import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Protect /generator
  if (request.nextUrl.pathname.startsWith('/generator') && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect logged-in users away from login
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/generator', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/generator/:path*', '/login'],
};
