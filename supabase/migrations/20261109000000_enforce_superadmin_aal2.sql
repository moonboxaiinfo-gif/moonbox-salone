-- ============================================================================
-- Moonbox Salon SaaS — Phase 01 Super Admin Security
-- Enforce role + Supabase MFA assurance at the database boundary.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    AND EXISTS (
      SELECT 1
      FROM public.platform_admins
      WHERE user_id = auth.uid()
        AND role = 'superadmin'
    );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'Returns true only for an authorized platform superadmin with Supabase MFA assurance level AAL2.';

-- Ensure callers cannot replace the security predicate through direct execution.
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
