import { NextResponse } from 'next/server';

// No auth required for this test endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'API server is running',
    time: new Date().toISOString(),
    info: 'This is a public test endpoint that does not require authentication'
  });
} 