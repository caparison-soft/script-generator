import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../../../lib/supabase';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = await createServerSupabaseClient(cookieStore);
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/generator`);
}
