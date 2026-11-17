import { FunctionEvent, isUuid, jsonResponse, parseBody, requireSuperAdmin, responseHeaders, serviceClient } from './_security.ts';

export const handler = async (event: FunctionEvent) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: responseHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method not allowed.' });
  const contentType = Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) return jsonResponse(event, 415, { error: 'Content-Type must be application/json.' });

  try {
    const body = parseBody(event, 2048);
    if (!isUuid(body.paymentId)) return jsonResponse(event, 400, { error: 'A valid payment request ID is required.' });
    const db = serviceClient();
    await requireSuperAdmin(event, db);
    const { data: payment, error } = await db.from('manual_payment_requests')
      .select('id,salon_id,receipt_url,receipt_file_name').eq('id', body.paymentId).maybeSingle();
    if (error || !payment || typeof payment.receipt_url !== 'string') return jsonResponse(event, 404, { error: 'Private receipt not found.' });
    const objectPath = payment.receipt_url;
    const [folder, filename, extra] = objectPath.split('/');
    const objectId = filename?.replace(/\.(?:jpg|png|webp|pdf)$/i, '');
    if (extra !== undefined || folder !== payment.salon_id || !isUuid(folder) || !objectId || !isUuid(objectId)
      || !/\.(?:jpg|png|webp|pdf)$/i.test(filename)) {
      return jsonResponse(event, 404, { error: 'This payment does not reference a private receipt object.' });
    }
    const downloadName = typeof payment.receipt_file_name === 'string'
      ? payment.receipt_file_name.replace(/[\r\n"\\/]/g, '_').slice(0, 120) || 'payment-receipt'
      : 'payment-receipt';
    const { data, error: signError } = await db.storage.from('payment-receipts').createSignedUrl(objectPath, 300, { download: downloadName });
    if (signError || !data?.signedUrl) return jsonResponse(event, 503, { error: 'A secure receipt viewing link could not be created.' });
    return jsonResponse(event, 200, { signedUrl: data.signedUrl, expiresIn: 300 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Receipt authorization failed.';
    const status = /invalid or expired|authorization is required/i.test(message) ? 401
      : /authorization|super admin|mfa assurance/i.test(message) ? 403
      : /configuration is incomplete/i.test(message) ? 503 : 400;
    return jsonResponse(event, status, { error: message });
  }
};
