import { FunctionEvent, isUuid, jsonResponse, parseBody, responseHeaders, serviceClient } from './_security.ts';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
}

function validEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const handler = async (event: FunctionEvent) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: responseHeaders(event), body: '' };

  if (event.httpMethod === 'GET') {
    const configured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
    return jsonResponse(event, 200, {
      service: 'resend',
      configured,
      fromEmail: configured ? process.env.RESEND_FROM_EMAIL : null,
      message: configured ? 'Booking-confirmation email service is configured.' : 'Server email credentials are not configured.',
    });
  }

  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method not allowed.' });
  const contentType = Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) return jsonResponse(event, 415, { error: 'Content-Type must be application/json.' });

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail || /[\r\n]/.test(fromEmail)) return jsonResponse(event, 503, { error: 'Server email credentials are not configured.' });

  try {
    const body = parseBody(event, 4096);
    if (body.template !== 'booking-confirmation' || !isUuid(body.appointmentId)
      || typeof body.salonSlug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.salonSlug) || body.salonSlug.length > 80) {
      return jsonResponse(event, 400, { error: 'A valid booking confirmation request is required.' });
    }

    const db = serviceClient();
    const { data: salon, error: salonError } = await db.from('salons')
      .select('id,name,status').eq('slug', body.salonSlug).maybeSingle();
    if (salonError || !salon || salon.status !== 'active') return jsonResponse(event, 404, { error: 'The salon is not available.' });

    const { data: appointment, error: appointmentError } = await db.from('appointments')
      .select('id,salon_id,customer_name,customer_email,staff_name,service_names,date,start_time,booking_source,created_at')
      .eq('id', body.appointmentId).eq('salon_id', salon.id).maybeSingle();
    if (appointmentError || !appointment || appointment.booking_source !== 'online_portal' || !validEmail(appointment.customer_email)) {
      return jsonResponse(event, 404, { error: 'A matching online booking with an email address was not found.' });
    }
    const createdAt = Date.parse(String(appointment.created_at));
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 24 * 60 * 60 * 1000 || createdAt > Date.now() + 5 * 60 * 1000) {
      return jsonResponse(event, 410, { error: 'This confirmation link has expired.' });
    }

    const { data: dispatch, error: dispatchError } = await db.from('transactional_email_dispatches')
      .insert({ appointment_id: appointment.id, template: 'booking-confirmation', recipient_email: appointment.customer_email, status: 'pending' })
      .select('id').single();
    if (dispatchError) {
      if (dispatchError.code === '23505') return jsonResponse(event, 409, { error: 'A confirmation email has already been requested for this booking.' });
      return jsonResponse(event, 503, { error: 'Email dispatch is temporarily unavailable.' });
    }

    const services = Array.isArray(appointment.service_names) ? appointment.service_names.join(', ') : '';
    const name = escapeHtml(appointment.customer_name);
    const salonName = escapeHtml(salon.name);
    const serviceNames = escapeHtml(services);
    const staffName = escapeHtml(appointment.staff_name);
    const date = escapeHtml(appointment.date);
    const time = escapeHtml(String(appointment.start_time).slice(0, 5));
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#231b2c"><h2>Booking received — ${salonName}</h2><p>Hello ${name},</p><p>Your online booking request has been received. The salon will contact you to confirm the appointment.</p><p><b>Service:</b> ${serviceNames}<br><b>Stylist:</b> ${staffName}<br><b>Date:</b> ${date}<br><b>Time:</b> ${time}</p><p>Thank you for choosing ${salonName}.</p></div>`;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [appointment.customer_email], subject: `Booking request received — ${salon.name}`, html }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      await db.from('transactional_email_dispatches').update({ status: 'failed' }).eq('id', dispatch.id);
      return jsonResponse(event, 502, { error: 'The booking was saved, but the confirmation email could not be delivered.' });
    }

    await db.from('transactional_email_dispatches').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', dispatch.id);
    return jsonResponse(event, 200, { success: true, status: 'sent' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid email request.';
    const status = /configuration is incomplete|not configured/i.test(message) ? 503
      : /invalid or expired|authorization is required/i.test(message) ? 401 : 400;
    return jsonResponse(event, status, { error: message });
  }
};
