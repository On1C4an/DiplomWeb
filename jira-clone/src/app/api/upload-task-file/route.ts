import { NextResponse } from 'next/server';
import { Client, Storage, ID, Databases, Query, Account } from 'node-appwrite';
import { cookies } from 'next/headers';

import { AUTH_COOKIE } from '@/features/auth/constants';
import { DATABASE_ID, TASK_FILES_BUCKET_ID, TASK_FILES_ID, TASKS_ID, MEMBERS_ID } from '@/config/db';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

const storage = new Storage(client);
const databases = new Databases(client);

export async function POST(req: Request) {
  try {
    const session = cookies().get(AUTH_COOKIE)?.value;

    if (!session) {
      console.error('API /upload-task-file: Не авторизован, отсутствует cookie сессии');
      return NextResponse.json({ error: 'Не авторизован.' }, { status: 401 });
    }

    client.setSession(session);

    const account = new Account(client);
    const currentUser = await account.get();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const taskId = formData.get('taskId') as string | null;

    if (!file || !taskId) {
      console.error('API /upload-task-file: Отсутствует файл или ID задачи');
      return NextResponse.json({ error: 'Требуется файл и ID задачи.' }, { status: 400 });
    }

    const task = await databases.getDocument(DATABASE_ID, TASKS_ID, taskId);
    const assignee = await databases.getDocument(DATABASE_ID, MEMBERS_ID, task.assigneeId);
    
    if (assignee.userId !== currentUser.$id) {
      console.error('API /upload-task-file: Пользователь не является исполнителем задачи');
      return NextResponse.json({ error: 'Только исполнитель задачи может загружать файлы.' }, { status: 403 });
    }

    if (!(file instanceof File)) {
      console.error('API /upload-task-file: Некорректный тип файла');
      return NextResponse.json({ error: 'Получен некорректный тип файла.' }, { status: 400 });
    }

    console.log('API /upload-task-file: Попытка загрузки файла', { name: file.name, size: file.size, taskId });

    const uploadedFile = await storage.createFile(TASK_FILES_BUCKET_ID, ID.unique(), file);

    console.log('API /upload-task-file: Файл успешно загружен', uploadedFile.$id);

    console.log('API /upload-task-file: Попытка сохранения метаданных', { taskId, fileId: uploadedFile.$id });

    const fileMetadata = await databases.createDocument(
      DATABASE_ID,
      TASK_FILES_ID,
      ID.unique(),
      {
        taskId: taskId,
        fileId: uploadedFile.$id,
        name: uploadedFile.name,
        type: uploadedFile.mimeType,
        size: uploadedFile.sizeOriginal,
      }
    );

    console.log('API /upload-task-file: Метаданные успешно сохранены', fileMetadata.$id);

    return NextResponse.json({ data: fileMetadata }, { status: 200 });

  } catch (error: any) {
    console.error('API /upload-task-file: Ошибка в процессе загрузки:', error);
    const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка';
    const errorStatus = error.status || 500;
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
} 