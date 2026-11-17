/**
 * Client-Side Cloudinary Upload Service
 * Requests signed upload authorization from Netlify function.
 * Never exposes API secrets on the client!
 * If credentials are missing, reports a clear configuration error.
 */

import { isSupabaseConfigured, supabase } from './supabaseClient';

export type CloudinaryUploadPurpose = 'website' | 'portfolio';

export interface CloudinaryUploadResult {
  success: boolean;
  secureUrl?: string;
  publicId?: string;
  error?: string;
}

export class CloudinaryService {
  /**
   * Check if Cloudinary is configured on the server
   */
  static async checkStatus(): Promise<{ configured: boolean; message: string; cloudName?: string }> {
    try {
      const res = await fetch('/.netlify/functions/cloudinary-sign', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        return {
          configured: Boolean(data.configured),
          message: data.message || 'Status checked.',
          cloudName: data.cloudName
        };
      }

      return {
        configured: false,
        message: 'Cloudinary credentials are not configured in Netlify Environment Variables.'
      };
    } catch {
      return {
        configured: false,
        message: 'Could not connect to Netlify function endpoint.'
      };
    }
  }

  /**
   * Upload an image to Cloudinary via signed serverless authorization
   */
  static async uploadImage(file: File, salonId: string, purpose: CloudinaryUploadPurpose = 'website'): Promise<CloudinaryUploadResult> {
    try {
      if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Supabase authentication must be configured before uploads are available.' };
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) return { success: false, error: 'Sign in to your salon before uploading files.' };
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedImageTypes.includes(file.type)) return { success: false, error: 'Only JPG, PNG and WebP images are accepted.' };
      if (file.size > 10 * 1024 * 1024) {
        return { success: false, error: 'The selected file is larger than the permitted size.' };
      }
      // Step 1: Request signed authorization from Netlify serverless endpoint
      const signRes = await fetch('/.netlify/functions/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ salonId, purpose, fileType: 'image' })
      });

      if (!signRes.ok) {
        const errData = await signRes.json().catch(() => ({}));
        const errorMessage = errData.error || 
          'Cloudinary is not configured. Please add CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, and CLOUDINARY_CLOUD_NAME in Netlify Project Configuration → Environment Variables.';
        
        return {
          success: false,
          error: errorMessage
        };
      }

      const signData = await signRes.json();
      if (!signData.signature || !signData.apiKey || !signData.cloudName) {
        return {
          success: false,
          error: 'Invalid signature payload received from Cloudinary signing endpoint.'
        };
      }

      // Step 2: Upload directly to Cloudinary using server-generated signature
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', String(signData.timestamp));
      formData.append('signature', signData.signature);
      formData.append('folder', signData.folder);
      formData.append('allowed_formats', signData.allowedFormats);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/${signData.resourceType}/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json().catch(() => ({}));
        return {
          success: false,
          error: uploadErr.error?.message || `Cloudinary upload failed with status ${uploadRes.status}`
        };
      }

      const uploadData = await uploadRes.json();
      return {
        success: true,
        secureUrl: uploadData.secure_url,
        publicId: uploadData.public_id
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error attempting to upload image to Cloudinary.'
      };
    }
  }
}
