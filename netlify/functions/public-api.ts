import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import {
  FunctionEvent,
  isUuid,
  jsonResponse,
  parseBody,
  requireSalonManager,
  responseHeaders,
  serviceClient,
} from './_security.ts';

function slugIsValid(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function publicValue(value: unknown, depth = 0, parentKey = ''): unknown {
  if (depth > 12) return null;
  if (typeof value === 'string') {
    if (/(token|secret|password|service.?role|api.?key|customer.?phone|customer.?email|moderated.?by|created.?by)/i.test(parentKey)) return undefined;
    if (/(url|href|link|instagram|facebook|youtube|tiktok)$/i.test(parentKey)
      && /^(?:javascript|vbscript|data|file):/i.test(value.trim())) return undefined;
    return value.slice(0, 20000);
  }
  if (Array.isArray(value)) return value.slice(0, 500).map((item) => publicValue(item, depth + 1, parentKey)).filter((item) => item !== undefined);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (/(token|secret|password|service.?role|api.?key|customer.?phone|customer.?email|moderated.?by|created.?by|draft)/i.test(key)) continue;
      const safe = publicValue(child, depth + 1, key);
      if (safe !== undefined) output[key] = safe;
    }
    return output;
  }
  return value;
}

function mapReview(row: Record<string, any>) {
  return {
    id: row.id,
    tenantId: '',
    customerName: row.customer_name,
    rating: Number(row.rating),
    text: row.review_text,
    serviceRef: row.service_ref || undefined,
    status: 'approved',
    isFeatured: Boolean(row.is_featured),
    verifiedBooking: Boolean(row.verified_booking),
    createdAt: row.created_at,
  };
}

async function publicWebsite(slug: string) {
  if (!slugIsValid(slug)) return { status: 400, body: { error: 'Invalid salon website address.' } };
  const db = serviceClient();
  const { data: salon, error: salonError } = await db.from('salons')
    .select('id,name,slug,tagline,logo_url,country,currency,phone,whatsapp,email,address,city,opening_hours,settings,portfolio,status,created_at,updated_at')
    .eq('slug', slug).eq('status', 'active').maybeSingle();
  if (salonError || !salon) return { status: 404, body: { error: 'This salon website is not available.' } };

  const today = new Date().toISOString().slice(0, 10);
  const { data: subscription, error: subscriptionError } = await db.from('salon_subscriptions')
    .select('status,plan_id,end_date').eq('salon_id', salon.id).maybeSingle();
  if (subscriptionError || !subscription || !['active', 'trial'].includes(subscription.status) || subscription.end_date < today) {
    return { status: 404, body: { error: 'This salon website is not available under its current plan.' } };
  }
  const { data: plan, error: planError } = await db.from('subscription_plans')
    .select('has_portfolio').eq('id', subscription.plan_id).maybeSingle();
  if (planError || !plan?.has_portfolio) return { status: 404, body: { error: 'This salon plan does not include website publishing.' } };

  const { data: site, error: siteError } = await db.from('website_configs')
    .select('status,published_config').eq('salon_id', salon.id).eq('status', 'published').maybeSingle();
  if (siteError || !site?.published_config) return { status: 404, body: { error: 'This salon website has not been published.' } };

  const [serviceResult, categoryResult, staffResult, reviewResult] = await Promise.all([
    db.from('services').select('*').eq('salon_id', salon.id).eq('is_active', true).order('name'),
    db.from('service_categories').select('id,name,description').eq('salon_id', salon.id).order('name'),
    db.from('staff').select('id,name,position,status,working_hours,color').eq('salon_id', salon.id).eq('status', 'active').order('name'),
    db.from('website_reviews').select('id,customer_name,rating,review_text,service_ref,is_featured,verified_booking,created_at')
      .eq('salon_id', salon.id).eq('status', 'approved').order('created_at', { ascending: false }).limit(50),
  ]);
  if (serviceResult.error || categoryResult.error || staffResult.error || reviewResult.error) {
    return { status: 503, body: { error: 'The salon website is temporarily unavailable.' } };
  }

  const rawSettings = salon.settings && typeof salon.settings === 'object' ? salon.settings as Record<string, any> : {};
  const safeSettings = {
    taxRate: Number(rawSettings.taxRate) || 0,
    currencySymbol: typeof rawSettings.currencySymbol === 'string' ? rawSettings.currencySymbol.slice(0, 12) : 'Rs.',
    appointmentBufferMinutes: Number(rawSettings.appointmentBufferMinutes) || 0,
    minAdvanceBookingHours: Number(rawSettings.minAdvanceBookingHours) || 0,
    maxBookingWindowDays: Number(rawSettings.maxBookingWindowDays) || 60,
    allowCustomerStaffSelection: rawSettings.allowCustomerStaffSelection !== false,
    requireBookingDeposit: Boolean(rawSettings.requireBookingDeposit),
    onlineBooking: rawSettings.onlineBooking && typeof rawSettings.onlineBooking === 'object' ? publicValue(rawSettings.onlineBooking) : undefined,
  };
  const rawPortfolio = salon.portfolio && typeof salon.portfolio === 'object' ? salon.portfolio as Record<string, any> : {};
  const safePortfolio = {
    heroTitle: String(rawPortfolio.heroTitle || '').slice(0, 200),
    heroSubtitle: String(rawPortfolio.heroSubtitle || '').slice(0, 300),
    aboutText: String(rawPortfolio.aboutText || '').slice(0, 5000),
    theme: ['luxury', 'modern', 'minimal', 'elegant', 'beauty'].includes(rawPortfolio.theme) ? rawPortfolio.theme : 'luxury',
    primaryColor: /^#[0-9a-f]{6}$/i.test(rawPortfolio.primaryColor || '') ? rawPortfolio.primaryColor : '#7C3AED',
    accentColor: /^#[0-9a-f]{6}$/i.test(rawPortfolio.accentColor || '') ? rawPortfolio.accentColor : '#F3C9AB',
    gallery: publicValue(Array.isArray(rawPortfolio.gallery) ? rawPortfolio.gallery : []),
    seoTitle: String(rawPortfolio.seoTitle || '').slice(0, 200),
    seoDescription: String(rawPortfolio.seoDescription || '').slice(0, 500),
  };
  const tenant = {
    id: salon.id, name: salon.name, slug: salon.slug, tagline: salon.tagline || '', logoUrl: salon.logo_url || undefined,
    country: salon.country, currency: salon.currency, phone: salon.phone, whatsapp: salon.whatsapp, email: salon.email,
    website: undefined, address: salon.address, city: salon.city, openingHours: publicValue(salon.opening_hours) || {},
    settings: publicValue(safeSettings) || {}, portfolio: safePortfolio,
    subscription: { planId: 'public', status: 'active', billingCycle: 'monthly', startDate: '', endDate: '', trialEndsAt: '', autoRenew: false },
    onboardingCompleted: true, onboardingStep: 0, status: 'active', createdAt: salon.created_at, updatedAt: salon.updated_at,
  };
  const services = (serviceResult.data || []).map((row: Record<string, any>) => ({
    id: row.id, tenantId: salon.id, categoryId: row.category_id || '', name: row.name,
    description: row.description || '', priceLKR: Number(row.price_lkr), durationMinutes: Number(row.duration_minutes),
    commissionRate: 0, isOnlineBookingEnabled: Boolean(row.is_online_booking_enabled), isActive: Boolean(row.is_active),
    assignedStaffIds: Array.isArray(row.assigned_staff_ids) ? row.assigned_staff_ids : [],
    createdAt: row.created_at, updatedAt: row.updated_at,
  }));
  const categories = (categoryResult.data || []).map((row: Record<string, any>) => ({
    id: row.id, tenantId: salon.id, name: row.name, description: row.description || '',
  }));
  const staff = (staffResult.data || []).map((row: Record<string, any>) => ({
    id: row.id, tenantId: salon.id, name: row.name, position: row.position || 'Stylist', phone: '', email: '',
    assignedServiceIds: services.filter((service: any) => service.assignedStaffIds.includes(row.id)).map((service: any) => service.id),
    status: 'active', defaultServiceCommission: 0, defaultProductCommission: 0,
    workingHours: publicValue(row.working_hours) || {}, color: row.color || '#9E4784',
    createdAt: '', updatedAt: '',
  }));
  return {
    status: 200,
    body: {
      tenant,
      config: publicValue(site.published_config),
      services: publicValue(services),
      categories: publicValue(categories),
      staff: publicValue(staff),
      reviews: (reviewResult.data || []).map((row: Record<string, any>) => ({ ...mapReview(row), tenantId: salon.id })),
    },
  };
}

async function publishWebsite(event: FunctionEvent, body: Record<string, unknown>) {
  if (!slugIsValid(body.slug) || !body.config || typeof body.config !== 'object' || Array.isArray(body.config)) {
    return { status: 400, body: { error: 'A salon address and website configuration are required.' } };
  }
  const db = serviceClient();
  const { data: salon, error } = await db.from('salons').select('id,status').eq('slug', body.slug).maybeSingle();
  if (error || !salon || salon.status !== 'active') return { status: 404, body: { error: 'This salon is not active.' } };
  await requireSalonManager(event, db, salon.id, true);
  const config = publicValue(body.config);
  if (!config || JSON.stringify(config).length > 500000) return { status: 413, body: { error: 'Website configuration is too large or invalid.' } };
  const now = new Date().toISOString();
  const { error: saveError } = await db.from('website_configs').upsert({
    salon_id: salon.id,
    status: 'published',
    draft_config: config,
    published_config: config,
    published_at: now,
    last_saved_at: now,
  }, { onConflict: 'salon_id' });
  if (saveError) return { status: 503, body: { error: 'The website could not be published.' } };
  return { status: 200, body: { success: true, slug: body.slug } };
}

async function readWebsiteDraft(event: FunctionEvent, slug: unknown) {
  if (!slugIsValid(slug)) return { status: 400, body: { error: 'A valid salon website address is required.' } };
  const db = serviceClient();
  const { data: salon, error } = await db.from('salons').select('id').eq('slug', slug).maybeSingle();
  if (error || !salon) return { status: 404, body: { error: 'Salon not found.' } };
  await requireSalonManager(event, db, salon.id, true);
  const { data, error: readError } = await db.from('website_configs')
    .select('status,draft_config,published_config,published_at,last_saved_at').eq('salon_id', salon.id).maybeSingle();
  if (readError) return { status: 503, body: { error: 'Website draft could not be loaded.' } };
  return {
    status: 200,
    body: data ? {
      status: data.status,
      draftConfig: publicValue(data.draft_config),
      publishedConfig: publicValue(data.published_config),
      publishedAt: data.published_at,
      lastSavedAt: data.last_saved_at,
    } : null,
  };
}

async function saveWebsiteDraft(event: FunctionEvent, body: Record<string, unknown>) {
  if (!slugIsValid(body.slug) || !body.draftConfig || typeof body.draftConfig !== 'object' || Array.isArray(body.draftConfig)) {
    return { status: 400, body: { error: 'A salon address and website draft are required.' } };
  }
  const db = serviceClient();
  const { data: salon, error } = await db.from('salons').select('id,status').eq('slug', body.slug).maybeSingle();
  if (error || !salon || salon.status !== 'active') return { status: 404, body: { error: 'This salon is not active.' } };
  await requireSalonManager(event, db, salon.id, true);
  const draftConfig = publicValue(body.draftConfig);
  if (!draftConfig || JSON.stringify(draftConfig).length > 500000) return { status: 413, body: { error: 'Website draft is too large or invalid.' } };
  const { data: existing } = await db.from('website_configs')
    .select('status,published_config,published_at').eq('salon_id', salon.id).maybeSingle();
  const now = new Date().toISOString();
  const { error: saveError } = await db.from('website_configs').upsert({
    salon_id: salon.id,
    status: existing?.status || 'draft',
    draft_config: draftConfig,
    published_config: existing?.published_config || null,
    published_at: existing?.published_at || null,
    last_saved_at: now,
  }, { onConflict: 'salon_id' });
  if (saveError) return { status: 503, body: { error: 'Website draft could not be saved.' } };
  return { status: 200, body: { success: true, lastSavedAt: now } };
}

async function listManagedReviews(event: FunctionEvent, slug: unknown) {
  if (!slugIsValid(slug)) return { status: 400, body: { error: 'Invalid salon website address.' } };
  const db = serviceClient();
  const { data: salon, error } = await db.from('salons').select('id').eq('slug', slug).maybeSingle();
  if (error || !salon) return { status: 404, body: { error: 'Salon not found.' } };
  await requireSalonManager(event, db, salon.id, true);
  const { data, error: readError } = await db.from('website_reviews')
    .select('id,customer_name,customer_phone,rating,review_text,service_ref,status,is_featured,verified_booking,created_at,moderated_at,moderated_by')
    .eq('salon_id', salon.id).order('created_at', { ascending: false }).limit(200);
  if (readError) return { status: 503, body: { error: 'Salon reviews could not be loaded.' } };
  const reviews = (data || []).map((row: Record<string, any>) => ({
    ...mapReview(row), customerPhone: row.customer_phone || undefined, tenantId: salon.id,
    status: row.status, moderatedAt: row.moderated_at || undefined, moderatedBy: row.moderated_by || undefined,
  }));
  return { status: 200, body: { reviews } };
}

async function moderateManagedReview(event: FunctionEvent, slug: unknown, body: Record<string, unknown>) {
  if (!slugIsValid(slug) || !isUuid(body.reviewId)
    || !['pending', 'approved', 'rejected'].includes(String(body.status))
    || (body.isFeatured !== undefined && typeof body.isFeatured !== 'boolean')) {
    return { status: 400, body: { error: 'Invalid review moderation request.' } };
  }
  const db = serviceClient();
  const { data: salon, error } = await db.from('salons').select('id').eq('slug', slug).maybeSingle();
  if (error || !salon) return { status: 404, body: { error: 'Salon not found.' } };
  const manager = await requireSalonManager(event, db, salon.id, true);
  const patch: Record<string, unknown> = {
    status: body.status,
    moderated_at: new Date().toISOString(),
    moderated_by: manager.user.id,
  };
  if (typeof body.isFeatured === 'boolean') patch.is_featured = body.isFeatured;
  const { data, error: updateError } = await db.from('website_reviews').update(patch)
    .eq('id', body.reviewId).eq('salon_id', salon.id).select('id');
  if (updateError) return { status: 503, body: { error: 'Review could not be updated.' } };
  if (!data?.length) return { status: 404, body: { error: 'Review not found.' } };
  return { status: 200, body: { success: true } };
}

async function deleteManagedReview(event: FunctionEvent, slug: unknown, body: Record<string, unknown>) {
  if (!slugIsValid(slug) || !isUuid(body.reviewId)) return { status: 400, body: { error: 'Invalid review deletion request.' } };
  const db = serviceClient();
  const { data: salon, error } = await db.from('salons').select('id').eq('slug', slug).maybeSingle();
  if (error || !salon) return { status: 404, body: { error: 'Salon not found.' } };
  await requireSalonManager(event, db, salon.id, true);
  const { data, error: deleteError } = await db.from('website_reviews').delete()
    .eq('id', body.reviewId).eq('salon_id', salon.id).select('id');
  if (deleteError) return { status: 503, body: { error: 'Review could not be deleted.' } };
  if (!data?.length) return { status: 404, body: { error: 'Review not found.' } };
  return { status: 200, body: { success: true } };
}

async function unpublishWebsite(event: FunctionEvent, slug: unknown) {
  if (!slugIsValid(slug)) return { status: 400, body: { error: 'A valid salon website address is required.' } };
  const db = serviceClient();
  const { data: salon, error } = await db.from('salons').select('id,status').eq('slug', slug).maybeSingle();
  if (error || !salon) return { status: 404, body: { error: 'Salon not found.' } };
  await requireSalonManager(event, db, salon.id, true);
  const { error: updateError } = await db.from('website_configs').update({ status: 'unpublished' }).eq('salon_id', salon.id);
  if (updateError) return { status: 503, body: { error: 'The website could not be unpublished.' } };
  return { status: 200, body: { success: true } };
}

async function submitReview(event: FunctionEvent, slug: unknown, body: Record<string, unknown>) {
  if (!slugIsValid(slug)) return { status: 400, body: { error: 'Invalid salon website address.' } };
  const name = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const rating = Number(body.rating);
  const phone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
  const serviceRef = typeof body.serviceRef === 'string' ? body.serviceRef.trim() : '';
  if (name.length < 2 || name.length > 60 || text.length < 10 || text.length > 800
    || !Number.isInteger(rating) || rating < 1 || rating > 5 || phone.length > 40 || serviceRef.length > 80) {
    return { status: 400, body: { error: 'Check the review name, rating and text and try again.' } };
  }
  const db = serviceClient();
  const { data: salon, error } = await db.from('salons').select('id').eq('slug', slug).eq('status', 'active').maybeSingle();
  if (error || !salon) return { status: 404, body: { error: 'This salon website is not available.' } };
  const secret = process.env.RATE_LIMIT_HMAC_SECRET || '';
  const ip = Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === 'x-nf-client-connection-ip')?.[1]?.trim() || '';
  if (secret.length < 32 || !isIP(ip)) return { status: 503, body: { error: 'Review submission is temporarily unavailable.' } };
  const requesterHash = createHmac('sha256', secret).update(ip).digest('hex');
  const { data: allowed, error: limitError } = await db.rpc('consume_public_review_rate_limit', {
    p_salon_id: salon.id, p_requester_hash: requesterHash, p_max_requests: 5, p_window_minutes: 60,
  });
  if (limitError) return { status: 503, body: { error: 'Review submission is temporarily unavailable.' } };
  if (allowed !== true) return { status: 429, body: { error: 'Too many reviews were submitted from this connection. Try again later.' } };
  const { data: review, error: insertError } = await db.from('website_reviews').insert({
    salon_id: salon.id,
    customer_name: name,
    customer_phone: phone || null,
    rating,
    review_text: text,
    service_ref: serviceRef || null,
    status: 'pending',
    is_featured: false,
    verified_booking: false,
    moderated_at: null,
    moderated_by: null,
  }).select('id,customer_name,rating,review_text,service_ref,status,is_featured,verified_booking,created_at').single();
  if (insertError || !review) return { status: 503, body: { error: 'Your review could not be submitted right now.' } };
  return { status: 200, body: { success: true, review: { ...mapReview(review), status: 'pending', tenantId: salon.id } } };
}

async function submitBooking(slug: unknown, body: Record<string, unknown>) {
  if (!slugIsValid(slug)) return { status: 400, body: { error: 'Invalid salon website address.' } };
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { status: 503, body: { error: 'Supabase booking service is not configured.' } };
  const rpcClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId : '';
  const serviceIds = Array.isArray(body.serviceIds) ? body.serviceIds : serviceId ? [serviceId] : [];
  const { data, error } = await rpcClient.rpc('submit_public_booking', {
    p_salon_slug: slug,
    p_customer_name: body.clientName ?? body.customerName ?? '',
    p_customer_phone: body.clientPhone ?? body.customerPhone ?? '',
    p_customer_email: body.clientEmail ?? body.customerEmail ?? null,
    p_staff_id: body.staffId || null,
    p_service_ids: serviceIds,
    p_date: body.date,
    p_start_time: body.startTime,
    p_end_time: body.endTime,
    p_duration_minutes: body.durationMinutes,
    p_idempotency_key: body.idempotencyKey,
    p_notes: body.notes || null,
  });
  if (error) return { status: 400, body: { error: error.message || 'The booking could not be completed.' } };
  return { status: 200, body: { success: true, booking: data } };
}

export const handler = async (event: FunctionEvent) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: responseHeaders(event), body: '' };
  if (event.httpMethod === 'POST') {
    const contentType = Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '';
    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) return jsonResponse(event, 415, { error: 'Content-Type must be application/json.' });
  }
  const resource = event.queryStringParameters?.resource || '';
  const slug = event.queryStringParameters?.slug || '';
  try {
    let result: { status: number; body: unknown };
    if (event.httpMethod === 'GET' && resource === 'website') result = await publicWebsite(slug);
    else if (event.httpMethod === 'GET' && resource === 'draft') result = await readWebsiteDraft(event, slug);
    else if (event.httpMethod === 'GET' && resource === 'manage-reviews') result = await listManagedReviews(event, slug);
    else if (event.httpMethod === 'POST' && resource === 'publish') result = await publishWebsite(event, parseBody(event, 524288));
    else if (event.httpMethod === 'POST' && resource === 'save-draft') result = await saveWebsiteDraft(event, parseBody(event, 524288));
    else if (event.httpMethod === 'POST' && resource === 'unpublish') result = await unpublishWebsite(event, slug);
    else if (event.httpMethod === 'POST' && resource === 'moderate-review') result = await moderateManagedReview(event, slug, parseBody(event, 16384));
    else if (event.httpMethod === 'POST' && resource === 'delete-review') result = await deleteManagedReview(event, slug, parseBody(event, 16384));
    else if (event.httpMethod === 'POST' && resource === 'review') result = await submitReview(event, slug, parseBody(event, 16384));
    else if (event.httpMethod === 'POST' && resource === 'booking') result = await submitBooking(slug, parseBody(event, 16384));
    else result = { status: 404, body: { error: 'API route not found.' } };
    return jsonResponse(event, result.status, result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    const status = /invalid or expired|authorization is required|authenticated .* access is required/i.test(message) ? 401
      : /authorization|active salon|plan|owner|manager|super admin|mfa assurance/i.test(message) ? 403
      : /configuration is incomplete|not configured/i.test(message) ? 503 : 400;
    return jsonResponse(event, status, { error: message });
  }
};
