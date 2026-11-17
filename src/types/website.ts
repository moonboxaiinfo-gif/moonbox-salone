/**
 * Moonbox Salon — Website & Portfolio Builder type definitions
 */

export type WebsiteThemeId = 'luxe_elegance' | 'modern_minimal' | 'glam_studio';
export type WebsiteStatus = 'draft' | 'published' | 'unpublished';

export type WebsiteSectionId =
  | 'hero'
  | 'services'
  | 'about'
  | 'gallery'
  | 'team'
  | 'reviews'
  | 'hours'
  | 'contact';

export interface WebsiteSectionSettings {
  id: WebsiteSectionId;
  enabled: boolean;
  /** Essential sections (contact) cannot be disabled while published */
  canDisable: boolean;
}

export interface WebsiteTeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
}

export type WebsiteGalleryCategory =
  | 'Hair'
  | 'Nails'
  | 'Bridal'
  | 'Makeup'
  | 'Skin Care'
  | 'Other';

export interface WebsiteGalleryItem {
  id: string;
  url: string;
  title: string;
  description: string;
  altText: string;
  category: WebsiteGalleryCategory;
  isFeatured: boolean;
  /** Optional before image for before/after pairs */
  beforeUrl?: string;
  createdAt: string;
}

export type WebsiteReviewStatus = 'pending' | 'approved' | 'rejected';

export interface WebsiteReview {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhone?: string;
  rating: number; // 1..5
  text: string;
  serviceRef?: string;
  status: WebsiteReviewStatus;
  isFeatured: boolean;
  /** Only set when the phone matches a real customer record with visit history */
  verifiedBooking?: boolean;
  createdAt: string;
  moderatedAt?: string;
  moderatedBy?: string;
}

export interface WebsiteContent {
  heroHeadline: string;
  heroDescription: string;
  heroImageUrl: string;
  heroImagePosition: 'center' | 'top' | 'bottom';
  heroOverlayOpacity: number; // 0..100
  heroTextAlignment: 'left' | 'center' | 'right';
  heroButtonLabel: string;
  aboutHeading: string;
  aboutText: string;
  aboutImageUrl: string;
  servicesHeading: string;
  galleryHeading: string;
  teamHeading: string;
  reviewsHeading: string;
  hoursHeading: string;
  contactHeading: string;
  footerText: string;
  bookButtonLabel: string;
  whatsappButtonLabel: string;
}

export interface WebsiteColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  button: string;
  buttonText: string;
}

export interface WebsiteTypography {
  fontId: string;
  sizePreset: 'compact' | 'default' | 'large';
  sectionSpacing: 'compact' | 'default' | 'spacious';
  buttonStyle: 'solid' | 'pill' | 'outline';
  borderRadius: 'sharp' | 'soft' | 'round';
  imageCorner: 'square' | 'rounded' | 'full';
  heroLayout: 'classic' | 'split' | 'overlay';
}

export interface WebsiteContactSettings {
  whatsappEnabled: boolean;
  whatsappNumber: string; // free-form input, validated before use
  whatsappGreeting: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  mapLink: string;
  social: {
    instagram: string;
    facebook: string;
    tiktok: string;
    youtube: string;
  };
}

export interface WebsiteServiceDisplay {
  /** Explicit display order of service ids (missing ids appended in natural order) */
  order: string[];
  featuredServiceIds: string[];
  hiddenServiceIds: string[];
}

export interface WebsiteConfig {
  themeId: WebsiteThemeId;
  content: WebsiteContent;
  colors: WebsiteColors;
  typography: WebsiteTypography;
  sections: WebsiteSectionSettings[];
  team: WebsiteTeamMember[];
  gallery: WebsiteGalleryItem[];
  contact: WebsiteContactSettings;
  seo: {
    title: string;
    description: string;
  };
  serviceDisplay: WebsiteServiceDisplay;
  updatedAt: string;
}

export interface WebsiteRecord {
  tenantId: string;
  status: WebsiteStatus;
  draft: WebsiteConfig;
  published: WebsiteConfig | null;
  publishedAt?: string;
  lastSavedAt?: string;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';
