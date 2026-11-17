import React, { useState } from 'react';
import { MessageCircle, Copy, Check, MapPin, Clock, AlertTriangle, Instagram, Facebook, Youtube, RefreshCw, UserRound } from 'lucide-react';
import { SalonTenant } from '../../types';
import { StorageService } from '../../services/storageService';
import { WebsiteConfig } from '../../types/website';
import { WebsiteService } from '../../services/websiteService';
import { TextField, SelectField } from './CustomizeTab';
import { ImageUploadField } from './UploadField';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * Contact & Social Links: WhatsApp configuration with validation,
 * salon contact details, per-day opening hours and social profiles.
 */
export const ContactTab: React.FC<{
  tenant: SalonTenant;
  draft: WebsiteConfig;
  updateDraft: (updater: (prev: WebsiteConfig) => WebsiteConfig, withHistory?: boolean) => void;
  onTenantUpdated: () => void;
  onToast: (kind: 'success' | 'error', msg: string) => void;
}> = ({ tenant, draft, updateDraft, onTenantUpdated, onToast }) => {
  const contact = draft.contact;
  const [copied, setCopied] = useState(false);

  const setContact = (patch: Partial<typeof contact>) =>
    updateDraft(prev => ({ ...prev, contact: { ...prev.contact, ...patch } }), false);

  const setSocial = (key: keyof typeof contact.social, value: string) =>
    updateDraft(prev => ({ ...prev, contact: { ...prev.contact, social: { ...prev.contact.social, [key]: value } } }), false);

  const setTenantField = (patch: Partial<SalonTenant>) => {
    StorageService.updateTenant({ ...tenant, ...patch });
    onTenantUpdated();
  };

  const setHours = (day: string, patch: { open?: string; close?: string; isOpen?: boolean }) => {
    const hours = { ...tenant.openingHours };
    const existing = hours[day] || { open: '09:00', close: '18:00', isOpen: false };
    hours[day] = { ...existing, ...patch };
    setTenantField({ openingHours: hours });
  };

  const waLink = WebsiteService.buildWhatsAppLink(contact.whatsappNumber, contact.whatsappGreeting);
  const numberInvalid = contact.whatsappNumber.length > 0 && !waLink;

  const syncFromProfile = () => {
    setContact({
      email: tenant.email || '',
      phone: tenant.phone || '',
      address: tenant.address || '',
      city: tenant.city || '',
    });
    onToast('success', 'Contact details synced from your salon profile.');
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* WhatsApp */}
        <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] space-y-4">
          <h4 className="font-extrabold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#25D366]" /> WhatsApp
          </h4>
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#210D33] cursor-pointer">
            <span className="text-xs font-bold text-slate-600 dark:text-[#AAA6BD]">Show floating WhatsApp button on the website</span>
            <button
              role="switch" aria-checked={contact.whatsappEnabled}
              onClick={() => setContact({ whatsappEnabled: !contact.whatsappEnabled })}
              className={`relative w-10 h-6 rounded-full transition-colors ${contact.whatsappEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-[#35174F]'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${contact.whatsappEnabled ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </label>
          <TextField
            label="WhatsApp number (with country code, e.g. +94771234567)"
            value={contact.whatsappNumber}
            onChange={v => setContact({ whatsappNumber: v })}
            placeholder="+94771234567"
          />
          {numberInvalid && (
            <p className="text-[11px] font-semibold text-red-500 flex items-center gap-1.5" role="alert">
              <AlertTriangle className="w-3.5 h-3.5" /> Enter a valid number with country code (8–15 digits). The WhatsApp button will not appear until it is valid.
            </p>
          )}
          <TextField label="Default greeting" value={contact.whatsappGreeting} onChange={v => setContact({ whatsappGreeting: v })} />
          {waLink && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-[#0D2A1C] border border-emerald-200 dark:border-[#1E4A33]">
              <span className="text-[11px] font-mono text-emerald-700 dark:text-[#6EE7A0] truncate">{waLink}</span>
              <button
                onClick={() => { navigator.clipboard?.writeText(waLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                aria-label="Copy WhatsApp link"
                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Contact details */}
        <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#7C3AED]" /> Contact Details
            </h4>
            <button onClick={syncFromProfile} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#7C3AED] hover:underline">
              <RefreshCw className="w-3.5 h-3.5" /> Sync from salon profile
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Phone" value={contact.phone} onChange={v => setContact({ phone: v })} />
            <TextField label="Email" value={contact.email} onChange={v => setContact({ email: v })} />
          </div>
          <TextField label="Address" value={contact.address} onChange={v => setContact({ address: v })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="City" value={contact.city} onChange={v => setContact({ city: v })} />
            <TextField label="Map link (Google Maps URL)" value={contact.mapLink} onChange={v => setContact({ mapLink: v })} placeholder="https://maps…" />
          </div>
        </div>

        {/* Social links */}
        <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] space-y-4">
          <h4 className="font-extrabold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] flex items-center gap-2">
            <Instagram className="w-4 h-4 text-[#E562A0]" /> Social Links
          </h4>
          <p className="text-[11px] text-slate-400 -mt-2">Leave a field empty to hide that icon from the website.</p>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Instagram" value={contact.social.instagram} onChange={v => setSocial('instagram', v)} placeholder="instagram.com/…" />
            <TextField label="Facebook" value={contact.social.facebook} onChange={v => setSocial('facebook', v)} placeholder="facebook.com/…" />
            <TextField label="TikTok" value={contact.social.tiktok} onChange={v => setSocial('tiktok', v)} placeholder="tiktok.com/@…" />
            <TextField label="YouTube" value={contact.social.youtube} onChange={v => setSocial('youtube', v)} placeholder="youtube.com/@…" />
          </div>
        </div>

        {/* Team */}
        <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] space-y-4">
          <h4 className="font-extrabold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] flex items-center gap-2">
            <UserRound className="w-4 h-4 text-[#7C3AED]" /> Team — Meet Our Experts
          </h4>
          <div className="space-y-3">
            {draft.team.map((m, i) => (
              <div key={m.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-[#2D1345] space-y-2.5">
                <ImageUploadField label={`Photo — ${m.name || `Member ${i + 1}`}`} value={m.photoUrl} tenantId={tenant.id} onChange={(url) => updateDraft(prev => ({ ...prev, team: prev.team.map(x => x.id === m.id ? { ...x, photoUrl: url } : x) }), false)} folder={`moonbox-salon/team/${tenant.id}`} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={m.name} onChange={(e) => updateDraft(prev => ({ ...prev, team: prev.team.map(x => x.id === m.id ? { ...x, name: e.target.value } : x) }), false)} placeholder="Name" className="px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6]" />
                  <input value={m.role} onChange={(e) => updateDraft(prev => ({ ...prev, team: prev.team.map(x => x.id === m.id ? { ...x, role: e.target.value } : x) }), false)} placeholder="Role (e.g. Senior Stylist)" className="px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6]" />
                </div>
                <textarea value={m.bio} onChange={(e) => updateDraft(prev => ({ ...prev, team: prev.team.map(x => x.id === m.id ? { ...x, bio: e.target.value } : x) }), false)} rows={2} placeholder="Short biography" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none focus:border-[#8B5CF6] resize-none" />
                <button
                  onClick={() => updateDraft(prev => ({ ...prev, team: prev.team.filter(x => x.id !== m.id) }), false)}
                  className="text-[11px] font-bold text-red-500 hover:underline"
                >
                  Remove member
                </button>
              </div>
            ))}
            <button
              onClick={() => updateDraft(prev => ({ ...prev, team: [...prev.team, { id: `team_${Date.now()}`, name: '', role: '', bio: '', photoUrl: '' }] }), false)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#35174F] text-xs font-bold text-slate-400 hover:border-[#8B5CF6] hover:text-[#7C3AED] transition-colors"
            >
              + Add team member
            </button>
          </div>
        </div>

        {/* Opening hours — edits the salon's real profile */}
        <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] lg:col-span-2">
          <h4 className="font-extrabold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[#7C3AED]" /> Opening Hours
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">These hours are shared with your salon profile and online booking system.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DAYS.map(day => {
              const h = tenant.openingHours?.[day] || { open: '09:00', close: '18:00', isOpen: false };
              return (
                <div key={day} className="p-3.5 rounded-xl border border-slate-100 dark:border-[#2D1345]">
                  <label className="flex items-center justify-between mb-2 cursor-pointer">
                    <span className="text-xs font-bold capitalize text-[#1B0C2D] dark:text-[#F3C9AB]">{day}</span>
                    <button
                      role="switch" aria-checked={h.isOpen}
                      onClick={() => setHours(day, { isOpen: !h.isOpen })}
                      className={`relative w-9 h-5 rounded-full transition-colors ${h.isOpen ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-[#35174F]'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${h.isOpen ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </label>
                  {h.isOpen && (
                    <div className="flex items-center gap-2">
                      <input type="time" value={h.open} onChange={e => setHours(day, { open: e.target.value })} aria-label={`${day} opens at`} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none" />
                      <span className="text-slate-400 text-xs">–</span>
                      <input type="time" value={h.close} onChange={e => setHours(day, { close: e.target.value })} aria-label={`${day} closes at`} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#35174F] text-xs bg-white dark:bg-[#1A0A2A] text-slate-700 dark:text-[#F3C9AB] focus:outline-none" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {void SelectField}
    </div>
  );
};
