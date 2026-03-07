import { updateSession } from '@/lib/supabase/middleware';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { getDemoRewritePath } from '@/lib/demo-routing';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  if (isDemoModeEnabled()) {
    const rewritePath = getDemoRewritePath(request.nextUrl.pathname);
    if (rewritePath) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = rewritePath;
      return NextResponse.rewrite(rewriteUrl);
    }

    return NextResponse.next({
      request,
    });
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
