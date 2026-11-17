import React, { useState } from 'react';
import { Trash2, Star, ArrowUp, ArrowDown, ImagePlus, AlertTriangle, Pencil, Check, X } from 'lucide-react';
import { SalonTenant } from '../../types';
import { WebsiteConfig, WebsiteGalleryItem, WebsiteGalleryCategory } from '../../types/website';
import { ImageUploadField } from './UploadField';
import { ConfirmDialog } from './WebsiteWorkspace';

const CATEGORIES: WebsiteGalleryCategory[] = ['Hair', 'Nails', 'Bridal', 'Makeup', 'Skin Care', 'Other'];

/**
 * Gallery / Our Work manager: multi-image uploads, categories, alt text,
 * before/after pairs, featured marks, reordering and confirmed deletion.
 */
export const GalleryTab: React.FC<{
  tenant: SalonTenant;
  draft: WebsiteConfig;
  updateDraft: (updater: (prev: WebsiteConfig) => WebsiteConfig, withHistory?: boolean) => void;
  showToast: (kind: 'success' | 'error', msg: string) => void;
}> = ({ tenant, draft, updateDraft, showToast }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const gallery = draft.gallery;

  const addItem = () => {
    const item: WebsiteGalleryItem = {
      id: `gal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      url: '',
      title: '',
      description: '',
      altText: '',
      category: 'Hair',
      isFeatured: false,
      createdAt: new Date().toISOString(),
    };
    updateDraft(prev => ({ ...prev, gallery: [item, ...prev.gallery] }), false);
    setEditingId(item.id);
  };

  const patchItem = (id: string, patch: Partial<WebsiteGalleryItem>) =>
    updateDraft(prev => ({
      ...prev,
      gallery: prev.gallery.map(g => g.id === id ? { ...g, ...patch } : g),
    }), false);

  const move = (id: string, dir: -1 | 1) =>
    updateDraft(prev => {
      const arr = [...prev.gallery];
      const i = arr.findIndex(g => g.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...prev, gallery: arr };
    }, false);

  const remove = (id: string) => {
    updateDraft(prev => ({ ...prev, gallery: prev.gallery.filter(g => g.id !== id) }), false);
    setDeleteId(null);
    showToast('success', 'Image removed from your gallery draft.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-[#1B0C2D] dark:text-[#F3C9AB]">Gallery — Our Work <span className="text-slate-400 font-bold">({gallery.length})</span></h3>
          <p className="text-xs text-slate-500 dark:text-[#AAA6BD] mt-1 max-w-xl">
            Showcase your best work. Upload images, add titles and alt text, organize by category, and mark Before/After transformations.
          </p>
        </div>
        <button onClick={addItem} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95">
          <ImagePlus className="w-4 h-4" /> Add Image
        </button>
      </div>

      {gallery.length === 0 ? (
        <div className="bg-white dark:bg-[#1A0A2A] p-12 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] text-center">
          <ImagePlus className="w-10 h-10 mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-bold text-[#1B0C2D] dark:text-[#F3C9AB]">Your gallery is empty</p>
          <p className="text-xs text-slate-400 mt-1">Add your first showcase image — visitors love seeing real work.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {gallery.map((g, i) => (
            <div key={g.id} className="bg-white dark:bg-[#1A0A2A] rounded-2xl border border-[#E8DFD6] dark:border-[#2D1344] overflow-hidden group">
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-[#210D33]">
                {g.url ? (
                  <img src={g.url} alt={g.altText || g.title || 'Gallery image'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <ImageUploadField label="Image" value="" tenantId={tenant.id} onChange={url => patchItem(g.id, { url })} folder={`moonbox-salon/gallery/${tenant.id}`} />
                  </div>
                )}
                {g.isFeatured && (
                  <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-400 text-white text-[10px] font-black shadow">
                    <Star className="w-3 h-3" fill="currentColor" /> Featured
                  </span>
                )}
                {g.beforeUrl && (
                  <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full bg-black/70 text-white text-[10px] font-black">Before / After</span>
                )}
                {/* Hover controls */}
                <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <button onClick={() => move(g.id, -1)} disabled={i === 0} aria-label="Move earlier" className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-white disabled:opacity-40"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => move(g.id, 1)} disabled={i === gallery.length - 1} aria-label="Move later" className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-white disabled:opacity-40"><ArrowDown className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingId(editingId === g.id ? null : g.id)} aria-label="Edit details" className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-white"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(g.id)} aria-label="Delete image" className="p-1.5 rounded-lg bg-red-500/95 text-white hover:bg-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>

              {/* Details / edit form */}
              {editingId === g.id ? (
                <div className="p-4 space-y-3">
                  <ImageUploadField label="Main image (after)" value={g.url} tenantId={tenant.id} onChange={url => patchItem(g.id, { url })} folder={`moonbox-salon/gallery/${tenant.id}`} />
                  <ImageUploadField label="Before image (optional)" value={g.beforeUrl || ''} tenantId={tenant.id} onChange={url => patchItem(g.id, { url })} folder={`moonbox-salon/gallery/${tenant.id}`} />
                  <input value={g.title} onChange={e => patchItem(g.id, { title: e.target.value })} placeholder="Title (e.g. Balayage transformation)" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6]" />
                  <input value={g.description} onChange={e => patchItem(g.id, { description: e.target.value })} placeholder="Short description" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6]" />
                  <input value={g.altText} onChange={e => patchItem(g.id, { altText: e.target.value })} placeholder="Alt text (accessibility & SEO)" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6]" />
                  <div className="flex items-center gap-2">
                    <select value={g.category} onChange={e => patchItem(g.id, { category: e.target.value as WebsiteGalleryCategory })} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none">
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button onClick={() => patchItem(g.id, { isFeatured: !g.isFeatured })} className={`px-3 py-2 rounded-lg text-[11px] font-bold border ${g.isFeatured ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 dark:border-[#35174F] text-slate-500'}`}>
                      <Star className="w-3.5 h-3.5" fill={g.isFeatured ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => setEditingId(null)} aria-label="Done editing" className="px-3 py-2 rounded-lg bg-emerald-500 text-white"><Check className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-xs font-bold text-[#1B0C2D] dark:text-[#F3C9AB] truncate">{g.title || 'Untitled'}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{g.category}{g.description ? ` — ${g.description}` : ''}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Remove this image?"
          body="The image will be removed from your website gallery. This cannot be undone."
          confirmLabel="Remove"
          danger
          onConfirm={() => remove(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
      {void X}
    </div>
  );
};
