import React, { useState } from 'react';
import {
  Eye, Type, Palette as PaletteIcon, LayoutPanelLeft, ChevronUp, ChevronDown,
  Monitor, Smartphone, Undo2, Redo2, EyeOff, AlertTriangle, Contrast, RotateCcw, Store,
} from 'lucide-react';
import { SalonTenant } from '../../types';
import { StorageService } from '../../services/storageService';
import { WebsiteConfig, WebsiteReview } from '../../types/website';
import { COLOR_PRESETS, FONT_OPTIONS, WEBSITE_SECTIONS, getThemeMeta } from '../../lib/websiteDefaults';
import { WebsitePreviewFrame } from './WebsitePreviewFrame';
import { ImageUploadField } from './UploadField';
import { SaveIndicator } from './WebsiteWorkspace';

const COLOR_FIELDS: { key: keyof WebsiteConfig['colors']; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
  { key: 'text', label: 'Main text' },
  { key: 'button', label: 'Button' },
  { key: 'buttonText', label: 'Button text' },
];

function hexLuminance(hex: string): number {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: string, b: string): number {
  const l1 = hexLuminance(a), l2 = hexLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

type Pane = 'content' | 'design' | 'preview';

/**
 * Live no-code customizer: content editor + design panel + live preview.
 * On large screens all three panes are visible; below xl they become tabs.
 */
export const CustomizeTab: React.FC<{
  draft: WebsiteConfig;
  tenant: SalonTenant;
  reviews: WebsiteReview[];
  onTenantUpdated: () => void;
  updateDraft: (updater: (prev: WebsiteConfig) => WebsiteConfig, withHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}> = ({ draft, tenant, reviews, onTenantUpdated, updateDraft, undo, redo, canUndo, canRedo }) => {
  const [pane, setPane] = useState<Pane>('content');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const c = draft.content;

  const setContent = (key: keyof typeof c, value: string | number) =>
    updateDraft(prev => ({ ...prev, content: { ...prev.content, [key]: value } }));

  const moveSection = (id: string, dir: -1 | 1) =>
    updateDraft(prev => {
      const sections = [...prev.sections];
      const i = sections.findIndex(s => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sections.length) return prev;
      [sections[i], sections[j]] = [sections[j], sections[i]];
      return { ...prev, sections };
    });

  const toggleSection = (id: string) =>
    updateDraft(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id !== id) return s;
        if (!s.canDisable && s.enabled) return s; // essential
        return { ...s, enabled: !s.enabled };
      }),
    }));

  const buttonContrast = contrastRatio(draft.colors.button, draft.colors.buttonText);
  const textContrast = contrastRatio(draft.colors.text, draft.colors.background);
  const contrastWarning = buttonContrast < 3 || textContrast < 3;

  return (
    <div className="space-y-4">
      {/* Toolbar (mobile panes + undo) */}
      <div className="bg-white dark:bg-[#1A0A2A] rounded-2xl border border-[#E8DFD6] dark:border-[#2D1344] p-2 flex items-center justify-between gap-2">
        <div className="flex lg:hidden gap-1 bg-slate-100 dark:bg-[#210D33] rounded-lg p-0.5">
          {([['content', 'Content', Type], ['design', 'Design', PaletteIcon], ['preview', 'Preview', Eye]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setPane(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold ${pane === id ? 'bg-white dark:bg-[#2A113C] shadow-sm text-[#7C3AED]' : 'text-slate-500'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-semibold">
          <LayoutPanelLeft className="w-4 h-4 text-[#7C3AED]" /> Live editor — edits autosave as a draft
        </div>
        <div className="flex items-center gap-1.5">
          <SaveIndicator state={'idle'} />
          <button onClick={undo} disabled={!canUndo} aria-label="Undo" className="p-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-[#210D33]"><Undo2 className="w-4 h-4" /></button>
          <button onClick={redo} disabled={!canRedo} aria-label="Redo" className="p-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-[#210D33]"><Redo2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* ============ LEFT: Content editor ============ */}
        <div className={`xl:col-span-4 space-y-4 ${pane !== 'content' ? 'hidden xl:block' : ''}`}>
          <EditorCard title="Brand Identity" icon={Store}>
            <div className="space-y-3">
              <ImageUploadField
                label="Salon logo"
                value={tenant.logoUrl || ''}
                tenantId={tenant.id}
                onChange={(url) => {
                  const updated = { ...tenant, logoUrl: url || undefined };
                  StorageService.updateTenant(updated);
                  onTenantUpdated();
                }}
                folder={`moonbox-salon/branding/${tenant.id}`}
              />
              <TextField label="Salon display name" value={tenant.name} onChange={(v) => {
                StorageService.updateTenant({ ...tenant, name: v });
                onTenantUpdated();
              }} />
              <TextField label="Tagline" value={tenant.tagline} onChange={(v) => {
                StorageService.updateTenant({ ...tenant, tagline: v });
                onTenantUpdated();
              }} />
            </div>
          </EditorCard>

          <EditorCard title="Hero Banner" icon={Eye}>
            <div className="space-y-3">
              <TextField label="Hero headline" value={c.heroHeadline} onChange={v => setContent('heroHeadline', v)} />
              <TextAreaField label="Hero description" value={c.heroDescription} onChange={v => setContent('heroDescription', v)} rows={3} />
              <ImageUploadField label="Hero banner image" value={c.heroImageUrl} tenantId={tenant.id} onChange={v => setContent('heroImageUrl', v)} folder={`moonbox-salon/website/${tenant.id}`} />
              <div className="grid grid-cols-2 gap-2">
                <SelectField label="Image position" value={c.heroImagePosition} onChange={v => setContent('heroImagePosition', v)} options={[['center', 'Center'], ['top', 'Top'], ['bottom', 'Bottom']]} />
                <SelectField label="Text alignment" value={c.heroTextAlignment} onChange={v => setContent('heroTextAlignment', v)} options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} />
              </div>
              <RangeField label="Image overlay darkness" value={c.heroOverlayOpacity} min={0} max={85} suffix="%" onChange={v => setContent('heroOverlayOpacity', v)} />
              <TextField label="Hero button label" value={c.heroButtonLabel} onChange={v => setContent('heroButtonLabel', v)} />
            </div>
          </EditorCard>

          <EditorCard title="About & Section Headings" icon={Type}>
            <div className="space-y-3">
              <TextField label="About heading" value={c.aboutHeading} onChange={v => setContent('aboutHeading', v)} />
              <TextAreaField label="About your salon" value={c.aboutText} onChange={v => setContent('aboutText', v)} rows={4} />
              <ImageUploadField label="About image" value={c.aboutImageUrl} tenantId={tenant.id} onChange={v => setContent('aboutImageUrl', v)} folder={`moonbox-salon/website/${tenant.id}`} />
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Services heading" value={c.servicesHeading} onChange={v => setContent('servicesHeading', v)} />
                <TextField label="Gallery heading" value={c.galleryHeading} onChange={v => setContent('galleryHeading', v)} />
                <TextField label="Team heading" value={c.teamHeading} onChange={v => setContent('teamHeading', v)} />
                <TextField label="Reviews heading" value={c.reviewsHeading} onChange={v => setContent('reviewsHeading', v)} />
                <TextField label="Hours heading" value={c.hoursHeading} onChange={v => setContent('hoursHeading', v)} />
                <TextField label="Contact heading" value={c.contactHeading} onChange={v => setContent('contactHeading', v)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Book button label" value={c.bookButtonLabel} onChange={v => setContent('bookButtonLabel', v)} />
                <TextField label="WhatsApp button label" value={c.whatsappButtonLabel} onChange={v => setContent('whatsappButtonLabel', v)} />
              </div>
              <TextField label="Footer text" value={c.footerText} onChange={v => setContent('footerText', v)} />
            </div>
          </EditorCard>

          <EditorCard title="Sections" icon={LayoutPanelLeft}>
            <p className="text-[11px] text-slate-400 -mt-1 mb-3">Toggle visibility and reorder the sections of your website. Contact is always shown so customers can reach you.</p>
            <div className="space-y-1.5">
              {draft.sections.map((s, i) => {
                const meta = WEBSITE_SECTIONS.find(x => x.id === s.id)!;
                return (
                  <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-[#2D1345]">
                    <div className="flex flex-col">
                      <button onClick={() => moveSection(s.id, -1)} disabled={i === 0} aria-label={`Move ${meta.label} up`} className="p-0.5 text-slate-400 hover:text-[#7C3AED] disabled:opacity-25"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => moveSection(s.id, 1)} disabled={i === draft.sections.length - 1} aria-label={`Move ${meta.label} down`} className="p-0.5 text-slate-400 hover:text-[#7C3AED] disabled:opacity-25"><ChevronDown className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1B0C2D] dark:text-[#F3C9AB]">{meta.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{meta.description}</p>
                    </div>
                    <button
                      onClick={() => toggleSection(s.id)}
                      disabled={!s.canDisable && s.enabled}
                      role="switch"
                      aria-checked={s.enabled}
                      aria-label={`Toggle ${meta.label}`}
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${s.enabled ? 'bg-[#8B5CF6]' : 'bg-slate-300 dark:bg-[#35174F]'} ${!s.canDisable && s.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${s.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </EditorCard>
        </div>

        {/* ============ CENTER: Live preview ============ */}
        <div className={`xl:col-span-5 ${pane !== 'preview' ? 'hidden xl:block' : ''}`}>
          <div className="sticky top-24">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Preview (draft)</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#210D33] rounded-lg p-0.5">
                <button onClick={() => setDevice('desktop')} aria-label="Desktop preview" className={`p-1.5 rounded-md ${device === 'desktop' ? 'bg-white dark:bg-[#2A113C] shadow-sm text-[#7C3AED]' : 'text-slate-400'}`}><Monitor className="w-4 h-4" /></button>
                <button onClick={() => setDevice('mobile')} aria-label="Mobile preview" className={`p-1.5 rounded-md ${device === 'mobile' ? 'bg-white dark:bg-[#2A113C] shadow-sm text-[#7C3AED]' : 'text-slate-400'}`}><Smartphone className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="h-[640px] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2D1345] bg-white shadow-inner">
              <div
                className="h-full overflow-hidden transition-all duration-300 mx-auto"
                style={{ width: device === 'mobile' ? 390 : '100%' }}
              >
                <div className="h-full overflow-y-auto">
                  <WebsitePreviewFrame
                    config={draft}
                    tenant={tenant}
                    reviews={reviews}
                    showDeviceToggle={false}
                    initialDevice={device}
                    compact
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ RIGHT: Design ============ */}
        <div className={`xl:col-span-3 space-y-4 ${pane !== 'design' ? 'hidden xl:block' : ''}`}>
          <EditorCard title="Colors" icon={PaletteIcon}>
            <div className="space-y-3">
              {contrastWarning && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-[#2A1E0D] border border-amber-200 dark:border-[#4A3A1E] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-semibold text-amber-700 dark:text-[#F3C9AB]">
                    Low color contrast detected. Keep button and text contrast high so every visitor can read your website.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => updateDraft(prev => ({ ...prev, colors: { ...p.colors } }))}
                    title={p.name}
                    className="group relative w-14 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-[#35174F] hover:ring-2 hover:ring-[#8B5CF6] transition-all"
                  >
                    <span className="absolute inset-0" style={{ background: p.colors.background }} />
                    <span className="absolute bottom-0 left-0 right-0 h-1/2" style={{ background: p.colors.primary }} />
                    <span className="absolute top-1 left-1 w-3 h-3 rounded-full" style={{ background: p.colors.accent }} />
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {COLOR_FIELDS.map(f => (
                  <div key={f.key} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-[#AAA6BD]">{f.label}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={draft.colors[f.key]}
                        onChange={e => updateDraft(prev => ({ ...prev, colors: { ...prev.colors, [f.key]: e.target.value } }))}
                        aria-label={`${f.label} color`}
                        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-[#35174F] cursor-pointer bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={draft.colors[f.key]}
                        onChange={e => updateDraft(prev => ({ ...prev, colors: { ...prev.colors, [f.key]: e.target.value } }))}
                        className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#35174F] text-[11px] font-mono bg-white dark:bg-[#1A0A2A] text-slate-600 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const meta = getThemeMeta(draft.themeId);
                  updateDraft(prev => ({ ...prev, colors: { ...meta.defaultColors } }));
                }}
                className="w-full py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-[11px] font-bold text-slate-500 dark:text-[#AAA6BD] hover:bg-slate-50 dark:hover:bg-[#210D33] inline-flex items-center justify-center gap-1.5"
              >
                <Contrast className="w-3.5 h-3.5" /> Reset to theme colors
              </button>
            </div>
          </EditorCard>

          <EditorCard title="Typography & Layout" icon={Type}>
            <div className="space-y-3">
              <SelectField
                label="Font"
                value={draft.typography.fontId}
                onChange={v => updateDraft(prev => ({ ...prev, typography: { ...prev.typography, fontId: v } }))}
                options={FONT_OPTIONS.map(f => [f.id, f.name])}
              />
              <SelectField label="Font size" value={draft.typography.sizePreset} onChange={v => updateDraft(prev => ({ ...prev, typography: { ...prev.typography, sizePreset: v as any } }))} options={[['compact', 'Compact'], ['default', 'Default'], ['large', 'Large']]} />
              <SelectField label="Section spacing" value={draft.typography.sectionSpacing} onChange={v => updateDraft(prev => ({ ...prev, typography: { ...prev.typography, sectionSpacing: v as any } }))} options={[['compact', 'Compact'], ['default', 'Default'], ['spacious', 'Spacious']]} />
              <SelectField label="Button style" value={draft.typography.buttonStyle} onChange={v => updateDraft(prev => ({ ...prev, typography: { ...prev.typography, buttonStyle: v as any } }))} options={[['solid', 'Solid'], ['pill', 'Pill'], ['outline', 'Outline']]} />
              <SelectField label="Border radius" value={draft.typography.borderRadius} onChange={v => updateDraft(prev => ({ ...prev, typography: { ...prev.typography, borderRadius: v as any } }))} options={[['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']]} />
              <SelectField label="Image corners" value={draft.typography.imageCorner} onChange={v => updateDraft(prev => ({ ...prev, typography: { ...prev.typography, imageCorner: v as any } }))} options={[['square', 'Square'], ['rounded', 'Rounded'], ['full', 'Fully round']]} />
              <SelectField label="Hero layout" value={draft.typography.heroLayout} onChange={v => updateDraft(prev => ({ ...prev, typography: { ...prev.typography, heroLayout: v as any } }))} options={[['classic', 'Classic banner'], ['split', 'Split with image'], ['overlay', 'Full-bleed overlay']]} />
            </div>
          </EditorCard>
        </div>
      </div>
    </div>
  );
};

const EditorCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <div className="bg-white dark:bg-[#1A0A2A] p-5 rounded-2xl border border-[#E8DFD6] dark:border-[#2D1344]">
    <h4 className="font-extrabold text-xs text-[#1B0C2D] dark:text-[#F3C9AB] uppercase tracking-wider flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#7C3AED]" /> {title}
    </h4>
    {children}
  </div>
);

export const TextField: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6]"
    />
  </div>
);

export const TextAreaField: React.FC<{ label: string; value: string; onChange: (v: string) => void; rows?: number }> = ({ label, value, onChange, rows = 3 }) => (
  <div>
    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6] resize-none"
    />
  </div>
);

export const SelectField: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6]"
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
);

export const RangeField: React.FC<{ label: string; value: number; min: number; max: number; suffix?: string; onChange: (v: number) => void }> = ({ label, value, min, max, suffix, onChange }) => (
  <div>
    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}: {value}{suffix}</label>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full accent-[#8B5CF6]"
    />
  </div>
);
