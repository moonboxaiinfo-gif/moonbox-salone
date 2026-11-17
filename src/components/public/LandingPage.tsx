import React, { useState } from 'react';
import { Logo } from '../brand/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import { formatLKR, BRAND_CONFIG } from '../../constants/brand';
import { SubscriptionPlan, BillingCycle } from '../../types';
import { 
  Calendar, 
  CreditCard, 
  Users, 
  Boxes, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Phone, 
  MessageSquare, 
  Globe, 
  ShieldCheck, 
  TrendingUp, 
  Scissors, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Menu,
  X,
  Lock,
  Layers,
  Sparkle
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenSignUp: () => void;
  onExploreDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenSignUp,
  onExploreDemo
}) => {
  const { resolvedTheme } = useTheme();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const plans = StorageService.getPlans() || [];

  const isDark = resolvedTheme === 'dark';

  const faqs = [
    {
      q: "How does salon workspace registration work for Sri Lankan salons?",
      a: "Every new salon workspace registers in 3 simple steps without requiring upfront credit card details. After submission, your isolated salon database is prepared, and Moonbox Digital platform administrators review and activate your free trial or assign your chosen package."
    },
    {
      q: "How do I pay for my subscription in Sri Lanka?",
      a: "We support direct manual bank transfers via Commercial Bank of Ceylon (CEFT or deposit slip). You simply submit your payment slip through your dashboard, and our Moonbox Digital platform team verifies and activates your subscription within 2 hours."
    },
    {
      q: "Can my clients book appointments directly via WhatsApp or online?",
      a: "Yes! Every salon gets a dedicated public web address (e.g. yoursalon.moonboxsalon.lk) where clients can browse treatment menus, select stylists, and choose available time slots 24/7. Instant WhatsApp confirmations are generated for Sri Lankan mobile numbers."
    },
    {
      q: "How does double-booking prevention work?",
      a: "Our scheduling engine cross-verifies stylist working hours, scheduled breaks, cleaning buffers, and overlapping appointments at database level. Stylists can never be double-booked during the same time interval."
    },
    {
      q: "Can I connect my own custom web domain?",
      a: "Yes! On the Growth and Dominate packages, you can attach your own branded domain (e.g. salon.glamour.lk) with free automated SSL encryption."
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-[#0E0416] text-[#F3C9AB]' : 'bg-[#FAF8F5] text-[#1B0C2D]'
    }`}>
      {/* ======================================================== */}
      {/* 1. TOP ANNOUNCEMENT & NAVIGATION BAR                      */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-[#1B0C2D] via-[#421C64] to-[#1B0C2D] text-white text-[11px] py-2 px-4 text-center font-medium border-b border-[#3D1A5C] flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#DE9E74] shrink-0" />
        <span>Moonbox Salon 2.0 is live in Sri Lanka — Built for transformative hair artistry & digital salon management.</span>
        <button 
          onClick={onOpenSignUp}
          className="underline font-bold text-[#DE9E74] hover:text-white ml-1"
        >
          Register Your Salon →
        </button>
      </div>

      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
        isDark ? 'bg-[#140921]/90 border-[#2D1344]' : 'bg-white/90 border-[#E8DFD6]'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Logo variant={isDark ? 'dark' : 'light'} size="sm" showTagline={true} />

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold">
            <a href="#features" className="hover:text-[#DE9E74] transition-colors">Features</a>
            <a href="#solutions" className="hover:text-[#DE9E74] transition-colors">Why Moonbox</a>
            <a href="#pricing" className="hover:text-[#DE9E74] transition-colors">Pricing Plans</a>
            <a href="#faq" className="hover:text-[#DE9E74] transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-[#DE9E74] transition-colors">Contact</a>
          </nav>

          {/* Right Action Buttons & Theme Toggle */}
          <div className="hidden sm:flex items-center gap-3">
            <ThemeToggle />

            <button
              onClick={onOpenLogin}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                isDark ? 'text-white hover:text-[#DE9E74]' : 'text-slate-800 hover:text-[#9B3E88]'
              }`}
            >
              Sign In
            </button>

            <button
              onClick={onOpenSignUp}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] text-xs font-extrabold shadow-md hover:opacity-95 transition-all"
            >
              Register Now
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className={`sm:hidden p-5 border-b space-y-3 text-xs font-bold ${
            isDark ? 'bg-[#180A26] border-[#2D1344]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Features</a>
            <a href="#solutions" onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Why Moonbox</a>
            <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Pricing Plans</a>
            <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="block py-1">FAQ</a>
            <div className="pt-3 border-t border-slate-200/20 flex flex-col gap-2">
              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenLogin(); }}
                className="w-full py-2.5 rounded-xl border border-[#DE9E74]/40 text-center font-bold"
              >
                Sign In to Workspace
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenSignUp(); }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] font-extrabold text-center shadow-md"
              >
                Start 14-Day Free Trial
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SECTION                                           */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold tracking-wide uppercase shadow-sm bg-gradient-to-r from-[#9B3E88]/15 via-[#DE9E74]/15 to-[#9B3E88]/15 border-[#DE9E74]/30 text-[#DE9E74]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Tenant Salon Management Platform · Sri Lanka</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Building a Smarter Salon for the Modern Era.
          </h1>

          <p className="text-sm sm:text-base lg:text-lg max-w-2xl mx-auto opacity-80 leading-relaxed">
            Replace paper appointment books, manual stock calculations, scattered Excel sheets, and handwritten bills with <strong>Moonbox Salon</strong>—the enterprise digital management platform engineered for salons in Sri Lanka.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenSignUp}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#DE9E74] via-[#E4A87F] to-[#C78558] text-[#1B0C2D] text-sm font-extrabold shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onExploreDemo}
              className={`w-full sm:w-auto px-7 py-4 rounded-2xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                isDark 
                  ? 'bg-[#1C0D2E] border-[#3C1A5A] text-white hover:bg-[#2A113C]' 
                  : 'bg-white border-[#E8DFD6] text-[#1B0C2D] hover:bg-[#FAF8F5]'
              }`}
            >
              <Scissors className="w-4 h-4 text-[#DE9E74]" />
              <span>Explore Live Salon Dashboard</span>
            </button>
          </div>

          <p className="text-[11px] opacity-60">
            ✓ Instant setup in 60 seconds · ✓ No credit card required · ✓ LKR currency native
          </p>
        </div>

        {/* Hero Interactive App Preview */}
        <div className="max-w-5xl mx-auto mt-12 rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-[#DE9E74]/40 via-[#9B3E88]/20 to-transparent shadow-2xl">
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-[#140921] border-[#3C1A5A]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <div className="px-4 py-3 bg-[#10061A] text-white flex items-center justify-between border-b border-[#251239]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] text-slate-400 font-mono ml-2 hidden sm:inline">
                  colombo.moonboxsalon.lk/dashboard
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#DE9E74] font-bold">Moonbox Salon - Flagship Colombo</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                  Live Operations
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#1C0D2E] border-[#2E1248]' : 'bg-[#FAF8F5] border-slate-200'}`}>
                <span className="text-[10px] uppercase font-bold opacity-60 block">Today's Revenue</span>
                <span className="text-xl font-extrabold text-emerald-500 block mt-1">Rs. 89,200</span>
                <span className="text-[10px] opacity-60">12 POS sales settled</span>
              </div>
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#1C0D2E] border-[#2E1248]' : 'bg-[#FAF8F5] border-slate-200'}`}>
                <span className="text-[10px] uppercase font-bold opacity-60 block">Today's Appointments</span>
                <span className="text-xl font-extrabold text-[#DE9E74] block mt-1">14 Bookings</span>
                <span className="text-[10px] opacity-60">Zero double-bookings</span>
              </div>
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#1C0D2E] border-[#2E1248]' : 'bg-[#FAF8F5] border-slate-200'}`}>
                <span className="text-[10px] uppercase font-bold opacity-60 block">Staff Commission</span>
                <span className="text-xl font-extrabold text-purple-400 block mt-1">Rs. 18,450</span>
                <span className="text-[10px] opacity-60">Auto-calculated</span>
              </div>
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#1C0D2E] border-[#2E1248]' : 'bg-[#FAF8F5] border-slate-200'}`}>
                <span className="text-[10px] uppercase font-bold opacity-60 block">Low Stock Alert</span>
                <span className="text-xl font-extrabold text-amber-500 block mt-1">1 Item</span>
                <span className="text-[10px] opacity-60">Keratin Shampoo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. CORE BENEFITS & PROBLEMS SOLVED                        */}
      {/* ======================================================== */}
      <section id="solutions" className={`py-20 px-4 sm:px-6 lg:px-8 border-y ${
        isDark ? 'bg-[#12051E] border-[#2B1240]' : 'bg-[#FAF4EE] border-[#E8DFD6]'
      }`}>
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-extrabold tracking-widest text-[#DE9E74] uppercase">
              Transforming Salon Operations
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Replace the Headaches of Fragmented Manual Systems
            </h2>
            <p className="text-xs sm:text-sm opacity-70">
              Traditional salons lose up to 15% of annual revenue through missed appointments, manual stock slippage, and unrecorded commissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-3xl border transition-all ${
              isDark ? 'bg-[#1B0C2D] border-[#381B59]' : 'bg-white border-[#E8DFD6]'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold mb-4">
                ✕
              </div>
              <h3 className="text-base font-bold mb-2">Paper Books & Missed Bookings</h3>
              <p className="text-xs opacity-75 leading-relaxed">
                Paper appointment diaries cause overlapping client appointments, lost bookings, and frustrating stylist clashes. Moonbox enforces database-level double-booking conflict checks.
              </p>
            </div>

            <div className={`p-6 rounded-3xl border transition-all ${
              isDark ? 'bg-[#1B0C2D] border-[#381B59]' : 'bg-white border-[#E8DFD6]'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold mb-4">
                ✕
              </div>
              <h3 className="text-base font-bold mb-2">Manual Stock Theft & Stockouts</h3>
              <p className="text-xs opacity-75 leading-relaxed">
                When retail products are sold without inventory linkage, salons run out of critical keratin, developers, and serums unexpectedly. Every POS sale decrements stock and alerts you before items run dry.
              </p>
            </div>

            <div className={`p-6 rounded-3xl border transition-all ${
              isDark ? 'bg-[#1B0C2D] border-[#381B59]' : 'bg-white border-[#E8DFD6]'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold mb-4">
                ✓
              </div>
              <h3 className="text-base font-bold mb-2">Accurate Daily Commissions</h3>
              <p className="text-xs opacity-75 leading-relaxed">
                Eliminate disputed commission calculations. Moonbox automatically tracks individual stylist percentages for both hair/skin services and retail products sold on every invoice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. MAIN FEATURES SHOWCASE                                 */}
      {/* ======================================================== */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-extrabold tracking-widest text-[#DE9E74] uppercase">
            Everything in One Cloud Architecture
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Complete Suite of Salon Management Tools
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className={`p-6 rounded-3xl border space-y-3 ${
            isDark ? 'bg-[#180A26] border-[#34164F]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-[#DE9E74] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold">Smart Calendar & Buffer Engine</h4>
            <p className="text-xs opacity-75 leading-relaxed">
              Timeline and agenda scheduling with automated sanitation buffers between client appointments, staff working hours, and instant check-in.
            </p>
          </div>

          {/* Feature 2 */}
          <div className={`p-6 rounded-3xl border space-y-3 ${
            isDark ? 'bg-[#180A26] border-[#34164F]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold">Fast POS Register & Tax Invoices</h4>
            <p className="text-xs opacity-75 leading-relaxed">
              Touch-friendly cashier register supporting services, retail products, discount percentages, tip gratuity, and official printable tax receipts.
            </p>
          </div>

          {/* Feature 3 */}
          <div className={`p-6 rounded-3xl border space-y-3 ${
            isDark ? 'bg-[#180A26] border-[#34164F]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold">Customer CRM with WhatsApp Links</h4>
            <p className="text-xs opacity-75 leading-relaxed">
              Full client profile history with visit counts, lifetime LKR spending, scalp notes, and one-tap direct WhatsApp messaging for Sri Lankan numbers.
            </p>
          </div>

          {/* Feature 4 */}
          <div className={`p-6 rounded-3xl border space-y-3 ${
            isDark ? 'bg-[#180A26] border-[#34164F]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold">Inventory & Movement Audit Logs</h4>
            <p className="text-xs opacity-75 leading-relaxed">
              Track shampoos, bleach developer supplies, and retail stock movements with real-time low-stock alerts before products deplete.
            </p>
          </div>

          {/* Feature 5 */}
          <div className={`p-6 rounded-3xl border space-y-3 ${
            isDark ? 'bg-[#180A26] border-[#34164F]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold">Public Website & 24/7 Booking</h4>
            <p className="text-xs opacity-75 leading-relaxed">
              Every salon gets an elegant customer storefront with customized portfolio gallery, treatment menus, and live online appointment reservation.
            </p>
          </div>

          {/* Feature 6 */}
          <div className={`p-6 rounded-3xl border space-y-3 ${
            isDark ? 'bg-[#180A26] border-[#34164F]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold">Financial Reports in LKR</h4>
            <p className="text-xs opacity-75 leading-relaxed">
              View daily revenue, operational rent and utility expenses, estimated net profit, and staff productivity metrics with one-click CSV export.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. PRICING PLANS (CONNECTED TO DATABASE)                 */}
      {/* ======================================================== */}
      <section id="pricing" className={`py-20 px-4 sm:px-6 lg:px-8 border-y ${
        isDark ? 'bg-[#12051E] border-[#2B1240]' : 'bg-[#FAF4EE] border-[#E8DFD6]'
      }`}>
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-extrabold tracking-widest text-[#DE9E74] uppercase">
              Transparent Sri Lankan Pricing
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Invest in Scalable Salon Software
            </h2>
            <p className="text-xs sm:text-sm opacity-70">
              Live subscription packages managed directly through Moonbox Digital. All packages include a 14-day free trial.
            </p>

            {/* Monthly / Yearly Switcher */}
            <div className="pt-2 flex items-center justify-center gap-2">
              <div className={`inline-flex items-center p-1 rounded-2xl border ${
                isDark ? 'bg-[#1C0D2E] border-[#3C1A5A]' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-[#DE9E74] text-[#1B0C2D] shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    billingCycle === 'yearly'
                      ? 'bg-[#DE9E74] text-[#1B0C2D] shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <span>Yearly Billing</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-extrabold">
                    Save 17%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(plans || []).map(p => {
              const price = billingCycle === 'yearly' ? p.yearlyPriceLKR : p.monthlyPriceLKR;
              return (
                <div
                  key={p.id}
                  className={`rounded-3xl border p-7 flex flex-col justify-between relative transition-all ${
                    p.isPopular
                      ? 'border-[#DE9E74] shadow-2xl ring-2 ring-[#DE9E74]/50 scale-[1.02]'
                      : isDark
                        ? 'bg-[#180A26] border-[#381B59]'
                        : 'bg-white border-[#E8DFD6]'
                  } ${isDark && p.isPopular ? 'bg-[#220E36]' : ''}`}
                >
                  {p.isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                      Most Popular for Salons
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-bold">{p.name}</h3>
                    <p className="text-xs opacity-70 mt-1 min-h-[36px]">{p.description}</p>

                    <div className="mt-5 pt-4 border-t border-slate-200/20">
                      <span className="text-3xl font-extrabold tracking-tight">
                        {formatLKR(price)}
                      </span>
                      <span className="text-xs opacity-60 ml-1">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>

                    <ul className="mt-6 space-y-2.5 text-xs opacity-85">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Up to <strong>{p.maxStaff} Staff Members</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Up to <strong>{p.maxCustomers.toLocaleString()} Clients</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Online Public Booking Service</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Salon Storefront & Portfolio</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.hasInventory ? 'text-emerald-400' : 'opacity-30'}`} />
                        <span className={p.hasInventory ? '' : 'opacity-40'}>
                          Product Inventory & Movement Logs
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.hasCommissions ? 'text-emerald-400' : 'opacity-30'}`} />
                        <span className={p.hasCommissions ? '' : 'opacity-40'}>
                          Automated Staff Commissions
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.hasCustomDomain ? 'text-emerald-400' : 'opacity-30'}`} />
                        <span className={p.hasCustomDomain ? '' : 'opacity-40'}>
                          Custom Web Domain & SSL
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-200/20">
                    <button
                      onClick={onOpenSignUp}
                      className={`w-full py-3 rounded-xl font-extrabold text-xs transition-all shadow-md ${
                        p.isPopular
                          ? 'bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] hover:opacity-95'
                          : isDark
                            ? 'bg-[#2E134A] text-white hover:bg-[#3D1A63]'
                            : 'bg-[#1B0C2D] text-[#F3C9AB] hover:bg-[#2A113C]'
                      }`}
                    >
                      Start 14-Day Free Trial
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. HOW IT WORKS                                           */}
      {/* ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-extrabold tracking-widest text-[#DE9E74] uppercase">
            Simple 3-Step Setup
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            How to Get Started Today
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className={`p-6 rounded-3xl border ${
            isDark ? 'bg-[#180A26] border-[#381B59]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <span className="w-10 h-10 rounded-full bg-[#DE9E74] text-[#1B0C2D] font-extrabold flex items-center justify-center mx-auto mb-3 text-sm">
              1
            </span>
            <h4 className="font-bold text-sm mb-1">Create Salon Workspace</h4>
            <p className="text-xs opacity-75">
              Sign up in 60 seconds with your salon name and phone number. Your 14-day trial begins instantly.
            </p>
          </div>

          <div className={`p-6 rounded-3xl border ${
            isDark ? 'bg-[#180A26] border-[#381B59]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <span className="w-10 h-10 rounded-full bg-[#DE9E74] text-[#1B0C2D] font-extrabold flex items-center justify-center mx-auto mb-3 text-sm">
              2
            </span>
            <h4 className="font-bold text-sm mb-1">Load Services & Team</h4>
            <p className="text-xs opacity-75">
              Use our built-in Sri Lankan price defaults or configure your own hair, facial, bridal, and nail treatments.
            </p>
          </div>

          <div className={`p-6 rounded-3xl border ${
            isDark ? 'bg-[#180A26] border-[#381B59]' : 'bg-white border-[#E8DFD6]'
          }`}>
            <span className="w-10 h-10 rounded-full bg-[#DE9E74] text-[#1B0C2D] font-extrabold flex items-center justify-center mx-auto mb-3 text-sm">
              3
            </span>
            <h4 className="font-bold text-sm mb-1">Accept 24/7 Bookings & POS</h4>
            <p className="text-xs opacity-75">
              Share your public booking link with clients, run POS checkouts, and let Moonbox handle inventory and commissions.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. FREQUENTLY ASKED QUESTIONS                             */}
      {/* ======================================================== */}
      <section id="faq" className={`py-20 px-4 sm:px-6 lg:px-8 border-y ${
        isDark ? 'bg-[#12051E] border-[#2B1240]' : 'bg-[#FAF4EE] border-[#E8DFD6]'
      }`}>
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold tracking-widest text-[#DE9E74] uppercase">
              Got Questions?
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx}
                  className={`rounded-2xl border transition-all ${
                    isDark ? 'bg-[#180A26] border-[#381B59]' : 'bg-white border-[#E8DFD6]'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between font-bold text-sm gap-4"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#DE9E74] shrink-0" /> : <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs opacity-75 leading-relaxed border-t border-slate-200/10 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. CONTACT & FOOTER                                       */}
      {/* ======================================================== */}
      <footer id="contact" className={`py-16 px-4 sm:px-6 lg:px-8 text-xs border-t ${
        isDark ? 'bg-[#0A0210] border-[#230C33] text-slate-400' : 'bg-[#140921] border-[#251239] text-slate-300'
      }`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-1">
            <Logo variant="dark" size="sm" showTagline={true} />
            <p className="leading-relaxed text-[11px] mt-2">
              Moonbox Salon, powered by <strong>Moonbox Digital</strong>.<br />
              Enterprise multi-tenant salon management software for Sri Lanka.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Headquarters</h4>
            <p className="leading-relaxed">
              {BRAND_CONFIG.address}<br />
              Colombo 03, Sri Lanka
            </p>
            <p className="mt-2 text-[11px]">
              Telephone: <strong>{BRAND_CONFIG.phone}</strong><br />
              WhatsApp: <strong>{BRAND_CONFIG.whatsapp}</strong>
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Support & Legal</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>Support Email: {BRAND_CONFIG.supportEmail}</li>
              <li>Official Site: {BRAND_CONFIG.website}</li>
              <li>Security: Supabase Row Level Security (RLS)</li>
              <li>Hosting: Netlify Global Edge</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Enterprise Security</h4>
            <p className="text-[11px] leading-relaxed">
              Every salon tenant operates inside an isolated, encrypted database container.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#DE9E74]">
              <ShieldCheck className="w-4 h-4 text-[#DE9E74] shrink-0" />
              <span>PostgreSQL RLS & TOTP MFA Protected</span>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <span>© {new Date().getFullYear()} Moonbox Salon. All rights reserved. Powered by Moonbox Digital.</span>
          <span>Official Currency: Sri Lankan Rupee (LKR)</span>
        </div>
      </footer>
    </div>
  );
};
