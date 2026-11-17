import { createHash } from 'node:crypto';
import {
  FunctionEvent,
  isUuid,
  jsonResponse,
  parseBody,
  requireSalonManager,
  responseHeaders,
  serviceClient,
} from './_security.ts';

const purposes = new Set(['website', 'portfolio']);

export const handler = async (event: FunctionEvent) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: responseHeaders(event), body: '' };

  if (event.httpMethod === 'GET') {
    const configured = Boolean(process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_CLOUD_NAME);
    return jsonResponse(event, 200, {
      service: 'cloudinary',
      configured,
      cloudName: configured ? process.env.CLOUDINARY_CLOUD_NAME : null,
      message: configured ? 'Signed upload service is configured.' : 'Server upload credentials are not configured.',
    });
  }

  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method not allowed.' });
  if (!/^application\/json(?:\s*;|$)/i.test(Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '')) {
    return jsonResponse(event, 415, { error: 'Content-Type must be application/json.' });
  }

  try {
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!apiSecret || !apiKey || !cloudName || !/^[a-zA-Z0-9-]+$/.test(cloudName)) {
      return jsonResponse(event, 503, { error: 'Cloudinary server credentials are not configured.' });
    }

    const payload = parseBody(event, 4096);
    if (!isUuid(payload.salonId) || typeof payload.purpose !== 'string' || !purposes.has(payload.purpose)) {
      return jsonResponse(event, 400, { error: 'A valid salon ID and upload purpose are required.' });
    }
    if (payload.fileType !== 'image') return jsonResponse(event, 400, { error: 'Only image uploads are supported.' });

    const adminClient = serviceClient();
    const manager = await requireSalonManager(
      event,
      adminClient,
      payload.salonId,
      payload.purpose === 'website' || payload.purpose === 'portfolio',
    );
    const allowedFormats = 'jpg,png,webp';
    const resourceType = 'image';
    const folder = `moonbox-salon/${manager.salonId}/${payload.purpose}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signedParameters = `allowed_formats=${allowedFormats}&folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash('sha1').update(`${signedParameters}${apiSecret}`, 'utf8').digest('hex');

    return jsonResponse(event, 200, { signature, timestamp, apiKey, cloudName, folder, allowedFormats, resourceType });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload authorization failed.';
    const status = /invalid or expired|authorization is required|authenticated .* access is required/i.test(message) ? 401
      : /authorization|active salon|plan|owner|manager|super admin|mfa assurance/i.test(message) ? 403
      : /configuration is incomplete|not configured/i.test(message) ? 503 : 400;
    return jsonResponse(event, status, { error: message });
  }
};
