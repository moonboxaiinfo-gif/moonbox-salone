-- Moonbox Salon Website & Portfolio Builder
-- Stores draft/live website versions separately and keeps public access limited
-- to published configuration and approved reviews.

CREATE TABLE IF NOT EXISTS public.website_configs (
  salon_id UUID PRIMARY KEY REFERENCES public.salons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished')),
  draft_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_config JSONB,
  published_at TIMESTAMPTZ,
  last_saved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_configs_status
  ON public.website_configs(status);

CREATE TABLE IF NOT EXISTS public.website_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 60),
  customer_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL CHECK (char_length(review_text) BETWEEN 10 AND 800),
  service_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  verified_booking BOOLEAN NOT NULL DEFAULT FALSE,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_reviews_salon_status
  ON public.website_reviews(salon_id, status, created_at DESC);

-- Keep updated_at server-controlled without requiring application code to do it.
CREATE OR REPLACE FUNCTION public.set_website_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS website_configs_set_updated_at ON public.website_configs;
CREATE TRIGGER website_configs_set_updated_at
  BEFORE UPDATE ON public.website_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_website_updated_at();

DROP TRIGGER IF EXISTS website_reviews_set_updated_at ON public.website_reviews;
CREATE TRIGGER website_reviews_set_updated_at
  BEFORE UPDATE ON public.website_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_website_updated_at();

ALTER TABLE public.website_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_reviews ENABLE ROW LEVEL SECURITY;

-- A salon member may read the complete draft/live record for their salon.
CREATE POLICY "Salon members can view website config"
  ON public.website_configs FOR SELECT
  USING (public.is_salon_member(salon_id));

CREATE POLICY "Salon managers can manage website config"
  ON public.website_configs FOR ALL
  USING (public.is_salon_manager_or_owner(salon_id))
  WITH CHECK (public.is_salon_manager_or_owner(salon_id));

-- Public visitors may see only the published configuration. Drafts are never public.
CREATE POLICY "Public can view published website config"
  ON public.website_configs FOR SELECT
  USING (status = 'published' AND published_config IS NOT NULL);

-- Owners/managers can moderate all reviews for their salon.
CREATE POLICY "Salon members can view website reviews"
  ON public.website_reviews FOR SELECT
  USING (public.is_salon_member(salon_id));

CREATE POLICY "Salon managers can manage website reviews"
  ON public.website_reviews FOR UPDATE
  USING (public.is_salon_manager_or_owner(salon_id))
  WITH CHECK (public.is_salon_manager_or_owner(salon_id));

CREATE POLICY "Salon managers can delete website reviews"
  ON public.website_reviews FOR DELETE
  USING (public.is_salon_manager_or_owner(salon_id));

-- Public visitors can read approved reviews only.
CREATE POLICY "Public can view approved website reviews"
  ON public.website_reviews FOR SELECT
  USING (status = 'approved');

-- Public submission is deliberately narrow: the client may create a pending
-- review, but cannot self-approve, feature, or mark itself as verified.
CREATE POLICY "Public can submit pending website review"
  ON public.website_reviews FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND is_featured = FALSE
    AND verified_booking = FALSE
    AND moderated_at IS NULL
    AND moderated_by IS NULL
  );

COMMENT ON TABLE public.website_configs IS
  'Tenant-isolated salon website drafts and published snapshots.';
COMMENT ON TABLE public.website_reviews IS
  'Moderated public reviews for salon websites; only approved rows are public.';
