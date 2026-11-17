-- ============================================================================
-- Moonbox Salon SaaS — Phase 02 Landing Page CMS
-- Platform-level content is separate from tenant salon data.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.landing_page_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  version INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS landing_page_documents_one_published
  ON public.landing_page_documents (status)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_landing_page_documents_status_updated
  ON public.landing_page_documents (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.landing_page_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.landing_page_documents(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_page_media_document_section
  ON public.landing_page_media (document_id, section_key, display_order);

ALTER TABLE public.landing_page_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published landing page" ON public.landing_page_documents;
CREATE POLICY "Public can read published landing page"
  ON public.landing_page_documents FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Super admins manage landing pages" ON public.landing_page_documents;
CREATE POLICY "Super admins manage landing pages"
  ON public.landing_page_documents FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Public can read enabled published media" ON public.landing_page_media;
CREATE POLICY "Public can read enabled published media"
  ON public.landing_page_media FOR SELECT
  USING (
    is_enabled = TRUE
    AND EXISTS (
      SELECT 1 FROM public.landing_page_documents d
      WHERE d.id = document_id AND d.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Super admins manage landing media" ON public.landing_page_media;
CREATE POLICY "Super admins manage landing media"
  ON public.landing_page_media FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

COMMENT ON TABLE public.landing_page_documents IS 'Draft and published platform-level landing page snapshots; not tenant content.';
COMMENT ON TABLE public.landing_page_media IS 'Platform landing page media metadata. Storage bucket policies must be deployed separately.';
