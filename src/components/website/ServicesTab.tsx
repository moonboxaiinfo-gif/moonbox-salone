import React, { useMemo } from 'react';
import { Clock, Eye, EyeOff, Star, ArrowUp, ArrowDown, ExternalLink, Info } from 'lucide-react';
import { SalonTenant, Service } from '../../types';
import { useTenantCatalog } from '../../services/asyncDataService';
import { WebsiteConfig } from '../../types/website';

/**
 * Services editor for the public website.
 * Reuses the salon's existing service records as the single source of truth —
 * names, prices, durations and availability always reflect real salon data.
 */
export const ServicesTab: React.FC<{
  tenant: SalonTenant;
  draft: WebsiteConfig;
  updateDraft: (updater: (prev: WebsiteConfig) => WebsiteConfig, withHistory?: boolean) => void;
  onNavigate: (tab: any) => void;
}> = ({ tenant, draft, updateDraft, onNavigate }) => {
  const catalogResource = useTenantCatalog(tenant.id);
  const services = catalogResource.data?.services || [];
  const categories = catalogResource.data?.categories || [];

  const ordered = useMemo(() => {
    const { order, hiddenServiceIds } = draft.serviceDisplay;
    const visible = services.filter(s => s.isActive && !hiddenServiceIds.includes(s.id));
    const sorted = [...visible].sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      return (ia < 0 ? 9999 : ia) - (ib < 0 ? 9999 : ib);
    });
    return sorted;
  }, [services, draft.serviceDisplay]);

  const setHidden = (id: string, hidden: boolean) =>
    updateDraft(prev => ({
      ...prev,
      serviceDisplay: {
        ...prev.serviceDisplay,
        hiddenServiceIds: hidden
          ? [...prev.serviceDisplay.hiddenServiceIds, id]
          : prev.serviceDisplay.hiddenServiceIds.filter(x => x !== id),
      },
    }), false);

  const setFeatured = (id: string, featured: boolean) =>
    updateDraft(prev => ({
      ...prev,
      serviceDisplay: {
        ...prev.serviceDisplay,
        featuredServiceIds: featured
          ? [...prev.serviceDisplay.featuredServiceIds, id]
          : prev.serviceDisplay.featuredServiceIds.filter(x => x !== id),
      },
    }), false);

  const move = (id: string, dir: -1 | 1) =>
    updateDraft(prev => {
      const current = ordered.map(s => s.id);
      const i = current.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= current.length) return prev;
      [current[i], current[j]] = [current[j], current[i]];
      return { ...prev, serviceDisplay: { ...prev.serviceDisplay, order: current } };
    });

  const categoryName = (id: string) => categories.find(c => c.id === id)?.name || 'General';

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-[#1B0C2D] dark:text-[#F3C9AB]">Website Services</h3>
          <p className="text-xs text-slate-500 dark:text-[#AAA6BD] mt-1 max-w-xl">
            These are your real salon services — the same records used by appointments, POS and online booking. Prices, durations and availability here always stay in sync with your booking system.
          </p>
        </div>
        <button onClick={() => onNavigate('services')} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#35174F] text-xs font-bold text-slate-600 dark:text-[#AAA6BD] hover:bg-slate-50 dark:hover:bg-[#210D33]">
          Edit service records <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {!tenant.portfolio && null}
      <div className="p-4 rounded-2xl bg-[#F5F0FF] dark:bg-[#210D33] border border-[#E4D7FA] dark:border-[#35174F] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold text-[#5B21B6] dark:text-[#C4B5FD]">
          Hidden services stay active inside your salon operations and online booking — they are only removed from the public website display.
        </p>
      </div>

      {catalogResource.loading && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading salon services…</div>}
      {catalogResource.error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p>{catalogResource.error}</p><button onClick={catalogResource.retry} className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold">Retry</button></div>}

      {!catalogResource.loading && !catalogResource.error && services.filter(s => s.isActive).length === 0 ? (
        <div className="bg-white dark:bg-[#1A0A2A] p-10 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] text-center">
          <p className="text-sm font-bold text-[#1B0C2D] dark:text-[#F3C9AB]">No active services yet</p>
          <p className="text-xs text-slate-400 mt-1">Add your services first, then control how they appear here.</p>
          <button onClick={() => onNavigate('services')} className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold">Go to Services</button>
        </div>
      ) : !catalogResource.loading && !catalogResource.error ? (
        <div className="space-y-2.5">
          {ordered.map((s, i) => (
            <ServiceRow
              key={s.id}
              service={s}
              index={i}
              total={ordered.length}
              category={categoryName(s.categoryId)}
              featured={draft.serviceDisplay.featuredServiceIds.includes(s.id)}
              hidden={draft.serviceDisplay.hiddenServiceIds.includes(s.id)}
              onMove={move}
              onSetFeatured={setFeatured}
              onSetHidden={setHidden}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ServiceRow: React.FC<{
  service: Service;
  index: number;
  total: number;
  category: string;
  featured: boolean;
  hidden: boolean;
  onMove: (id: string, dir: -1 | 1) => void;
  onSetFeatured: (id: string, f: boolean) => void;
  onSetHidden: (id: string, h: boolean) => void;
}> = ({ service: s, index, total, category, featured, hidden, onMove, onSetFeatured, onSetHidden }) => (
  <div className={`bg-white dark:bg-[#1A0A2A] p-4 sm:p-5 rounded-2xl border transition-all ${hidden ? 'border-slate-100 dark:border-[#2D1345] opacity-55' : 'border-[#E8DFD6] dark:border-[#2D1344]'}`}>
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <button onClick={() => onMove(s.id, -1)} disabled={index === 0 || hidden} aria-label={`Move ${s.name} up`} className="p-1 text-slate-400 hover:text-[#7C3AED] disabled:opacity-25"><ArrowUp className="w-4 h-4" /></button>
        <button onClick={() => onMove(s.id, 1)} disabled={index === total - 1 || hidden} aria-label={`Move ${s.name} down`} className="p-1 text-slate-400 hover:text-[#7C3AED] disabled:opacity-25"><ArrowDown className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className={`font-bold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] ${hidden ? 'line-through' : ''}`}>{s.name}</h4>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#210D33] text-slate-500">{category}</span>
          {s.isOnlineBookingEnabled && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Bookable online</span>}
        </div>
        {s.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description}</p>}
        <div className="flex items-center gap-4 mt-2 text-xs font-bold">
          <span className="text-[#7C3AED]">LKR {s.priceLKR.toLocaleString()}</span>
          <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.durationMinutes} min</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={() => onSetFeatured(s.id, !featured)}
          role="switch" aria-checked={featured}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold border transition-colors ${featured ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 dark:border-[#35174F] text-slate-400 hover:bg-slate-50 dark:hover:bg-[#210D33]'}`}
        >
          <Star className="w-3.5 h-3.5" fill={featured ? 'currentColor' : 'none'} /> {featured ? 'Featured' : 'Feature'}
        </button>
        <button
          onClick={() => onSetHidden(s.id, !hidden)}
          role="switch" aria-checked={!hidden}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold border transition-colors ${hidden ? 'bg-slate-100 dark:bg-[#210D33] text-slate-400' : 'border-slate-200 dark:border-[#35174F] text-slate-600 dark:text-[#AAA6BD] hover:bg-slate-50 dark:hover:bg-[#210D33]'}`}
        >
          {hidden ? <><EyeOff className="w-3.5 h-3.5" /> Hidden</> : <><Eye className="w-3.5 h-3.5" /> Visible</>}
        </button>
      </div>
    </div>
  </div>
);
