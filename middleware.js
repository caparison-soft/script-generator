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
      cookieOptions: process.env.NODE_ENV === 'production' ? { domain: '.caparisonlab.com' } : {},
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
    const mainLoginUrl = new URL('https://www.caparisonlab.com/login');
    mainLoginUrl.searchParams.set('next', request.url);
    return NextResponse.redirect(mainLoginUrl);
  }

  // Redirect /login to main app login
  if (request.nextUrl.pathname === '/login') {
    if (session) {
      return NextResponse.redirect(new URL('/generator', request.url));
    } else {
      const mainLoginUrl = new URL('https://www.caparisonlab.com/login');
      mainLoginUrl.searchParams.set('next', new URL('/generator', request.url).toString());
      return NextResponse.redirect(mainLoginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/generator/:path*', '/login'],
};
