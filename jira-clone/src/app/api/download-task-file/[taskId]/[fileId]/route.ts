import { NextResponse } from 'next/server';
import { Client, Storage } from 'node-appwrite';
import { cookies } from 'next/headers';

import { AUTH_COOKIE } from '@/features/auth/constants';
import { TASK_FILES_BUCKET_ID } from '@/config/db';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

const storage = new Storage(client);

export async function GET(req: Request, { params }: { params: { taskId: string; fileId: string } }) {
  try {
    // Получаем сессию
    const session = cookies().get(AUTH_COOKIE)?.value;

    if (!session) {
      console.error('API /download-task-file/[taskId]/[fileId]: Unauthorized, no session cookie');
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    client.setSession(session);

    const { taskId, fileId } = params;

    if (!taskId || !fileId) {
      console.error('API /download-task-file/[taskId]/[fileId]: Task ID or File ID missing');
      return NextResponse.json({ error: 'Task ID and File ID are required.' }, { status: 400 });
    }

    console.log('API /download-task-file/[taskId]/[fileId]: Attempting to get file metadata and content for File ID:', fileId);

    // Получаем метаданные файла для определения Content-Type и имени
    const fileMetadata = await storage.getFile(TASK_FILES_BUCKET_ID, fileId);
    console.log('API /download-task-file/[taskId]/[fileId]: File metadata obtained. Name:', fileMetadata.name, 'Type:', fileMetadata.mimeType);

    // Получаем содержимое файла
    const fileContent = await storage.getFileView(TASK_FILES_BUCKET_ID, fileId);
    console.log('API /download-task-file/[taskId]/[fileId]: File content obtained.');

    // Правильно кодируем имя файла для Content-Disposition
    const encodedFileName = encodeURIComponent(fileMetadata.name);

    // Возвращаем файл как Response
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': fileMetadata.mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
      },
    });

  } catch (error: any) {
    console.error('API /download-task-file/[taskId]/[fileId]: Error during download process:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorStatus = error.status || 500;
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
} 