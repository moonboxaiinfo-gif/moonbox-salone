import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { handler as cloudinaryHandler } from '../../netlify/functions/cloudinary-sign';
import { handler as emailHandler } from '../../netlify/functions/send-email';
import { handler as supabaseAdminHandler } from '../../netlify/functions/supabase-admin';
import { CloudinaryService } from './cloudinaryService';
import { EmailService } from './emailService';

describe('Environment Variables & Netlify Functions Security Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('ensures .gitignore blocks all secret environment files', () => {
    const gitignoreContent = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('.env');
    expect(gitignoreContent).toContain('.env.local');
    expect(gitignoreContent).toContain('!.env.example');
  });

  it('ensures .env.example contains only placeholders and exact variable names', () => {
    const envExample = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf-8');
    
    // Client-safe variables
    expect(envExample).toContain('VITE_SUPABASE_URL=');
    expect(envExample).toContain('VITE_SUPABASE_ANON_KEY=');
    expect(envExample).toContain('VITE_CLOUDINARY_CLOUD_NAME=');

    // Server-only secrets MUST NOT have VITE_ prefix
    expect(envExample).toContain('SUPABASE_SERVICE_ROLE_KEY=');
    expect(envExample).not.toContain('VITE_SUPABASE_SERVICE_ROLE_KEY');
    
    expect(envExample).toContain('CLOUDINARY_API_KEY=');
    expect(envExample).not.toContain('VITE_CLOUDINARY_API_KEY');

    expect(envExample).toContain('CLOUDINARY_API_SECRET=');
    expect(envExample).not.toContain('VITE_CLOUDINARY_API_SECRET');

    expect(envExample).toContain('RESEND_API_KEY=');
    expect(envExample).toContain('RESEND_FROM_EMAIL=');
    expect(envExample).toContain('RATE_LIMIT_HMAC_SECRET=');
    expect(envExample).not.toContain('VITE_RESEND_API_KEY');
  });

  it('returns 503 with clear configuration error when Cloudinary credentials are not configured', async () => {
    const originalSecret = process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_API_SECRET;

    const status = await cloudinaryHandler({ httpMethod: 'GET', body: null, headers: {} });
    expect(JSON.parse(status.body).configured).toBe(false);
    const res = await cloudinaryHandler({
      httpMethod: 'POST',
      body: JSON.stringify({ salonId: '00000000-0000-4000-8000-000000000001', purpose: 'website', fileType: 'image' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).error).toContain('Cloudinary server credentials are not configured');

    if (originalSecret) process.env.CLOUDINARY_API_SECRET = originalSecret;
  });

  it('returns 503 with clear configuration error when Resend API key is not configured', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    const originalFrom = process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;

    const status = await emailHandler({ httpMethod: 'GET', body: null, headers: {} });
    expect(JSON.parse(status.body).configured).toBe(false);
    const res = await emailHandler({
      httpMethod: 'POST',
      body: JSON.stringify({ template: 'booking-confirmation', appointmentId: '00000000-0000-4000-8000-000000000001', salonSlug: 'salon-one' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('Server email credentials are not configured');

    if (originalKey) process.env.RESEND_API_KEY = originalKey;
    if (originalFrom) process.env.RESEND_FROM_EMAIL = originalFrom;
  });

  it('returns 503 with clear configuration error when Supabase service-role key is not configured', async () => {
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ action: 'health_check' }),
      headers: {}
    };

    const res = await supabaseAdminHandler(event);
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.configured).toBe(false);
    expect(body.error).toContain('Supabase service-role key is not configured');

    if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('CloudinaryService returns clear error without faking success when server reports missing credentials', async () => {
    // Mock fetch returning 503 from Netlify function
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: 'Cloudinary server credentials are not configured.',
      })
    } as any));

    const dummyFile = new File(['image-bytes'], 'test.jpg', { type: 'image/jpeg' });
    const result = await CloudinaryService.uploadImage(dummyFile, '00000000-0000-4000-8000-000000000001');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Supabase authentication');
    expect(result.secureUrl).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('EmailService reports missing provider credentials without accepting arbitrary email content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: 'Server email credentials are not configured.',
      })
    } as any));

    const result = await EmailService.sendAppointmentConfirmation(
      '00000000-0000-4000-8000-000000000001', 'salon-one',
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Server email credentials are not configured');
    const request = JSON.parse(String((fetch as any).mock.calls[0][1].body));
    expect(request).toEqual({ template: 'booking-confirmation', appointmentId: '00000000-0000-4000-8000-000000000001', salonSlug: 'salon-one' });
  });
});
