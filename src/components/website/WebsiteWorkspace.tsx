import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Globe, ExternalLink, LayoutDashboard, Palette, SlidersHorizontal, Briefcase,
  Image as ImageIcon, Star, Phone, Search, Copy, Rocket, Eye, Undo2, Redo2,
  CheckCircle2, AlertCircle, Loader2, Globe2, Lock, Sparkles, ArrowRight, Monitor, X,
} from 'lucide-react';
import { SalonTenant } from '../../types';
import { EntitlementService } from '../../services/entitlementService';
import { WebsiteService, MutationContext } from '../../services/websiteService';
import { PublicWebsiteApi } from '../../services/publicWebsiteApi';
import { useTenantCatalog, useTenantStaff } from '../../services/asyncDataService';
import { WebsiteConfig, WebsiteRecord, SaveState, WebsiteReview } from '../../types/website';
import { buildDefaultWebsiteConfig, normalizeWebsiteConfig } from '../../lib/websiteDefaults';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { CustomDomainModal } from '../portfolio/CustomDomainModal';
import { WebsitePreviewFrame } from './WebsitePreviewFrame';
import { ThemeTab } from './ThemeTab';
import { CustomizeTab } from './CustomizeTab';
import { ServicesTab } from './ServicesTab';
import { GalleryTab } from './GalleryTab';
import { ReviewsTab } from './ReviewsTab';
import { ContactTab } from './ContactTab';
import { SeoTab } from './SeoTab';

type WorkspaceTab = 'overview' | 'theme' | 'customize' | 'services' | 'gallery' | 'reviews' | 'contact' | 'seo';

const TABS: { id: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'theme', label: 'Choose a Theme', icon: Palette },
  { id: 'customize', label: 'Customize Website', icon: SlidersHorizontal },
  { id: 'services', label: 'Services', icon: Briefcase },
  { id: 'gallery', label: 'Gallery / Our Work', icon: ImageIcon },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'contact', label: 'Contact & Social', icon: Phone },
  { id: 'seo', label: 'SEO & Settings', icon: Search },
];

interface Props {
  tenant: SalonTenant;
  onOpenPublicPortal: () => void;
  onTenantUpdated: () => void;
}

export const WebsiteWorkspace: React.FC<Props> = ({ tenant, onOpenPublicPortal, onTenantUpdated }) => {
  const { currentUser } = useAuth();
  const remoteWebsite = isSupabaseConfigured && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenant.id);
  const catalogResource = useTenantCatalog(tenant.id);
  const staffResource = useTenantStaff(tenant.id);
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [record, setRecord] = useState<WebsiteRecord | null>(null);
  const [draft, setDraft] = useState<WebsiteConfig | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'publish' | 'unpublish' | null>(null);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{ past: WebsiteConfig[]; future: WebsiteConfig[] }>({ past: [], future: [] });
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const skipAutosave = useRef(true);

  const showToast = useCallback((kind: 'success' | 'error', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Load record
  useEffect(() => {
    const rec = WebsiteService.getRecord(tenant);
    setRecord(rec);
    setDraft(rec.draft);
    skipAutosave.current = true;
    setHistory({ past: [], future: [] });
  }, [tenant.id]);

  // In hosted mode, the Supabase record is authoritative across browsers/devices.
  useEffect(() => {
    if (!remoteWebsite) return;
    let active = true;
    PublicWebsiteApi.getDraft(tenant.slug).then(remote => {
      if (!active || !remote) return;
      const draftConfig = normalizeWebsiteConfig(remote.draftConfig, tenant);
      const publishedConfig = remote.publishedConfig ? normalizeWebsiteConfig(remote.publishedConfig, tenant) : null;
      skipAutosave.current = true;
      setDraft(draftConfig);
      setRecord({
        tenantId: tenant.id,
        status: remote.status,
        draft: draftConfig,
        published: publishedConfig,
        publishedAt: remote.publishedAt,
        lastSavedAt: remote.lastSavedAt,
      });
      setSaveState('saved');
    }).catch(error => {
      if (active) showToast('error', error instanceof Error ? error.message : 'Could not load the saved website draft.');
    });
    return () => { active = false; };
  }, [remoteWebsite, tenant.id, tenant.slug, showToast]);

  const ctx: MutationContext = useMemo(() => ({
    tenantId: tenant.id,
    actorEmail: currentUser?.email || 'system',
    actorRole: currentUser?.role || 'owner',
  }), [tenant.id, currentUser]);

  // Autosave draft (debounced)
  useEffect(() => {
    if (!draft) return;
    if (skipAutosave.current) { skipAutosave.current = false; return; }
    setSaveState('unsaved');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      setSaveState('saving');
      const savedDraft = { ...draft, updatedAt: new Date().toISOString() };
      const res = WebsiteService.saveDraft(ctx, savedDraft);
      if (res.success) {
        setRecord(r => r ? { ...r, draft: savedDraft, lastSavedAt: new Date().toISOString() } : r);
        if (remoteWebsite) {
          const save = remoteSaveQueue.current.then(async () => {
            const result = await PublicWebsiteApi.saveDraft(tenant.slug, savedDraft);
            setRecord(r => r ? { ...r, lastSavedAt: result.lastSavedAt } : r);
          });
          remoteSaveQueue.current = save.then(() => undefined, () => undefined);
          void save.then(() => setSaveState('saved')).catch(error => {
            setSaveState('error');
            showToast('error', error instanceof Error ? error.message : 'Could not save the website draft to the server.');
          });
        } else {
          setSaveState('saved');
        }
      } else {
        setSaveState('error');
      }
    }, 1200);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [draft, ctx, remoteWebsite, tenant.slug, showToast]);

  // Warn about unsaved edits
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveState === 'unsaved' || saveState === 'saving') { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveState]);

  /** Apply a draft update with undo history. */
  const updateDraft = useCallback((updater: (prev: WebsiteConfig) => WebsiteConfig, withHistory = true) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      if (withHistory) {
        setHistory(h => ({ past: [...h.past.slice(-24), prev], future: [] }));
      }
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      setDraft(cur => { if (cur) h.future.push(cur); return prev; });
      return { past: h.past.slice(0, -1), future: h.future };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h;
      const next = h.future[h.future.length - 1];
      setDraft(cur => { if (cur) h.past.push(cur); return next; });
      return { past: h.past, future: h.future.slice(0, -1) };
    });
  }, []);

  const handlePublish = async () => {
    if (!draft) return;
    if (catalogResource.loading || staffResource.loading) { showToast('error', 'Wait for the live salon catalog and staff list to finish loading before publishing.'); return; }
    if (catalogResource.error || staffResource.error || !catalogResource.data || !staffResource.data) { showToast('error', 'Could not load live service, category, or staff data. Retry the catalog before publishing.'); return; }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (remoteWebsite) {
      try {
        await remoteSaveQueue.current;
        await PublicWebsiteApi.saveDraft(tenant.slug, draft);
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Could not save the latest server draft before publishing.');
        return;
      }
    }
    // Flush pending autosave before publishing
    const flushed = WebsiteService.saveDraft(ctx, draft);
    if (!flushed.success) { showToast('error', flushed.error || 'Could not save draft.'); return; }
    const res = WebsiteService.publish(ctx);
    if (res.success) {
      try {
        await PublicWebsiteApi.publish({
          slug: tenant.slug,
          tenant,
          config: WebsiteService.getRecord(tenant).published || draft,
          services: catalogResource.data.services,
          categories: catalogResource.data.categories,
          staff: staffResource.data.filter(staff => staff.status === 'active'),
        });
      } catch (error) {
        if (!import.meta.env.DEV) {
          WebsiteService.unpublish(ctx);
          showToast('error', error instanceof Error ? error.message : 'Could not sync the published website.');
          setConfirmAction(null);
          return;
        }
      }
      setRecord(r => r ? WebsiteService.getRecord(tenant) : r);
      setSaveState('saved');
      showToast('success', import.meta.env.DEV ? 'Your website is live in this preview.' : 'Your website is now live.');
      onTenantUpdated();
    } else {
      showToast('error', res.error || 'Publishing failed.');
    }
    setConfirmAction(null);
  };

  const handleUnpublish = async () => {
    try {
      await PublicWebsiteApi.unpublish(tenant.slug);
    } catch (error) {
      if (!import.meta.env.DEV) {
        showToast('error', error instanceof Error ? error.message : 'Could not unpublish the website.');
        setConfirmAction(null);
        return;
      }
    }
    const res = WebsiteService.unpublish(ctx);
    if (res.success) {
      setRecord(WebsiteService.getRecord(tenant));
      showToast('success', 'Website unpublished. Your draft is preserved.');
      onTenantUpdated();
    } else {
      showToast('error', res.error || 'Unpublish failed.');
    }
    setConfirmAction(null);
  };

  const publicUrl = `${window.location.origin}/portfolio/${tenant.slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Could not copy link. Your browser blocked clipboard access.');
    }
  };

  if (!record || !draft) return null;

  const statusInfo = {
    draft: { label: 'Draft', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    published: { label: 'Published', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    unpublished: { label: 'Unpublished', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  }[record.status];

  return (
    <div className="space-y-6">
      {/* ===== Header bar ===== */}
      <div className="bg-white dark:bg-[#1A0A2A] p-5 sm:p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white shadow-lg shadow-[#8B5CF6]/25">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-extrabold text-[#1B0C2D] dark:text-[#F3C9AB]">Website &amp; Portfolio</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.color}`}>{statusInfo.label}</span>
                <SaveIndicator state={saveState} />
              </div>
              <p className="text-xs text-slate-500 dark:text-[#AAA6BD] mt-1">
                Your public salon website at{' '}
                <button onClick={copyLink} className="font-semibold text-[#7C3AED] hover:underline inline-flex items-center gap-1" title="Copy link">
                  {publicUrl.replace(/^https?:\/\//, '')}
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                </button>
              </p>
              {record.lastSavedAt && (
                <p className="text-[11px] text-slate-400 mt-0.5">Last saved {new Date(record.lastSavedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#35174F] bg-white dark:bg-[#210D33] text-xs font-bold text-slate-700 dark:text-[#F3C9AB] hover:bg-slate-50 dark:hover:bg-[#2A113C] transition-colors">
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button onClick={() => { setDraft({ ...draft }); setTab('customize'); }} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#35174F] bg-white dark:bg-[#210D33] text-xs font-bold text-slate-700 dark:text-[#F3C9AB] hover:bg-slate-50 dark:hover:bg-[#2A113C] transition-colors">
              <SlidersHorizontal className="w-4 h-4" /> Customize
            </button>
            {record.status === 'published' ? (
              <>
                <button onClick={() => setConfirmAction('publish')} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95 transition-opacity">
                  <Rocket className="w-4 h-4" /> Update Website
                </button>
                <button onClick={() => setConfirmAction('unpublish')} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors">
                  Unpublish
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmAction('publish')} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95 transition-opacity">
                <Rocket className="w-4 h-4" /> Publish Website
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Tab navigation ===== */}
      <div className="bg-white dark:bg-[#1A0A2A] rounded-2xl border border-[#E8DFD6] dark:border-[#2D1344] p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/20'
                  : 'text-slate-500 dark:text-[#AAA6BD] hover:bg-slate-50 dark:hover:bg-[#210D33]'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ===== Tab content ===== */}
      {tab === 'overview' && (
        <OverviewTab
          tenant={tenant}
          record={record}
          reviews={WebsiteService.getReviews(tenant.id)}
          onNavigate={setTab}
          onPreview={() => setPreviewOpen(true)}
          onOpenPublicPortal={onOpenPublicPortal}
        />
      )}
      {tab === 'theme' && (
        <ThemeTab draft={draft} tenant={tenant} reviews={[]} onThemeSelected={(themeId) => {
          updateDraft(prev => ({
            ...prev,
            themeId,
            typography: { ...prev.typography },
          }));
          showToast('success', 'Theme applied to your draft. Your content is preserved — preview and publish when ready.');
        }} onPreviewDraft={() => setPreviewOpen(true)} />
      )}
      {tab === 'customize' && (
        <CustomizeTab
          draft={draft}
          tenant={tenant}
          onTenantUpdated={onTenantUpdated}
          updateDraft={updateDraft}
          undo={undo}
          redo={redo}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          reviews={WebsiteService.getApprovedReviews(tenant.id)}
        />
      )}
      {tab === 'services' && <ServicesTab tenant={tenant} draft={draft} updateDraft={updateDraft} onNavigate={setTab} />}
      {tab === 'gallery' && <GalleryTab tenant={tenant} draft={draft} updateDraft={updateDraft} showToast={showToast} />}
      {tab === 'reviews' && <ReviewsTab tenant={tenant} onToast={showToast} ctx={ctx} />}
      {tab === 'contact' && <ContactTab tenant={tenant} draft={draft} updateDraft={updateDraft} onTenantUpdated={onTenantUpdated} onToast={showToast} />}
      {tab === 'seo' && (
        <SeoTab
          tenant={tenant}
          draft={draft}
          updateDraft={updateDraft}
          publicUrl={publicUrl}
          record={record}
          onOpenDomain={() => setDomainModalOpen(true)}
          onUnpublish={() => setConfirmAction('unpublish')}
        />
      )}

      {/* ===== Preview modal ===== */}
      {previewOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 p-0 sm:p-6 flex" role="dialog" aria-modal="true" aria-label="Website preview">
          <div className="relative bg-white dark:bg-[#1A0A2A] w-full rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[#2D1345] shrink-0">
              <p className="text-sm font-bold text-[#1B0C2D] dark:text-[#F3C9AB] flex items-center gap-2">
                <Monitor className="w-4 h-4" /> Website Preview <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">DRAFT</span>
              </p>
              <button onClick={() => setPreviewOpen(false)} aria-label="Close preview" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#210D33]">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <WebsitePreviewFrame config={draft} tenant={tenant} reviews={WebsiteService.getApprovedReviews(tenant.id)} />
          </div>
        </div>
      )}

      {/* ===== Confirm dialogs ===== */}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction === 'publish' ? (record.status === 'published' ? 'Update live website?' : 'Publish website?') : 'Unpublish website?'}
          body={
            confirmAction === 'publish'
              ? 'Your current draft will replace the live version for all visitors. You can unpublish at any time.'
              : 'Your website will be removed from public view. Your draft and content are preserved.'
          }
          confirmLabel={confirmAction === 'publish' ? (record.status === 'published' ? 'Update Website' : 'Publish') : 'Unpublish'}
          danger={confirmAction === 'unpublish'}
          onConfirm={() => (confirmAction === 'publish' ? handlePublish() : handleUnpublish())}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {domainModalOpen && (
        <CustomDomainModal
          isOpen={domainModalOpen}
          tenant={tenant}
          onClose={() => setDomainModalOpen(false)}
          onSaved={onTenantUpdated}
        />
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-bold ${toast.kind === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`} role="status">
          {toast.kind === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export const SaveIndicator: React.FC<{ state: SaveState }> = ({ state }) => {
  if (state === 'idle') return null;
  const map: Record<SaveState, { label: string; cls: string; icon: React.ElementType | null }> = {
    idle: { label: '', cls: '', icon: null },
    saving: { label: 'Saving…', cls: 'text-slate-500', icon: Loader2 },
    saved: { label: 'All changes saved', cls: 'text-emerald-600', icon: CheckCircle2 },
    error: { label: 'Save failed — retrying on next edit', cls: 'text-red-600', icon: AlertCircle },
    unsaved: { label: 'Unsaved changes', cls: 'text-amber-600', icon: null },
  };
  const info = map[state];
  if (!info.label) return null;
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${info.cls}`} aria-live="polite">
      {Icon && <Icon className={`w-3.5 h-3.5 ${state === 'saving' ? 'animate-spin' : ''}`} />}
      {info.label}
    </span>
  );
};

export const ConfirmDialog: React.FC<{
  title: string; body: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}> = ({ title, body, confirmLabel, danger, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
    <div className="relative bg-white dark:bg-[#1A0A2A] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
      <h3 className="font-extrabold text-[#1B0C2D] dark:text-[#F3C9AB]">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-[#AAA6BD] mt-2 leading-relaxed">{body}</p>
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#35174F] text-xs font-bold text-slate-600 dark:text-[#AAA6BD] hover:bg-slate-50 dark:hover:bg-[#210D33]">Cancel</button>
        <button
          onClick={onConfirm}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:opacity-95'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

/** Overview tab: status, checklist and quick stats. */
const OverviewTab: React.FC<{
  tenant: SalonTenant;
  record: WebsiteRecord;
  reviews: WebsiteReview[];
  onNavigate: (t: WorkspaceTab) => void;
  onPreview: () => void;
  onOpenPublicPortal: () => void;
}> = ({ tenant, record, reviews, onNavigate, onPreview, onOpenPublicPortal }) => {
  const cfg = record.draft;
  const services = [] as any[]; // filled below via lazy read
  const approved = reviews.filter(r => r.status === 'approved').length;
  const pending = reviews.filter(r => r.status === 'pending').length;

  const checklist = [
    { done: true, label: 'Workspace created', tab: 'overview' as WorkspaceTab },
    { done: Boolean(cfg.content.heroHeadline), label: 'Hero headline set', tab: 'customize' as WorkspaceTab },
    { done: Boolean(cfg.content.heroImageUrl), label: 'Hero banner image uploaded', tab: 'customize' as WorkspaceTab },
    { done: cfg.gallery.length > 0, label: 'Gallery has at least one image', tab: 'gallery' as WorkspaceTab },
    { done: approved > 0, label: 'At least one approved review', tab: 'reviews' as WorkspaceTab },
    { done: Boolean(WebsiteService.normalizeWhatsAppNumber(cfg.contact.whatsappNumber)), label: 'WhatsApp number configured', tab: 'contact' as WorkspaceTab },
    { done: record.status === 'published', label: 'Website published', tab: 'overview' as WorkspaceTab },
  ];
  void services;

  const stats = [
    { label: 'Theme', value: record.draft.themeId.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), tab: 'theme' as WorkspaceTab },
    { label: 'Gallery images', value: String(cfg.gallery.length), tab: 'gallery' as WorkspaceTab },
    { label: 'Approved reviews', value: String(approved), tab: 'reviews' as WorkspaceTab },
    { label: 'Pending moderation', value: String(pending), tab: 'reviews' as WorkspaceTab },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => (
          <button key={s.label} onClick={() => onNavigate(s.tab)} className="text-left bg-white dark:bg-[#1A0A2A] p-5 rounded-2xl border border-[#E8DFD6] dark:border-[#2D1344] hover:shadow-md transition-shadow">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className="text-lg font-extrabold text-[#1B0C2D] dark:text-[#F3C9AB] mt-1.5">{s.value}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344]">
          <h3 className="font-extrabold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" /> Launch Checklist
          </h3>
          <div className="mt-4 space-y-2.5">
            {checklist.map(item => (
              <button key={item.label} onClick={() => onNavigate(item.tab)} className="w-full flex items-center gap-3 text-left group">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500' : 'border-2 border-slate-300'}`}>
                  {item.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </span>
                <span className={`text-xs font-semibold ${item.done ? 'text-slate-500 line-through' : 'text-[#1B0C2D] dark:text-[#F3C9AB] group-hover:text-[#7C3AED]'}`}>{item.label}</span>
                {!item.done && <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-[#7C3AED]" />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344]">
            <h3 className="font-extrabold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-[#7C3AED]" /> Quick Actions
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => onNavigate('theme')} className="p-4 rounded-2xl bg-gradient-to-br from-[#F5F0FF] to-[#EDE4FF] dark:from-[#210D33] dark:to-[#2A113C] text-left hover:shadow-md transition-shadow">
                <Palette className="w-5 h-5 text-[#7C3AED]" />
                <p className="text-xs font-bold mt-2 text-[#1B0C2D] dark:text-[#F3C9AB]">Change Theme</p>
              </button>
              <button onClick={() => onNavigate('customize')} className="p-4 rounded-2xl bg-gradient-to-br from-[#F5F0FF] to-[#EDE4FF] dark:from-[#210D33] dark:to-[#2A113C] text-left hover:shadow-md transition-shadow">
                <SlidersHorizontal className="w-5 h-5 text-[#7C3AED]" />
                <p className="text-xs font-bold mt-2 text-[#1B0C2D] dark:text-[#F3C9AB]">Customize Content</p>
              </button>
              <button onClick={onPreview} className="p-4 rounded-2xl bg-gradient-to-br from-[#F5F0FF] to-[#EDE4FF] dark:from-[#210D33] dark:to-[#2A113C] text-left hover:shadow-md transition-shadow">
                <Eye className="w-5 h-5 text-[#7C3AED]" />
                <p className="text-xs font-bold mt-2 text-[#1B0C2D] dark:text-[#F3C9AB]">Preview Draft</p>
              </button>
              <button onClick={onOpenPublicPortal} className="p-4 rounded-2xl bg-gradient-to-br from-[#F5F0FF] to-[#EDE4FF] dark:from-[#210D33] dark:to-[#2A113C] text-left hover:shadow-md transition-shadow">
                <ExternalLink className="w-5 h-5 text-[#7C3AED]" />
                <p className="text-xs font-bold mt-2 text-[#1B0C2D] dark:text-[#F3C9AB]">Open Booking Page</p>
              </button>
            </div>
          </div>

          {record.status !== 'published' && (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-[#2A1E0D] border border-amber-200 dark:border-[#4A3A1E] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800 dark:text-[#F3C9AB]">Your website is not live yet</p>
                <p className="text-[11px] text-amber-700/80 dark:text-[#AAA6BD] mt-1">Customize your content, preview it, then press Publish Website when you are ready.</p>
                <button onClick={() => onNavigate('customize')} className="mt-3 text-[11px] font-bold text-amber-800 dark:text-[#F3C9AB] underline underline-offset-4">
                  Start customizing →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Entitlement gate shown when the salon's plan lacks the portfolio feature. */
export const WebsiteUpgradeGate: React.FC<{ tenant: SalonTenant; onNavigateSubscription: () => void }> = ({ tenant, onNavigateSubscription }) => {
  const check = EntitlementService.canAccessFeature(tenant, 'portfolio');
  if (check.allowed) return null;
  return (
    <div className="max-w-lg mx-auto mt-10 bg-white dark:bg-[#1A0A2A] p-10 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] text-center">
      <div className="w-16 h-16 mx-auto rounded-3xl flex items-center justify-center bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white shadow-lg shadow-[#8B5CF6]/30">
        <Lock className="w-8 h-8" />
      </div>
      <h2 className="mt-6 text-xl font-extrabold text-[#1B0C2D] dark:text-[#F3C9AB]">Website &amp; Portfolio is a premium feature</h2>
      <p className="text-xs text-slate-500 dark:text-[#AAA6BD] mt-3 leading-relaxed">
        {check.reason || 'Upgrade your subscription to unlock your salon’s own public website, portfolio gallery, reviews and online booking integration.'}
      </p>
      <button
        onClick={onNavigateSubscription}
        className="mt-7 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95"
      >
        View Subscription Plans →
      </button>
    </div>
  );
};

export { buildDefaultWebsiteConfig };
