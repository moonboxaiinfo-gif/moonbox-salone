import { SalonTenant } from '../types';
import {
  WebsiteConfig,
  WebsiteColors,
  WebsiteSectionId,
  WebsiteSectionSettings,
  WebsiteThemeId,
  WebsiteTypography,
} from '../types/website';

export const WEBSITE_SECTIONS: { id: WebsiteSectionId; label: string; description: string; canDisable: boolean }[] = [
  { id: 'hero', label: 'Hero Banner', description: 'First impression with headline and booking CTA', canDisable: false },
  { id: 'services', label: 'Services', description: 'Your salon service menu with prices', canDisable: true },
  { id: 'about', label: 'About', description: 'Your salon story', canDisable: true },
  { id: 'gallery', label: 'Gallery / Our Work', description: 'Signature work showcase', canDisable: true },
  { id: 'team', label: 'Team', description: 'Meet your experts', canDisable: true },
  { id: 'reviews', label: 'Reviews', description: 'Approved client testimonials', canDisable: true },
  { id: 'hours', label: 'Opening Hours & Location', description: 'When and where to find you', canDisable: true },
  { id: 'contact', label: 'Contact', description: 'Contact details and messaging CTAs', canDisable: false },
];

export interface ThemeMeta {
  id: WebsiteThemeId;
  name: string;
  target: string;
  description: string;
  palette: string[]; // swatch colors for the theme card
  defaultFontId: string;
  defaultColors: WebsiteColors;
  heroLayout: WebsiteTypography['heroLayout'];
}

export const WEBSITE_THEMES: ThemeMeta[] = [
  {
    id: 'luxe_elegance',
    name: 'Luxe Elegance',
    target: 'Premium salons, bridal studios & luxury beauty businesses',
    description: 'Editorial serif typography, ivory and champagne-gold tones, large hero banner and sophisticated gallery layouts.',
    palette: ['#FBF7F0', '#C9A24B', '#1C0D2E', '#DE9E74'],
    defaultFontId: 'playfair',
    defaultColors: {
      primary: '#1C0D2E',
      secondary: '#C9A24B',
      accent: '#DE9E74',
      background: '#FBF7F0',
      text: '#2A2138',
      button: '#1C0D2E',
      buttonText: '#F6EFE3',
    },
    heroLayout: 'overlay',
  },
  {
    id: 'modern_minimal',
    name: 'Modern Minimal',
    target: 'Modern hair salons, unisex salons & professional studios',
    description: 'Clean white-and-grey grid, minimalist type, large photography and a prominent online booking CTA.',
    palette: ['#FFFFFF', '#111111', '#6B7280', '#F3F4F6'],
    defaultFontId: 'inter',
    defaultColors: {
      primary: '#111111',
      secondary: '#4B5563',
      accent: '#111111',
      background: '#FFFFFF',
      text: '#111111',
      button: '#111111',
      buttonText: '#FFFFFF',
    },
    heroLayout: 'split',
  },
  {
    id: 'glam_studio',
    name: 'Glam Studio',
    target: 'Creative stylists, nail studios, makeup artists & fashion-forward salons',
    description: 'Plum and rose tones, bold editorial headlines, asymmetric image layouts and a strong mobile experience.',
    palette: ['#3B0A2A', '#E562A0', '#F9EDF5', '#8B3E7A'],
    defaultFontId: 'poppins',
    defaultColors: {
      primary: '#3B0A2A',
      secondary: '#8B3E7A',
      accent: '#E562A0',
      background: '#FDF6FA',
      text: '#33102A',
      button: '#C2417F',
      buttonText: '#FFFFFF',
    },
    heroLayout: 'classic',
  },
];

export const getThemeMeta = (themeId: WebsiteThemeId): ThemeMeta =>
  WEBSITE_THEMES.find(t => t.id === themeId) || WEBSITE_THEMES[0];

export interface FontOption {
  id: string;
  name: string;
  stack: string;
  googleFamily?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'playfair', name: 'Playfair Display (Elegant serif)', stack: '"Playfair Display", Georgia, serif', googleFamily: 'Playfair+Display:wght@400;500;600;700;800' },
  { id: 'cormorant', name: 'Cormorant Garamond (Refined serif)', stack: '"Cormorant Garamond", Georgia, serif', googleFamily: 'Cormorant+Garamond:wght@400;500;600;700' },
  { id: 'lora', name: 'Lora (Classic serif)', stack: '"Lora", Georgia, serif', googleFamily: 'Lora:wght@400;500;600;700' },
  { id: 'inter', name: 'Inter (Clean sans)', stack: '"Inter", system-ui, sans-serif', googleFamily: 'Inter:wght@300;400;500;600;700;800' },
  { id: 'poppins', name: 'Poppins (Friendly sans)', stack: '"Poppins", system-ui, sans-serif', googleFamily: 'Poppins:wght@300;400;500;600;700' },
  { id: 'montserrat', name: 'Montserrat (Modern sans)', stack: '"Montserrat", system-ui, sans-serif', googleFamily: 'Montserrat:wght@300;400;500;600;700;800' },
  { id: 'dm', name: 'DM Sans (Neutral sans)', stack: '"DM Sans", system-ui, sans-serif', googleFamily: 'DM+Sans:wght@300;400;500;600;700' },
];

export const getFontOption = (fontId: string): FontOption =>
  FONT_OPTIONS.find(f => f.id === fontId) || FONT_OPTIONS[3];

const loadedFontFamilies = new Set<string>();
export function ensureFontsLoaded(fontIds: string[]) {
  if (typeof document === 'undefined') return;
  const families = fontIds
    .map(id => getFontOption(id).googleFamily)
    .filter(Boolean) as string[];
  const pending = families.filter(f => !loadedFontFamilies.has(f));
  if (pending.length === 0) return;
  pending.forEach(f => loadedFontFamilies.add(f));
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${pending.map(f => `family=${f}`).join('&')}&display=swap`;
  document.head.appendChild(link);
}

export const COLOR_PRESETS: { name: string; themeId: WebsiteThemeId; colors: WebsiteColors }[] = [
  { name: 'Champagne Ivory', themeId: 'luxe_elegance', colors: getThemeMeta('luxe_elegance').defaultColors },
  { name: 'Noir Gold', themeId: 'luxe_elegance', colors: { primary: '#171310', secondary: '#B98A2F', accent: '#D5AC5D', background: '#F6F1E7', text: '#171310', button: '#171310', buttonText: '#F3E9D2' } },
  { name: 'Editorial White', themeId: 'modern_minimal', colors: getThemeMeta('modern_minimal').defaultColors },
  { name: 'Soft Stone', themeId: 'modern_minimal', colors: { primary: '#1F2937', secondary: '#6B7280', accent: '#374151', background: '#F9FAFB', text: '#111827', button: '#1F2937', buttonText: '#FFFFFF' } },
  { name: 'Plum Rose', themeId: 'glam_studio', colors: getThemeMeta('glam_studio').defaultColors },
  { name: 'Midnight Glam', themeId: 'glam_studio', colors: { primary: '#2B0A1F', secondary: '#E562A0', accent: '#F2A9CE', background: '#1E0817', text: '#FBEFF6', button: '#E562A0', buttonText: '#FFFFFF' } },
];

function defaultSections(): WebsiteSectionSettings[] {
  return WEBSITE_SECTIONS.map(s => ({ id: s.id, enabled: true, canDisable: s.canDisable }));
}

/**
 * Build a sensible starting configuration derived from the salon's real profile data.
 * Never invents business details: defaults reuse the salon's own name, tagline,
 * about text, address and contact information.
 */
export function buildDefaultWebsiteConfig(tenant: SalonTenant): WebsiteConfig {
  const meta = getThemeMeta('modern_minimal');
  const aboutText =
    tenant.portfolio?.aboutText ||
    `${tenant.name} is a salon in ${tenant.city || 'your area'}. Add your salon story here.`;
  return {
    themeId: 'modern_minimal',
    content: {
      heroHeadline: tenant.portfolio?.heroTitle || tenant.name,
      heroDescription: tenant.portfolio?.heroSubtitle || tenant.tagline || '',
      heroImageUrl: '',
      heroImagePosition: 'center',
      heroOverlayOpacity: 45,
      heroTextAlignment: 'center',
      heroButtonLabel: 'Book Appointment',
      aboutHeading: 'About the Salon',
      aboutText,
      aboutImageUrl: '',
      servicesHeading: 'Our Services',
      galleryHeading: 'Our Work',
      teamHeading: 'Meet the Team',
      reviewsHeading: 'Client Reviews',
      hoursHeading: 'Opening Hours',
      contactHeading: 'Contact Us',
      footerText: `© ${new Date().getFullYear()} ${tenant.name}`,
      bookButtonLabel: 'Book Online',
      whatsappButtonLabel: 'WhatsApp Us',
    },
    colors: { ...meta.defaultColors },
    typography: {
      fontId: meta.defaultFontId,
      sizePreset: 'default',
      sectionSpacing: 'default',
      buttonStyle: 'solid',
      borderRadius: 'soft',
      imageCorner: 'rounded',
      heroLayout: meta.heroLayout,
    },
    sections: defaultSections(),
    team: [],
    gallery: (tenant.portfolio?.gallery || []).map(g => ({
      id: g.id,
      url: g.url,
      title: g.caption,
      description: '',
      altText: g.caption,
      category: 'Other',
      isFeatured: false,
      createdAt: new Date().toISOString(),
    })),
    contact: {
      whatsappEnabled: true,
      whatsappNumber: tenant.whatsapp || tenant.phone || '',
      whatsappGreeting: `Hello ${tenant.name}! I would like to book an appointment.`,
      email: tenant.email || '',
      phone: tenant.phone || '',
      address: tenant.address || '',
      city: tenant.city || '',
      mapLink: '',
      social: { instagram: '', facebook: '', tiktok: '', youtube: '' },
    },
    seo: {
      title: tenant.portfolio?.seoTitle || `${tenant.name} | Salon in ${tenant.city || 'Sri Lanka'}`,
      description: tenant.portfolio?.seoDescription || tenant.tagline || '',
    },
    serviceDisplay: { order: [], featuredServiceIds: [], hiddenServiceIds: [] },
    updatedAt: new Date().toISOString(),
  };
}

/** Merge stored config over defaults so new fields never break older saved records. */
export function normalizeWebsiteConfig(raw: any, tenant: SalonTenant): WebsiteConfig {
  const base = buildDefaultWebsiteConfig(tenant);
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    content: { ...base.content, ...(raw.content || {}) },
    colors: { ...base.colors, ...(raw.colors || {}) },
    typography: { ...base.typography, ...(raw.typography || {}) },
    contact: {
      ...base.contact,
      ...(raw.contact || {}),
      social: { ...base.contact.social, ...(raw.contact?.social || {}) },
    },
    seo: { ...base.seo, ...(raw.seo || {}) },
    serviceDisplay: { ...base.serviceDisplay, ...(raw.serviceDisplay || {}) },
    sections: WEBSITE_SECTIONS.map(s => {
      const stored = (raw.sections || []).find((x: any) => x.id === s.id);
      return { id: s.id, canDisable: s.canDisable, enabled: stored ? Boolean(stored.enabled) : true };
    }),
    team: Array.isArray(raw.team) ? raw.team : [],
    gallery: Array.isArray(raw.gallery) ? raw.gallery : base.gallery,
    updatedAt: raw.updatedAt || base.updatedAt,
  };
}
