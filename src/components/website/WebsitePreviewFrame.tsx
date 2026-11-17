import React from 'react';
import { Monitor, Smartphone, ExternalLink } from 'lucide-react';
import { SalonTenant } from '../../types';
import { WebsiteConfig, WebsiteReview } from '../../types/website';
import { WebsiteRenderer } from './WebsiteRenderer';

/**
 * Renders the salon website in a framed viewport with desktop/mobile
 * preview modes. Used by the workspace preview modal and the live customizer.
 */
export const WebsitePreviewFrame: React.FC<{
  config: WebsiteConfig;
  tenant: SalonTenant;
  reviews: WebsiteReview[];
  initialDevice?: 'desktop' | 'mobile';
  showDeviceToggle?: boolean;
  compact?: boolean;
}> = ({ config, tenant, reviews, initialDevice = 'desktop', showDeviceToggle = true, compact }) => {
  const [device, setDevice] = React.useState<'desktop' | 'mobile'>(initialDevice);

  const width = device === 'mobile' ? 390 : undefined;

  return (
    <div className="flex flex-col h-full min-h-0">
      {showDeviceToggle && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white/80 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setDevice('desktop')}
              aria-label="Desktop preview"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${device === 'desktop' ? 'bg-white shadow-sm text-[#7C3AED]' : 'text-slate-500'}`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </button>
            <button
              onClick={() => setDevice('mobile')}
              aria-label="Mobile preview"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${device === 'mobile' ? 'bg-white shadow-sm text-[#7C3AED]' : 'text-slate-500'}`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
          </div>
          <span className="text-[11px] text-slate-400 font-medium truncate px-2">
            /portfolio/{tenant.slug}
          </span>
          <a
            href={`/portfolio/${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#7C3AED] inline-flex items-center gap-1 hover:underline"
            onClick={e => { e.preventDefault(); window.open(`/portfolio/${tenant.slug}`, '_blank'); }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </a>
        </div>
      )}
      <div className={`flex-1 min-h-0 overflow-auto bg-slate-200/70 ${compact ? 'p-0' : 'p-4'} flex justify-center`}>
        <div
          className="bg-white shadow-2xl transition-all duration-300 w-full overflow-hidden"
          style={{ maxWidth: width, height: 'fit-content', minHeight: '100%' }}
        >
          <WebsiteRenderer
            config={config}
            tenant={tenant}
            reviews={reviews}
            onBook={() => window.open(`/book/${tenant.slug}`, '_blank')}
            onWriteReview={undefined}
          />
        </div>
      </div>
    </div>
  );
};
