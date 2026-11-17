import React from 'react';
import { MapPin, Phone, Mail, MessageCircle, Sparkles, BadgeCheck, Instagram, ChevronRight } from 'lucide-react';
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
 * THEME 03 — GLAM STUDIO
 * Plum/rose tones, bold editorial type, asymmetric layouts, strong mobile presence.
 */

export const GlamStudio: React.FC<WebsiteRendererProps> = (props) => {
  const { config, tenant, services = [], reviews, onBook } = props;
  const tokens = useTokens(config);
  const btn = useButtonStyle(config);
  const sections = new Set(orderedSections(config).map(s => s.id));
  const c = config.content;
  const whatsappLink = WebsiteService.buildWhatsAppLink(config.contact.whatsappNumber, config.contact.whatsappGreeting);
  const displayServices = services.filter(s => !config.serviceDisplay.hiddenServiceIds.includes(s.id));
  const overlay = c.heroOverlayOpacity / 100;

  return (
    <div style={tokens} className="min-h-full">
      {/* 1. Creative header */}
      <header className="sticky top-0 z-30 backdrop-blur-md" style={{ background: 'color-mix(in srgb, var(--wb-bg) 85%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--wb-secondary) 25%, transparent)' }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 min-h-[64px] sm:h-[72px] flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
            <img src={tenant.logoUrl || '/brand/moonbox-salon-mark.jpg'} alt={tenant.logoUrl ? `${tenant.name} logo` : 'Moonbox Salon'} className="h-9 w-9 object-cover rounded-xl" />
            <span className="min-w-0 truncate font-black text-base sm:text-lg tracking-tight" style={{ color: 'var(--wb-primary)' }}>{tenant.name}</span>
            <Sparkles className="hidden sm:block w-4 h-4 shrink-0" style={{ color: 'var(--wb-accent)' }} />
          </div>
          <nav className="hidden md:flex items-center gap-7 text-[13px] font-bold uppercase tracking-wider">
            {sections.has('services') && <a href="#services" className="opacity-70 hover:opacity-100">Services</a>}
            {sections.has('gallery') && <a href="#gallery" className="opacity-70 hover:opacity-100">Work</a>}
            {sections.has('reviews') && <a href="#reviews" className="opacity-70 hover:opacity-100">Love</a>}
            {sections.has('contact') && <a href="#contact" className="opacity-70 hover:opacity-100">Contact</a>}
          </nav>
          <BookCta label={c.bookButtonLabel} onBook={onBook} className="shrink-0 max-w-[42vw] text-center leading-tight" style={{ ...btn, padding: 'clamp(7px, 2.5vw, 10px) clamp(8px, 3vw, 24px)', fontSize: 'clamp(10px, 3vw, 13px)', borderRadius: '999px' }} />
        </div>
        <nav aria-label="Main navigation" className="md:hidden flex gap-5 overflow-x-auto px-4 py-2 text-xs font-bold whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.has('services') && <a href="#services">Services</a>}
          {sections.has('gallery') && <a href="#gallery">Work</a>}
          {sections.has('reviews') && <a href="#reviews">Love</a>}
          {sections.has('contact') && <a href="#contact">Contact</a>}
        </nav>
      </header>

      {/* 2. Bold visual hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background: c.heroImageUrl
            ? `linear-gradient(rgba(20,4,15,${overlay}), rgba(20,4,15,${overlay * 0.7})), url('${c.heroImageUrl}') center/cover no-repeat`
            : `linear-gradient(135deg, var(--wb-primary), color-mix(in srgb, var(--wb-secondary) 70%, var(--wb-primary)))`,
          color: '#FFFFFF',
        }}
      >
        <div className={`max-w-6xl mx-auto px-6 py-28 md:py-36 ${c.heroTextAlignment === 'center' ? 'text-center' : ''}`}>
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full mb-7" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <Sparkles className="w-3.5 h-3.5" /> {tenant.tagline || 'Beauty Studio'}
          </p>
          <h1
            className={`text-5xl md:text-7xl font-black leading-[0.98] tracking-tight mb-6 ${c.heroTextAlignment === 'center' ? 'mx-auto' : 'max-w-2xl'}`}
            style={{ textWrap: 'balance' }}
          >
            {c.heroHeadline}
          </h1>
          {c.heroDescription && <p className="text-lg md:text-xl opacity-85 max-w-xl mb-10" style={{ marginInline: c.heroTextAlignment === 'center' ? 'auto' : undefined }}>{c.heroDescription}</p>}
          <div className={`flex flex-wrap gap-4 ${c.heroTextAlignment === 'center' ? 'justify-center' : ''}`}>
            <BookCta
              label={c.heroButtonLabel || c.bookButtonLabel}
              onBook={onBook}
              style={{ padding: '16px 40px', fontSize: '15px', borderRadius: '999px', background: 'var(--wb-accent)', color: '#fff', border: 'none' }}
              icon
            />
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-9 py-4 text-[15px] font-bold" style={{ borderRadius: '999px', border: '2px solid rgba(255,255,255,0.6)' }}>
                <MessageCircle className="w-5 h-5" /> {c.whatsappButtonLabel}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 3. Signature services — bold cards */}
      {sections.has('services') && (
        <section id="services" style={{ padding: 'var(--wb-pad) 0' }} className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-3" style={{ color: 'var(--wb-primary)' }}>{c.servicesHeading}</h2>
          <div className="h-1.5 w-20 rounded-full mb-10" style={{ background: 'var(--wb-accent)' }} />
          {displayServices.length === 0 ? (
            <EmptyHint text="Service details will appear here soon." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayServices.slice(0, 9).map((s, i) => (
                <div
                  key={s.id}
                  className="relative p-7 overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
                  style={{
                    borderRadius: '26px',
                    background: i % 3 === 1 ? 'var(--wb-primary)' : 'color-mix(in srgb, var(--wb-accent) 10%, var(--wb-bg))',
                    color: i % 3 === 1 ? '#fff' : 'inherit',
                    border: i % 3 === 1 ? 'none' : '1px solid color-mix(in srgb, var(--wb-secondary) 30%, transparent)',
                  }}
                >
                  <span className="absolute -top-3 -right-1 text-[80px] font-black opacity-[0.07] select-none">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="font-black text-lg">{s.name}</h3>
                  {s.description && <p className="text-sm opacity-70 mt-2">{s.description}</p>}
                  <div className="mt-5 flex items-center gap-3">
                    <span className="font-black text-xl">{formatPrice(s.priceLKR)}</span>
                    <span className="text-xs opacity-60">· {s.durationMinutes} min</span>
                    {config.serviceDisplay.featuredServiceIds.includes(s.id) && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'var(--wb-accent)', color: '#fff' }}>Featured</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Featured transformations (before/after) */}
      {sections.has('gallery') && config.gallery.some(g => g.beforeUrl) && (
        <section style={{ background: 'color-mix(in srgb, var(--wb-secondary) 8%, var(--wb-bg))' }}>
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-10" style={{ color: 'var(--wb-primary)' }}>Featured Transformations</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {config.gallery.filter(g => g.beforeUrl).slice(0, 4).map(g => (
                <div key={`ba-${g.id}`} className="grid grid-cols-2 gap-2" style={{ borderRadius: 'var(--wb-img-radius)', overflow: 'hidden' }}>
                  <div className="relative">
                    <img src={g.beforeUrl} alt={`${g.title || 'Transformation'} before`} loading="lazy" className="w-full aspect-[4/5] object-cover" />
                    <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest bg-black/70 text-white px-2.5 py-1 rounded-full">Before</span>
                  </div>
                  <div className="relative">
                    <img src={g.url} alt={`${g.title || 'Transformation'} after`} loading="lazy" className="w-full aspect-[4/5] object-cover" />
                    <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'var(--wb-accent)', color: '#fff' }}>After</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Photo portfolio — asymmetric */}
      {sections.has('gallery') && (
        <section id="gallery" style={{ padding: 'var(--wb-pad) 0' }} className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-10" style={{ color: 'var(--wb-primary)' }}>{c.galleryHeading}</h2>
          {config.gallery.length === 0 ? (
            <EmptyHint text="Our latest work will be showcased here." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[220px]">
              {config.gallery.slice(0, 10).map((g, i) => (
                <figure
                  key={g.id}
                  className={`relative overflow-hidden group ${i % 5 === 0 ? 'row-span-2' : ''} ${i % 5 === 2 ? 'md:col-span-2' : ''}`}
                  style={{ borderRadius: 'var(--wb-img-radius)' }}
                >
                  <img src={g.url} alt={g.altText || g.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {g.title && (
                    <figcaption className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/75 to-transparent text-white text-xs font-bold">
                      {g.title}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 6. Artist profiles */}
      {sections.has('team') && config.team.length > 0 && (
        <section style={{ background: 'color-mix(in srgb, var(--wb-primary) 6%, var(--wb-bg))' }}>
          <div className="max-w-6xl mx-auto px-6 py-[var(--wb-pad)]">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-10" style={{ color: 'var(--wb-primary)' }}>{c.teamHeading}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {config.team.map((m, i) => (
                <div
                  key={m.id}
                  className={`p-7 flex flex-col ${i % 2 === 1 ? 'md:translate-y-8' : ''}`}
                  style={{ borderRadius: '26px', background: 'var(--wb-bg)', border: '1px solid color-mix(in srgb, var(--wb-secondary) 25%, transparent)' }}
                >
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} className="w-24 h-24 rounded-2xl object-cover -mt-14 shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl -mt-14 shadow-lg flex items-center justify-center text-3xl font-black" style={{ background: 'var(--wb-accent)', color: '#fff' }}>{m.name.charAt(0)}</div>
                  )}
                  <h3 className="font-black text-lg mt-4" style={{ color: 'var(--wb-primary)' }}>{m.name}</h3>
                  <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--wb-accent)' }}>{m.role}</p>
                  {m.bio && <p className="text-sm opacity-70 mt-3">{m.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. Client reviews */}
      {sections.has('reviews') && (
        <section id="reviews" style={{ padding: 'var(--wb-pad) 0' }} className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-10" style={{ color: 'var(--wb-primary)' }}>{c.reviewsHeading}</h2>
          {reviews.length === 0 ? (
            <EmptyHint text="No client reviews yet — be the first to share your experience." />
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {reviews.slice(0, 6).map((r, i) => (
                <div
                  key={r.id}
                  className={`p-8 ${i % 2 === 1 ? 'md:translate-y-4' : ''}`}
                  style={{ borderRadius: '26px', background: 'color-mix(in srgb, var(--wb-accent) 9%, var(--wb-bg))' }}
                >
                  <Stars rating={r.rating} color="#C2417F" />
                  <p className="mt-4 leading-relaxed font-medium" style={{ color: 'var(--wb-primary)' }}>“{r.text}”</p>
                  <p className="mt-4 text-sm font-bold flex items-center gap-2">
                    {r.customerName}
                    {r.verifiedBooking && <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--wb-secondary)' }}><BadgeCheck className="w-4 h-4" /> Verified client</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
          {props.onWriteReview && (
            <div className="text-center mt-10">
              <button onClick={props.onWriteReview} className="text-sm font-black underline underline-offset-8 decoration-2" style={{ color: 'var(--wb-accent)' }}>
                Write a review
              </button>
            </div>
          )}
        </section>
      )}

      {/* 8. Social showcase */}
      {config.contact.social.instagram && (
        <section className="text-center py-14" style={{ background: 'var(--wb-primary)', color: '#fff' }}>
          <a href={config.contact.social.instagram.startsWith('http') ? config.contact.social.instagram : `https://${config.contact.social.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-xl font-black">
            <Instagram className="w-6 h-6" /> Follow our work on Instagram
            <ChevronRight className="w-5 h-5" />
          </a>
        </section>
      )}

      {/* 9/10. Contact & footer */}
      {sections.has('hours') && (
        <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="font-black text-2xl mb-6" style={{ color: 'var(--wb-primary)' }}>{c.hoursHeading}</h3>
            <OpeningHours tenant={tenant} />
          </div>
          <div>
            <h3 className="font-black text-2xl mb-6" style={{ color: 'var(--wb-primary)' }}>Location</h3>
            {(config.contact.address || config.contact.city) && (
              <p className="flex items-start gap-2 opacity-75"><MapPin className="w-5 h-5 shrink-0 mt-0.5" /> {config.contact.address}{config.contact.city ? `, ${config.contact.city}` : ''}</p>
            )}
            {config.contact.mapLink && (
              <a href={config.contact.mapLink} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4 inline-flex items-center gap-1 mt-3">
                Open in Maps <ChevronRight className="w-4 h-4" />
              </a>
            )}
            <div className="mt-5 space-y-2 text-sm">
              {config.contact.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 opacity-50" /> {config.contact.phone}</p>}
              {config.contact.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 opacity-50" /> {config.contact.email}</p>}
              <SocialIcons config={config} />
            </div>
          </div>
        </section>
      )}

      {sections.has('contact') && (
        <section id="contact" className="text-center py-20 px-6" style={{ background: 'var(--wb-primary)', color: '#fff' }}>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Let's get you gorgeous.</h2>
          <p className="opacity-75 mb-10">Appointments fill fast — book online or message us.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <BookCta label={c.bookButtonLabel} onBook={onBook} style={{ padding: '16px 42px', fontSize: '15px', borderRadius: '999px', background: 'var(--wb-accent)', color: '#fff', border: 'none' }} icon />
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-9 py-4 text-[15px] font-bold" style={{ borderRadius: '999px', border: '2px solid rgba(255,255,255,0.55)' }}>
                <MessageCircle className="w-5 h-5" /> {c.whatsappButtonLabel}
              </a>
            )}
          </div>
          <div className="mt-12 flex flex-col items-center gap-3 text-sm opacity-60">
            <p>{c.footerText}</p>
            <SocialIcons config={config} size={20} />
          </div>
        </section>
      )}
    </div>
  );
};
