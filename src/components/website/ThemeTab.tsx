import React, { useState } from 'react';
import { Check, Eye, Monitor, Smartphone, Sparkles } from 'lucide-react';
import { SalonTenant } from '../../types';
import { WebsiteConfig, WebsiteThemeId } from '../../types/website';
import { WEBSITE_THEMES } from '../../lib/websiteDefaults';
import { WebsiteRenderer } from './WebsiteRenderer';
import { useTenantCatalog } from '../../services/asyncDataService';

/**
 * Theme selection: three genuinely distinct templates with live rendered
 * desktop/mobile previews. Selecting a theme updates the draft only —
 * the published website keeps serving until the owner publishes.
 */
export const ThemeTab: React.FC<{
  draft: WebsiteConfig;
  tenant: SalonTenant;
  reviews: any[];
  onThemeSelected: (themeId: WebsiteThemeId) => void;
  onPreviewDraft: () => void;
}> = ({ draft, tenant, reviews, onThemeSelected, onPreviewDraft }) => {
  const [previewDevice, setPreviewDevice] = useState<Record<string, 'desktop' | 'mobile'>>({});

  const approvedReviews = reviews.length > 0 ? reviews : [];
  const catalogResource = useTenantCatalog(tenant.id);
  const services = (catalogResource.data?.services || []).filter(s => s.isActive);
  const categories = catalogResource.data?.categories || [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-[#1B0C2D] dark:text-[#F3C9AB]">Choose a Theme</h3>
          <p className="text-xs text-slate-500 dark:text-[#AAA6BD] mt-1">
            Switching themes preserves all of your content — logo, text, gallery, reviews and contact details. Changes stay as a draft until you publish.
          </p>
        </div>
        <button onClick={onPreviewDraft} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95">
          <Eye className="w-4 h-4" /> Preview Current Draft
        </button>
      </div>

      {catalogResource.loading && <div role="status" className="text-sm text-slate-500">Loading live catalog preview…</div>}
      {catalogResource.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p>{catalogResource.error}</p><button onClick={catalogResource.retry} className="mt-2 underline">Retry</button></div>}
      {!catalogResource.loading && !catalogResource.error && <div className="grid lg:grid-cols-3 gap-6">
        {WEBSITE_THEMES.map(theme => {
          const selected = draft.themeId === theme.id;
          const device = previewDevice[theme.id] || 'desktop';
          const previewConfig: WebsiteConfig = {
            ...draft,
            themeId: theme.id,
          };
          return (
            <div
              key={theme.id}
              className={`bg-white dark:bg-[#1A0A2A] rounded-3xl border-2 overflow-hidden transition-all ${selected ? 'border-[#8B5CF6] shadow-xl shadow-[#8B5CF6]/10' : 'border-[#E8DFD6] dark:border-[#2D1344] hover:border-[#c4b5fd]'}`}
            >
              {/* Live rendered preview */}
              <div className="relative bg-slate-100 dark:bg-[#210D33] overflow-hidden" style={{ height: 340 }}>
                <div
                  className="absolute top-4 left-1/2 -translate-x-1/2 origin-top pointer-events-none bg-white shadow-xl overflow-hidden transition-all duration-500"
                  style={{
                    width: device === 'desktop' ? 1024 : 375,
                    transform: `translateX(-50%) scale(${device === 'desktop' ? 0.33 : 0.72})`,
                    height: device === 'desktop' ? 900 : 812,
                  }}
                  aria-hidden
                >
                  <WebsiteRenderer
                    config={previewConfig}
                    tenant={tenant}
                    services={services}
                    categories={categories}
                    reviews={approvedReviews}
                    onBook={() => {}}
                  />
                </div>
                {/* device toggle */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 dark:bg-[#1A0A2A]/95 rounded-full p-1 shadow-lg border border-slate-200 dark:border-[#35174F]">
                  <button
                    onClick={() => setPreviewDevice(p => ({ ...p, [theme.id]: 'desktop' }))}
                    aria-label="Desktop preview"
                    className={`p-1.5 rounded-full ${device === 'desktop' ? 'bg-[#8B5CF6] text-white' : 'text-slate-400'}`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice(p => ({ ...p, [theme.id]: 'mobile' }))}
                    aria-label="Mobile preview"
                    className={`p-1.5 rounded-full ${device === 'mobile' ? 'bg-[#8B5CF6] text-white' : 'text-slate-400'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
                {selected && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#8B5CF6] text-white text-[10px] font-black uppercase tracking-wider shadow-lg">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>

              {/* Meta */}
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-[#1B0C2D] dark:text-[#F3C9AB]">Theme {String(WEBSITE_THEMES.indexOf(theme) + 1).padStart(2, '0')} — {theme.name}</h4>
                </div>
                <p className="text-[11px] font-semibold text-[#7C3AED] mt-1">{theme.target}</p>
                <p className="text-xs text-slate-500 dark:text-[#AAA6BD] mt-2 leading-relaxed">{theme.description}</p>
                <div className="flex items-center gap-1.5 mt-3">
                  {theme.palette.map(col => (
                    <span key={col} className="w-5 h-5 rounded-full border border-black/10" style={{ background: col }} />
                  ))}
                </div>
                <button
                  onClick={() => onThemeSelected(theme.id)}
                  disabled={selected}
                  className={`mt-5 w-full py-3 rounded-xl text-xs font-bold transition-all ${
                    selected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/25 hover:opacity-95'
                  }`}
                >
                  {selected ? (
                    <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> Current Theme</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Select Theme</span>
                  )}
                </button>
                <button
                  onClick={onPreviewDraft}
                  className="mt-2 w-full py-2.5 rounded-xl border border-slate-200 dark:border-[#35174F] text-xs font-bold text-slate-600 dark:text-[#AAA6BD] hover:bg-slate-50 dark:hover:bg-[#210D33]"
                >
                  Live Preview
                </button>
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
};
