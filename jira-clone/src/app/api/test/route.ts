import { NextResponse } from 'next/server';

export async function GET() {
  console.log('Reached /api/test');
  return NextResponse.json({ message: 'Test route reached' });
} 