import { NextRequest } from 'next/server';
import app from '@/features/tasks/server/route';

export const POST = async (req: NextRequest) => {
  return app.fetch(req);
}; 