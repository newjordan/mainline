export function getSafeNextPath(nextPath: string | null): string | null {
  if (!nextPath) {
    return null;
  }

  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return null;
  }

  // Keep this as a path-only redirect target.
  if (nextPath.includes('?') || nextPath.includes('#')) {
    return null;
  }

  return nextPath;
}
