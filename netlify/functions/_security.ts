import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export interface FunctionEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  rawUrl?: string;
  path?: string;
}

export interface AuthenticatedAdmin {
  user: User;
  aal: string;
}

export interface AuthenticatedSalonManager {
  user: User;
  salonId: string;
  role: 'owner' | 'manager';
}

function header(event: FunctionEvent, name: string): string | undefined {
  const key = Object.keys(event.headers || {}).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? event.headers[key] : undefined;
}

function configuredOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      try { return [new URL(value).origin]; } catch { return []; }
    });
}

export function responseHeaders(event: FunctionEvent): Record<string, string> {
  const origin = header(event, 'origin');
  const allowed = configuredOrigins();
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (origin && origin !== 'null' && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function jsonResponse(event: FunctionEvent, statusCode: number, body: unknown) {
  return { statusCode, headers: responseHeaders(event), body: JSON.stringify(body) };
}

export function parseBody(event: FunctionEvent, maxBytes = 262144): Record<string, unknown> {
  if (!event.body) return {};
  if (Buffer.byteLength(event.body, 'utf8') > maxBytes) throw new Error('Request body is too large.');
  const parsed: unknown = JSON.parse(event.body);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Request body must be a JSON object.');
  return parsed as Record<string, unknown>;
}

export function bearerToken(event: FunctionEvent): string | null {
  const value = header(event, 'authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : null;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) return {};
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;
}

export function serviceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key.includes('your-supabase-service-role-key')) throw new Error('Supabase server configuration is incomplete.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function requireSuperAdmin(event: FunctionEvent, adminClient: SupabaseClient): Promise<AuthenticatedAdmin> {
  const token = bearerToken(event);
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!token || !anonKey || !url) throw new Error('Authorization is required.');

  const authClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid or expired authorization token.');

  const { data: admin, error: adminError } = await adminClient
    .from('platform_admins')
    .select('user_id, role')
    .eq('user_id', data.user.id)
    .eq('role', 'superadmin')
    .maybeSingle();
  if (adminError || !admin) throw new Error('Super Admin authorization required.');

  const aal = String(decodeJwtPayload(token).aal || 'aal1');
  if (aal !== 'aal2') throw new Error('Super Admin MFA assurance level AAL2 is required.');
  return { user: data.user, aal };
}

export async function requireSalonManager(
  event: FunctionEvent,
  adminClient: SupabaseClient,
  salonId: string,
  requirePortfolio = false,
): Promise<AuthenticatedSalonManager> {
  if (!isUuid(salonId)) throw new Error('A valid salon ID is required.');
  const token = bearerToken(event);
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!token || !anonKey || !url) throw new Error('Authenticated salon-manager access is required.');

  const authClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) throw new Error('Invalid or expired authorization token.');

  const { data: member, error: memberError } = await adminClient.from('salon_members')
    .select('role').eq('salon_id', salonId).eq('user_id', authData.user.id).eq('status', 'active').maybeSingle();
  if (memberError || !member || !['owner', 'manager'].includes(member.role)) {
    throw new Error('Active salon owner or manager authorization is required.');
  }
  const { data: salon, error: salonError } = await adminClient.from('salons')
    .select('status').eq('id', salonId).maybeSingle();
  if (salonError || !salon || salon.status !== 'active') throw new Error('This salon is not active.');

  if (requirePortfolio) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: subscription, error: subscriptionError } = await adminClient.from('salon_subscriptions')
      .select('status, plan_id, end_date').eq('salon_id', salonId).maybeSingle();
    if (subscriptionError || !subscription || !['active', 'trial'].includes(subscription.status) || subscription.end_date < today) {
      throw new Error('An active salon plan is required to publish a website.');
    }
    const { data: plan, error: planError } = await adminClient.from('subscription_plans')
      .select('has_portfolio').eq('id', subscription.plan_id).maybeSingle();
    if (planError || !plan?.has_portfolio) throw new Error('The current salon plan does not include website publishing.');
  }
  return { user: authData.user, salonId, role: member.role as 'owner' | 'manager' };
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
