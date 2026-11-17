import React from 'react';
import { Search, Globe, ShieldCheck, Copy, ExternalLink, Trash2, Check } from 'lucide-react';
import { SalonTenant } from '../../types';
import { WebsiteConfig, WebsiteRecord } from '../../types/website';
import { TextAreaField, TextField } from './CustomizeTab';

/**
 * SEO & Website Settings: meta tags, public URL, custom domain entry point
 * and unpublish (danger zone).
 */
export const SeoTab: React.FC<{
  tenant: SalonTenant;
  draft: WebsiteConfig;
  updateDraft: (updater: (prev: WebsiteConfig) => WebsiteConfig, withHistory?: boolean) => void;
  publicUrl: string;
  record: WebsiteRecord;
  onOpenDomain: () => void;
  onUnpublish: () => void;
}> = ({ tenant, draft, updateDraft, publicUrl, record, onOpenDomain, onUnpublish }) => {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] space-y-4">
          <h4 className="font-extrabold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#7C3AED]" /> Search Engine Optimization
          </h4>
          <TextField
            label="Page title (meta title)"
            value={draft.seo.title}
            onChange={v => updateDraft(prev => ({ ...prev, seo: { ...prev.seo, title: v } }), false)}
            placeholder={`${tenant.name} | Salon`}
          />
          <TextAreaField
            label="Meta description"
            value={draft.seo.description}
            onChange={v => updateDraft(prev => ({ ...prev, seo: { ...prev.seo, description: v } }), false)}
            rows={3}
          />
          {/* Google-style search preview */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#35174F] bg-slate-50 dark:bg-[#210D33]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Search preview</p>
            <p className="text-[13px] text-[#1A0CAB] dark:text-[#8AB4F8] truncate">{draft.seo.title || draft.seo.title}</p>
            <p className="text-[11px] text-emerald-700 dark:text-[#4ADE80] truncate">/portfolio/{tenant.slug}</p>
            <p className="text-[11px] text-slate-500 dark:text-[#AAA6BD] line-clamp-2">{draft.seo.description || 'Add a meta description so search engines show a summary of your salon.'}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] space-y-3">
            <h4 className="font-extrabold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#7C3AED]" /> Your Website Address
            </h4>
            <div className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 dark:bg-[#210D33] border border-slate-200 dark:border-[#35174F]">
              <span className="text-xs font-mono text-slate-600 dark:text-[#AAA6BD] truncate">{publicUrl}</span>
              <button
                onClick={async () => { try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}
                aria-label="Copy website URL"
                className="p-1.5 rounded-lg text-[#7C3AED] hover:bg-purple-50 dark:hover:bg-[#2A113C] shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <a href={`/portfolio/${tenant.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#7C3AED] hover:underline" onClick={e => { e.preventDefault(); window.open(`/portfolio/${tenant.slug}`, '_blank'); }}>
              <ExternalLink className="w-3.5 h-3.5" /> Open public website
            </a>
            {record.publishedAt && (
              <p className="text-[11px] text-slate-400">Published on {new Date(record.publishedAt).toLocaleString()}</p>
            )}
            <div className="pt-3 border-t border-slate-100 dark:border-[#2D1345]">
              <button onClick={onOpenDomain} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#35174F] text-xs font-bold text-slate-600 dark:text-[#AAA6BD] hover:bg-slate-50 dark:hover:bg-[#210D33]">
                <Globe className="w-4 h-4 text-[#7C3AED]" />
                Custom Domain {tenant.portfolio?.customDomain?.verified ? '✓' : ''}
              </button>
              <p className="text-[10px] text-slate-400 mt-2">
                Custom domains require DNS configuration and plan entitlement. Domain status is shown as configured — not automatically functional.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-red-50 dark:bg-[#2A0D12] border border-red-200 dark:border-[#4A1E28]">
            <h4 className="font-extrabold text-sm text-red-700 dark:text-[#F3C9AB] flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Danger Zone
            </h4>
            <p className="text-[11px] text-red-600/80 dark:text-[#AAA6BD] mt-2">
              {record.status === 'published'
                ? 'Unpublishing removes your website from public view. Your draft and all content are preserved.'
                : 'Your website is not currently published.'}
            </p>
            <button
              onClick={onUnpublish}
              disabled={record.status !== 'published'}
              className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-40"
            >
              Unpublish Website
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#F5F0FF] dark:bg-[#210D33] border border-[#E4D7FA] dark:border-[#35174F] flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold text-[#5B21B6] dark:text-[#C4B5FD]">
          All website data is stored per salon with tenant-isolated access. Only your salon can read or modify this website, and unpublished drafts are never visible to the public.
        </p>
      </div>
    </div>
  );
};
