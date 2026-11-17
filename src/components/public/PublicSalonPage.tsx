import React, { useState } from 'react';
import { useRouter } from '../../context/RouterContext';
import { SalonTenant, Service } from '../../types';
import { useTenantCatalog } from '../../services/asyncDataService';
import { formatLKR, BRAND_CONFIG } from '../../constants/brand';
import { Logo } from '../brand/Logo';
import { PublicBookingFlow } from './PublicBookingFlow';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  Check, 
  Scissors,
  X
} from 'lucide-react';

interface PublicSalonPageProps {
  tenant: SalonTenant;
  onClose: () => void;
}

export const PublicSalonPage: React.FC<PublicSalonPageProps> = ({
  tenant,
  onClose
}) => {
  const { navigate } = useRouter();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<Service | null>(null);
  const catalogResource = useTenantCatalog(tenant.id);
  const services = (catalogResource.data?.services || []).filter(s => s.isActive && s.isOnlineBookingEnabled);
  const categories = catalogResource.data?.categories || [];
  const gallery = tenant.portfolio.gallery || [];

  const handleBookService = (srv: Service) => {
    setSelectedServiceForBooking(srv);
    setIsBookingOpen(true);
  };

  const rawWa = tenant.whatsapp || tenant.phone;
  const cleanWa = rawWa.replace(/[^0-9]/g, '');
  const waUrl = cleanWa.startsWith('0') 
    ? `https://wa.me/94${cleanWa.substring(1)}` 
    : `https://wa.me/94${cleanWa}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF8F5] overflow-y-auto">
      {/* Top Floating Admin Exit Bar (for salon manager) */}
      <div className="sticky top-0 z-40 bg-[#140921]/90 backdrop-blur-md px-3 sm:px-6 py-2.5 text-xs text-white flex items-center justify-between gap-2 border-b border-[#251239]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="w-2 h-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate text-[#F3C9AB] font-semibold">Public Client Storefront Preview</span>
          <span className="text-slate-400 hidden sm:inline">· {tenant.slug}.moonboxsalon.lk</span>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 px-2 sm:px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#F3C9AB] text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <span className="hidden sm:inline">Return to Dashboard</span>
          <span className="sm:hidden">Dashboard</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Public Website Header */}
      <header className="min-h-16 sm:h-20 bg-white/95 backdrop-blur-md border-b border-[#E8DFD6] px-3 sm:px-12 flex items-center justify-between gap-2 sticky top-9 z-30">
        <Logo variant="light" size="sm" showTagline={true} />

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-700">
          <a href="#services" className="hover:text-[#9B3E88] transition-colors">Services</a>
          <a href="#about" className="hover:text-[#9B3E88] transition-colors">Our Story</a>
          <a href="#team" className="hover:text-[#9B3E88] transition-colors">Stylists</a>
          <a href="#gallery" className="hover:text-[#9B3E88] transition-colors">Lookbook</a>
          <a href="#contact" className="hover:text-[#9B3E88] transition-colors">Location</a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </a>

          <button
            onClick={() => navigate(`/book/${tenant.slug}`)}
            className="shrink-0 px-2.5 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] text-[10px] sm:text-xs font-bold shadow-md hover:from-[#2A113C] hover:to-[#552380] transition-all whitespace-nowrap"
          >
            <span className="hidden sm:inline">Book Appointment</span>
            <span className="sm:hidden">Book</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#180829] via-[#210D36] to-[#12051E] text-white py-20 sm:py-28 px-6 sm:px-12">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-[#F3C9AB]">
            <Sparkles className="w-3.5 h-3.5 text-[#DE9E74]" />
            <span>Sri Lanka’s Premier Luxury Salon Destination</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {tenant.portfolio.heroTitle || 'Elegance Reimagined for the Modern Sri Lankan Woman'}
          </h1>

          <p className="text-sm sm:text-base text-[#DBCADF] max-w-2xl mx-auto leading-relaxed">
            {tenant.portfolio.heroSubtitle || 'Experience haute coiffure, bespoke aesthetic skin treatments, and opulent nail artistry in the heart of Colombo.'}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(`/book/${tenant.slug}`)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] text-sm font-bold shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment Online</span>
            </button>

            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#4BBF98]/10 hover:bg-[#4BBF98]/20 text-[#4BBF98] border border-[#4BBF98]/30 font-bold text-sm flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Salon</span>
              </a>
            )}

            <a
              href="#services"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/15 transition-colors"
            >
              Explore Treatment Menu
            </a>
          </div>
        </div>
      </section>

      {/* Services Menu Section */}
      <section id="services" className="py-16 sm:py-24 px-6 sm:px-12 max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#9B3E88]">
            Curated Salon Catalog
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B0C2D] tracking-tight">
            Signature Services & Treatments
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            All services include consultation, luxury botanicals, and customized finishing by master stylists.
          </p>
        </div>

        {catalogResource.loading && <p role="status" className="text-center text-sm text-slate-500">Loading bookable services…</p>}
        {catalogResource.error && <div role="alert" className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p>{catalogResource.error}</p><button onClick={catalogResource.retry} className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold">Retry</button></div>}
        {!catalogResource.loading && !catalogResource.error && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(srv => {
            const cat = categories.find(c => c.id === srv.categoryId);
            return (
              <div
                key={srv.id}
                className="bg-white p-6 rounded-2xl border border-[#E8DFD6] shadow-2xs hover:border-[#DE9E74] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-[#9B3E88] uppercase tracking-wider">
                        {cat?.name || 'Treatment'} · {srv.durationMinutes} mins
                      </span>
                      <h4 className="text-base font-bold text-[#1B0C2D] mt-0.5">{srv.name}</h4>
                    </div>
                    <span className="text-base font-extrabold text-[#1B0C2D] shrink-0">
                      {formatLKR(srv.priceLKR)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {srv.description || 'Full luxury hair treatment using high-grade formulations.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">LKR inclusive of taxes</span>
                  <button
                    onClick={() => handleBookService(srv)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#DE9E74] text-xs font-bold text-[#1B0C2D] hover:bg-[#DE9E74]/15 transition-colors"
                  >
                    <span>Reserve Slot</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9B3E88]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>}
      </section>

      {/* About Section */}
      <section id="about" className="bg-[#FAF4EE] py-16 px-6 sm:px-12 border-y border-[#E8DFD6]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#9B3E88]">
              About {tenant.name}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B0C2D] mt-1 tracking-tight">
              A Legacy of Care & Hair Artistry
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
              {tenant.portfolio.aboutText || 'Moonbox Salon was created to bring international salon perfection, clean cruelty-free formulations, and bespoke artistry to Sri Lanka.'}
            </p>
            <div className="mt-4 space-y-2 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Certified international master stylists & color directors</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Formaldehyde-free and vegan formulations</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Private bridal suites with air-conditioned dressing lounges</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-xl aspect-4/3 border-2 border-white">
            <img
              src="/salon-interior-still.jpg"
              alt="Warm modern salon interior with elegant styling stations"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Gallery Showcase */}
      {gallery.length > 0 && (
        <section id="gallery" className="py-16 sm:py-24 px-6 sm:px-12 max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#9B3E88]">
              Salon Lookbook
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B0C2D] tracking-tight">
              Transformations & Artistry
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gallery.map(img => (
              <div key={img.id} className="group relative rounded-2xl overflow-hidden aspect-square shadow-sm">
                <img src={img.url} alt={img.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white text-xs">
                  <p className="font-bold">{img.caption}</p>
                  <p className="text-[10px] text-[#DE9E74]">{img.category}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact & Hours Section */}
      <footer id="contact" className="bg-[#140921] text-white py-14 px-6 sm:px-12 border-t border-[#251239]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Logo variant="dark" size="md" showTagline={true} />
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              {tenant.name} · Licensed salon platform powered by Moonbox Digital (Pvt) Ltd.
            </p>
          </div>

          <div className="text-xs space-y-2">
            <h4 className="font-bold text-sm text-[#F3C9AB] uppercase tracking-wider mb-2">Location & Contacts</h4>
            <p className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-[#DE9E74] shrink-0" />
              <span>{tenant.address}, {tenant.city}, Sri Lanka</span>
            </p>
            <p className="flex items-center gap-2 text-slate-300">
              <Phone className="w-4 h-4 text-[#DE9E74] shrink-0" />
              <span>{tenant.phone} (WhatsApp: {tenant.whatsapp})</span>
            </p>
          </div>

          <div className="text-xs space-y-2">
            <h4 className="font-bold text-sm text-[#F3C9AB] uppercase tracking-wider mb-2">Salon Operating Hours</h4>
            <div className="space-y-1 text-slate-300">
              <p>Mon – Fri: 09:00 AM – 07:00 PM</p>
              <p>Saturday: 08:30 AM – 08:00 PM</p>
              <p>Sunday: 09:00 AM – 06:00 PM</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>© {new Date().getFullYear()} {tenant.name}. Powered by Moonbox Digital (Sri Lanka).</span>
          <span>Currency: Sri Lankan Rupee (LKR)</span>
        </div>
      </footer>

      {/* Online Booking Modal Flow */}
      <PublicBookingFlow
        tenant={tenant}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        preselectedService={selectedServiceForBooking}
      />
    </div>
  );
};
