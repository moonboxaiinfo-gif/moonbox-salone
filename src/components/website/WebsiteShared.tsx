import React, { useState } from 'react';
import { Star, MapPin, Clock, Phone, Mail, Instagram, Facebook, Youtube, MessageCircle, Music2, X, CalendarCheck, Send, ShieldCheck, ChevronDown } from 'lucide-react';
import { SalonTenant, Service, ServiceCategory } from '../../types';
import { WebsiteConfig, WebsiteGalleryItem, WebsiteReview } from '../../types/website';
import { getFontOption } from '../../lib/websiteDefaults';
import { WebsiteService } from '../../services/websiteService';
import { PublicWebsiteApi } from '../../services/publicWebsiteApi';

export interface WebsiteRendererProps {
  config: WebsiteConfig;
  tenant: SalonTenant;
  services?: Service[];
  categories?: ServiceCategory[];
  reviews: WebsiteReview[];
  onBook: () => void;
  onWriteReview?: () => void;
}

/** Derived design tokens applied as CSS variables on the website root. */
export function useTokens(config: WebsiteConfig): React.CSSProperties {
  const font = getFontOption(config.typography.fontId);
  const radius = { sharp: '2px', soft: '14px', round: '28px' }[config.typography.borderRadius];
  const imgRadius = { square: '0px', rounded: '18px', full: '999px' }[config.typography.imageCorner];
  const pad = { compact: '44px', default: '72px', spacious: '104px' }[config.typography.sectionSpacing];
  const base = { compact: '15px', default: '16.5px', large: '18.5px' }[config.typography.sizePreset];
  return {
    ['--wb-font' as any]: font.stack,
    ['--wb-bg' as any]: config.colors.background,
    ['--wb-text' as any]: config.colors.text,
    ['--wb-primary' as any]: config.colors.primary,
    ['--wb-secondary' as any]: config.colors.secondary,
    ['--wb-accent' as any]: config.colors.accent,
    ['--wb-button' as any]: config.colors.button,
    ['--wb-button-text' as any]: config.colors.buttonText,
    ['--wb-radius' as any]: radius,
    ['--wb-img-radius' as any]: imgRadius,
    ['--wb-pad' as any]: pad,
    ['--wb-base' as any]: base,
    background: config.colors.background,
    color: config.colors.text,
    fontFamily: font.stack,
    fontSize: base,
  } as React.CSSProperties;
}

export function useButtonStyle(config: WebsiteConfig): React.CSSProperties {
  const r = { sharp: '2px', soft: '12px', round: '999px' }[config.typography.borderRadius];
  if (config.typography.buttonStyle === 'outline') {
    return {
      borderRadius: r,
      border: `2px solid ${config.colors.button}`,
      color: config.colors.button,
      background: 'transparent',
    };
  }
  return {
    borderRadius: r,
    background: config.colors.button,
    color: config.colors.buttonText,
    border: '2px solid transparent',
  };
}

/** Ordered, enabled section list — contact & hero always render. */
export function orderedSections(config: WebsiteConfig) {
  return config.sections.filter(s => s.enabled || !s.canDisable);
}

export function formatPrice(n: number) {
  return `LKR ${n.toLocaleString()}`;
}

export function Stars({ rating, color }: { rating: number; color?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className="w-4 h-4"
          style={{ color: color || '#D9A441' }}
          fill={i <= rating ? 'currentColor' : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

/** Floating WhatsApp button — rendered only when a valid number exists. */
export const WhatsAppFloat: React.FC<{ config: WebsiteConfig }> = ({ config }) => {
  const { whatsappEnabled, whatsappNumber, whatsappGreeting } = config.contact;
  if (!whatsappEnabled) return null;
  const link = WebsiteService.buildWhatsAppLink(whatsappNumber, whatsappGreeting);
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-105"
      style={{ background: '#25D366', color: '#fff' }}
    >
      <MessageCircle className="w-7 h-7" fill="currentColor" strokeWidth={1} />
    </a>
  );
};

export const SocialIcons: React.FC<{ config: WebsiteConfig; size?: number }> = ({ config, size = 18 }) => {
  const { instagram, facebook, tiktok, youtube } = config.contact.social;
  const items = [
    { url: instagram, Icon: Instagram, label: 'Instagram' },
    { url: facebook, Icon: Facebook, label: 'Facebook' },
    { url: tiktok, Icon: Music2, label: 'TikTok' },
    { url: youtube, Icon: Youtube, label: 'YouTube' },
  ].filter(i => i.url);
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-3">
      {items.map(({ url, Icon, label }) => (
        <a
          key={label}
          href={url.startsWith('http') ? url : `https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="opacity-80 hover:opacity-100 transition-opacity"
          style={{ color: 'inherit' }}
        >
          <Icon style={{ width: size, height: size }} />
        </a>
      ))}
    </div>
  );
};

export const OpeningHours: React.FC<{ tenant: SalonTenant }> = ({ tenant }) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const todayIdx = (new Date().getDay() + 6) % 7;
  return (
    <div className="space-y-1.5 w-full max-w-sm mx-auto">
      {days.map((day, i) => {
        const h = tenant.openingHours?.[day];
        const isOpen = h?.isOpen;
        return (
          <div
            key={day}
            className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg"
            style={{ background: i === todayIdx ? 'rgba(0,0,0,0.05)' : 'transparent' }}
          >
            <span className="capitalize font-medium flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 opacity-60" />
              {day}
            </span>
            <span style={{ color: isOpen ? 'inherit' : 'var(--wb-secondary)' }}>
              {isOpen ? `${h.open} – ${h.close}` : 'Closed'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Public review submission dialog with validation + salon-verified badge. */
export const ReviewFormModal: React.FC<{
  tenantId: string;
  slug?: string;
  services: Service[];
  onClose: () => void;
  onSubmitted: (msg: string) => void;
}> = ({ tenantId, slug, services, onClose, onSubmitted }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [serviceRef, setServiceRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = React.useRef(false);

  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    let res: { success: boolean; error?: string };
    const review = {
      customerName: name,
      customerPhone: phone || undefined,
      rating,
      text,
      serviceRef: serviceRef || undefined,
    };
    try {
      if (!slug) throw new Error('Missing salon slug.');
      await PublicWebsiteApi.submitReview(slug, review);
      res = { success: true };
    } catch (error) {
      if (!import.meta.env.DEV) {
        res = { success: false, error: error instanceof Error ? error.message : 'Could not submit the review.' };
      } else {
        res = WebsiteService.submitPublicReview({ tenantId, ...review });
      }
    }
    submittingRef.current = false;
    setSubmitting(false);
    if (!res.success) {
      setError(res.error || 'Something went wrong. Please try again.');
      return;
    }
    onSubmitted('Thank you! Your review was submitted for moderation.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Write a review">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--wb-bg)', color: 'var(--wb-text)' }}>
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 opacity-60 hover:opacity-100">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold mb-1">Write a Review</h3>
        <p className="text-sm opacity-70 mb-4">Share your experience. Reviews appear after the salon approves them.</p>

        <div className="space-y-3 text-sm">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name *"
            maxLength={60}
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-transparent focus:outline-none focus:border-current"
          />
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Phone (optional — verifies your booking)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-transparent focus:outline-none focus:border-current"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">Rating:</span>
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} type="button" aria-label={`${i} star${i > 1 ? 's' : ''}`} onClick={() => setRating(i)}>
                <Star
                  className={`w-6 h-6 transition-transform ${i <= rating ? 'scale-100' : 'scale-90 opacity-40'}`}
                  style={{ color: '#D9A441' }}
                  fill={i <= rating ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
          <select
            value={serviceRef}
            onChange={e => setServiceRef(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-transparent focus:outline-none"
          >
            <option value="">Service (optional)</option>
            {services.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            maxLength={800}
            placeholder="Tell us about your visit (10–800 characters) *"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-transparent focus:outline-none focus:border-current resize-none"
          />
          {error && (
            <p className="text-red-600 text-xs font-semibold" role="alert">{error}</p>
          )}
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'var(--wb-button)', color: 'var(--wb-button-text)' }}
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
          <p className="text-[11px] opacity-50 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Reviews are moderated by the salon. Spam and abuse are filtered.
          </p>
        </div>
      </div>
    </div>
  );
};

/** Booking CTA — links to the salon's existing public booking flow. */
export const BookCta: React.FC<{
  label: string;
  onBook: () => void;
  style?: React.CSSProperties;
  className?: string;
  icon?: boolean;
}> = ({ label, onBook, style, className, icon }) => (
  <button
    onClick={onBook}
    className={`inline-flex items-center justify-center gap-2 font-bold transition-all hover:opacity-90 ${className || ''}`}
    style={style}
  >
    {icon && <CalendarCheck className="w-4 h-4" />}
    {label}
  </button>
);

export const EmptyHint: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-sm opacity-60 text-center py-6 italic">{text}</p>
);
