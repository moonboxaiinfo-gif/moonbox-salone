import { SalonTenant, Service, ServiceCategory, Staff } from '../types';
import { WebsiteConfig, WebsiteReview } from '../types/website';
import { createSupabaseRepository } from './supabaseRepository';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface PublicWebsitePayload {
  tenant: SalonTenant;
  config: WebsiteConfig;
  services: Service[];
  categories: ServiceCategory[];
  staff: Staff[];
  reviews: WebsiteReview[];
}

const API = '/.netlify/functions/public-api';

async function request<T>(resource: string, query: Record<string, string>, init?: RequestInit, requiresAuth = false): Promise<T> {
  const url = new URL(API, window.location.origin);
  url.searchParams.set('resource', resource);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('Content-Type', 'application/json');
  if ((requiresAuth || (init?.method && init.method.toUpperCase() !== 'GET')) && isSupabaseConfigured && supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  const response = await fetch(url, { ...init, headers, cache: 'no-store', credentials: 'omit' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed with status ${response.status}`);
  return body as T;
}

function makeBookingKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

export const PublicWebsiteApi = {
  async get(slug: string, signal?: AbortSignal): Promise<PublicWebsitePayload> {
    return request<PublicWebsitePayload>('website', { slug: slug.trim().toLowerCase() }, { signal });
  },

  async getDraft(slug: string): Promise<{
    status: 'draft' | 'published' | 'unpublished';
    draftConfig: WebsiteConfig;
    publishedConfig: WebsiteConfig | null;
    publishedAt?: string;
    lastSavedAt?: string;
  } | null> {
    return request('draft', { slug: slug.trim().toLowerCase() }, undefined, true);
  },

  async saveDraft(slug: string, draftConfig: WebsiteConfig): Promise<{ success: boolean; lastSavedAt: string }> {
    return request('save-draft', {}, { method: 'POST', body: JSON.stringify({ slug: slug.trim().toLowerCase(), draftConfig }) });
  },

  async getManagedReviews(slug: string): Promise<{ reviews: WebsiteReview[] }> {
    return request('manage-reviews', { slug: slug.trim().toLowerCase() }, undefined, true);
  },

  async moderateReview(slug: string, reviewId: string, status: WebsiteReview['status'], isFeatured?: boolean): Promise<{ success: boolean }> {
    return request('moderate-review', { slug: slug.trim().toLowerCase() }, {
      method: 'POST', body: JSON.stringify({ reviewId, status, isFeatured }),
    });
  },

  async deleteReview(slug: string, reviewId: string): Promise<{ success: boolean }> {
    return request('delete-review', { slug: slug.trim().toLowerCase() }, { method: 'POST', body: JSON.stringify({ reviewId }) });
  },

  async publish(payload: {
    slug: string;
    config: WebsiteConfig;
    tenant?: SalonTenant;
    services?: Service[];
    categories?: ServiceCategory[];
    staff?: Staff[];
  }): Promise<{ success: boolean; slug: string }> {
    return request('publish', {}, { method: 'POST', body: JSON.stringify({ slug: payload.slug, config: payload.config }) });
  },

  async unpublish(slug: string): Promise<{ success: boolean }> {
    return request('unpublish', { slug: slug.trim().toLowerCase() }, { method: 'POST' });
  },

  async submitReview(slug: string, review: {
    customerName: string;
    customerPhone?: string;
    rating: number;
    text: string;
    serviceRef?: string;
  }): Promise<{ success: boolean; review: WebsiteReview }> {
    return request('review', { slug: slug.trim().toLowerCase() }, { method: 'POST', body: JSON.stringify(review) });
  },

  async submitBooking(slug: string, booking: Record<string, unknown>): Promise<{ success: boolean; booking: Record<string, unknown> }> {
    const params = {
      salonSlug: slug.trim().toLowerCase(),
      customerName: String(booking.clientName || booking.customerName || ''),
      customerPhone: String(booking.clientPhone || booking.customerPhone || ''),
      customerEmail: booking.clientEmail ? String(booking.clientEmail) : booking.customerEmail ? String(booking.customerEmail) : undefined,
      staffId: booking.staffId ? String(booking.staffId) : undefined,
      serviceIds: Array.isArray(booking.serviceIds) ? booking.serviceIds.map(String) : [String(booking.serviceId || '')],
      date: String(booking.date || ''),
      startTime: String(booking.startTime || ''),
      endTime: String(booking.endTime || ''),
      durationMinutes: Number(booking.durationMinutes || 0),
      idempotencyKey: String(booking.idempotencyKey || makeBookingKey()),
      notes: booking.notes ? String(booking.notes) : undefined,
    };
    if (isSupabaseConfigured) {
      const repository = createSupabaseRepository();
      if (!repository) throw new Error('Supabase booking service is not configured.');
      const result = await repository.submitPublicBooking(params);
      return { success: true, booking: result };
    }
    return request('booking', { slug: params.salonSlug }, {
      method: 'POST',
      body: JSON.stringify({
        clientName: params.customerName, clientPhone: params.customerPhone, clientEmail: params.customerEmail,
        staffId: params.staffId, serviceIds: params.serviceIds, date: params.date,
        startTime: params.startTime, endTime: params.endTime, durationMinutes: params.durationMinutes,
        idempotencyKey: params.idempotencyKey, notes: params.notes,
      }),
    });
  },
};
