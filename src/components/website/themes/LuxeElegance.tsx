import React from 'react';
import { MapPin, Phone, Mail, MessageCircle, ChevronRight, BadgeCheck } from 'lucide-react';
import { WebsiteConfig, WebsiteGalleryItem } from '../../../types/website';
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
 * THEME 01 — LUXE ELEGANCE
 * Ivory & champagne-gold editorial layout for premium salons and bridal studios.
 */

export const LuxeElegance: React.FC<WebsiteRendererProps> = (props) => {
  const { config, tenant, services = [], categories = [], reviews, onBook } = props;
  const tokens = useTokens(config);
  const btn = useButtonStyle(config);
  const sections = new Set(orderedSections(config).map(s => s.id));
  const c = config.content;
  const whatsappLink = WebsiteService.buildWhatsAppLink(config.contact.whatsappNumber, config.contact.whatsappGreeting);
  const displayServices = services.filter(s => !config.serviceDisplay.hiddenServiceIds.includes(s.id));

  return (
    <div style={tokens} className="min-h-full">
      {/* 1. Elegant header */}
      <header className="sticky top-0 z-30 backdrop-blur-md border-b" style={{ background: 'color-mix(in srgb, var(--wb-bg) 88%, transparent)', borderColor: 'color-mix(in srgb, var(--wb-primary) 12%, transparent)' }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 min-h-[64px] sm:h-[76px] flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="h-10 w-10 object-contain" style={{ borderRadius: 'var(--wb-img-radius)' }} />
            ) : (
              <img src="/brand/moonbox-salon-mark.jpg" alt="Moonbox Salon" className="h-10 w-10 object-cover" style={{ borderRadius: 'var(--wb-img-radius)' }} />
            )}
            <div className="leading-tight">
              <p className="truncate font-bold tracking-wide" style={{ color: 'var(--wb-primary)' }}>{tenant.name}</p>
              {tenant.tagline && <p className="hidden sm:block truncate text-[11px] tracking-[0.18em] uppercase opacity-60">{tenant.tagline}</p>}
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-[13px] tracking-wide">
            {sections.has('services') && <a href="#services" className="opacity-70 hover:opacity-100">Services</a>}
            {sections.has('gallery') && <a href="#gallery" className="opacity-70 hover:opacity-100">Gallery</a>}
            {sections.has('reviews') && <a href="#reviews" className="opacity-70 hover:opacity-100">Reviews</a>}
            {sections.has('contact') && <a href="#contact" className="opacity-70 hover:opacity-100">Contact</a>}
          </nav>
          <BookCta label={c.bookButtonLabel} onBook={onBook} className="shrink-0 max-w-[42vw] text-center leading-tight" style={{ ...btn, padding: 'clamp(7px, 2.5vw, 10px) clamp(8px, 3vw, 22px)', fontSize: 'clamp(10px, 3vw, 13px)', letterSpacing: '0.02em' }} />
        </div>
        <nav aria-label="Main navigation" className="md:hidden flex gap-5 overflow-x-auto px-4 py-2 text-xs whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.has('services') && <a href="#services">Services</a>}
          {sections.has('gallery') && <a href="#gallery">Gallery</a>}
          {sections.has('reviews') && <a href="#reviews">Reviews</a>}
          {sections.has('contact') && <a href="#contact">Contact</a>}
        </nav>
      </header>

      {/* 2. Large editorial hero */}
      <section
        className="relative flex items-center justify-center text-center overflow-hidden"
        style={{
          minHeight: '560px',
          background: c.heroImageUrl
            ? `linear-gradient(rgba(0,0,0,${config.content.heroOverlayOpacity / 100}), rgba(0,0,0,${config.content.heroOverlayOpacity / 100})), url('${c.heroImageUrl}') center/${c.heroImagePosition}/cover no-repeat`
            : 'linear-gradient(160deg, var(--wb-primary) 0%, color-mix(in srgb, var(--wb-primary) 80%, var(--wb-secondary)) 100%)',
          color: c.heroImageUrl ? '#FFFFFF' : 'var(--wb-bg)',
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-24" style={{ textAlign: c.heroTextAlignment === 'center' ? 'center' : c.heroTextAlignment }}>
          <p className="text-[12px] tracking-[0.35em] uppercase mb-5 opacity-85">{tenant.tagline || 'Salon & Studio'}</p>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6" style={{ fontFamily: 'var(--wb-font)' }}>
            {c.heroHeadline}
          </h1>
          {c.heroDescription && <p className="text-base md:text-lg opacity-90 leading-relaxed mb-9 max-w-xl mx-auto">{c.heroDescription}</p>}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <BookCta
              label={c.heroButtonLabel || c.bookButtonLabel}
              onBook={onBook}
              style={{
                padding: '15px 38px', fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase',
                background: c.heroImageUrl ? '#FFFFFF' : 'var(--wb-bg)', color: 'var(--wb-primary)', borderRadius: 'var(--wb-radius)', border: 'none',
              }}
            />
            {whatsappLink && (
              <a
                href={whatsappLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-9 py-[15px] text-sm font-semibold tracking-wide uppercase"
                style={{ border: '1.5px solid currentColor', borderRadius: 'var(--wb-radius)', color: 'inherit' }}
              >
                <MessageCircle className="w-4 h-4" /> {c.whatsappButtonLabel}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 3. Featured services — editorial rows */}
      {sections.has('services') && (
        <section id="services" style={{ padding: 'var(--wb-pad) 0' }} className="max-w-6xl mx-auto px-6">
          <SectionHeading config={config} title={c.servicesHeading} kicker="The Menu" />
          {displayServices.length === 0 ? (
            <EmptyHint text="Service details will appear here soon." />
          ) : (
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-8">
              {displayServices.slice(0, 8).map(s => (
                <div key={s.id} className="group">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--wb-primary)' }}>
                      {s.name}
                      {config.serviceDisplay.featuredServiceIds.includes(s.id) && (
                        <span className="ml-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--wb-secondary)' }}>Signature</span>
                      )}
                    </h3>
                    <span className="flex-1 border-b border-dotted opacity-30" style={{ borderColor: 'var(--wb-primary)' }} />
                    <span className="font-bold whitespace-nowrap" style={{ color: 'var(--wb-secondary)' }}>{formatPrice(s.priceLKR)}</span>
                  </div>
                  <p className="text-sm opacity-60 mt-1">
                    {s.durationMinutes} min{s.description ? ` — ${s.description}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-12">
            <BookCta label={c.bookButtonLabel} onBook={onBook} style={{ ...btn, padding: '14px 34px', fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase' }} icon />
          </div>
        </section>
      )}

      {/* 4. About */}
      {sections.has('about') && (
        <section style={{ background: 'color-mix(in srgb, var(--wb-primary) 5%, var(--wb-bg))' }}>
          <div className="max-w-6xl mx-auto px-6 py-[var(--wb-pad)] grid md:grid-cols-2 gap-12 items-center">
            <div>
              <SectionHeading config={config} title={c.aboutHeading} kicker="Our Story" align="left" />
              <p className="leading-relaxed opacity-80 whitespace-pre-line">{c.aboutText}</p>
            </div>
            {c.aboutImageUrl ? (
              <img src={c.aboutImageUrl} alt="Inside the salon" className="w-full h-[380px] object-cover shadow-2xl" style={{ borderRadius: 'var(--wb-img-radius)' }} />
            ) : (
              <div className="w-full h-[380px] flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--wb-secondary) 15%, var(--wb-bg))', borderRadius: 'var(--wb-img-radius)' }}>
                <p className="tracking-[0.3em] uppercase text-sm opacity-50">{tenant.name}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Signature work gallery */}
      {sections.has('gallery') && (
        <section id="gallery" style={{ padding: 'var(--wb-pad) 0' }} className="max-w-6xl mx-auto px-6">
          <SectionHeading config={config} title={c.galleryHeading} kicker="Portfolio" />
          {config.gallery.length === 0 ? (
            <EmptyHint text="Our latest work will be showcased here." />
          ) : (
            <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4">
              {config.gallery.slice(0, 9).map((g: WebsiteGalleryItem) => (
                <figure key={g.id} className="group relative overflow-hidden" style={{ borderRadius: 'var(--wb-img-radius)' }}>
                  <img src={g.beforeUrl ? g.beforeUrl : g.url} alt={g.altText || g.title} loading="lazy" className="w-full aspect-[4/5] object-cover transition-transform duration-500 group-hover:scale-105" />
                  {(g.title || g.description) && (
                    <figcaption className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
                      <p className="text-sm font-semibold">{g.title}</p>
                      {g.description && <p className="text-xs opacity-80">{g.description}</p>}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 6. Team */}
      {sections.has('team') && config.team.length > 0 && (
        <section style={{ background: 'color-mix(in srgb, var(--wb-primary) 5%, var(--wb-bg))' }}>
          <div className="max-w-6xl mx-auto px-6 py-[var(--wb-pad)]">
            <SectionHeading config={config} title={c.teamHeading} kicker="The Artists" />
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {config.team.map(m => (
                <div key={m.id} className="text-center">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} className="w-32 h-32 mx-auto object-cover rounded-full shadow-lg" />
                  ) : (
                    <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center text-3xl font-bold" style={{ background: 'color-mix(in srgb, var(--wb-secondary) 25%, var(--wb-bg))', color: 'var(--wb-primary)' }}>
                      {m.name.charAt(0)}
                    </div>
                  )}
                  <h3 className="mt-4 font-bold" style={{ color: 'var(--wb-primary)' }}>{m.name}</h3>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--wb-secondary)' }}>{m.role}</p>
                  {m.bio && <p className="text-sm opacity-65 mt-2">{m.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. Reviews */}
      {sections.has('reviews') && (
        <section id="reviews" style={{ padding: 'var(--wb-pad) 0' }} className="max-w-6xl mx-auto px-6">
          <SectionHeading config={config} title={c.reviewsHeading} kicker="Kind Words" />
          {reviews.length === 0 ? (
            <EmptyHint text="No client reviews yet — be the first to share your experience." />
          ) : (
            <div className="mt-10 grid md:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map(r => (
                <blockquote key={r.id} className="p-7 border shadow-sm" style={{ borderColor: 'color-mix(in srgb, var(--wb-primary) 12%, transparent)', borderRadius: 'var(--wb-radius)', background: 'var(--wb-bg)' }}>
                  <Stars rating={r.rating} />
                  <p className="mt-4 text-sm leading-relaxed opacity-85">“{r.text}”</p>
                  <footer className="mt-5 text-xs">
                    <span className="font-bold" style={{ color: 'var(--wb-primary)' }}>{r.customerName}</span>
                    {r.verifiedBooking && (
                      <span className="ml-2 inline-flex items-center gap-1" style={{ color: 'var(--wb-secondary)' }}>
                        <BadgeCheck className="w-3.5 h-3.5" /> Verified client
                      </span>
                    )}
                    {r.serviceRef && <span className="block opacity-50 mt-0.5">{r.serviceRef}</span>}
                  </footer>
                </blockquote>
              ))}
            </div>
          )}
          {props.onWriteReview && (
            <div className="text-center mt-8">
              <button onClick={props.onWriteReview} className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100">
                Write a review
              </button>
            </div>
          )}
        </section>
      )}

      {/* 8. Hours & location */}
      {sections.has('hours') && (
        <section style={{ background: 'color-mix(in srgb, var(--wb-primary) 5%, var(--wb-bg))' }}>
          <div className="max-w-6xl mx-auto px-6 py-[var(--wb-pad)] grid md:grid-cols-2 gap-12">
            <div className="text-center">
              <SectionHeading config={config} title={c.hoursHeading} kicker="Visit Us" />
              <OpeningHours tenant={tenant} />
            </div>
            <div className="text-center">
              <SectionHeading config={config} title="Find Us" kicker="Location" />
              <div className="space-y-2 text-sm">
                {config.contact.address && (
                  <p className="flex items-center justify-center gap-2"><MapPin className="w-4 h-4 opacity-60" /> {config.contact.address}{config.contact.city ? `, ${config.contact.city}` : ''}</p>
                )}
                {config.contact.mapLink && (
                  <a href={config.contact.mapLink} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 opacity-70 hover:opacity-100 inline-flex items-center gap-1">
                    Open in Maps <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                )}
                {config.contact.phone && <p className="flex items-center justify-center gap-2"><Phone className="w-4 h-4 opacity-60" /> {config.contact.phone}</p>}
                {config.contact.email && <p className="flex items-center justify-center gap-2"><Mail className="w-4 h-4 opacity-60" /> {config.contact.email}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 9. Contact / final CTA */}
      {sections.has('contact') && (
        <section id="contact" className="text-center" style={{ background: 'var(--wb-primary)', color: 'var(--wb-bg)', padding: 'var(--wb-pad) 0' }}>
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--wb-font)' }}>Ready for your appointment?</h2>
            <p className="opacity-80 mb-9">Book online in under a minute{whatsappLink ? ', or message us on WhatsApp' : ''}.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <BookCta
                label={c.bookButtonLabel}
                onBook={onBook}
                style={{ padding: '15px 38px', fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--wb-bg)', color: 'var(--wb-primary)', borderRadius: 'var(--wb-radius)', border: 'none' }}
                icon
              />
              {whatsappLink && (
                <a
                  href={whatsappLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-9 py-[15px] text-sm font-semibold uppercase tracking-wide"
                  style={{ border: '1.5px solid currentColor', borderRadius: 'var(--wb-radius)' }}
                >
                  <MessageCircle className="w-4 h-4" /> {c.whatsappButtonLabel}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 10. Footer */}
      <footer style={{ background: 'var(--wb-primary)', color: 'var(--wb-bg)', borderTop: '1px solid color-mix(in srgb, var(--wb-bg) 15%, transparent)' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-5 text-sm">
          <p className="opacity-75">{c.footerText}</p>
          <SocialIcons config={config} />
          <p className="text-xs opacity-40">Powered by Moonbox Digital</p>
        </div>
      </footer>
    </div>
  );
};

export const SectionHeading: React.FC<{ config: WebsiteConfig; title: string; kicker?: string; align?: 'center' | 'left' }> = ({ config, title, kicker, align = 'center' }) => (
  <div className={align === 'center' ? 'text-center' : ''}>
    {kicker && <p className="text-[11px] uppercase tracking-[0.35em] mb-3" style={{ color: 'var(--wb-secondary)' }}>{kicker}</p>}
    <h2 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--wb-primary)', fontFamily: 'var(--wb-font)' }}>{title}</h2>
    <div className={`mt-4 h-[1.5px] w-16 ${align === 'center' ? 'mx-auto' : ''}`} style={{ background: 'var(--wb-secondary)' }} />
  </div>
);
