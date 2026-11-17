/**
 * Website & Portfolio Builder Service
 * Persists per-salon website configuration (draft vs published), gallery,
 * team, reviews and contact settings with strict tenant isolation.
 *
 * Uses the application's existing StorageService data layer (the same
 * source of truth used by every other module) for persistence and audit
 * logging. A matching Supabase migration is provided in
 * supabase/migrations for server-side deployments.
 */

import { SalonTenant } from '../types';
import { WebsiteConfig, WebsiteRecord, WebsiteReview, WebsiteReviewStatus } from '../types/website';
import { buildDefaultWebsiteConfig, normalizeWebsiteConfig } from '../lib/websiteDefaults';
import { StorageService } from './storageService';

const STORAGE_PREFIX = 'moonbox_salon_saas_v1_';
const REVIEWS_PREFIX = 'moonbox_salon_saas_v1_website_reviews_';
const PUBLIC_SUBMIT_PREFIX = 'moonbox_public_review_';

const memoryRecords: Record<string, string> = {};

function readRaw(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return memoryRecords[key] ?? null;
    return localStorage.getItem(key);
  } catch {
    return memoryRecords[key] ?? null;
  }
}

function writeRaw(key: string, value: string): boolean {
  memoryRecords[key] = value;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
    return true;
  } catch (err) {
    console.error('WebsiteService: failed to persist record', err);
    return false;
  }
}

export interface MutationContext {
  tenantId: string;
  actorEmail: string;
  actorRole: string;
}

export class WebsiteService {
  // ==========================================
  // WEBSITE RECORDS (DRAFT / PUBLISHED)
  // ==========================================

  /** Load the full record for a salon, creating a default draft if none exists. */
  static getRecord(tenant: SalonTenant): WebsiteRecord {
    const raw = readRaw(STORAGE_PREFIX + `website_${tenant.id}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as WebsiteRecord;
        // Re-validate tenant ownership: record key already tenant-scoped, but
        // guard against corrupted/cross-tenant payloads.
        if (parsed && parsed.tenantId === tenant.id) {
          return {
            ...parsed,
            draft: normalizeWebsiteConfig(parsed.draft, tenant),
            published: parsed.published ? normalizeWebsiteConfig(parsed.published, tenant) : null,
          };
        }
      } catch (err) {
        console.error('WebsiteService: corrupted website record, recreating.', err);
      }
    }
    const record: WebsiteRecord = {
      tenantId: tenant.id,
      status: 'draft',
      draft: buildDefaultWebsiteConfig(tenant),
      published: null,
    };
    writeRaw(STORAGE_PREFIX + `website_${tenant.id}`, JSON.stringify(record));
    return record;
  }

  /** Persist a draft. Never touches the published website. */
  static saveDraft(ctx: MutationContext, config: WebsiteConfig): { success: boolean; error?: string } {
    const tenant = StorageService.getTenantById(ctx.tenantId);
    if (!tenant) return { success: false, error: 'Salon not found.' };
    const raw = readRaw(STORAGE_PREFIX + `website_${ctx.tenantId}`);
    let status: WebsiteRecord['status'] = 'draft';
    let published: WebsiteConfig | null = null;
    let publishedAt: string | undefined;
    if (raw) {
      try {
        const existing = JSON.parse(raw) as WebsiteRecord;
        if (existing.tenantId !== ctx.tenantId) return { success: false, error: 'Tenant mismatch.' };
        status = existing.status;
        published = existing.published;
        publishedAt = existing.publishedAt;
      } catch { /* recreate */ }
    }
    const record: WebsiteRecord = {
      tenantId: ctx.tenantId,
      status,
      draft: { ...config, updatedAt: new Date().toISOString() },
      published,
      publishedAt,
      lastSavedAt: new Date().toISOString(),
    };
    const ok = writeRaw(STORAGE_PREFIX + `website_${ctx.tenantId}`, JSON.stringify(record));
    if (!ok) return { success: false, error: 'Failed to save draft. Storage unavailable.' };
    StorageService.logAudit({
      tenantId: ctx.tenantId,
      actorEmail: ctx.actorEmail,
      actorRole: ctx.actorRole,
      action: 'WEBSITE_DRAFT_SAVED',
      entity: 'website',
      entityId: ctx.tenantId,
      details: 'Draft website configuration saved.'
    });
    return { success: true };
  }

  /** Publish the current draft. The live site keeps serving until success. */
  static publish(ctx: MutationContext): { success: boolean; error?: string } {
    const tenant = StorageService.getTenantById(ctx.tenantId);
    if (!tenant) return { success: false, error: 'Salon not found.' };
    const record = WebsiteService.getRecord(tenant);
    // Essential sections must be present to publish
    const contactSection = record.draft.sections.find(s => s.id === 'contact');
    if (!contactSection?.enabled) {
      return { success: false, error: 'The Contact section is required before publishing.' };
    }
    const next: WebsiteRecord = {
      ...record,
      status: 'published',
      published: { ...record.draft, updatedAt: new Date().toISOString() },
      publishedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
    };
    const ok = writeRaw(STORAGE_PREFIX + `website_${ctx.tenantId}`, JSON.stringify(next));
    if (!ok) return { success: false, error: 'Failed to publish. Storage unavailable.' };
    StorageService.logAudit({
      tenantId: ctx.tenantId,
      actorEmail: ctx.actorEmail,
      actorRole: ctx.actorRole,
      action: 'WEBSITE_PUBLISHED',
      entity: 'website',
      entityId: ctx.tenantId,
      details: 'Salon website published.'
    });
    return { success: true };
  }

  /** Unpublish the live website with confirmation handled by the caller. */
  static unpublish(ctx: MutationContext): { success: boolean; error?: string } {
    const tenant = StorageService.getTenantById(ctx.tenantId);
    if (!tenant) return { success: false, error: 'Salon not found.' };
    const record = WebsiteService.getRecord(tenant);
    const next: WebsiteRecord = { ...record, status: 'unpublished' };
    const ok = writeRaw(STORAGE_PREFIX + `website_${ctx.tenantId}`, JSON.stringify(next));
    if (!ok) return { success: false, error: 'Failed to unpublish. Storage unavailable.' };
    StorageService.logAudit({
      tenantId: ctx.tenantId,
      actorEmail: ctx.actorEmail,
      actorRole: ctx.actorRole,
      action: 'WEBSITE_UNPUBLISHED',
      entity: 'website',
      entityId: ctx.tenantId,
      details: 'Salon website unpublished.'
    });
    return { success: true };
  }

  /**
   * Public accessor: returns the published configuration only when the
   * website status is 'published'. Unpublished drafts are never exposed.
   */
  static getPublishedConfig(tenantId: string): WebsiteConfig | null {
    const tenant = StorageService.getTenantById(tenantId);
    if (!tenant) return null;
    const raw = readRaw(STORAGE_PREFIX + `website_${tenantId}`);
    if (!raw) return null;
    try {
      const record = JSON.parse(raw) as WebsiteRecord;
      if (record.tenantId !== tenantId) return null;
      if (record.status !== 'published' || !record.published) return null;
      return normalizeWebsiteConfig(record.published, tenant);
    } catch {
      return null;
    }
  }

  // ==========================================
  // REVIEWS (TENANT-ISOLATED, MODERATED)
  // ==========================================

  static getReviews(tenantId: string): WebsiteReview[] {
    const raw = readRaw(REVIEWS_PREFIX + tenantId);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as WebsiteReview[];
      if (!Array.isArray(parsed)) return [];
      // Enforce isolation on read as well
      return parsed.filter(r => r.tenantId === tenantId);
    } catch {
      return [];
    }
  }

  static getApprovedReviews(tenantId: string): WebsiteReview[] {
    return WebsiteService.getReviews(tenantId)
      .filter(r => r.status === 'approved')
      .sort((a, b) => (b.moderatedAt || b.createdAt).localeCompare(a.moderatedAt || a.createdAt));
  }

  private static saveReviews(tenantId: string, reviews: WebsiteReview[]) {
    writeRaw(REVIEWS_PREFIX + tenantId, JSON.stringify(reviews));
  }

  /**
   * Public review submission with validation, input limits and basic
   * client-side rate limiting. Reviews start as 'pending' and are public
   * only after salon approval.
   */
  static submitPublicReview(params: {
    tenantId: string;
    customerName: string;
    customerPhone?: string;
    rating: number;
    text: string;
    serviceRef?: string;
  }): { success: boolean; error?: string } {
    const tenant = StorageService.getTenantById(params.tenantId);
    if (!tenant) return { success: false, error: 'Salon not found.' };

    const name = params.customerName.trim();
    const text = params.text.trim();
    const rating = Number(params.rating);
    if (name.length < 2 || name.length > 60) return { success: false, error: 'Please enter your name (2–60 characters).' };
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { success: false, error: 'Please select a rating between 1 and 5.' };
    if (text.length < 10 || text.length > 800) return { success: false, error: 'Review must be between 10 and 800 characters.' };
    if (params.customerPhone && !/^[+\d][\d\s-]{5,19}$/.test(params.customerPhone.trim())) {
      return { success: false, error: 'Please enter a valid phone number.' };
    }

    // Basic rate limiting: max 1 submission per visitor per 10 minutes, 5 per day
    try {
      if (typeof localStorage !== 'undefined') {
        const now = Date.now();
        const history: number[] = JSON.parse(localStorage.getItem(PUBLIC_SUBMIT_PREFIX + params.tenantId) || '[]');
        const recent = history.filter(ts => now - ts < 10 * 60 * 1000);
        const today = history.filter(ts => now - ts < 24 * 60 * 60 * 1000);
        if (recent.length > 0) return { success: false, error: 'You just submitted a review. Please wait a few minutes.' };
        if (today.length >= 5) return { success: false, error: 'Too many reviews submitted today. Please try again tomorrow.' };
        recent.push(now);
        localStorage.setItem(PUBLIC_SUBMIT_PREFIX + params.tenantId, JSON.stringify(recent.slice(-20)));
      }
    } catch { /* rate limiting is best-effort client side */ }

    // Verified-booking: only when the phone matches a real customer record of this salon
    let verified = false;
    if (params.customerPhone) {
      const normalized = params.customerPhone.replace(/[\s-]/g, '');
      verified = StorageService
        .getAllCustomersIncludingArchived(params.tenantId)
        .some(c => c.phone.replace(/[\s-]/g, '') === normalized && c.visitsCount > 0);
    }

    const reviews = WebsiteService.getReviews(params.tenantId);
    const review: WebsiteReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenantId: params.tenantId,
      customerName: name,
      customerPhone: params.customerPhone?.trim() || undefined,
      rating,
      text,
      serviceRef: params.serviceRef?.trim() || undefined,
      status: 'pending',
      isFeatured: false,
      verifiedBooking: verified || undefined,
      createdAt: new Date().toISOString(),
    };
    reviews.unshift(review);
    WebsiteService.saveReviews(params.tenantId, reviews);
    return { success: true };
  }

  static moderateReview(params: {
    tenantId: string;
    reviewId: string;
    status: WebsiteReviewStatus;
    isFeatured?: boolean;
    moderatedBy: string;
  }): { success: boolean; error?: string } {
    const reviews = WebsiteService.getReviews(params.tenantId);
    const idx = reviews.findIndex(r => r.id === params.reviewId && r.tenantId === params.tenantId);
    if (idx < 0) return { success: false, error: 'Review not found.' };
    reviews[idx] = {
      ...reviews[idx],
      status: params.status,
      isFeatured: params.isFeatured ?? reviews[idx].isFeatured,
      moderatedAt: new Date().toISOString(),
      moderatedBy: params.moderatedBy,
    };
    WebsiteService.saveReviews(params.tenantId, reviews);
    return { success: true };
  }

  static deleteReview(tenantId: string, reviewId: string): { success: boolean; error?: string } {
    const reviews = WebsiteService.getReviews(tenantId);
    const filtered = reviews.filter(r => !(r.id === reviewId && r.tenantId === tenantId));
    if (filtered.length === reviews.length) return { success: false, error: 'Review not found.' };
    WebsiteService.saveReviews(tenantId, filtered);
    return { success: true };
  }

  // ==========================================
  // WHATSAPP HELPERS
  // ==========================================

  /** Normalize a free-form phone input to international digits (no plus). */
  static normalizeWhatsAppNumber(input: string): string | null {
    if (!input) return null;
    let digits = input.replace(/[\s\-().]/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('+')) digits = digits.slice(1);
    if (!/^\d{8,15}$/.test(digits)) return null;
    return digits;
  }

  /** Build a valid click-to-chat link; returns null when no valid number is configured. */
  static buildWhatsAppLink(number: string, greeting?: string): string | null {
    const normalized = WebsiteService.normalizeWhatsAppNumber(number);
    if (!normalized) return null;
    const base = `https://wa.me/${normalized}`;
    if (greeting && greeting.trim()) {
      return `${base}?text=${encodeURIComponent(greeting.trim())}`;
    }
    return base;
  }
}
