/**
 * Public Layout
 *
 * Layout for public routes (landing page, public quote view).
 * Enforces light theme regardless of system preference.
 * No authentication required.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="light" style={{ colorScheme: 'light' }}>
      {children}
    </div>
  );
}
