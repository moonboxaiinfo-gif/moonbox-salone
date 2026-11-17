import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import {
  CalendarClock,
  UsersRound,
  PackageSearch,
  LineChart,
  ArrowRight,
  Menu,
  X,
  CheckCircle2,
  XCircle,
  Sparkles,
  CalendarCheck,
  Contact,
  Handshake,
  Boxes,
  Wallet,
  FileBarChart,
  PlayCircle,
  MessageCircle,
  LayoutDashboard,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Logo, Card, Dashboard, CalendarMock, MiniChart, Bars, PhoneMock, EASE } from "../landing/mockups";
import { cn } from "../../lib/utils";
import { ThemeToggle } from "../common/ThemeToggle";
import { AmbientParticles, PointerTilt, WordReveal, AnimatedCounter } from "../landing/motionPrimitives";
import { StorageService } from "../../services/storageService";
import { formatLKR } from "../../constants/brand";
import { LandingPageService } from "../../services/landingPageService";

interface NewLandingPageProps {
  onOpenLogin: () => void;
  onOpenSignUp: () => void;
  onExploreDemo: () => void;
}

export const NewLandingPage: React.FC<NewLandingPageProps> = ({
  onOpenLogin,
  onOpenSignUp,
  onExploreDemo,
}) => {
  const reduce = useReducedMotion();
  const [landingContent, setLandingContent] = useState(() => LandingPageService.getPublished());
  const [lightbox, setLightbox] = useState<{ src: string; alt: string; label: string; className: string } | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const plans = StorageService.getPlans().filter(plan => plan.isActive);
  const salonPhotos = landingContent.gallery.filter(item => item.isEnabled).sort((a, b) => a.displayOrder - b.displayOrder).map((item, index) => ({ ...item, label: item.caption || `Gallery image ${index + 1}`, className: index === 0 ? "md:col-span-2" : "" }));
  const whatsappUrl = LandingPageService.whatsappUrl(landingContent.contact.whatsapp, landingContent.contact.whatsappMessage);

  useEffect(() => {
    const refresh = () => setLandingContent(LandingPageService.getPublished());
    window.addEventListener("moonbox:landing-published", refresh);
    return () => window.removeEventListener("moonbox:landing-published", refresh);
  }, []);

  useEffect(() => {
    document.title = landingContent.seo.metaTitle;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", landingContent.seo.metaDescription);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && landingContent.seo.canonicalUrl) canonical.setAttribute("href", landingContent.seo.canonicalUrl);
  }, [landingContent]);
  const links = [
    ["Home", "home"],
    ["Features", "features"],
    ["How It Works", "how"],
    ["Pricing", "pricing"],
    ["FAQ", "faq"],
  ] as const;

  const btnPrimary =
    "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:shadow-float";
  const btnGhost =
    "inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40";

  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.8, delay: i * 0.1, ease: EASE } }),
  };

  const Reveal = ({ children, i = 0, delay, className }: { children: React.ReactNode; i?: number; delay?: number; className?: string }) => {
    return (
      <motion.div className={className} variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} transition={delay === undefined ? undefined : { duration: reduce ? 0.01 : 0.8, delay: reduce ? 0 : delay, ease: EASE }}>
        {children}
      </motion.div>
    );
  };

  const SectionHead = ({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) => {
    return (
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <Reveal><p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">{eyebrow}</p></Reveal>
        <Reveal i={1}><h2 className="text-3xl font-extrabold text-foreground sm:text-5xl">{title}</h2></Reveal>
        {sub && <Reveal i={2}><p className="mt-4 text-lg text-muted-foreground">{sub}</p></Reveal>}
      </div>
    );
  };

  const Nav = () => {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    useEffect(() => {
      const on = () => setScrolled(window.scrollY > 20);
      on();
      window.addEventListener("scroll", on, { passive: true });
      return () => window.removeEventListener("scroll", on);
    }, []);
    return (
      <header className={cn("fixed inset-x-0 top-0 z-50 bg-card/55 backdrop-blur-md transition-all duration-500", scrolled ? "border-b border-border py-3 shadow-soft" : "border-b border-border/60 py-5")}>
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5" aria-label="Main">
          <a href="#home" aria-label="Moonbox Salon home"><Logo /></a>
          <ul className="hidden items-center gap-1 lg:flex">
            {links.map(([l, id]) => (
              <li key={id}>
                <a href={`#${id}`} className="group relative px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  {l}
                  <span className="absolute inset-x-4 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-300 group-hover:scale-x-100" />
                </a>
              </li>
            ))}
          </ul>
          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            <a href="#features" className="px-3 text-sm font-semibold text-foreground hover:text-primary">Explore Features</a>
            <button onClick={onOpenLogin} className="px-3 text-sm font-semibold text-muted-foreground hover:text-foreground">Sign in</button>
            <button onClick={onOpenSignUp} className={cn(btnPrimary, "py-2.5")}>Get Started</button>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        {open && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass mx-4 mt-3 rounded-2xl border border-border p-4 shadow-float lg:hidden">
            {links.map(([l, id]) => (
              <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 font-medium text-foreground hover:bg-lavender">{l}</a>
            ))}
            <button onClick={onOpenLogin} className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-left font-medium text-foreground hover:bg-lavender">Sign in</button>
            <button onClick={onOpenSignUp} className={cn(btnPrimary, "mt-2 w-full")}>Get Started</button>
          </motion.div>
        )}
      </header>
    );
  };

  const Hero = () => {
    const ref = useRef<HTMLElement>(null);
    const reduce = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const y1 = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -220]);
    const rot = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 12, 0]);
    return (
      <section id="home" ref={ref} className="cinematic-sweep film-grain relative isolate overflow-hidden pb-24 pt-32 lg:min-h-[760px] lg:pt-40">
        <motion.div className="bg-hero absolute inset-0 -z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }} />
        <img
          className="moonbox-hero-image pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover"
          src={landingContent.hero.heroImage || "/moonbox-salon-lifestyle-hero-poster.jpg"}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
        />
        <div className="moonbox-hero-overlay pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <motion.div
          className="pointer-events-none absolute -inset-[18%] -z-10 opacity-70"
          style={{ y: y1 }}
          animate={reduce ? undefined : { rotate: [0, 3, 0], scale: [1, 1.04, 1] }}
          transition={reduce ? undefined : { duration: 18, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute left-[6%] top-[12%] h-72 w-72 rounded-full bg-[var(--mb-violet)]/15 blur-3xl" />
          <div className="absolute right-[8%] top-[28%] h-80 w-80 rounded-full bg-[#20CBE5]/12 blur-3xl" />
          <div className="absolute left-[42%] top-[4%] h-[34rem] w-[34rem] rounded-full border border-[#5D83FF]/15" />
        </motion.div>
        <AmbientParticles count={reduce ? 5 : 20} />
        <motion.div style={{ y: y2 }} className="pointer-events-none absolute right-[12%] top-28 -z-10 hidden h-32 w-32 rounded-[2rem] border border-white/15 bg-white/5 shadow-[0_0_70px_rgba(161,107,255,0.3)] backdrop-blur-sm lg:block" animate={reduce ? undefined : { rotate: [0, 10, 0], y: [0, -14, 0] }} transition={reduce ? undefined : { duration: 11, repeat: Infinity, ease: "easeInOut" }} aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 lg:grid-cols-2">
          <div>
            {[
              <p key="e" className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-primary shadow-soft"><Sparkles className="h-3.5 w-3.5" /> {landingContent.hero.eyebrow}</p>,
              <h1 key="h" className="max-w-3xl text-5xl font-extrabold leading-[1.02] text-foreground sm:text-6xl xl:text-7xl">{landingContent.hero.heading.split(/(?<=\.)\s+/).map((part, index) => <React.Fragment key={`${part}-${index}`}><WordReveal text={part} className={index === landingContent.hero.heading.split(/(?<=\.)\s+/).length - 1 ? "text-gradient" : undefined} />{index < landingContent.hero.heading.split(/(?<=\.)\s+/).length - 1 && <br />}</React.Fragment>)}</h1>,
              <p key="p" className="mt-6 max-w-xl text-lg text-muted-foreground"><strong className="font-semibold text-foreground">{landingContent.hero.subtitle}</strong><br />{landingContent.hero.description}</p>,
              <div key="b" className="mt-9 flex flex-wrap gap-3">
                <button onClick={onOpenSignUp} className={btnPrimary}>Start Your Free Trial <ArrowRight className="h-4 w-4" /></button>
                <button onClick={onExploreDemo} className={btnGhost}>Explore the Platform</button>
              </div>,
              <p key="r" className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> Registration is reviewed before trial activation.</p>,
            ].map((el, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2 + i * 0.12, ease: EASE }}>
                {el}
              </motion.div>
            ))}
          </div>

          <div className="relative mx-auto w-full max-w-xl [perspective:1600px]">
            <PointerTilt>
              <motion.div style={{ rotateX: rot }} initial={{ opacity: 0, y: 120, rotateY: -14 }} animate={{ opacity: 1, y: 0, rotateY: -8 }} transition={{ duration: 1.3, delay: 0.7, ease: EASE }} className="relative [transform-style:preserve-3d]">
                <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-[#2454D8]/25 via-transparent to-[#20CBE5]/20 blur-2xl" aria-hidden="true" />
                <Dashboard />
                <motion.div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-border bg-card/85 p-3 shadow-float backdrop-blur-md sm:block" animate={reduce ? undefined : { y: [0, -8, 0] }} transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Illustrative demo</p>
                  <p className="mt-1 text-sm font-bold text-foreground"><AnimatedCounter value={24} /> appointments flowing</p>
                </motion.div>
              </motion.div>
            </PointerTilt>
          </div>
        </div>
      </section>
    );
  };

  const SalonGallery = () => {
    return (
      <section id="gallery" className="relative py-24">
        <div className="mx-auto max-w-7xl px-5">
          <SectionHead eyebrow="The Moonbox atmosphere" title="Beauty Happens Here." sub="A considered salon experience, supported by the calm of having your business in one beautiful place." />
          <div className="grid auto-rows-[180px] grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:auto-rows-[150px]">
            {salonPhotos.map((photo, index) => (
              <Reveal key={photo.src} delay={index * 0.06} className={photo.className}>
                <button type="button" onClick={() => setLightbox(photo)} className="group relative h-full w-full overflow-hidden rounded-[1.75rem] border border-border bg-card text-left shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <img src={photo.src} alt={photo.alt} loading={index > 1 ? "lazy" : "eager"} className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--mb-overlay)]/80 via-[var(--mb-overlay)]/20 to-transparent px-5 pb-4 pt-12 text-sm font-semibold text-white">{photo.label}</span>
                  <span className="absolute right-4 top-4 rounded-full border border-white/25 bg-[var(--mb-overlay)]/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">View</span>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const CapabilityStrip = () => {
    const capabilities = [
      [CalendarCheck, "Smart Appointment Management", "Keep the day moving with a clearer schedule."],
      [LayoutDashboard, "Complete Salon Operations", "Bring daily work into one organized workspace."],
      [Contact, "Customer Management", "Keep profiles, visits and relationships close."],
      [LineChart, "Sales & Business Insights", "Understand activity with focused reports."],
    ] as const;
    return (
      <section aria-label="Moonbox Salon capabilities" className="relative z-10 -mt-8 px-5 pb-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[1.75rem] border border-border bg-card/90 shadow-float backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map(([Icon, title, copy], index) => (
            <div key={title} className={cn("flex items-start gap-3 px-5 py-5", index > 0 && "border-t border-border sm:border-t-0 sm:border-l")}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lavender text-primary"><Icon className="h-5 w-5" /></span>
              <div><p className="text-sm font-bold text-foreground">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy}</p></div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const SalonStory = () => {
    const story = [
      ["01", "Welcome", "A stylist welcomes a client into a space designed to make every visit feel considered.", { src: "/client-management.webp", alt: "Salon consultation and client management" }],
      ["02", "Care", "Treatments, colour and conversation happen in the foreground while Moonbox keeps the day moving behind the scenes.", { src: "/services-packages.webp", alt: "Curated salon services and treatment products" }],
      ["03", "Clarity", "Owners see the bigger picture—from the next booking to the health of the business—without leaving the salon floor.", { src: "/analytics-insights.webp", alt: "Salon analytics and business insights" }],
    ] as const;
    return (
      <section id="how" className="bg-[var(--mb-overlay)] py-24 text-white">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid items-end gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal><p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--mb-accent)]">The salon story</p><h2 className="mt-4 text-4xl font-extrabold leading-tight sm:text-6xl">More Beauty.<br /><span className="text-[var(--mb-accent)]">Less Administration.</span></h2></Reveal>
            <Reveal delay={0.15}><p className="max-w-xl text-lg leading-relaxed text-white/65">Moonbox gives the people behind a premium salon more room to focus on the craft, the guest and the experience—while the business stays beautifully organized.</p></Reveal>
          </div>
          <div className="mt-16 grid gap-5 lg:grid-cols-3">
            {story.map(([number, title, copy, photo], index) => (
              <Reveal key={number} delay={index * 0.1}>
                <article className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.06]">
                  <div className="aspect-[4/3] overflow-hidden"><img src={photo.src} alt={photo.alt} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
                  <div className="p-6"><div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[0.2em] text-[var(--mb-accent)]">{number}</span><span className="text-xs uppercase tracking-[0.18em] text-white/40">{title}</span></div><p className="mt-5 text-base leading-relaxed text-white/75">{copy}</p></div>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-16 border-t border-white/10 pt-10">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--mb-accent)]">How it works</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {["Register your salon", "Submit details", "Moonbox reviews", "Trial activates after approval", "Set up services and staff", "Start managing your salon"].map((step, index) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><span className="text-xs font-bold text-[var(--mb-accent)]">0{index + 1}</span><p className="mt-3 text-sm font-semibold leading-snug text-white/80">{step}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const SalonVideoShowcase = () => {
    return (
      <section id="experience" className="py-24">
        <div className="mx-auto max-w-7xl px-5">
          <SectionHead eyebrow="Experience the world of modern salon management" title="The atmosphere is real. The operations are effortless." sub="See the calm of a premium salon, then see the system that protects it." />
          <div className="grid items-stretch gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <Reveal className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-border bg-[var(--mb-overlay)] shadow-float">
              <img className="absolute inset-0 h-full w-full object-cover opacity-90" src="/salon-interior-still.jpg" alt="Modern salon interior with styling stations" loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--mb-overlay)]/85 via-transparent to-[var(--mb-overlay)]/10" />
              <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--mb-accent)]">A beautiful environment, held together</p><h3 className="mt-3 max-w-xl text-3xl font-extrabold text-white sm:text-4xl">Let the salon be the story.</h3></div>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <Reveal delay={0.1} className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft"><img src="/appointment-management.webp" alt="Appointment management workspace visual" loading="lazy" decoding="async" className="h-48 w-full object-cover" /><div className="p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">The details</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Beautiful spaces, clear stock levels and a reception that never feels rushed.</p></div></Reveal>
              <Reveal delay={0.2} className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft"><div className="p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">The system</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Moonbox keeps appointments, customers, staff, sales, inventory and reports close at hand.</p><Dashboard compact className="mt-5" /></div></Reveal>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const Problems = () => {
    const problems: Array<[React.ElementType, string, string]> = [
      [CalendarClock, "Booking Confusion", "Missed appointments and overlapping bookings make every day harder."],
      [UsersRound, "Staff Management", "Keeping track of shifts, responsibilities and daily performance takes time."],
      [PackageSearch, "Stock and Expenses", "Manual records make it difficult to keep track of product usage and business expenses."],
      [LineChart, "Business Visibility", "Without organized reports, understanding your salon's performance becomes difficult."],
    ];
    const allProblems: Array<[React.ElementType, string, string]> = [
      ...problems,
      [Contact, "Scattered Customer Records", "Important client details and follow-ups are harder to find when they live in too many places."],
      [CalendarCheck, "Manual Repetitive Tasks", "Spend less time repeating updates and more time giving clients a thoughtful salon experience."],
    ];
    return (
      <section id="problems" className="py-24">
        <div className="mx-auto max-w-7xl px-5">
          <SectionHead eyebrow="Problem awareness" title="Still Managing Your Salon the Hard Way?" sub="You should not have to piece together your day from paper notes, scattered messages and separate spreadsheets." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {allProblems.map(([Icon, t, d], i) => (
              <motion.div key={t} initial={{ opacity: 0, y: 40, scale: 0.95, filter: "grayscale(1)" }} whileInView={{ opacity: 1, y: 0, scale: 1, filter: "grayscale(0)" }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }}>
                <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-float">
                  <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-lavender text-primary transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110"><Icon className="h-6 w-6" /></span>
                  <h3 className="mb-2 text-lg font-bold text-foreground">{t}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{d}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const Product = () => {
    return (
      <section id="product" className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Product value" title="Everything Your Salon Needs in One Smart System." sub="Moonbox Salon brings appointments, customers, staff, services, sales, inventory and business visibility together in one organized workspace." />
          <Dashboard className="mx-auto max-w-4xl" />
        </div>
      </section>
    );
  };

  const ProductDemo = () => {
    return (
      <section id="demo" className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-hero opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5">
          <SectionHead eyebrow="See Moonbox Salon in action" title="Discover how simple salon management can become." sub="Explore the genuine product workspace, then open the interactive demo to see the application flow for yourself." />
          <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <div className="rounded-[2rem] border border-border bg-card/85 p-7 shadow-float backdrop-blur-md">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lavender text-primary"><PlayCircle className="h-7 w-7" /></span>
                <h3 className="mt-6 text-2xl font-extrabold text-foreground">A real product tour, not a promise.</h3>
                <p className="mt-4 leading-relaxed text-muted-foreground">Use the interactive demo to explore the dashboard, appointments, customers and salon operations already available in Moonbox Salon.</p>
                <button type="button" onClick={onExploreDemo} className={cn(btnPrimary, "mt-7")}>Open Interactive Demo <ArrowRight className="h-4 w-4" /></button>
                <p className="mt-5 text-xs leading-relaxed text-muted-foreground">A final narrated product walkthrough video can be added here when the approved recording is available. This section is ready for the final 16:9 video asset without fabricating a software demo.</p>
              </div>
            </Reveal>
            <Reveal delay={0.12} className="mx-auto w-full max-w-4xl">
              <div className="rounded-[2rem] border border-border bg-card/90 p-4 shadow-float backdrop-blur-md sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Interactive preview</p><p className="mt-1 text-sm text-muted-foreground">Appointments, customers, staff and business activity in one view.</p></div><span className="hidden rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success sm:inline-flex">Live application flow</span></div>
                <Dashboard />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    );
  };

  const Features = () => {
    const features = [
      [CalendarCheck, "Appointment Management", "Every Appointment, Under Control.", "Organize your daily bookings and maintain a clearer view of your salon schedule.", CalendarMock, "/appointment-management.webp", "Appointment schedule visual"],
      [Contact, "Customer Management", "Build Better Customer Relationships.", "Keep customer details organized and make everyday service management easier.", PhoneMock, "/client-management.webp", "Client consultation and profile visual"],
      [Handshake, "Staff Management", "Keep Your Team in Rhythm.", "Coordinate staff visibility, responsibilities and the day’s work without scattered notes.", Dashboard, "/staff-management.webp", "Salon team management visual"],
      [FileBarChart, "Reports & Analytics", "Turn Activity Into Clarity.", "See the operational picture with clear reports that support better salon decisions.", MiniChart, "/analytics-insights.webp", "Salon analytics visual"],
      [Boxes, "Services & Packages", "Present Your Best Work Beautifully.", "Keep treatments, packages and service details organized for a more consistent client experience.", CalendarMock, "/services-packages.webp", "Salon services and packages visual"],
    ] as const;
    return (
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Features" title="Everything in One Beautiful Place." />
          <div className="space-y-28">
            {features.map(([Icon, tag, h, d, Mock, image, imageAlt], i) => (
              <div key={tag} className="grid items-center gap-12 lg:grid-cols-2">
                <div className={cn(i % 2 && "lg:order-2")}>
                  <Reveal><span className="mb-4 inline-flex items-center gap-2 rounded-full bg-lavender px-3 py-1 text-xs font-bold text-primary"><Icon className="h-3.5 w-3.5" />{tag}</span></Reveal>
                  <Reveal i={1}><h3 className="text-3xl font-extrabold text-foreground sm:text-4xl">{h}</h3></Reveal>
                  <Reveal i={2}><p className="mt-4 max-w-md text-lg text-muted-foreground">{d}</p></Reveal>
                </div>
                <Reveal i={1} className="mx-auto w-full max-w-md">
                  <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-float">
                    <img src={image} alt={imageAlt} loading="lazy" className="h-44 w-full object-cover" />
                    <div className="p-4"><Mock /></div>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const FeatureLab = () => {
    const features = [
      [CalendarCheck, "Appointments", "A moving schedule keeps every chair in view."],
      [Wallet, "POS", "Products flow into a clear, animated total."],
      [Contact, "Customers", "Layered profiles keep relationships close."],
      [Handshake, "Staff", "Team visibility moves with the day."],
      [Boxes, "Inventory", "Stock levels surface before they become surprises."],
      [FileBarChart, "Reports", "Charts grow into decisions, not paperwork."],
      [CalendarClock, "Online Booking", "Mobile-first booking stays calm for clients."],
      [Sparkles, "Website Builder", "Themes transform without losing your brand."],
    ] as const;
    return (
      <section id="benefits" className="relative overflow-hidden py-24">
        <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-gradient-to-r from-transparent via-[var(--mb-violet)]/30 to-transparent" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-5">
          <SectionHead eyebrow="Why Moonbox Salon" title="Every workflow has its own rhythm." sub="One connected system reduces manual records, keeps appointments organized and helps owners understand how the salon is performing." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(([Icon, title, copy], index) => (
              <Reveal key={title} delay={index * 0.06}>
                <PointerTilt>
                  <Card className="group relative h-full overflow-hidden p-5 transition-shadow duration-500 hover:shadow-float">
                    <motion.div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[var(--mb-violet)]/10 blur-2xl" animate={reduce ? undefined : { scale: [0.9, 1.15, 0.9], opacity: [0.4, 0.8, 0.4] }} transition={reduce ? undefined : { duration: 5 + index * 0.3, repeat: Infinity, ease: "easeInOut" }} aria-hidden="true" />
                    <div className="relative">
                      <motion.span className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-lavender text-primary" whileHover={reduce ? undefined : { rotate: 8, scale: 1.08 }}>
                        <Icon className="h-5 w-5" />
                      </motion.span>
                      <h3 className="text-base font-bold text-foreground">{title}</h3>
                      <p className="mt-2 min-h-10 text-sm leading-relaxed text-muted-foreground">{copy}</p>
                      <div className="mt-5 h-10 overflow-hidden rounded-xl border border-border bg-lavender/40 p-2">
                        {index % 3 === 0 && <div className="flex h-full items-end gap-1">{[35, 62, 48, 82, 68, 92].map((height, bar) => <motion.span key={bar} className="flex-1 rounded-t bg-gradient-primary" initial={{ height: 0 }} whileInView={{ height: `${height}%` }} viewport={{ once: true }} transition={{ duration: 0.6, delay: bar * 0.06, ease: EASE }} />)}</div>}
                        {index % 3 === 1 && <motion.div className="h-2 rounded-full bg-[#5D83FF]/20" animate={reduce ? undefined : { background: ["rgba(93,131,255,.18)", "rgba(32,203,229,.55)", "rgba(93,131,255,.18)"] }} transition={reduce ? undefined : { duration: 3.5, repeat: Infinity }}><motion.span className="block h-full w-2/3 rounded-full bg-gradient-primary" animate={reduce ? undefined : { x: [0, 22, 0] }} transition={reduce ? undefined : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }} /></motion.div>}
                        {index % 3 === 2 && <div className="flex items-center gap-1.5">{[0, 1, 2, 3].map((dot) => <motion.span key={dot} className="h-2.5 w-2.5 rounded-full bg-[var(--mb-cyan)]" animate={reduce ? undefined : { y: [0, -5, 0], opacity: [0.35, 1, 0.35] }} transition={reduce ? undefined : { duration: 1.8, delay: dot * 0.18, repeat: Infinity }} />)}</div>}
                      </div>
                    </div>
                  </Card>
                </PointerTilt>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs font-semibold text-muted-foreground">
            {["Dashboard", "Services", "Sales & invoices", "Expenses", "Commissions", "Notifications", "Settings", "Subscription"].map(item => <span key={item} className="rounded-full border border-border bg-card px-3 py-1.5">{item}</span>)}
          </div>
        </div>
      </section>
    );
  };

  const MobileShowcase = () => {
    return (
      <section id="mobile" className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-hero opacity-70" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Reveal><p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">Built for the floor</p></Reveal>
            <Reveal delay={0.1}><h2 className="text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">A salon command center that fits in your hand.</h2></Reveal>
            <Reveal delay={0.2}><p className="mt-5 max-w-lg text-lg text-muted-foreground">Keep an eye on appointments, client flow and the day’s pulse from a mobile-responsive Moonbox workspace.</p></Reveal>
            <Reveal delay={0.3}><div className="mt-7 flex flex-wrap gap-3"><span className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground">Responsive by design</span><span className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground">Fast on the floor</span></div></Reveal>
          </div>
          <div className="relative flex min-h-[360px] items-center justify-center gap-5 [perspective:1200px]">
            <PointerTilt>
              <motion.div initial={{ opacity: 0, y: 80, rotateY: -18, rotateZ: -4 }} whileInView={{ opacity: 1, y: 0, rotateY: -10, rotateZ: -4 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 1, ease: EASE }} animate={reduce ? undefined : { y: [0, -10, 0] }} className="[transform-style:preserve-3d]">
                <PhoneMock className="w-[190px] sm:w-[210px]" />
              </motion.div>
            </PointerTilt>
            <PointerTilt>
              <motion.div initial={{ opacity: 0, y: 100, rotateY: 18, rotateZ: 5 }} whileInView={{ opacity: 1, y: 0, rotateY: 10, rotateZ: 5 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 1, delay: 0.12, ease: EASE }} animate={reduce ? undefined : { y: [0, 12, 0] }} className="hidden [transform-style:preserve-3d] sm:block">
                <PhoneMock className="w-[150px] opacity-85" />
              </motion.div>
            </PointerTilt>
            <div className="pointer-events-none absolute bottom-4 left-1/2 h-8 w-64 -translate-x-1/2 rounded-full bg-[var(--mb-violet)]/20 blur-2xl" aria-hidden="true" />
          </div>
        </div>
      </section>
    );
  };

  const Pricing = () => {
    return (
      <section id="pricing" className="relative py-24">
        <div className="mx-auto max-w-7xl px-5">
          <SectionHead eyebrow="Plans that grow with your salon" title="Choose the Perfect Plan for Your Salon." sub="Live packages are managed by Moonbox Digital. Pricing and feature availability come from the same plan source used inside the application." />
          <div className="mb-10 flex flex-col items-center gap-3">
            <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-soft" role="group" aria-label="Billing cycle">
              {(["monthly", "yearly"] as const).map(cycle => (
                <button key={cycle} type="button" onClick={() => setBillingCycle(cycle)} aria-pressed={billingCycle === cycle} className={cn("rounded-full px-5 py-2 text-sm font-semibold capitalize transition", billingCycle === cycle ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground")}>
                  {cycle} billing
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Create your salon account and submit it for review. Any trial activation happens after approval.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan, index) => {
              const price = billingCycle === "yearly" ? plan.yearlyPriceLKR : plan.monthlyPriceLKR;
              const annualSavings = Math.max(0, Math.round((1 - plan.yearlyPriceLKR / (plan.monthlyPriceLKR * 12)) * 100));
              const featureRows = [
                ["Online booking", plan.hasOnlineBooking],
                ["Website & portfolio", plan.hasPortfolio],
                ["Inventory", plan.hasInventory],
                ["Reports", plan.hasReports],
                ["Staff commissions", plan.hasCommissions],
                ["Custom domain", plan.hasCustomDomain],
              ] as const;
              return (
                <Reveal key={plan.id} delay={index * 0.08}>
                  <article className={cn("relative flex h-full flex-col rounded-[1.75rem] border bg-card p-7 shadow-soft", plan.isPopular ? "border-primary shadow-glow" : "border-border")}>
                    {plan.isPopular && <span className="absolute -top-3 left-6 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">Recommended</span>}
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{plan.slug}</p>
                    <h3 className="mt-3 text-2xl font-extrabold text-foreground">{plan.name.replace("Moonbox Salon ", "")}</h3>
                    <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
                    <div className="mt-6 border-t border-border pt-5"><span className="text-3xl font-extrabold text-foreground">{formatLKR(price)}</span><span className="ml-1 text-sm text-muted-foreground">/{billingCycle === "yearly" ? "year" : "month"}</span></div>
                    {billingCycle === "yearly" && <p className="mt-2 text-xs font-semibold text-success">Save {annualSavings}% versus monthly billing</p>}
                    <div className="mt-5 space-y-2 text-sm text-muted-foreground"><p>Up to <strong className="text-foreground">{plan.maxStaff}</strong> staff</p><p>Up to <strong className="text-foreground">{plan.maxCustomers.toLocaleString()}</strong> customers</p>{featureRows.map(([label, enabled]) => <p key={label} className="flex items-center gap-2"><span className={cn("grid h-5 w-5 place-items-center rounded-full", enabled ? "bg-success/15 text-success" : "bg-muted/40 text-muted-foreground/50")}>{enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}</span><span className={enabled ? "text-foreground" : "line-through opacity-60"}>{label}</span></p>)}</div>
                    <button type="button" onClick={onOpenSignUp} className={cn(btnPrimary, "mt-7 w-full")}>Request Your 14-Day Free Trial</button>
                  </article>
                </Reveal>
              );
            })}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">Subscriptions use the existing manual bank-transfer workflow. Choose a package, submit your registration, and after approval view configured bank details, upload the payment receipt and wait for platform review before activation.</p>
        </div>
      </section>
    );
  };

  const Faq = () => {
    const faqs = landingContent.faqs.filter(item => item.isEnabled).sort((a, b) => a.displayOrder - b.displayOrder);
    return (
      <section id="faq" className="py-24">
        <div className="mx-auto max-w-3xl px-5">
          <SectionHead eyebrow="FAQ" title="Questions, Answered." />
          <Reveal>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem key={faq.id} value={`q${i}`} className="rounded-2xl border border-border bg-card px-6 shadow-soft">
                  <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>
    );
  };

  const Cta = () => {
    return (
      <section id="cta" className="px-5 py-24">
        <div className="cinematic-sweep film-grain relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-border bg-lavender px-6 py-20 text-center shadow-float sm:px-12">
          <div className="bg-hero absolute inset-0" />
          <div className="relative">
            <Reveal><h2 className="mx-auto max-w-3xl text-4xl font-extrabold text-foreground sm:text-6xl">Your Dream Salon Deserves <span className="text-gradient">Smarter Management.</span></h2></Reveal>
            <Reveal i={1}><p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">Bring your salon operations together and spend more time doing what you love.</p></Reveal>
            <Reveal i={2} className="mt-9 flex flex-wrap justify-center gap-3">
              <button onClick={onOpenSignUp} className={btnPrimary}>Start Your 14-Day Free Trial <ArrowRight className="h-4 w-4" /></button>
            </Reveal>
          </div>
        </div>
      </section>
    );
  };

  const Footer = () => {
    const socialLinks = [
      ["Facebook", landingContent.contact.facebook],
      ["Instagram", landingContent.contact.instagram],
      ["YouTube", landingContent.contact.youtube],
      ["TikTok", landingContent.contact.tiktok],
      ["LinkedIn", landingContent.contact.linkedin],
    ].filter(([, url]) => Boolean(url));
    return (
      <footer id="contact" className="border-t border-border py-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">{landingContent.footer.description}</p>
            {landingContent.footer.showContact && <div className="mt-5 space-y-1 text-sm text-muted-foreground">
              {landingContent.contact.phone && <a className="block hover:text-primary" href={`tel:${landingContent.contact.phone.replace(/[^+\d]/g, "")}`}>{landingContent.contact.phone}</a>}
              {landingContent.contact.email && <a className="block hover:text-primary" href={`mailto:${landingContent.contact.email}`}>{landingContent.contact.email}</a>}
              {landingContent.contact.address && <span className="block">{landingContent.contact.address}</span>}
              <span className="block">{landingContent.contact.hours}</span>
            </div>}
          </div>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {links.map(([l, id]) => <li key={id}><a href={`#${id}`} className="text-muted-foreground transition-colors hover:text-primary">{l}</a></li>)}
          </ul>
        </div>
        <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 px-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {landingContent.footer.copyright}</p>
          {socialLinks.length > 0 && <div className="flex flex-wrap gap-4">{socialLinks.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="hover:text-primary">{label}</a>)}</div>}
        </div>
        {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Contact Moonbox Digital on WhatsApp" className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[#1fb957]"><MessageCircle className="h-5 w-5" /> WhatsApp</a>}
      </footer>
    );
  };

  return (
    <main className="moonbox-landing overflow-x-clip">
      <Nav />
      <Hero />
      <CapabilityStrip />
      <SalonGallery />
      <SalonVideoShowcase />
      <SalonStory />
      <Problems />
      <Product />
      <ProductDemo />
      <Features />
      <FeatureLab />
      <MobileShowcase />
      <Pricing />
      <Faq />
      <Cta />
      <Footer />
      {lightbox && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[var(--mb-overlay)]/90 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={`${lightbox.label} image viewer`} onClick={() => setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20" aria-label="Close image viewer"><X className="h-5 w-5" /></button>
          <figure className="relative max-h-[90vh] max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.alt} className="max-h-[82vh] rounded-2xl object-contain shadow-2xl" />
            <figcaption className="mt-3 text-center text-sm text-white/70">{lightbox.label}</figcaption>
          </figure>
        </div>
      )}
    </main>
  );
};
