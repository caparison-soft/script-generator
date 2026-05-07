import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../lib/supabase';

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = await createServerSupabaseClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/generator');
  } else {
    redirect('/login');
  }
}
