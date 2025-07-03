import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { ID, Models, Query } from 'node-appwrite';
import { z } from 'zod';

import { DATABASE_ID, IMAGES_BUCKET_ID, MEMBERS_ID, PROJECTS_ID, TASKS_ID, COMMENTS_ID, TASK_FILES_BUCKET_ID, TASK_FILES_ID } from '@/config/db';
import { getMember } from '@/features/members/utils';
import type { Project } from '@/features/projects/types';
import { createTaskSchema, updateTaskSchema } from '@/features/tasks/schema';
import { type Task, TaskStatus } from '@/features/tasks/types';
import { createAdminClient } from '@/lib/appwrite';
import { sessionMiddleware } from '@/lib/session-middleware';
import { createCommentSchema } from '../schema';
import { taskStatusTranslations } from '@/features/tasks/translations';

const app = new Hono()
  .get(
    '/',
    sessionMiddleware,
    zValidator(
      'query',
      z.object({
        workspaceId: z.string(),
        projectId: z.string().nullish(),
        assigneeId: z.string().nullish(),
        status: z.nativeEnum(TaskStatus).nullish(),
        search: z.string().nullish(),
        dueDate: z.string().nullish(),
      }),
    ),
    async (ctx) => {
      const { users } = await createAdminClient();
      const databases = ctx.get('databases');
      const storage = ctx.get('storage');
      const user = ctx.get('user');

      const { workspaceId, projectId, assigneeId, status, search, dueDate } = ctx.req.valid('query');

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return ctx.json({ error: 'Unauthorized.' }, 401);
      }

      const query = [Query.equal('workspaceId', workspaceId), Query.orderDesc('$createdAt')];

      if (projectId) query.push(Query.equal('projectId', projectId));

      if (status) query.push(Query.equal('status', status));

      if (assigneeId) query.push(Query.equal('assigneeId', assigneeId));

      if (dueDate) query.push(Query.equal('dueDate', dueDate));

      if (search) query.push(Query.search('name', search));

      const tasks = await databases.listDocuments<Task>(DATABASE_ID, TASKS_ID, query);

      const projectIds = tasks.documents.map((task) => task.projectId);
      const assigneeIds = tasks.documents.map((task) => task.assigneeId);

      const projects = await databases.listDocuments<Project>(
        DATABASE_ID,
        PROJECTS_ID,
        projectIds.length > 0 ? [Query.contains('$id', projectIds)] : [],
      );

      const members = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        assigneeIds.length > 0 ? [Query.contains('$id', assigneeIds)] : [],
      );

      const assignees = await Promise.all(
        members.documents.map(async (member) => {
          const user = await users.get(member.userId);

          return {
            ...member,
            name: user.name,
            email: user.email,
          };
        }),
      );

      const populatedTasks: (Models.Document & Task)[] = await Promise.all(
        tasks.documents.map(async (task) => {
          const project = projects.documents.find((project) => project.$id === task.projectId);
          const assignee = assignees.find((assignee) => assignee.$id === task.assigneeId);

          let imageUrl: string | undefined = undefined;

          if (project?.imageId) {
            const arrayBuffer = await storage.getFileView(IMAGES_BUCKET_ID, project.imageId);
            imageUrl = `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
          }

          return {
            ...task,
            project: {
              ...project,
              imageUrl,
            },
            assignee,
          };
        }),
      );

      return ctx.json({
        data: {
          ...tasks,
          documents: populatedTasks,
        },
      });
    },
  )
  .get('/:taskId', sessionMiddleware, async (ctx) => {
    const { taskId } = ctx.req.param();
    const currentUser = ctx.get('user');
    const databases = ctx.get('databases');

    const { users } = await createAdminClient();

    const task = await databases.getDocument<Task>(DATABASE_ID, TASKS_ID, taskId);

    const currentMember = await getMember({
      databases,
      workspaceId: task.workspaceId,
      userId: currentUser.$id,
    });

    if (!currentMember) {
      return ctx.json({ error: 'Unauthorized.' }, 401);
    }

    const project = await databases.getDocument<Project>(DATABASE_ID, PROJECTS_ID, task.projectId);

    const member = await databases.getDocument(DATABASE_ID, MEMBERS_ID, task.assigneeId);

    const user = await users.get(member.userId);

    const assignee = {
      ...member,
      name: user.name,
      email: user.email,
    };

    return ctx.json({
      data: {
        ...task,
        project,
        assignee,
      },
    });
  })
  .post('/', sessionMiddleware, zValidator('json', createTaskSchema), async (ctx) => {
    const user = ctx.get('user');
    const databases = ctx.get('databases');

    const { name, status, workspaceId, projectId, dueDate, assigneeId } = ctx.req.valid('json');

    const member = await getMember({
      databases,
      workspaceId,
      userId: user.$id,
    });

    if (!member) {
      return ctx.json({ error: 'Unauthorized.' }, 401);
    }

    const highestPositionTask = await databases.listDocuments(DATABASE_ID, TASKS_ID, [
      Query.equal('status', status),
      Query.equal('workspaceId', workspaceId),
      Query.orderAsc('position'),
      Query.limit(1),
    ]);

    const newPosition = highestPositionTask.documents.length > 0 ? highestPositionTask.documents[0].position + 1000 : 1000;

    const task = await databases.createDocument<Task>(DATABASE_ID, TASKS_ID, ID.unique(), {
      name,
      status,
      workspaceId,
      projectId,
      dueDate,
      assigneeId,
      position: newPosition,
    });

    return ctx.json({ data: task });
  })
  .patch(
    '/:taskId',
    sessionMiddleware,
    zValidator(
      'json',
      updateTaskSchema.superRefine((data: z.infer<typeof updateTaskSchema>, ctx: z.RefinementCtx) => {
        if (data.status && !['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(data.status)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid status',
            path: ['status'],
          });
        }

        if (data.position && typeof data.position !== 'number') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Position must be a number',
            path: ['position'],
          });
        }
      }),
    ),
    async (ctx) => {
      const user = ctx.get('user');
      const databases = ctx.get('databases');

      const { taskId } = ctx.req.param();
      const values = ctx.req.valid('json');

      const task = await databases.getDocument<Task>(DATABASE_ID, TASKS_ID, taskId);

      const member = await getMember({
        databases,
        workspaceId: task.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return ctx.json({ error: 'Unauthorized.' }, 401);
      }

      // --- Новая логика валидации: проверка наличия файла при статусе DONE ---
      if (values.status && values.status === TaskStatus.DONE) {
        console.log(`>>>> Task ${taskId}: Status set to DONE. Checking for attached files.`);
        const attachedFiles = await databases.listDocuments(
          DATABASE_ID,
          TASK_FILES_ID,
          [Query.equal('taskId', taskId), Query.limit(1)] // Проверяем наличие хотя бы одного файла
        );

        if (attachedFiles.total === 0) {
          console.log(`>>>> Task ${taskId}: No files found when status is DONE. Returning error.`);
          return ctx.json({ error: 'Для установки статуса «Выполнено» необходимо прикрепить хотя бы один файл.' }, 400);
        }
        console.log(`>>>> Task ${taskId}: Found ${attachedFiles.total} attached files. Proceeding.`);
      }
      // --- Конец новой логики валидации ---

      const updatedTask = await databases.updateDocument(
        DATABASE_ID,
        TASKS_ID,
        taskId,
        values,
      );

      return ctx.json({ data: updatedTask });
    },
  )
  .post(
    '/bulk-update',
    sessionMiddleware,
    zValidator(
      'json',
      z.object({
        tasks: z.array(
          z.object({
            $id: z.string(),
            status: z.nativeEnum(TaskStatus),
            position: z.number().int().positive().min(1000).max(1_00_000),
          }),
        ),
      }),
    ),
    async (ctx) => {
      const databases = ctx.get('databases');
      const user = ctx.get('user');
      const { tasks } = ctx.req.valid('json');

      const tasksToUpdate = await databases.listDocuments<Task>(DATABASE_ID, TASKS_ID, [
        Query.contains(
          '$id',
          tasks.map((task) => task.$id),
        ),
      ]);

      const workspaceIds = new Set(tasksToUpdate.documents.map((task) => task.workspaceId));

      if (workspaceIds.size !== 1) {
        return ctx.json({ error: 'All tasks must belong to the same workspace.' }, 401);
      }

      const workspaceId = workspaceIds.values().next().value!;

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return ctx.json({ error: 'Unauthorized.' }, 401);
      }

      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          const { $id, status, position } = task;

          return databases.updateDocument<Task>(DATABASE_ID, TASKS_ID, $id, { status, position });
        }),
      );

      return ctx.json({ data: { updatedTasks, workspaceId } });
    },
  )
  .delete('/:taskId', sessionMiddleware, async (ctx) => {
    const user = ctx.get('user');
    const databases = ctx.get('databases');

    const { taskId } = ctx.req.param();

    const task = await databases.getDocument<Task>(DATABASE_ID, TASKS_ID, taskId);

    const member = await getMember({
      databases,
      workspaceId: task.workspaceId,
      userId: user.$id,
    });

    if (!member) {
      return ctx.json({ error: 'Unauthorized.' }, 401);
    }

    await databases.deleteDocument(DATABASE_ID, TASKS_ID, taskId);

    return ctx.json({ data: task });
  })
  .get('/:taskId/comments', sessionMiddleware, async (ctx) => {
    const { taskId } = ctx.req.param();
    const databases = ctx.get('databases');

    const comments = await databases.listDocuments(
      DATABASE_ID,
      COMMENTS_ID,
      [Query.equal('taskId', taskId), Query.orderAsc('createdAt')]
    );

    return ctx.json({ data: comments.documents });
  })
  .post(
    '/:taskId/comments',
    sessionMiddleware,
    zValidator('json', createCommentSchema),
    async (ctx) => {
      const { taskId } = ctx.req.param();
      const user = ctx.get('user');
      const databases = ctx.get('databases');
      const { text, type } = ctx.req.valid('json');

      const comment = await databases.createDocument(
        DATABASE_ID,
        COMMENTS_ID,
        ID.unique(),
        {
          taskId,
          userId: user.$id,
          userName: user.name,
          text,
          createdAt: new Date().toISOString(),
          type,
        }
      );

      return ctx.json({ data: comment });
    }
  )
  .post('/upload_file', sessionMiddleware, async (ctx) => {
    console.log('>>>> Reached POST /upload_file handler');
    console.log('>>>> Request method:', ctx.req.method);
    console.log('>>>> Request path:', ctx.req.path);
    console.log('>>>> Content-Type:', ctx.req.header('Content-Type'));
    
    const storage = ctx.get('storage');
    const databases = ctx.get('databases');
    const user = ctx.get('user');

    try {
      const formData = await ctx.req.formData();
      const file = formData.get('file');
      const taskId = formData.get('taskId');

      console.log('>>>> Received formData. file:', file ? 'exists' : 'null', 'taskId:', taskId);

      if (!(file instanceof File) || typeof taskId !== 'string') {
        console.error('>>>> Invalid data received');
        return ctx.json({ error: 'Некорректные данные' }, 400);
      }

      // Загружаем файл в Storage
      const fileId = ID.unique();
      console.log('>>>> Attempting to create file in Storage. Bucket ID:', TASK_FILES_BUCKET_ID, 'File ID:', fileId);
      const uploaded = await storage.createFile(TASK_FILES_BUCKET_ID, fileId, file);

      console.log('>>>> File created in Storage. Uploaded ID:', uploaded.$id);

      // Сохраняем метаданные в TaskFiles
      console.log('>>>> Attempting to create document in TaskFiles collection. Collection ID:', TASK_FILES_ID, 'Task ID:', taskId);
      const doc = await databases.createDocument(DATABASE_ID, TASK_FILES_ID, ID.unique(), {
        taskId,
        fileId: uploaded.$id,
        name: uploaded.name,
        type: uploaded.mimeType,
        size: uploaded.sizeOriginal,
      });

      console.log('>>>> Document created in TaskFiles collection. Doc ID:', doc.$id);

      return ctx.json({ data: doc });
    } catch (error: unknown) {
      console.error('>>>> Error in POST /upload_file handler:', error instanceof Error ? error.message : error);
      // Возвращаем более подробную ошибку, если возможно
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      const errorStatus = (error as any).status || 500;
      return ctx.json({ error: errorMessage }, errorStatus);
    }
  })
  .get('/:taskId', sessionMiddleware, async (ctx) => {
    console.log('>>>> Reached GET /:taskId handler (for files)');
    console.log('>>>> Request method:', ctx.req.method);
    console.log('>>>> Request path:', ctx.req.path);
    console.log('>>>> Task ID from param:', ctx.req.param('taskId'));

    const databases = ctx.get('databases');
    const { taskId } = ctx.req.param();

    if (!taskId) {
       console.error('>>>> Task ID is missing from params');
       return ctx.json({ error: 'Task ID is required' }, 400);
    }

    try {
      console.log('>>>> Attempting to list documents in TaskFiles collection. Collection ID:', TASK_FILES_ID, 'Task ID query:', taskId);
      const files = await databases.listDocuments(DATABASE_ID, TASK_FILES_ID, [
        Query.equal('taskId', taskId),
        Query.orderDesc('$createdAt'),
      ]);

      console.log('>>>> Documents listed from TaskFiles collection. Found', files.documents.length, 'files.');

      return ctx.json({ data: files.documents });
    } catch (error: unknown) {
      console.error('>>>> Error in GET /:taskId handler (for files):', error instanceof Error ? error.message : error);
       // Возвращаем более подробную ошибку, если возможно
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch task files';
      const errorStatus = (error as any).status || 500;
      return ctx.json({ error: errorMessage }, errorStatus);
    }
  })
  .get('/:taskId/files/:fileId', sessionMiddleware, async (ctx) => {
    console.log('>>>> Reached GET /:taskId/files/:fileId handler');
    console.log('>>>> Request method:', ctx.req.method);
    console.log('>>>> Request path:', ctx.req.path);
    console.log('>>>> Task ID from param:', ctx.req.param('taskId'), 'File ID from param:', ctx.req.param('fileId'));
    
    const storage = ctx.get('storage');
    const { fileId } = ctx.req.param();

    if (!fileId) {
        console.error('>>>> File ID is missing from params');
        return ctx.json({ error: 'File ID is required' }, 400);
    }

    try {
      console.log('>>>> Attempting to get file metadata. Bucket ID:', TASK_FILES_BUCKET_ID, 'File ID:', fileId);
      // Получаем метаданные файла
      const fileMetadata = await storage.getFile(TASK_FILES_BUCKET_ID, fileId);
      console.log('>>>> File metadata obtained. File Name:', fileMetadata.name);

      console.log('>>>> Attempting to get file content.');
      // Получаем содержимое файла
      const fileContent = await storage.getFileView(TASK_FILES_BUCKET_ID, fileId);
      console.log('>>>> File content obtained.');

      return new Response(fileContent, {
        headers: {
          'Content-Type': fileMetadata.mimeType,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileMetadata.name)}`,
        },
      });
    } catch (error: unknown) {
      console.error('>>>> Error in GET /:taskId/files/:fileId handler:', error instanceof Error ? error.message : error);
      // Возвращаем 404, если файл не найден
      const errorMessage = error instanceof Error ? error.message : 'Файл не найден';
      // Если ошибка от Appwrite - проверяем статус, иначе по умолчанию 404
      const errorStatus = (error as any).status || 404; 
      return ctx.json({ error: errorMessage }, errorStatus);
    }
  });

export default app;
