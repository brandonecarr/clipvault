import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

// Lightweight server-side audit log.
// Events are written to stdout (captured by Vercel/Railway/etc. log drains).
// To persist to DB: insert into an `audit_log` table here instead of / in addition to console.log.

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({}, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({}, { status: 400 });
  }

  console.log(
    JSON.stringify({
      type: 'AUDIT',
      userId: user.id,
      timestamp: new Date().toISOString(),
      ...body,
    }),
  );

  return NextResponse.json({ ok: true });
}
