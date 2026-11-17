import React, { useState } from 'react';
import { SalonTenant, PortfolioImage } from '../../types';
import { StorageService } from '../../services/storageService';
import { CloudinaryService } from '../../services/cloudinaryService';
import { CustomDomainModal } from './CustomDomainModal';
import { 
  Globe, 
  ExternalLink, 
  Sparkles, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Save, 
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Upload,
  AlertCircle
} from 'lucide-react';

interface PortfolioBuilderProps {
  tenant: SalonTenant;
  onOpenPublicPortal: () => void;
  onTenantUpdated: () => void;
}

export const PortfolioBuilder: React.FC<PortfolioBuilderProps> = ({
  tenant,
  onOpenPublicPortal,
  onTenantUpdated
}) => {
  const [heroTitle, setHeroTitle] = useState(tenant.portfolio.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(tenant.portfolio.heroSubtitle);
  const [aboutText, setAboutText] = useState(tenant.portfolio.aboutText);
  const [theme, setTheme] = useState(tenant.portfolio.theme || 'luxury');
  const [seoTitle, setSeoTitle] = useState(tenant.portfolio.seoTitle || `${tenant.name} | Salon in Sri Lanka`);
  const [seoDescription, setSeoDescription] = useState(tenant.portfolio.seoDescription || '');
  const [gallery, setGallery] = useState<PortfolioImage[]>(tenant.portfolio.gallery || []);

  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // New gallery image inputs
  const [newImgUrl, setNewImgUrl] = useState('');
  const [newImgCaption, setNewImgCaption] = useState('');
  const [newImgCategory, setNewImgCategory] = useState('Hair Artistry');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const result = await CloudinaryService.uploadImage(file, tenant.id, 'portfolio');
    setIsUploading(false);

    if (result.success && result.secureUrl) {
      const newImg: PortfolioImage = {
        id: `gal_${Date.now()}`,
        url: result.secureUrl,
        caption: newImgCaption || file.name.replace(/\.[^/.]+$/, ""),
        category: newImgCategory,
        isPublic: true
      };
      setGallery(prev => [...prev, newImg]);
      setNewImgCaption('');
    } else {
      setUploadError(result.error || 'Failed to upload image. Please check Cloudinary environment variables.');
    }
  };

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImgUrl) return;

    const newImg: PortfolioImage = {
      id: `gal_${Date.now()}`,
      url: newImgUrl,
      caption: newImgCaption || 'Salon styling work',
      category: newImgCategory,
      isPublic: true
    };
    setGallery([...gallery, newImg]);
    setNewImgUrl('');
    setNewImgCaption('');
  };

  const handleRemoveImage = (imgId: string) => {
    setGallery(gallery.filter(g => g.id !== imgId));
  };

  const handleSavePortfolio = () => {
    const updated = {
      ...tenant,
      portfolio: {
        ...tenant.portfolio,
        heroTitle,
        heroSubtitle,
        aboutText,
        theme,
        seoTitle,
        seoDescription,
        gallery
      }
    };
    StorageService.updateTenant(updated);
    setIsSaved(true);
    onTenantUpdated();
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8DFD6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-[#1B0C2D]">Public Salon Website & Portfolio Builder</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Customize the storefront your customers see when booking appointments online.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDomainModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-[#9B3E88]" />
            <span>Custom Domain {tenant.portfolio.customDomain?.verified && '✓'}</span>
          </button>

          <button
            onClick={onOpenPublicPortal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#DE9E74]/60 text-xs font-bold text-[#8B3E7A] hover:bg-[#DE9E74]/10 transition-colors"
          >
            <span>Preview Live Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleSavePortfolio}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] text-xs font-bold shadow-xs hover:from-[#2A113C] hover:to-[#552380] transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaved ? 'Saved!' : 'Save Website'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Website Config & Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Content & Copy Settings */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DFD6] space-y-4 text-xs">
          <h4 className="font-bold text-sm text-[#1B0C2D] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#9B3E88]" />
            <span>Hero & Branding Information</span>
          </h4>

          {/* Theme Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Aesthetic Visual Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'luxury', label: 'Luxury Night' },
                { id: 'modern', label: 'Modern Minimal' },
                { id: 'elegant', label: 'Ceylon Elegant' },
                { id: 'beauty', label: 'Blush Beauty' },
                { id: 'minimal', label: 'Clean Studio' }
              ].map(th => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id as any)}
                  className={`py-2 px-2 rounded-xl border text-center transition-all ${
                    theme === th.id
                      ? 'border-[#9B3E88] bg-purple-50 text-[#9B3E88] font-bold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {th.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hero Main Heading *</label>
            <input
              type="text"
              value={heroTitle}
              onChange={e => setHeroTitle(e.target.value)}
              placeholder="e.g. Elegance Reimagined for the Modern Sri Lankan Woman"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hero Subheading / Tagline</label>
            <input
              type="text"
              value={heroSubtitle}
              onChange={e => setHeroSubtitle(e.target.value)}
              placeholder="e.g. Experience haute coiffure and bespoke aesthetic treatments in Colombo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">About Salon Story</label>
            <textarea
              value={aboutText}
              onChange={e => setAboutText(e.target.value)}
              rows={4}
              placeholder="Describe your salon's heritage, artistic philosophy, and client care standards"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2">Search Engine Optimization (SEO)</h5>
            <div className="space-y-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Page Title (Meta Title)</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={e => setSeoTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Meta Description</label>
                <textarea
                  value={seoDescription}
                  onChange={e => setSeoDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Portfolio Gallery Manager */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DFD6] space-y-4 text-xs flex flex-col">
          <h4 className="font-bold text-sm text-[#1B0C2D] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#9B3E88]" />
              <span>Salon Portfolio Gallery ({gallery.length})</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Supports High-Res JPG/PNG/WebP</span>
          </h4>

          {/* Configuration Error Banner */}
          {uploadError && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-start gap-2 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">Cloudinary Upload Notice</p>
                <p className="mt-0.5">{uploadError}</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  You can also paste a direct image URL below while server credentials are being configured.
                </p>
              </div>
            </div>
          )}

          {/* Add Image Form */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#210D33] border border-slate-200 dark:border-[#35174F] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-[#F3C9AB] text-[11px]">Add Showcase Photograph</span>
              <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-[#2E1444] text-[#9B3E88] dark:text-[#DE9E74] hover:bg-purple-100 dark:hover:bg-[#3D1A5A] text-[10px] font-bold flex items-center gap-1 transition-colors border border-purple-200 dark:border-[#4B1E70]">
                <Upload className="w-3 h-3" />
                <span>{isUploading ? 'Uploading to Cloudinary...' : 'Upload File (Cloudinary)'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={isUploading}
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            <form onSubmit={handleAddImage} className="space-y-2">
              <input
                type="url"
                required
                value={newImgUrl}
                onChange={e => setNewImgUrl(e.target.value)}
                placeholder="Or paste image URL (e.g. Unsplash or hosted photo link)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-800 dark:text-[#F3C9AB] focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newImgCaption}
                  onChange={e => setNewImgCaption(e.target.value)}
                  placeholder="Caption (e.g. Balayage finish)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-800 dark:text-[#F3C9AB] focus:outline-none"
                />
                <select
                  value={newImgCategory}
                  onChange={e => setNewImgCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-800 dark:text-[#F3C9AB] focus:outline-none"
                >
                  <option value="Hair Artistry">Hair Artistry</option>
                  <option value="Skin & Spa">Skin & Spa</option>
                  <option value="Nail Lounge">Nail Lounge</option>
                  <option value="Bridal Couture">Bridal Couture</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 rounded-lg bg-[#1B0C2D] text-[#F3C9AB] font-bold text-xs hover:bg-[#2A113C] transition-colors"
              >
                + Add to Public Gallery
              </button>
            </form>
          </div>

          {/* Gallery Items Grid */}
          <div className="flex-1 overflow-y-auto max-h-[380px] grid grid-cols-2 gap-2.5 pr-1">
            {gallery.map(img => (
              <div key={img.id} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video">
                <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                  <p className="text-white text-[11px] font-bold truncate">{img.caption}</p>
                  <p className="text-[#DE9E74] text-[9px] uppercase font-bold">{img.category}</p>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600 text-white hover:bg-rose-700"
                    title="Remove Image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Domain Modal */}
      <CustomDomainModal
        isOpen={isDomainModalOpen}
        onClose={() => setIsDomainModalOpen(false)}
        tenant={tenant}
        onSaved={onTenantUpdated}
      />
    </div>
  );
};
