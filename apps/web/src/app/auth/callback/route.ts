import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Validate next: must be a relative path starting with / but not //
  // (prevents open-redirect attacks like ?next=//evil.com)
  const rawNext = searchParams.get('next') ?? '/library';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/library';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
