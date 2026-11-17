import React, { useState } from 'react';
import { SalonTenant } from '../../types';
import { StorageService } from '../../services/storageService';
import { Settings, Save, Palette, ShieldCheck } from 'lucide-react';

interface SalonSettingsProps {
  tenant: SalonTenant;
  onSaved: () => void;
}

export const SalonSettings: React.FC<SalonSettingsProps> = ({ tenant, onSaved }) => {
  const [name, setName] = useState(tenant.name);
  const [tagline, setTagline] = useState(tenant.tagline);
  const [address, setAddress] = useState(tenant.address);
  const [city, setCity] = useState(tenant.city);
  const [phone, setPhone] = useState(tenant.phone);
  const [whatsapp, setWhatsapp] = useState(tenant.whatsapp);
  const [taxRate, setTaxRate] = useState(tenant.settings.taxRate);
  const [bufferMinutes, setBufferMinutes] = useState(tenant.settings.appointmentBufferMinutes);
  const [minAdvanceHours, setMinAdvanceHours] = useState(tenant.settings.minAdvanceBookingHours);
  const [maxWindowDays, setMaxWindowDays] = useState(tenant.settings.maxBookingWindowDays);
  const [email, setEmail] = useState(tenant.email);
  const [website, setWebsite] = useState(tenant.website || '');
  const [primaryColor, setPrimaryColor] = useState(tenant.portfolio.primaryColor);
  const [accentColor, setAccentColor] = useState(tenant.portfolio.accentColor);
  const [allowStaffSelection, setAllowStaffSelection] = useState(tenant.settings.allowCustomerStaffSelection);
  const [requireDeposit, setRequireDeposit] = useState(tenant.settings.requireBookingDeposit);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    const updated: SalonTenant = {
      ...tenant,
      name,
      tagline,
      address,
      city,
      phone,
      whatsapp,
      email,
      website,
      settings: {
        ...tenant.settings,
        taxRate,
        appointmentBufferMinutes: bufferMinutes,
        minAdvanceBookingHours: minAdvanceHours,
        maxBookingWindowDays: maxWindowDays,
        allowCustomerStaffSelection: allowStaffSelection,
        requireBookingDeposit: requireDeposit
      },
      portfolio: {
        ...tenant.portfolio,
        primaryColor,
        accentColor
      }
    };

    try {
      await StorageService.updateTenantConfirmed(updated);
      setIsSaved(true);
      onSaved();
      setTimeout(() => setIsSaved(false), 2500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save salon settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-3xl border border-[#E8DFD6] flex justify-between items-center">
        <div>
          <h3 className="font-bold text-base text-[#1B0C2D]">Salon Settings & Operational Rules</h3>
            <p className="text-xs text-slate-500">
              Customize the salon workspace identity, public brand, booking rules, and operational defaults.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] text-xs font-bold shadow-xs hover:from-[#2A113C] hover:to-[#552380] transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving…' : isSaved ? 'Changes Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-[#E8DFD6] space-y-5 text-xs">
        {errorMessage && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{errorMessage}</div>}
        <div>
          <h4 className="font-bold text-sm text-[#1B0C2D] mb-3">General Salon Profile</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <h4 className="font-bold text-sm text-[#1B0C2D] mb-3">Address & Local Contacts</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telephone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">WhatsApp Mobile</label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3.5 py-2 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Website</label>
              <input type="text" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" className="w-full px-3.5 py-2 rounded-xl border border-slate-200" />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <h4 className="font-bold text-sm text-[#1B0C2D] mb-3 flex items-center gap-2"><Palette className="w-4 h-4 text-[#8B5CF6]" /> Brand & Workspace Appearance</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block font-semibold text-slate-700 mb-1">Primary Brand Colour</label><input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 p-1" /></div>
            <div><label className="block font-semibold text-slate-700 mb-1">Accent Colour</label><input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 p-1" /></div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <h4 className="font-bold text-sm text-[#1B0C2D] mb-3">Online Booking & Scheduling Buffers</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Buffer Between Bookings (Mins)</label>
              <input
                type="number"
                min="0"
                step="5"
                value={bufferMinutes}
                onChange={e => setBufferMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Time for sanitizing chairs</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Advance Notice (Hours)</label>
              <input
                type="number"
                min="1"
                value={minAdvanceHours}
                onChange={e => setMinAdvanceHours(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Minimum lead time for clients</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax Rate (VAT/NBT %)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={taxRate}
                onChange={e => setTaxRate(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Applied to POS invoices</span>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Maximum Booking Window (Days)</label>
              <input type="number" min="1" value={maxWindowDays} onChange={e => setMaxWindowDays(Number(e.target.value))} className="w-full px-3.5 py-2 rounded-xl border border-slate-200" />
              <span className="text-[10px] text-slate-400 mt-0.5 block">How far ahead customers can book</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 font-semibold text-slate-700"><input type="checkbox" checked={allowStaffSelection} onChange={e => setAllowStaffSelection(e.target.checked)} className="accent-[#8B5CF6]" /> Allow customers to choose a stylist</label>
            <label className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 font-semibold text-slate-700"><input type="checkbox" checked={requireDeposit} onChange={e => setRequireDeposit(e.target.checked)} className="accent-[#8B5CF6]" /> Require booking deposit</label>
          </div>
        </div>
      </form>
    </div>
  );
};
