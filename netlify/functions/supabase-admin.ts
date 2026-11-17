import {
  FunctionEvent,
  isUuid,
  jsonResponse,
  parseBody,
  requireSuperAdmin,
  responseHeaders,
  serviceClient,
} from './_security.js';

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
    let data: unknown = null;
    let error: { message: string } | null = null;

    if (action === 'grant_trial') {
      const durationDays = Number(payload.durationDays);
      if (![7, 14, 30].includes(durationDays)) return jsonResponse(event, 400, { error: 'durationDays must be 7, 14, or 30.' });
      const now = new Date();
      const trialEnd = new Date(now.getTime() + durationDays * 86400000);
      const endDate = new Date(now.getTime() + (durationDays + 30) * 86400000);
      const planId = typeof payload.planId === 'string' && payload.planId.trim() ? payload.planId.trim() : 'plan_growth';
      ({ error } = await adminClient.from('salons').update({ status: 'active', updated_at: now.toISOString() }).eq('id', salonId));
      if (!error) ({ data, error } = await adminClient.from('salon_subscriptions').upsert({ salon_id: salonId, plan_id: planId, status: 'trial', billing_cycle: 'monthly', start_date: now.toISOString().slice(0, 10), end_date: endDate.toISOString().slice(0, 10), trial_ends_at: trialEnd.toISOString().slice(0, 10), auto_renew: false, updated_at: now.toISOString() }).select().single());
      if (!error) await adminClient.from('audit_logs').insert({ salon_id: salonId, actor_email: actor.user.email || actor.user.id, actor_role: 'superadmin', action: 'GRANT_TRIAL', entity: 'subscription', entity_id: salonId, details: `Granted ${durationDays}-day trial until ${trialEnd.toISOString().slice(0, 10)}` });
    } else if (action === 'revoke_trial') {
      const today = new Date().toISOString().slice(0, 10);
      ({ data, error } = await adminClient.from('salon_subscriptions').update({ status: 'expired', trial_ends_at: today, updated_at: new Date().toISOString() }).eq('salon_id', salonId).select().single());
      if (!error) await adminClient.from('audit_logs').insert({ salon_id: salonId, actor_email: actor.user.email || actor.user.id, actor_role: 'superadmin', action: 'REVOKE_TRIAL', entity: 'subscription', entity_id: salonId, details: 'Trial revoked. Salon operational data preserved.' });
    } else if (action === 'extend_trial') {
      const additionalDays = Number(payload.additionalDays);
      if (!Number.isInteger(additionalDays) || additionalDays < 1 || additionalDays > 365) return jsonResponse(event, 400, { error: 'additionalDays must be an integer from 1 to 365.' });
      const { data: subscription, error: subscriptionError } = await adminClient.from('salon_subscriptions').select('trial_ends_at').eq('salon_id', salonId).maybeSingle();
      if (subscriptionError) error = subscriptionError;
      else {
        const current = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : new Date();
        const base = current.getTime() > Date.now() ? current : new Date();
        const newEnd = new Date(base.getTime() + additionalDays * 86400000);
        ({ data, error } = await adminClient.from('salon_subscriptions').update({ status: 'trial', trial_ends_at: newEnd.toISOString().slice(0, 10), updated_at: new Date().toISOString() }).eq('salon_id', salonId).select().single());
        if (!error) await adminClient.from('audit_logs').insert({ salon_id: salonId, actor_email: actor.user.email || actor.user.id, actor_role: 'superadmin', action: 'EXTEND_TRIAL', entity: 'subscription', entity_id: salonId, details: `Extended trial by ${additionalDays} days until ${newEnd.toISOString().slice(0, 10)}` });
      }
    } else if (action === 'assign_package') {
      const planId = typeof payload.planId === 'string' ? payload.planId.trim() : '';
      const billingCycle = payload.billingCycle === 'yearly' ? 'yearly' : 'monthly';
      if (!planId || planId.length > 80) return jsonResponse(event, 400, { error: 'A valid planId is required.' });
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + (billingCycle === 'yearly' ? 12 : 1));
      ({ error } = await adminClient.from('salons').update({ status: 'active', updated_at: now.toISOString() }).eq('id', salonId));
      if (!error) ({ data, error } = await adminClient.from('salon_subscriptions').upsert({ salon_id: salonId, plan_id: planId, status: 'active', billing_cycle: billingCycle, start_date: now.toISOString().slice(0, 10), end_date: endDate.toISOString().slice(0, 10), auto_renew: true, updated_at: now.toISOString() }).select().single());
      if (!error) await adminClient.from('audit_logs').insert({ salon_id: salonId, actor_email: actor.user.email || actor.user.id, actor_role: 'superadmin', action: 'ASSIGN_PACKAGE', entity: 'subscription', entity_id: salonId, details: `Assigned ${planId} (${billingCycle})` });
    } else if (action === 'update_salon_status') {
      const status = payload.status;
      if (status !== 'active' && status !== 'suspended') return jsonResponse(event, 400, { error: 'status must be active or suspended.' });
      ({ data, error } = await adminClient.from('salons').update({ status, updated_at: new Date().toISOString() }).eq('id', salonId).select('id,status').single());
      if (!error) {
        await adminClient.from('audit_logs').insert({
          salon_id: salonId,
          actor_email: actor.user.email || actor.user.id,
          actor_role: 'superadmin',
          action: 'UPDATE_SALON_STATUS',
          entity: 'salon',
          entity_id: salonId,
          details: `Salon status changed to ${status}`,
        });
      }
    } else {
      return jsonResponse(event, 400, { error: 'Unsupported admin action.' });
    }

    if (error) return jsonResponse(event, 400, { error: error.message });
    return jsonResponse(event, 200, { success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized server operation.';
    const status = /authorization|required|token|MFA|Super Admin/i.test(message) ? 401 : 500;
    return jsonResponse(event, status, { error: message });
  }
};
