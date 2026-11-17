import React, { useMemo, useState } from 'react';
import { SalonTenant } from '../../types';
import { StorageService } from '../../services/storageService';
import { Copy, ExternalLink, QrCode, Save, Share2, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';

interface OnlineBookingManagerProps {
  tenant: SalonTenant;
  onSaved: () => void;
}

const defaultBooking = {
  enabled: true,
  pageTitle: 'Book your next beauty experience',
  pageSubtitle: 'Choose a service, select a time, and reserve your appointment in minutes.',
  successMessage: 'Your appointment is confirmed. We look forward to seeing you!',
  showPrices: true,
  showStaffSelection: true,
  allowWhatsApp: true,
  accentColor: '#8B5CF6',
  backgroundColor: '#F8F7FC'
};

export const OnlineBookingManager: React.FC<OnlineBookingManagerProps> = ({ tenant, onSaved }) => {
  const [booking, setBooking] = useState({ ...defaultBooking, ...(tenant.settings.onlineBooking || {}) });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const bookingUrl = useMemo(() => `${window.location.origin}/book/${tenant.slug}`, [tenant.slug]);
  const qrUrl = useMemo(() => `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(bookingUrl)}`, [bookingUrl]);

  const update = <K extends keyof typeof booking>(key: K, value: (typeof booking)[K]) => {
    setBooking(current => ({ ...current, [key]: value }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await StorageService.updateTenantConfirmed({
        ...tenant,
        settings: {
          ...tenant.settings,
          allowCustomerStaffSelection: booking.showStaffSelection,
          onlineBooking: booking
        }
      });
      setSaved(true);
      onSaved();
      window.setTimeout(() => setSaved(false), 2400);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save booking settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(bookingUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Book an appointment with ${tenant.name}: ${bookingUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center"><QrCode className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-base text-[#1B0C2D]">Online Booking Management</h3>
              <p className="text-xs text-slate-500 mt-1">Manage your public booking page, QR code, and customer booking experience from one place.</p>
            </div>
          </div>
        </div>
        <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] text-xs font-bold shadow-sm">
          <Save className="w-4 h-4" /> {isSaving ? 'Saving…' : saved ? 'Changes Saved' : 'Save Booking Settings'}
        </button>
      </div>

      {errorMessage && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{errorMessage}</div>}

      <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-5">
        <div className="rounded-3xl border border-[#E8DFD6] bg-white p-5 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-[#1B0C2D]">Public booking page</h4>
              <p className="text-xs text-slate-500 mt-1">Share this link on Instagram, WhatsApp, Google Business, or your website.</p>
            </div>
            <button type="button" onClick={() => update('enabled', !booking.enabled)} className={`inline-flex items-center gap-2 text-xs font-bold ${booking.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {booking.enabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              {booking.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3 font-mono text-xs text-[#9B3E88] break-all">{bookingUrl}</div>
            <div className="flex gap-2">
              <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold"><Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy'}</button>
              <button type="button" onClick={() => window.open(bookingUrl, '_blank')} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold"><ExternalLink className="w-3.5 h-3.5" /> Preview</button>
            </div>
          </div>
          <button type="button" onClick={shareWhatsApp} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-bold"><Share2 className="w-4 h-4" /> Share booking link on WhatsApp</button>
        </div>

        <div className="rounded-3xl border border-[#E8DFD6] bg-[#1B0C2D] p-5 text-white flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-3"><QrCode className="w-5 h-5 text-[#F3C9AB]" /><h4 className="font-bold text-sm">Booking QR code</h4></div>
          <div className="bg-white p-3 rounded-2xl"><img src={qrUrl} alt={`QR code for ${tenant.name} online booking`} className="w-44 h-44" /></div>
          <a href={qrUrl} download={`${tenant.slug}-booking-qr.png`} target="_blank" rel="noreferrer" className="mt-4 text-xs font-bold text-[#F3C9AB] hover:underline">Download QR code</a>
          <p className="text-[11px] text-white/60 mt-2">Print it at your reception desk, mirror, or storefront.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-[#E8DFD6] bg-white p-5 space-y-5">
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#8B5CF6]" /><div><h4 className="font-bold text-sm text-[#1B0C2D]">Customize the public booking page</h4><p className="text-xs text-slate-500 mt-1">These settings are applied to your customer-facing booking page.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <label className="space-y-1"><span className="font-semibold text-slate-700">Page headline</span><input value={booking.pageTitle} onChange={e => update('pageTitle', e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200" /></label>
          <label className="space-y-1"><span className="font-semibold text-slate-700">Page subtitle</span><input value={booking.pageSubtitle} onChange={e => update('pageSubtitle', e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200" /></label>
          <label className="space-y-1 md:col-span-2"><span className="font-semibold text-slate-700">Confirmation message</span><textarea value={booking.successMessage} onChange={e => update('successMessage', e.target.value)} rows={2} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 resize-none" /></label>
          <label className="space-y-1"><span className="font-semibold text-slate-700">Accent colour</span><input type="color" value={booking.accentColor} onChange={e => update('accentColor', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 p-1" /></label>
          <label className="space-y-1"><span className="font-semibold text-slate-700">Page background colour</span><input type="color" value={booking.backgroundColor} onChange={e => update('backgroundColor', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 p-1" /></label>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {([['showPrices', 'Show service prices'], ['showStaffSelection', 'Allow stylist selection'], ['allowWhatsApp', 'Show WhatsApp contact']] as const).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 font-semibold text-slate-700"><input type="checkbox" checked={booking[key]} onChange={e => update(key, e.target.checked)} className="accent-[#8B5CF6]" />{label}</label>
          ))}
        </div>
      </section>
    </form>
  );
};
