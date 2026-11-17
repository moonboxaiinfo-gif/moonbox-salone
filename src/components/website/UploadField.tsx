import React, { useRef, useState } from 'react';
import { Upload, Loader2, Link2, ImagePlus, X } from 'lucide-react';
import { CloudinaryService } from '../../services/cloudinaryService';

/**
 * Image input with Cloudinary upload + paste-URL fallback.
 * Reports upload progress states and validation errors.
 */
export const ImageUploadField: React.FC<{
  label: string;
  value: string;
  tenantId: string;
  onChange: (url: string) => void;
  folder?: string;
  compact?: boolean;
}> = ({ label, value, tenantId, onChange, folder: _folder, compact }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 10 MB.');
      return;
    }
    setError(null);
    setUploading(true);
    const res = await CloudinaryService.uploadImage(file, tenantId, 'website');
    setUploading(false);
    if (res.success && res.secureUrl) {
      onChange(res.secureUrl);
    } else {
      setError(res.error || 'Upload failed. You can paste an image URL instead.');
      setShowUrlInput(true);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</label>
      <div className="flex items-start gap-2.5">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-[#35174F] bg-slate-50 dark:bg-[#210D33] shrink-0 flex items-center justify-center">
          {value ? (
            <>
              <img src={value} alt={label} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange('')}
                aria-label={`Remove ${label}`}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <ImagePlus className="w-6 h-6 text-slate-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F5F0FF] dark:bg-[#2E1444] text-[#7C3AED] dark:text-[#DE9E74] text-[11px] font-bold hover:opacity-90 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(s => !s)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-slate-500 dark:text-[#AAA6BD] text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-[#210D33]"
            >
              <Link2 className="w-3.5 h-3.5" /> URL
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {showUrlInput && (
            <div className="flex gap-1.5 mt-1.5">
              <input
                type="url"
                value={urlDraft}
                onChange={e => setUrlDraft(e.target.value)}
                placeholder="https://…"
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                type="button"
                onClick={() => { if (urlDraft.trim()) { onChange(urlDraft.trim()); setUrlDraft(''); setShowUrlInput(false); } }}
                className="px-3 py-1.5 rounded-lg bg-[#1B0C2D] text-white text-[11px] font-bold"
              >
                Use
              </button>
            </div>
          )}
          {error && <p className="text-[10px] text-red-500 font-semibold mt-1.5" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
};
