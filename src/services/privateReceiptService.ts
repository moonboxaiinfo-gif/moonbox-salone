import { isSupabaseConfigured, supabase } from './supabaseClient';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export class PrivateReceiptService {
  static async upload(file: File, salonId: string): Promise<{ success: true; path: string } | { success: false; error: string }> {
    if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Secure Supabase Storage is not configured.' };
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.access_token) return { success: false, error: 'Sign in to the salon owner account before uploading a receipt.' };
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(salonId)) {
      return { success: false, error: 'A valid salon account is required for secure receipt storage.' };
    }
    const extension = TYPES[file.type];
    if (!extension) return { success: false, error: 'Accepted formats: JPG, PNG, WebP or PDF.' };
    if (file.size <= 0 || file.size > MAX_BYTES) return { success: false, error: 'Receipt files must be 5 MB or smaller.' };
    const path = `${salonId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('payment-receipts').upload(path, file, {
      contentType: file.type,
      cacheControl: '0',
      upsert: false,
    });
    if (error) return { success: false, error: `Private receipt upload failed: ${error.message}` };
    return { success: true, path };
  }

  static async getAdminViewUrl(paymentId: string): Promise<string> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase authentication is not configured.');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) throw new Error('Sign in with an authorized platform administrator account.');
    const response = await fetch('/.netlify/functions/receipt-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ paymentId }),
      cache: 'no-store',
      credentials: 'omit',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.signedUrl !== 'string') {
      throw new Error(body.error || 'Could not create a secure receipt viewing link.');
    }
    return body.signedUrl;
  }
}
