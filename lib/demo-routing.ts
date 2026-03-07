export function getDemoRewritePath(pathname: string): string | null {
  if (pathname.startsWith('/demo')) return null;

  if (pathname.startsWith('/auth')) return '/demo/login';
  if (pathname === '/home') return '/demo/home';
  if (pathname === '/setup-wizard') return '/demo/login';
  if (pathname === '/customers' || pathname.startsWith('/customers/')) {
    return `/demo${pathname}`;
  }
  if (pathname === '/quotes' || pathname.startsWith('/quotes/')) {
    return `/demo${pathname}`;
  }
  if (pathname === '/invoices' || pathname.startsWith('/invoices/')) {
    return `/demo${pathname}`;
  }
  if (pathname === '/search') return '/demo/search';

  return null;
}