import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from '../../context/RouterContext';
import { StorageService } from '../../services/storageService';
import { isLocalDemoMode } from '../../services/storageService';
import { WebsiteService } from '../../services/websiteService';
import { PublicWebsiteApi, PublicWebsitePayload } from '../../services/publicWebsiteApi';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, Globe, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { WebsiteRenderer } from '../website/WebsiteRenderer';
import { ReviewFormModal } from '../website/WebsiteShared';
import { ensureFontsLoaded } from '../../lib/websiteDefaults';

/**
 * Public salon website: renders the salon's PUBLISHED website configuration
 * with its selected theme. Drafts and unpublished content are never exposed,
 * and no salon-owner login is required.
 */
export const PublicPortfolioPage: React.FC = () => {
  const { params, navigate } = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [remoteSite, setRemoteSite] = useState<PublicWebsitePayload | null>(null);
  const [remoteResolvedSlug, setRemoteResolvedSlug] = useState('');

  const slug = params.salonSlug || '';
  const isLoadingRemoteSite = Boolean(slug) && remoteResolvedSlug !== slug;
  const localTenant = useMemo(
    () => (isLocalDemoMode && slug ? StorageService.getTenantBySlug(slug) : undefined),
    [slug]
  );

  useEffect(() => {
    const controller = new AbortController();
    setRemoteSite(null);
    if (!slug) {
      setRemoteResolvedSlug('');
      return () => { controller.abort(); };
    }
    PublicWebsiteApi.get(slug, controller.signal)
      .then(site => { if (!controller.signal.aborted) setRemoteSite(site); })
      .catch(() => { /* local adapter remains available in development/demo mode */ })
      .finally(() => { if (!controller.signal.aborted) setRemoteResolvedSlug(slug); });
    return () => { controller.abort(); };
  }, [slug]);

  const activeRemoteSite = remoteSite?.tenant.slug.toLowerCase() === slug.toLowerCase() ? remoteSite : null;
  const tenant = activeRemoteSite?.tenant ?? localTenant;

  const publishedConfig = useMemo(
    () => activeRemoteSite?.config ?? (isLocalDemoMode && tenant ? WebsiteService.getPublishedConfig(tenant.id) : null),
    [activeRemoteSite, tenant]
  );

  const approvedReviews = useMemo(
    () => activeRemoteSite?.reviews ?? (isLocalDemoMode && tenant ? WebsiteService.getApprovedReviews(tenant.id) : []),
    [activeRemoteSite, tenant]
  );

  const services = useMemo(
    () => activeRemoteSite?.services ?? (isLocalDemoMode && tenant ? StorageService.getServices(tenant.id).filter(s => s.isActive) : []),
    [activeRemoteSite, tenant]
  );
  const categories = useMemo(
    () => activeRemoteSite?.categories ?? (isLocalDemoMode && tenant ? StorageService.getCategories(tenant.id) : []),
    [activeRemoteSite, tenant]
  );

  // SEO: reflect the salon's published meta title + favicon
  React.useEffect(() => {
    if (!tenant || !publishedConfig) return;
    const prevTitle = document.title;
    document.title = publishedConfig.seo.title || `${tenant.name} | Salon`;
    if (tenant.logoUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      if (!link.href || link.href.includes('logo.svg')) link.href = tenant.logoUrl;
    }
    return () => { document.title = prevTitle; };
  }, [tenant, publishedConfig]);

  // Not found
  if (isLoadingRemoteSite && !localTenant) {
    return <PublicStateScreen
      isDark={isDark}
      icon={<Globe className="w-10 h-10 animate-pulse" />}
      title="Loading salon website"
      message="Fetching the published salon website…"
      onHome={() => navigate('/')}
    />;
  }

  if (!tenant) {
    return <PublicStateScreen
      isDark={isDark}
      icon={<Globe className="w-10 h-10" />}
      title="Salon Not Found"
      message="This salon website does not exist or may have moved."
      onHome={() => navigate('/')}
    />;
  }

  // Not published (or no published content)
  if (!publishedConfig) {
    return <PublicStateScreen
      isDark={isDark}
      icon={<CalendarCheck className="w-10 h-10" />}
      title={`${tenant.name} is getting ready`}
      message="This salon hasn't published its website yet — but you can still book an appointment online."
      showBooking
      slug={tenant.slug}
      onHome={() => navigate('/')}
    />;
  }

  return (
    <>
      <WebsiteRenderer
        config={publishedConfig}
        tenant={tenant}
        services={services}
        categories={categories}
        reviews={approvedReviews}
        onBook={() => navigate(`/book/${tenant.slug}`)}
        onWriteReview={() => setReviewFormOpen(true)}
      />
      {/* Floating WhatsApp button is rendered by the theme via config; see themes */}
      {reviewFormOpen && (
        <ReviewFormModal
          tenantId={tenant.id}
          slug={tenant.slug}
          services={services}
          onClose={() => setReviewFormOpen(false)}
          onSubmitted={(msg) => { setReviewFormOpen(false); setReviewSubmitted(true); setTimeout(() => setReviewSubmitted(false), 5000); }}
        />
      )}
      {reviewSubmitted && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] sm:w-auto px-4 sm:px-5 py-3 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center justify-center gap-2 text-center text-sm font-bold" role="status">
          <CheckCircle2 className="w-5 h-5" /> Thank you! Your review was submitted for moderation.
        </div>
      )}
    </>
  );
};

const PublicStateScreen: React.FC<{
  isDark: boolean;
  icon: React.ReactNode;
  title: string;
  message: string;
  showBooking?: boolean;
  slug?: string;
  onHome: () => void;
}> = ({ isDark, icon, title, message, showBooking, slug, onHome }) => (
  <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${
    isDark ? 'bg-[#101225] text-white' : 'bg-[#F8F7FC] text-[#101225]'
  }`}>
    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${isDark ? 'bg-[#1C1B31] text-[#B8A5FF]' : 'bg-white text-[#8B5CF6] shadow-lg'}`}>
      {icon}
    </div>
    <h2 className="mt-6 text-xl font-extrabold">{title}</h2>
    <p className="mt-2 text-sm opacity-60 max-w-sm">{message}</p>
    <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <button onClick={onHome} className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-[#343047] text-xs font-bold inline-flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" /> Return Home
      </button>
      {showBooking && slug && (
        <button
          onClick={() => window.location.assign(`/book/${slug}`)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25"
        >
          Book Appointment
        </button>
      )}
    </div>
  </div>
);
