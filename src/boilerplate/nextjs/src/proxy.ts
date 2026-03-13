import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { Locale } from 'next-intl';

const intlMiddleware = createMiddleware(routing);

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Extract credentials and locale preferences
  const accessToken = req.cookies.get('accessToken')?.value;
  const savedLocale = req.cookies.get('NEXT_LOCALE')?.value;

  // Use saved cookie if valid, otherwise fallback to the fixed organizational default
  const activeLocale =
    savedLocale && routing.locales.includes(savedLocale as Locale)
      ? savedLocale
      : routing.defaultLocale;

  // Helper to check if the current path is a base locale path (e.g., "/en", "/vi")
  const isBaseLocalePath = routing.locales.some((l) => pathname === `/${l}`);

  // 2. Handle Root "/" redirection
  if (pathname === '/') {
    const target = accessToken ? `/${activeLocale}/dashboard` : `/${activeLocale}/login`;
    return NextResponse.redirect(new URL(target, req.url));
  }

  // 3. Handle Locale-only paths (e.g., user types "/en" manually)
  if (isBaseLocalePath) {
    const pathLocale = pathname.split('/')[1];
    const target = accessToken ? `/${pathLocale}/dashboard` : `/${pathLocale}/login`;
    return NextResponse.redirect(new URL(target, req.url));
  }

  // 4. Authentication Guard: Logged-in users should not see the login page
  const isLoginPage = routing.locales.some((l) => pathname === `/${l}/login`);
  if (accessToken && isLoginPage) {
    return NextResponse.redirect(new URL(`/${activeLocale}/dashboard`, req.url));
  }

  // 5. Authentication Guard: Protect private routes
  // Define your protected segments here
  const protectedSegments = ['/dashboard', '/settings', '/users', '/chat'];
  const isProtectedRoute = protectedSegments.some((segment) => pathname.includes(segment));

  if (!accessToken && isProtectedRoute) {
    // Extract locale from path to keep the user in their preferred language context
    const pathSegments = pathname.split('/');
    const currentPathLocale = routing.locales.includes(pathSegments[1] as Locale)
      ? pathSegments[1]
      : activeLocale;

    return NextResponse.redirect(new URL(`/${currentPathLocale}/login`, req.url));
  }

  // 6. Finalize with intl handling for localized routing/headers
  return intlMiddleware(req);
}

export const config = {
  // Standard matcher to exclude static assets and internal Next.js files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
