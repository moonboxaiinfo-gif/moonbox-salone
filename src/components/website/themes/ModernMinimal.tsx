import React from 'react';
import { MapPin, Phone, Mail, Clock, MessageCircle, ChevronRight, ArrowRight, BadgeCheck } from 'lucide-react';
import {
  WebsiteRendererProps,
  useTokens,
  useButtonStyle,
  orderedSections,
  formatPrice,
  Stars,
  SocialIcons,
  OpeningHours,
  BookCta,
  EmptyHint,
} from '../WebsiteShared';
import { WebsiteService } from '../../../services/websiteService';

/**
 * THEME 02 — MODERN MINIMAL
 * White/black/grey grid, minimalist type, large photography, prominent booking CTA.
 */

export const ModernMinimal: React.FC<WebsiteRendererProps> = (props) => {
  const { config, tenant, services = [], categories = [], reviews, onBook } = props;
  const tokens = useTokens(config);
  const btn = useButtonStyle(config);
  const sections = new Set(orderedSections(config).map(s => s.id));
  const c = config.content;
  const whatsappLink = WebsiteService.buildWhatsAppLink(config.contact.whatsappNumber, config.contact.whatsappGreeting);
  const displayServices = services.filter(s => !config.serviceDisplay.hiddenServiceIds.includes(s.id));

  const heroAlign = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' }[c.heroTextAlignment];

  return (
    <div style={tokens} className="min-h-full">
      {/* 1. Minimal header */}
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur" style={{ borderColor: '#E5E7EB', background: 'color-mix(in srgb, var(--wb-bg) 92%, transparent)' }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 min-h-16 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="h-8 w-8 object-contain" style={{ borderRadius: 'var(--wb-img-radius)' }} />
            ) : (
              <img src="/brand/moonbox-salon-mark.jpg" alt="Moonbox Salon" className="h-8 w-8 object-cover" style={{ borderRadius: 'var(--wb-img-radius)' }} />
            )}
            <span className="min-w-0 truncate font-extrabold tracking-tight">{tenant.name}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            {sections.has('services') && <a href="#services" className="hover:text-black transition-colors">Services</a>}
            {sections.has('gallery') && <a href="#gallery" className="hover:text-black transition-colors">Gallery</a>}
            {sections.has('team') && <a href="#team" className="hover:text-black transition-colors">Team</a>}
            {sections.has('reviews') && <a href="#reviews" className="hover:text-black transition-colors">Reviews</a>}
            {sections.has('contact') && <a href="#contact" className="hover:text-black transition-colors">Contact</a>}
          </nav>
          <BookCta label={c.bookButtonLabel} onBook={onBook} className="shrink-0 max-w-[42vw] text-center leading-tight" style={{ ...btn, padding: 'clamp(7px, 2.5vw, 9px) clamp(8px, 3vw, 20px)', fontSize: 'clamp(10px, 3vw, 13px)' }} icon />
        </div>
        <nav aria-label="Main navigation" className="md:hidden flex gap-5 overflow-x-auto px-4 py-2 text-xs text-gray-600 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.has('services') && <a href="#services">Services</a>}
          {sections.has('gallery') && <a href="#gallery">Gallery</a>}
          {sections.has('team') && <a href="#team">Team</a>}
          {sections.has('reviews') && <a href="#reviews">Reviews</a>}
          {sections.has('contact') && <a href="#contact">Contact</a>}
        </nav>
      </header>

      {/* 2. Strong hero — split layout with big type */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-14">
        <div className={`flex flex-col ${config.typography.heroLayout === 'split' && c.heroImageUrl ? 'md:flex-row md:items-center gap-12' : ''} ${heroAlign}`}>
          <div className="flex-1">
            {tenant.tagline && <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400 mb-4">{tenant.tagline}</p>}
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] mb-6">{c.heroHeadline}</h1>
            {c.heroDescription && <p className="text-lg text-gray-500 max-w-lg mb-8 leading-relaxed">{c.heroDescription}</p>}
            <div className={`flex flex-wrap gap-3 ${c.heroTextAlignment === 'center' ? 'justify-center' : c.heroTextAlignment === 'right' ? 'justify-end' : ''}`}>
              <BookCta label={c.bookButtonLabel} onBook={onBook} style={{ ...btn, padding: '14px 32px', fontSize: '15px' }} icon />
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-[14px] text-[15px] font-bold border-2 border-gray-200 hover:border-gray-400 transition-colors" style={{ borderRadius: '999px', color: 'inherit' }}>
                  <MessageCircle className="w-4 h-4" /> {c.whatsappButtonLabel}
                </a>
              )}
            </div>
          </div>
          {config.typography.heroLayout === 'split' && c.heroImageUrl && (
            <img src={c.heroImageUrl} alt="Salon hero" className="flex-1 w-full h-[420px] object-cover" style={{ borderRadius: 'var(--wb-img-radius)' }} />
          )}
          {config.typography.heroLayout === 'overlay' && c.heroImageUrl && (
            <img src={c.heroImageUrl} alt="Salon hero" className="w-full h-[480px] object-cover mt-10" style={{ borderRadius: 'var(--wb-img-radius)' }} />
          )}
        </div>
      </section>

      {/* 3. Service grid */}
      {sections.has('services') && (
        <section id="services" className="max-w-6xl mx-auto px-6 py-[var(--wb-pad)]">
          <div className="flex items-end justify-between mb-10">
            <h2 className="text-3xl font-black tracking-tight">{c.servicesHeading}</h2>
            <BookCta label={c.bookButtonLabel} onBook={onBook} className="hidden sm:inline-flex text-sm" style={{ ...btn, padding: '10px 22px' }} icon />
          </div>
          {displayServices.length === 0 ? (
            <EmptyHint text="Service details will appear here soon." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayServices.slice(0, 9).map(s => (
                <div key={s.id} className="border border-gray-200 p-6 flex flex-col hover:shadow-lg transition-shadow" style={{ borderRadius: 'var(--wb-radius)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold">{s.name}</h3>
                    {config.serviceDisplay.featuredServiceIds.includes(s.id) && (
                      <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5" style={{ borderRadius: '999px' }}>Popular</span>
                    )}
                  </div>
                  {s.description && <p className="text-sm text-gray-500 mt-2 flex-1">{s.description}</p>}
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="font-black text-lg">{formatPrice(s.priceLKR)}</span>
                    <span className="flex items-center gap-1 text-gray-400"><Clock className="w-3.5 h-3.5" /> {s.durationMinutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Price list — clean table */}
      {displayServices.length > 0 && (
        <section className="border-y border-gray-100" style={{ background: '#FAFAFA' }}>
          <div className="max-w-3xl mx-auto px-6 py-14">
            <h2 className="text-2xl font-black tracking-tight mb-6">Price List</h2>
            <div className="divide-y divide-gray-200">
              {displayServices.slice(0, 10).map(s => (
                <div key={`pl-${s.id}`} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="flex items-center gap-6">
                    <span className="text-gray-400">{s.durationMinutes} min</span>
                    <span className="font-bold">{formatPrice(s.priceLKR)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. About */}
      {sections.has('about') && (
        <section className="max-w-6xl mx-auto px-6 py-[var(--wb-pad)]">
          <div className={`grid md:grid-cols-2 gap-12 items-center`}>
            {c.aboutImageUrl && <img src={c.aboutImageUrl} alt="Inside the salon" className="w-full h-[380px] object-cover" style={{ borderRadius: 'var(--wb-img-radius)' }} />}
            <div>
              <h2 className="text-3xl font-black tracking-tight mb-5">{c.aboutHeading}</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{c.aboutText}</p>
            </div>
          </div>
        </section>
      )}

      {/* 6. Before & after / gallery */}
      {sections.has('gallery') && (
        <section id="gallery" className="max-w-6xl mx-auto px-6 pb-[var(--wb-pad)]">
          <h2 className="text-3xl font-black tracking-tight mb-10">{c.galleryHeading}</h2>
          {config.gallery.length === 0 ? (
            <EmptyHint text="Our latest work will be showcased here." />
          ) : (
            <div className="columns-2 md:columns-3 gap-4 [&>*]:mb-4">
              {config.gallery.slice(0, 12).map(g => (
                <figure key={g.id} className="break-inside-avoid overflow-hidden group" style={{ borderRadius: 'var(--wb-img-radius)' }}>
                  <img src={g.url} alt={g.altText || g.title} loading="lazy" className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  {g.beforeUrl && (
                    <div className="grid grid-cols-2 gap-0.5 mt-0.5">
                      <img src={g.beforeUrl} alt={`${g.title || 'Work'} — before`} loading="lazy" className="w-full aspect-square object-cover" />
                      <img src={g.url} alt={`${g.title || 'Work'} — after`} loading="lazy" className="w-full aspect-square object-cover" />
                    </div>
                  )}
                  {(g.title || g.category) && (
                    <figcaption className="pt-2 pb-1 text-xs text-gray-500 flex items-center justify-between">
                      <span className="font-semibold text-gray-800">{g.title}</span>
                      <span>{g.category}</span>
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 7. Team */}
      {sections.has('team') && config.team.length > 0 && (
        <section id="team" className="border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-[var(--wb-pad)]">
            <h2 className="text-3xl font-black tracking-tight mb-10">{c.teamHeading}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {config.team.map(m => (
                <div key={m.id}>
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} className="w-full aspect-square object-cover" style={{ borderRadius: 'var(--wb-img-radius)' }} />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-4xl font-black text-gray-300" style={{ borderRadius: 'var(--wb-img-radius)' }}>{m.name.charAt(0)}</div>
                  )}
                  <h3 className="font-bold mt-4">{m.name}</h3>
                  <p className="text-xs uppercase tracking-widest text-gray-400">{m.role}</p>
                  {m.bio && <p className="text-sm text-gray-500 mt-2">{m.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. Reviews */}
      {sections.has('reviews') && (
        <section id="reviews" className="border-t border-gray-100" style={{ background: '#FAFAFA' }}>
          <div className="max-w-6xl mx-auto px-6 py-[var(--wb-pad)]">
            <div className="flex items-end justify-between mb-10">
              <h2 className="text-3xl font-black tracking-tight">{c.reviewsHeading}</h2>
              {props.onWriteReview && (
                <button onClick={props.onWriteReview} className="text-sm font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
                  Write a review <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            {reviews.length === 0 ? (
              <EmptyHint text="No client reviews yet — be the first to share your experience." />
            ) : (
              <div className="grid md:grid-cols-3 gap-5">
                {reviews.slice(0, 6).map(r => (
                  <div key={r.id} className="bg-white border border-gray-200 p-6" style={{ borderRadius: 'var(--wb-radius)' }}>
                    <Stars rating={r.rating} color="#111111" />
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">“{r.text}”</p>
                    <p className="mt-4 text-xs font-bold">
                      {r.customerName}
                      {r.verifiedBooking && <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-semibold"><BadgeCheck className="w-3.5 h-3.5" /> Verified</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 9. Location, hours & contact */}
      {(sections.has('hours') || sections.has('contact')) && (
        <section id="contact" className="max-w-6xl mx-auto px-6 py-[var(--wb-pad)] grid md:grid-cols-3 gap-12">
          {sections.has('hours') && (
            <div>
              <h3 className="font-black text-lg mb-5 flex items-center gap-2"><Clock className="w-5 h-5" /> {c.hoursHeading}</h3>
              <OpeningHours tenant={tenant} />
            </div>
          )}
          <div>
            <h3 className="font-black text-lg mb-5 flex items-center gap-2"><MapPin className="w-5 h-5" /> Location</h3>
            {(config.contact.address || config.contact.city) && <p className="text-gray-600">{config.contact.address}{config.contact.city ? `, ${config.contact.city}` : ''}</p>}
            {config.contact.mapLink && (
              <a href={config.contact.mapLink} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4 inline-flex items-center gap-1 mt-2">
                Open in Maps <ChevronRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <div>
            <h3 className="font-black text-lg mb-5 flex items-center gap-2"><Phone className="w-5 h-5" /> {c.contactHeading}</h3>
            <div className="space-y-2 text-gray-600">
              {config.contact.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 opacity-50" /> {config.contact.phone}</p>}
              {config.contact.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 opacity-50" /> {config.contact.email}</p>}
              <SocialIcons config={config} />
            </div>
          </div>
        </section>
      )}

      {/* 10. Footer */}
      <footer className="bg-black text-white">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p className="opacity-70">{c.footerText}</p>
          <BookCta label={c.bookButtonLabel} onBook={onBook} style={{ background: '#fff', color: '#000', padding: '10px 24px', fontSize: '13px' }} icon />
        </div>
      </footer>
    </div>
  );
};
