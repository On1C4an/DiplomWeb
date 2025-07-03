import { NextRequest } from 'next/server';
import app from '@/features/tasks/server/route';

export const GET = async (req: NextRequest, { params }: { params: { taskId: string } }) => {
  return app.fetch(req);
}; 