import { NextResponse } from 'next/server';

/**
 * Sandbox webhook sink.
 *
 * Purpose:
 * - Keep Square sandbox and production webhook URLs distinct.
 * - Avoid touching live invoice/payment state from sandbox events.
 */
export async function POST() {
  return new NextResponse('OK', { status: 200 });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Square sandbox webhook endpoint is active.',
  });
}
