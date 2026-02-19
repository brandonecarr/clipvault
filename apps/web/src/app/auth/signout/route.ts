import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function POST(request: Request) {
  // CSRF guard: verify the request originates from the same host.
  // Browsers send Origin on cross-origin form POSTs, so a mismatch means
  // a third-party page is trying to sign the user out.
  const origin = request.headers.get('origin');
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || '';

  if (origin) {
    try {
      const originHost = new URL(origin).hostname;
      const targetHost = host.split(':')[0]; // strip port
      if (originHost !== targetHost) {
        return new Response('Forbidden', { status: 403 });
      }
    } catch {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  );
}
