import React, { useState } from 'react';
import { 
  Building, 
  Image as ImageIcon, 
  MapPin, 
  Phone, 
  Clock, 
  Sparkles, 
  Users, 
  Globe, 
  CreditCard, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { DEFAULT_PLANS } from '../../constants/plans';
import { formatLKR } from '../../constants/brand';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { tenant, updateTenantData } = useTenant();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const totalSteps = 10;

  // Local state initialized from tenant
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    tagline: tenant?.tagline || '',
    address: tenant?.address || '',
    city: tenant?.city || 'Colombo',
    phone: tenant?.phone || '',
    whatsapp: tenant?.whatsapp || '',
    email: tenant?.email || '',
    selectedPlan: tenant?.subscription.planId || 'plan_growth',
    bufferMinutes: tenant?.settings.appointmentBufferMinutes || 15
  });

  if (!isOpen || !tenant) return null;

  const nextStep = async () => {
    if (step < totalSteps) setStep(step + 1);
    else await handleFinish();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateTenantData(prev => ({
        ...prev,
        name: formData.name,
        tagline: formData.tagline,
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        email: formData.email,
        settings: {
          ...prev.settings,
          appointmentBufferMinutes: formData.bufferMinutes
        },
        onboardingCompleted: true,
        onboardingStep: 10
      }));
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140921]/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E8DFD6] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Step Progress */}
        <div className="px-6 py-5 bg-[#FAF8F5] border-b border-[#E8DFD6] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#9B3E88] uppercase">
              Step {step} of {totalSteps}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#1B0C2D]">
              {step === 1 && "1. Salon Business Information"}
              {step === 2 && "2. Brand Logo & Visuals"}
              {step === 3 && "3. Salon Location & Address"}
              {step === 4 && "4. Phone & Client WhatsApp"}
              {step === 5 && "5. Working Hours & Schedules"}
              {step === 6 && "6. Signature Services"}
              {step === 7 && "7. Stylists & Team"}
              {step === 8 && "8. Online Customer Booking"}
              {step === 9 && "9. Subscription & 14-Day Trial"}
              {step === 10 && "10. Setup Complete!"}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="Complete later"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#EFE9E2] h-1.5">
          <div 
            className="bg-gradient-to-r from-[#9B3E88] to-[#DE9E74] h-1.5 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Body content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Enter your official salon trade name and customer tagline as it should appear on bills and appointments.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Salon Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Moonbox Salon - Colombo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#9B3E88]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. Building a smarter salon."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#9B3E88]"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-[#1C0D2E] flex items-center justify-center p-3 shadow-md border border-[#DE9E74]/30">
                <ImageIcon className="w-10 h-10 text-[#DE9E74]" />
              </div>
              <h3 className="text-sm font-bold text-[#1B0C2D]">Official Moonbox Brand Identity Connected</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your salon is powered by the Moonbox luxury design system. You can upload custom salon photos anytime under Portfolio & Gallery.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Provide physical address details for maps and customer receipts.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="No. 45, Galle Road"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#9B3E88]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Colombo 03"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#9B3E88]"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Contact numbers used for instant appointment alerts and booking WhatsApp links.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salon Telephone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="014241555"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#9B3E88]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Mobile</label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="0714241555"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#9B3E88]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Support Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="colombo@moonboxsalon.lk"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#9B3E88]"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Salon hours are automatically pre-configured: Monday–Friday (09:00 - 19:00), Saturday (08:30 - 20:00), Sunday (09:00 - 18:00).
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <div className="flex justify-between"><span>Monday - Friday</span><span className="font-semibold">09:00 AM – 07:00 PM</span></div>
                <div className="flex justify-between"><span>Saturday (Peak)</span><span className="font-semibold">08:30 AM – 08:00 PM</span></div>
                <div className="flex justify-between"><span>Sunday</span><span className="font-semibold">09:00 AM – 06:00 PM</span></div>
              </div>
              <p className="text-[11px] text-slate-400">
                You can fine-tune specific days and holiday closures in Salon Settings anytime.
              </p>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Default Catalog Active</h3>
              <p className="text-xs text-slate-600">
                8 signature services with verified Sri Lankan market rates are pre-loaded (Haircuts, Keratin, Balayage, 24K Facials, Gel Nails, Bridal dressing).
              </p>
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Default service menu ready for instant POS & online booking.</span>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Staff Roster Loaded</h3>
              <p className="text-xs text-slate-600">
                Senior Hair Stylist, Lead Aesthetician, Master Nail Artist, and Bridal Director profiles are ready with custom commission percentages.
              </p>
              <div className="p-3 bg-purple-50 text-purple-900 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#9B3E88]" />
                <span>Working hours and commission calculations configured.</span>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Configure slot booking buffers to give stylists time to clean and sterilize between clients.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Buffer time between appointments (Minutes)
                </label>
                <select
                  value={formData.bufferMinutes}
                  onChange={e => setFormData({ ...formData, bufferMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#9B3E88]"
                >
                  <option value={0}>0 minutes (Back-to-back)</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes (Recommended)</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Your 14-day full-feature trial is active. You can upgrade or change tiers anytime with manual bank deposit slip upload.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {DEFAULT_PLANS.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => setFormData({ ...formData, selectedPlan: p.id })}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      formData.selectedPlan === p.id 
                        ? 'border-[#9B3E88] bg-[#9B3E88]/5 shadow-xs' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold text-[#1B0C2D]">{p.name}</p>
                    <p className="text-[11px] text-[#9B3E88] font-bold mt-1">{formatLKR(p.monthlyPriceLKR)}/mo</p>
                    <p className="text-[10px] text-slate-400 mt-1">Up to {p.maxStaff} staff</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 10 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-[#1B0C2D]">Your Salon is Ready for Business!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                You can now process POS checkouts, manage appointments, add products to inventory, and share your customer booking link.
              </p>
            </div>
          )}
        </div>

        {/* Footer with Prev / Next */}
        <div className="px-6 py-4 bg-[#FAF8F5] border-t border-[#E8DFD6] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Skip Setup
            </button>
          )}

          <button
            onClick={nextStep}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] transition-all shadow-md active:scale-95 disabled:cursor-wait disabled:opacity-60"
          >
            <span>{saving ? 'Saving…' : step === totalSteps ? 'Launch Dashboard' : 'Next Step'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
