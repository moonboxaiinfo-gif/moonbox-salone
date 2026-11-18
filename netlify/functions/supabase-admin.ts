import {
  FunctionEvent,
  isUuid,
  jsonResponse,
  parseBody,
  bearerToken,
  requireSuperAdmin,
  responseHeaders,
  serviceClient,
} from './_security.js';
import { createClient } from '@supabase/supabase-js';

export const handler = async (event: FunctionEvent) => {
  const headers = responseHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  if (event.httpMethod === 'GET') {
    const configured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL));
    return jsonResponse(event, 200, {
      service: 'supabase_admin',
      configured,
      message: configured ? 'Server-side Supabase administration is configured.' : 'Server-side Supabase configuration is incomplete.',
    });
  }
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)) {
    return jsonResponse(event, 503, { error: 'Supabase service-role key is not configured on the server.', configured: false });
  }

  let adminClient;
  try {
    adminClient = serviceClient();
    const actor = await requireSuperAdmin(event, adminClient);
    const payload = parseBody(event);
    const action = payload.action;
    const salonId = payload.salonId;
    if (salonId !== undefined && !isUuid(salonId)) return jsonResponse(event, 400, { error: 'salonId must be a valid UUID.' });

    if (action === 'health_check') {
      const { error } = await adminClient.from('salons').select('id', { count: 'exact', head: true });
      return jsonResponse(event, error ? 500 : 200, { success: !error, message: error?.message || 'Database connectivity verified.' });
    }

    if (!salonId && action !== 'health_check') return jsonResponse(event, 400, { error: 'salonId is required.' });
    const supportedActions = new Set([
      'grant_trial',
      'revoke_trial',
      'extend_trial',
      'assign_package',
      'update_salon_status',
    ]);
    if (!supportedActions.has(action as string)) {
      return jsonResponse(event, 400, { error: 'Unsupported admin action.' });
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const token = bearerToken(event);
    if (!url || !anonKey || !token) {
      return jsonResponse(event, 503, { error: 'Authenticated database execution is not configured.' });
    }
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await userClient.rpc('execute_superadmin_lifecycle', {
      p_action: action,
      p_salon_id: salonId,
      p_duration_days: action === 'grant_trial' ? Number(payload.durationDays) : null,
      p_additional_days: action === 'extend_trial' ? Number(payload.additionalDays) : null,
      p_plan_id: typeof payload.planId === 'string' ? payload.planId : null,
      p_billing_cycle: payload.billingCycle === 'yearly' ? 'yearly' : 'monthly',
      p_status: typeof payload.status === 'string' ? payload.status : null,
    });

    if (error) return jsonResponse(event, 400, { error: error.message });
    return jsonResponse(event, 200, { success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized server operation.';
    const status = /authorization|required|Super Admin|MFA/i.test(message) ? 403
      : /invalid or expired|authorization is required|token/i.test(message) ? 401
      : 500;
    return jsonResponse(event, status, { error: message });
  }
};
