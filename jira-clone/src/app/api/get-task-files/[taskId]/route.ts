import { NextResponse } from 'next/server';
import { Client, Databases, Query, Models } from 'node-appwrite';
import { cookies } from 'next/headers';

import { AUTH_COOKIE } from '@/features/auth/constants';
import { DATABASE_ID, TASK_FILES_ID } from '@/config/db';
import { UploadedFile } from '@/features/tasks/types';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

const databases = new Databases(client);

export async function GET(req: Request, { params }: { params: { taskId: string } }) {
  try {
    // Получаем сессию
    const session = cookies().get(AUTH_COOKIE)?.value;

    if (!session) {
      console.error('API /get-task-files/[taskId]: Unauthorized, no session cookie');
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    client.setSession(session);

    const { taskId } = params;

    if (!taskId) {
      console.error('API /get-task-files/[taskId]: Task ID is missing from params');
      return NextResponse.json({ error: 'Task ID is required.' }, { status: 400 });
    }

    console.log('API /get-task-files/[taskId]: Attempting to list documents for Task ID:', taskId);

    // Получаем метаданные файлов из Appwrite Database
    const files = await databases.listDocuments(
      DATABASE_ID,
      TASK_FILES_ID,
      [
        Query.equal('taskId', taskId),
        Query.orderDesc('$createdAt'),
      ]
    );

    console.log('API /get-task-files/[taskId]: Found files:', files.documents.length);

    return NextResponse.json({ data: files.documents as UploadedFile[] }, { status: 200 });

  } catch (error: any) {
    console.error('API /get-task-files/[taskId]: Error during fetch process:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorStatus = error.status || 500;
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
} 