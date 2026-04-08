import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/book");

  if (!req.auth && !isPublicRoute) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Forward pathname so server layouts can read it
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (manifest, icons, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|workbox-).*)",
  ],
};
