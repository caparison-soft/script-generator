export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../../../lib/supabase';
import { prisma } from '../../../lib/db';

// GET /api/scripts — fetch user's script history
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerSupabaseClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const scripts = await prisma.script.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, topic: true, duration: true, createdAt: true, scriptText: true },
    });

    return NextResponse.json(scripts);
  } catch (err) {
    console.error('[/api/scripts GET]', err);
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 });
  }
}
