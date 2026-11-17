import { StorageService } from './storageService';

export interface LandingGalleryItem {
  id: string;
  src: string;
  alt: string;
  caption: string;
  isEnabled: boolean;
  displayOrder: number;
}

export interface LandingFaqItem {
  id: string;
  question: string;
  answer: string;
  isEnabled: boolean;
  displayOrder: number;
}

export interface LandingPageContent {
  version: number;
  general: {
    websiteTitle: string;
    brandName: string;
    description: string;
    primaryCtaText: string;
    primaryCtaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
  };
  hero: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    description: string;
    heroImage: string;
    heroImageAlt: string;
  };
  gallery: LandingGalleryItem[];
  contact: {
    brandName: string;
    phone: string;
    secondaryPhone: string;
    whatsapp: string;
    email: string;
    address: string;
    mapsUrl: string;
    hours: string;
    facebook: string;
    instagram: string;
    youtube: string;
    tiktok: string;
    linkedin: string;
    whatsappMessage: string;
  };
  footer: {
    description: string;
    copyright: string;
    showContact: boolean;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    canonicalUrl: string;
  };
  faqs: LandingFaqItem[];
  updatedAt: string;
  updatedBy?: string;
}

export interface LandingPageRevision {
  id: string;
  revisionNumber: number;
  status: 'draft' | 'published';
  snapshot: LandingPageContent;
  createdAt: string;
  createdBy: string;
  publishedAt?: string;
}

const defaultContent: LandingPageContent = {
  version: 1,
  general: {
    websiteTitle: 'Moonbox Salon — Salon Management Software',
    brandName: 'Moonbox Salon',
    description: 'A connected salon management system for appointments, staff, customers, inventory and business operations.',
    primaryCtaText: 'Start Your Free Trial',
    primaryCtaLink: '#pricing',
    secondaryCtaText: 'Explore the Platform',
    secondaryCtaLink: '#features'
  },
  hero: {
    eyebrow: 'SALON MANAGEMENT SOFTWARE',
    heading: 'Your Salon. Your Business. One Beautiful System.',
    subtitle: 'Everything Your Salon Needs. Beautifully Connected.',
    description: 'Take control of appointments, customers, staff, sales and salon operations with one beautifully connected management platform.',
    heroImage: '/moonbox-salon-lifestyle-hero-poster.jpg',
    heroImageAlt: 'Warm modern luxury salon interior with a professional stylist'
  },
  gallery: [
    { id: 'gallery-interior', src: '/salon-interior-still.jpg', alt: 'Warm modern luxury salon interior with curved mirrors and styling stations', caption: 'The space', isEnabled: true, displayOrder: 1 },
    { id: 'gallery-stylist', src: '/salon-stylist-still.jpg', alt: 'Professional hairstylist styling a client\'s hair at a mirror workstation', caption: 'Hair artistry', isEnabled: true, displayOrder: 2 },
    { id: 'gallery-client', src: '/salon-client-still.jpg', alt: 'Client enjoying a calm premium salon styling experience', caption: 'The experience', isEnabled: true, displayOrder: 3 }
  ],
  contact: {
    brandName: 'Moonbox Digital Sri Lanka',
    phone: '+94 77 123 4567',
    secondaryPhone: '',
    whatsapp: '',
    email: 'hello@moonboxdigital.com',
    address: 'Sri Lanka',
    mapsUrl: '',
    hours: 'Monday–Saturday · 9:00 AM–6:00 PM',
    facebook: '', instagram: '', youtube: '', tiktok: '', linkedin: '',
    whatsappMessage: 'Hello Moonbox Digital, I would like to learn more about Moonbox Salon.'
  },
  footer: {
    description: 'Moonbox Salon — Powered by Moonbox Digital. A connected salon management system for appointments, staff, customers, inventory and business operations.',
    copyright: 'Moonbox Digital. All rights reserved.',
    showContact: true
  },
  seo: {
    metaTitle: 'Moonbox Salon — Salon Management Software',
    metaDescription: 'Manage appointments, customers, staff, inventory and salon operations with Moonbox Salon.',
    ogTitle: 'Moonbox Salon — One Smart System for Your Salon',
    ogDescription: 'Spend less time managing and more time growing with Moonbox Salon.',
    ogImage: '/moonbox-salon-lifestyle-hero-poster.jpg',
    canonicalUrl: 'https://moonboxdigital.com/'
  },
  faqs: [
    { id: 'faq-1', question: 'What is Moonbox Salon?', answer: 'Moonbox Salon is a salon management system by Moonbox Digital that brings appointments, customers, staff, inventory and finances together in one organized place.', isEnabled: true, displayOrder: 1 },
    { id: 'faq-2', question: 'How can Moonbox Salon help my salon?', answer: 'It helps you keep a clearer daily schedule, organized customer details, easier staff coordination and better visibility into your salon activity.', isEnabled: true, displayOrder: 2 },
    { id: 'faq-3', question: 'What can I manage with the system?', answer: 'Appointments, customer information, staff details, inventory records, income and expenses, and business reports.', isEnabled: true, displayOrder: 3 },
    { id: 'faq-4', question: 'Can I view the system on different screen sizes?', answer: 'Yes. The interface is designed to present clearly on larger screens and mobile-sized views.', isEnabled: true, displayOrder: 4 },
    { id: 'faq-5', question: 'How can I learn more or get started?', answer: 'Use the Get Started button on this page to take the next step with Moonbox Salon.', isEnabled: true, displayOrder: 5 }
  ],
  updatedAt: new Date().toISOString()
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const normalize = (value: LandingPageContent): LandingPageContent => ({
  ...clone(defaultContent),
  ...value,
  general: { ...defaultContent.general, ...(value.general || {}) },
  hero: { ...defaultContent.hero, ...(value.hero || {}) },
  contact: { ...defaultContent.contact, ...(value.contact || {}) },
  footer: { ...defaultContent.footer, ...(value.footer || {}) },
  seo: { ...defaultContent.seo, ...(value.seo || {}) },
  gallery: Array.isArray(value.gallery) ? value.gallery : clone(defaultContent.gallery),
  faqs: Array.isArray(value.faqs) ? value.faqs : clone(defaultContent.faqs)
});

export class LandingPageService {
  private static publishedKey = 'landing_page_published';
  private static draftKey = 'landing_page_draft';
  private static revisionsKey = 'landing_page_revisions';

  static getPublished(): LandingPageContent {
    return normalize(StorageService.getPlatformContent(this.publishedKey, defaultContent));
  }

  static getDraft(): LandingPageContent {
    return normalize(StorageService.getPlatformContent(this.draftKey, this.getPublished()));
  }

  static saveDraft(content: LandingPageContent, actorEmail: string): LandingPageContent {
    const next = normalize({ ...content, updatedAt: new Date().toISOString(), updatedBy: actorEmail });
    StorageService.setPlatformContent(this.draftKey, next);
    StorageService.logAudit({ actorEmail, actorRole: 'superadmin', action: 'SAVE_LANDING_PAGE_DRAFT', entity: 'landing_page', details: `Saved landing page draft version ${next.version}.` });
    return next;
  }

  static validate(content: LandingPageContent): string[] {
    const errors: string[] = [];
    if (!content.general.websiteTitle.trim()) errors.push('Website title is required.');
    if (!content.general.brandName.trim()) errors.push('Brand name is required.');
    if (!content.hero.heading.trim()) errors.push('Hero heading is required.');
    if (!content.seo.metaTitle.trim()) errors.push('SEO meta title is required.');
    if (!content.seo.metaDescription.trim()) errors.push('SEO meta description is required.');
    if (content.contact.whatsapp && !/^\+?[0-9]{7,15}$/.test(content.contact.whatsapp.replace(/[\s()-]/g, ''))) errors.push('WhatsApp number must contain 7–15 digits.');
    for (const item of content.gallery) if (item.isEnabled && !item.src.trim()) errors.push(`Gallery image “${item.caption || item.id}” needs an image URL.`);
    for (const item of content.faqs) if (item.isEnabled && (!item.question.trim() || !item.answer.trim())) errors.push('Enabled FAQs require both a question and an answer.');
    return errors;
  }

  static publishDraft(actorEmail: string): { success: boolean; errors: string[]; content?: LandingPageContent } {
    const draft = this.getDraft();
    const errors = this.validate(draft);
    if (errors.length) return { success: false, errors };
    const previous = this.getPublished();
    const published = normalize({ ...draft, version: previous.version + 1, updatedAt: new Date().toISOString(), updatedBy: actorEmail });
    const revisions = StorageService.getPlatformRevisions(this.revisionsKey);
    const revision: LandingPageRevision = { id: `landing_revision_${Date.now()}`, revisionNumber: published.version, status: 'published', snapshot: clone(published), createdAt: new Date().toISOString(), publishedAt: new Date().toISOString(), createdBy: actorEmail };
    StorageService.setPlatformContent(this.publishedKey, published);
    StorageService.setPlatformContent(this.draftKey, published);
    StorageService.setPlatformRevisions(this.revisionsKey, [revision, ...revisions].slice(0, 20));
    StorageService.logAudit({ actorEmail, actorRole: 'superadmin', action: 'PUBLISH_LANDING_PAGE', entity: 'landing_page', entityId: revision.id, details: `Published landing page version ${published.version}.` });
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('moonbox:landing-published'));
    return { success: true, errors: [], content: published };
  }

  static resetDraft(actorEmail: string): LandingPageContent {
    const published = this.getPublished();
    StorageService.setPlatformContent(this.draftKey, published);
    StorageService.logAudit({ actorEmail, actorRole: 'superadmin', action: 'RESET_LANDING_PAGE_DRAFT', entity: 'landing_page', details: `Reset draft to published version ${published.version}.` });
    return published;
  }

  static getRevisions(): LandingPageRevision[] { return StorageService.getPlatformRevisions(this.revisionsKey); }
  static restoreRevision(id: string, actorEmail: string): { success: boolean; errors: string[] } {
    const revision = this.getRevisions().find(item => item.id === id);
    if (!revision) return { success: false, errors: ['Revision not found.'] };
    this.saveDraft(revision.snapshot, actorEmail);
    return { success: true, errors: [] };
  }

  static whatsappUrl(number: string, message: string): string | null {
    const clean = number.replace(/\D/g, '');
    if (clean.length < 7 || clean.length > 15) return null;
    return `https://wa.me/${clean}?text=${encodeURIComponent(message || 'Hello, I would like to learn more.')}`;
  }
}

export const DEFAULT_LANDING_PAGE_CONTENT = clone(defaultContent);
