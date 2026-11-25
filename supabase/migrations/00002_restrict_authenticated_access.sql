-- Dashboard data was readable by every authenticated Supabase user because
-- the original policies used USING (true). App-level allowlists do not apply
-- to direct PostgREST calls made with the public anon key.
--
-- Access now requires the signed-in email to be present in admin_allowlist.
-- The app inserts that row from ALLOWED_EMAILS before user-scoped queries.
-- The service role bypasses RLS and is unchanged.

CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_allowlist FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_dashboard_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_allowlist
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

REVOKE ALL ON FUNCTION public.is_dashboard_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_dashboard_admin() TO authenticated;

DROP POLICY IF EXISTS "Admin full access on customers" ON public.customers;
DROP POLICY IF EXISTS "Admin full access on messages" ON public.messages;
DROP POLICY IF EXISTS "Admin full access on quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admin full access on invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin full access on message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "Admin read access on quote_audit_log" ON public.quote_audit_log;
DROP POLICY IF EXISTS "Admin full access on customer_photos" ON public.customer_photos;

CREATE POLICY "Allowlisted admin access on customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.is_dashboard_admin())
  WITH CHECK (public.is_dashboard_admin());

CREATE POLICY "Allowlisted admin access on messages"
  ON public.messages FOR ALL TO authenticated
  USING (public.is_dashboard_admin())
  WITH CHECK (public.is_dashboard_admin());

CREATE POLICY "Allowlisted admin access on quotes"
  ON public.quotes FOR ALL TO authenticated
  USING (public.is_dashboard_admin())
  WITH CHECK (public.is_dashboard_admin());

CREATE POLICY "Allowlisted admin access on invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (public.is_dashboard_admin())
  WITH CHECK (public.is_dashboard_admin());

CREATE POLICY "Allowlisted admin access on message_templates"
  ON public.message_templates FOR ALL TO authenticated
  USING (public.is_dashboard_admin())
  WITH CHECK (public.is_dashboard_admin());

CREATE POLICY "Allowlisted admin read access on quote_audit_log"
  ON public.quote_audit_log FOR SELECT TO authenticated
  USING (public.is_dashboard_admin());

CREATE POLICY "Allowlisted admin access on customer_photos"
  ON public.customer_photos FOR ALL TO authenticated
  USING (public.is_dashboard_admin())
  WITH CHECK (public.is_dashboard_admin());

COMMENT ON TABLE public.admin_allowlist IS
  'Emails allowed to use dashboard RLS policies. Synced from ALLOWED_EMAILS.';
