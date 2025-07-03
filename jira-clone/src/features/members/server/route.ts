import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { Query } from 'node-appwrite';
import { z } from 'zod';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';

import { DATABASE_ID, MEMBERS_ID } from '@/config/db';
import { type Member, MemberRole } from '@/features/members/types';
import { getMember } from '@/features/members/utils';
import { createAdminClient } from '@/lib/appwrite';
import { sessionMiddleware } from '@/lib/session-middleware';
import { TASKS_ID } from '@/config/db';
import { TaskStatus } from '@/features/tasks/types';

const app = new Hono()
  .get(
    '/',
    sessionMiddleware,
    zValidator(
      'query',
      z.object({
        workspaceId: z.string(),
      }),
    ),
    async (ctx) => {
      const { users } = await createAdminClient();
      const databases = ctx.get('databases');
      const user = ctx.get('user');
      const { workspaceId } = ctx.req.valid('query');

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return ctx.json({ error: 'Unauthorized.' }, 401);
      }

      const members = await databases.listDocuments<Member>(DATABASE_ID, MEMBERS_ID, [Query.equal('workspaceId', workspaceId)]);

      const populatedMembers = await Promise.all(
        members.documents.map(async (member) => {
          const user = await users.get(member.userId);

          return { ...member, name: user.name, email: user.email };
        }),
      );

      return ctx.json({
        data: {
          ...members,
          documents: populatedMembers,
        },
      });
    },
  )
  .delete('/:memberId', sessionMiddleware, async (ctx) => {
    const { memberId } = ctx.req.param();
    const user = ctx.get('user');
    const databases = ctx.get('databases');

    const memberToDelete = await databases.getDocument(DATABASE_ID, MEMBERS_ID, memberId);

    const allMembersInWorkspace = await databases.listDocuments(DATABASE_ID, MEMBERS_ID, [
      Query.equal('workspaceId', memberToDelete.workspaceId),
    ]);

    if (allMembersInWorkspace.total === 1) {
      return ctx.json(
        {
          error: 'Cannot delete the only member.',
        },
        400,
      );
    }

    const member = await getMember({
      databases,
      workspaceId: memberToDelete.workspaceId,
      userId: user.$id,
    });

    if (!member) {
      return ctx.json(
        {
          error: 'Unauthorized.',
        },
        401,
      );
    }

    if (member.$id !== memberToDelete.$id && member.role !== MemberRole.ADMIN) {
      return ctx.json(
        {
          error: 'Unauthorized.',
        },
        401,
      );
    }

    await databases.deleteDocument(DATABASE_ID, MEMBERS_ID, memberId);

    return ctx.json({ data: { $id: memberToDelete.$id, workspaceId: memberToDelete.workspaceId } });
  })
  .patch(
    '/:memberId',
    sessionMiddleware,
    zValidator(
      'json',
      z.object({
        role: z.nativeEnum(MemberRole),
      }),
    ),
    async (ctx) => {
      const { memberId } = ctx.req.param();
      const { role } = ctx.req.valid('json');
      const user = ctx.get('user');
      const databases = ctx.get('databases');

      const memberToUpdate = await databases.getDocument(DATABASE_ID, MEMBERS_ID, memberId);

      const allMembersInWorkspace = await databases.listDocuments(DATABASE_ID, MEMBERS_ID, [
        Query.equal('workspaceId', memberToUpdate.workspaceId),
      ]);

      if (allMembersInWorkspace.total === 1) {
        return ctx.json(
          {
            error: 'Cannot downgrade the only member.',
          },
          400,
        );
      }

      const member = await getMember({
        databases,
        workspaceId: memberToUpdate.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return ctx.json(
          {
            error: 'Unauthorized.',
          },
          401,
        );
      }

      if (member.role !== MemberRole.ADMIN) {
        return ctx.json(
          {
            error: 'Unauthorized.',
          },
          401,
        );
      }

      await databases.updateDocument(DATABASE_ID, MEMBERS_ID, memberId, { role });

      return ctx.json({ data: { $id: memberToUpdate.$id, workspaceId: memberToUpdate.workspaceId } });
    },
  )
  .get(
    '/:memberId/analytics',
    sessionMiddleware,
    zValidator(
      'param',
      z.object({
        memberId: z.string(),
      }),
    ),
    async (ctx) => {
      const { memberId } = ctx.req.valid('param');
      const databases = ctx.get('databases');

      // --- Реализация получения статистики участника ---
      // Подсчитываем задачи по статусам для данного участника

      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      // Общее количество задач за текущий и предыдущий месяцы
      const thisMonthTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal('assigneeId', memberId),
          Query.greaterThanEqual('$createdAt', thisMonthStart.toISOString()),
          Query.lessThanEqual('$createdAt', thisMonthEnd.toISOString()),
        ]
      );

       const lastMonthTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal('assigneeId', memberId),
          Query.greaterThanEqual('$createdAt', lastMonthStart.toISOString()),
          Query.lessThanEqual('$createdAt', lastMonthEnd.toISOString()),
        ]
      );

      const taskCount = thisMonthTasks.total;
      const taskDifference = taskCount - lastMonthTasks.total;

      // Количество выполненных задач за текущий и предыдущий месяцы
      const thisMonthCompletedTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal('assigneeId', memberId),
          Query.equal('status', TaskStatus.DONE),
          Query.greaterThanEqual('$createdAt', thisMonthStart.toISOString()),
          Query.lessThanEqual('$createdAt', thisMonthEnd.toISOString()),
        ]
      );

      const lastMonthCompletedTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal('assigneeId', memberId),
          Query.equal('status', TaskStatus.DONE),
          Query.greaterThanEqual('$createdAt', lastMonthStart.toISOString()),
          Query.lessThanEqual('$createdAt', lastMonthEnd.toISOString()),
        ]
      );

      const completedTaskCount = thisMonthCompletedTasks.total;
      const completedTaskDifference = completedTaskCount - lastMonthCompletedTasks.total;

      // Количество незавершенных задач за текущий и предыдущий месяцы
      const thisMonthIncompleteTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal('assigneeId', memberId),
          Query.notEqual('status', TaskStatus.DONE),
          Query.greaterThanEqual('$createdAt', thisMonthStart.toISOString()),
          Query.lessThanEqual('$createdAt', thisMonthEnd.toISOString()),
        ]
      );

      const lastMonthIncompleteTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal('assigneeId', memberId),
          Query.notEqual('status', TaskStatus.DONE),
          Query.greaterThanEqual('$createdAt', lastMonthStart.toISOString()),
          Query.lessThanEqual('$createdAt', lastMonthEnd.toISOString()),
        ]
      );

      const incompleteTaskCount = thisMonthIncompleteTasks.total;
      const incompleteTaskDifference = incompleteTaskCount - lastMonthIncompleteTasks.total;

      // Количество просроченных задач за текущий и предыдущий месяцы
      const thisMonthOverdueTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal('assigneeId', memberId),
          Query.notEqual('status', TaskStatus.DONE),
          Query.lessThan('dueDate', now.toISOString()),
        ]
      );

      const lastMonthOverdueTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal('assigneeId', memberId),
          Query.notEqual('status', TaskStatus.DONE),
          Query.lessThan('dueDate', lastMonthEnd.toISOString()),
        ]
      );

       const overdueTaskCount = thisMonthOverdueTasks.total;
       const overdueTaskDifference = overdueTaskCount - lastMonthOverdueTasks.total;

       // Количество назначенных задач за текущий месяц (уже есть в предыдущей реализации, но берем из thisMonthTasks)
       const assignedTaskCount = thisMonthTasks.total;
       // Для назначеннных задач разница по месяцам не всегда имеет смысл, но для консистентности добавим
       const assignedTaskDifference = taskDifference; // Используем общую разницу задач


      const analytics = {
        taskCount,
        taskDifference,
        assignedTaskCount,
        assignedTaskDifference,
        completedTaskCount,
        completedTaskDifference,
        incompleteTaskCount,
        incompleteTaskDifference,
        overdueTaskCount,
        overdueTaskDifference,
      };
      // --- Конец реализации ---

      return ctx.json({ data: analytics });
    },
  );

export default app;
