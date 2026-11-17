import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../../context/RouterContext';
import { StorageService } from '../../services/storageService';
import { isLocalDemoMode } from '../../services/storageService';
import { PublicWebsiteApi, PublicWebsitePayload } from '../../services/publicWebsiteApi';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { Service, Staff, Appointment } from '../../types';
import { BOOKING_TRANSLATIONS, BookingLanguage } from '../../constants/bookingTranslations';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Sparkles, 
  Check, 
  ChevronRight, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  ArrowLeft, 
  ArrowRight,
  Globe2,
  CalendarCheck2
} from 'lucide-react';

export const PublicBookingPage: React.FC = () => {
  const { params, navigate, searchParams } = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const slug = params.salonSlug || 'colombo';
  const localTenant = isLocalDemoMode ? (StorageService.getTenantBySlug(slug) || StorageService.getTenants()[0]) : undefined;
  const [remoteSite, setRemoteSite] = useState<PublicWebsitePayload | null>(null);
  const [remoteSiteError, setRemoteSiteError] = useState<string | null>(null);
  const [remoteRetry, setRemoteRetry] = useState(0);
  const [remoteResolvedKey, setRemoteResolvedKey] = useState('');
  const remoteRequestKey = `${slug}:${remoteRetry}`;
  const isLoadingRemoteSite = !isLocalDemoMode && remoteResolvedKey !== remoteRequestKey;

  useEffect(() => {
    const controller = new AbortController();
    setRemoteSite(null);
    setRemoteSiteError(null);
    PublicWebsiteApi.get(slug, controller.signal)
      .then(site => { if (!controller.signal.aborted) setRemoteSite(site); })
      .catch(error => { if (!controller.signal.aborted) { setRemoteSite(null); setRemoteSiteError(error instanceof Error ? error.message : 'Could not load the published booking page.'); } })
      .finally(() => { if (!controller.signal.aborted) setRemoteResolvedKey(remoteRequestKey); });
    return () => { controller.abort(); };
  }, [slug, remoteRetry, remoteRequestKey]);

  const activeRemoteSite = remoteSite?.tenant.slug.toLowerCase() === slug.toLowerCase() ? remoteSite : null;
  const tenant = activeRemoteSite?.tenant || localTenant;

  // Language state (persisted in session)
  const [lang, setLang] = useState<BookingLanguage>(() => {
    if (typeof sessionStorage !== 'undefined') {
      return (sessionStorage.getItem('moonbox_booking_lang') as BookingLanguage) || 'en';
    }
    return 'en';
  });

  const t = BOOKING_TRANSLATIONS[lang];
  const bookingSettings = {
    enabled: true,
    pageTitle: 'Book your next beauty experience',
    pageSubtitle: 'Choose a service, select a time, and reserve your appointment in minutes.',
    successMessage: 'Your appointment is confirmed. We look forward to seeing you!',
    showPrices: true,
    showStaffSelection: true,
    allowWhatsApp: true,
    accentColor: tenant?.settings?.onlineBooking?.accentColor || tenant?.portfolio?.accentColor || '#8B5CF6',
    backgroundColor: tenant?.settings?.onlineBooking?.backgroundColor || '#F8F7FC',
    ...tenant?.settings?.onlineBooking
  };

  const handleToggleLang = () => {
    const nextLang: BookingLanguage = lang === 'en' ? 'si' : 'en';
    setLang(nextLang);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('moonbox_booking_lang', nextLang);
    }
  };

  // 3-Step Wizard Navigation: 1 = Client Info, 2 = Service, 3 = Date & Time, 4 = Confirmed
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Customer Information
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  // Step 2: Selected Service / Package
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Step 3: Date, Staff, and Time Slot
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('any');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Submission & Validation States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  const allServices = useMemo(
    () => (activeRemoteSite?.services ?? (isLocalDemoMode && tenant ? StorageService.getServices(tenant.id) : [])).filter(s => s.isActive && s.isOnlineBookingEnabled),
    [activeRemoteSite?.services, tenant?.id]
  );
  const categories = useMemo(
    () => activeRemoteSite?.categories ?? (isLocalDemoMode && tenant ? StorageService.getCategories(tenant.id) : []),
    [activeRemoteSite?.categories, tenant?.id]
  );
  const staffList = useMemo(
    () => (activeRemoteSite?.staff ?? (isLocalDemoMode && tenant ? StorageService.getStaff(tenant.id) : [])).filter(s => s.status === 'active'),
    [activeRemoteSite?.staff, tenant?.id]
  );

  useEffect(() => {
    if (!tenant) return;
    const serviceId = searchParams.get('serviceId');
    if (serviceId) {
      const service = allServices.find(item => item.id === serviceId);
      if (service) { setSelectedService(service); setCurrentStep(2); }
    } else if (!selectedService && allServices.length > 0) {
      setSelectedService(allServices[0]);
    }
  }, [tenant?.id, allServices, searchParams]);

  if (isLoadingRemoteSite && !tenant) {
    return <div role="status" className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#101225] text-white' : 'bg-[#F8F7FC] text-[#101225]'}`}>Loading published booking page…</div>;
  }

  if (!tenant) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${
        isDark ? 'bg-[#101225] text-[#F6F3FB]' : 'bg-[#F8F7FC] text-[#101225]'
      }`}>
        <h2 className="text-xl font-bold mb-2">Salon Workspace Not Found</h2>
        <p className="text-xs opacity-75 mb-4">{remoteSiteError || `No active salon found matching web slug "${slug}".`}</p>
        {remoteSiteError && <button onClick={() => setRemoteRetry(value => value + 1)} className="mb-3 px-5 py-2.5 rounded-xl border border-[#8B5CF6] text-[#8B5CF6] font-bold text-xs">Retry</button>}
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white font-bold text-xs"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!bookingSettings.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F7FC] text-[#101225] text-center">
        <div className="max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-200">
          <h2 className="text-xl font-extrabold mb-2">Online booking is temporarily unavailable</h2>
          <p className="text-sm text-slate-500">Please contact {tenant.name} directly to arrange your appointment.</p>
        </div>
      </div>
    );
  }

  const filteredServices = selectedCategory === 'all'
    ? allServices
    : allServices.filter(s => s.categoryId === selectedCategory);

  // Salon WhatsApp normalization
  const rawWa = tenant.whatsapp || tenant.phone;
  const cleanWa = rawWa ? rawWa.replace(/[^0-9]/g, '') : '';
  const waIntlNumber = cleanWa.startsWith('0') 
    ? `94${cleanWa.substring(1)}` 
    : cleanWa.startsWith('94')
      ? cleanWa
      : `94${cleanWa}`;

  const bookingWaMsg = encodeURIComponent(
    `Hello ${tenant.name}, I am visiting your online booking page and have a question regarding reserving an appointment.`
  );
  const salonWhatsAppUrl = cleanWa && bookingSettings.allowWhatsApp ? `https://wa.me/${waIntlNumber}?text=${bookingWaMsg}` : null;

  // Calculate day-of-week opening hours
  const selectedDayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof tenant.openingHours;
  const daySchedule = tenant.openingHours?.[selectedDayName];
  const isSalonOpenToday = daySchedule?.isOpen ?? true;

  // Generate Slots for the selected date based on salon hours
  const openTime = daySchedule?.open || '09:00';
  const closeTime = daySchedule?.close || '18:00';
  const [openHour] = openTime.split(':').map(Number);
  const [closeHour] = closeTime.split(':').map(Number);

  const candidateSlots: string[] = [];
  for (let hour = openHour; hour < closeHour; hour++) {
    candidateSlots.push(`${String(hour).padStart(2, '0')}:00`);
    candidateSlots.push(`${String(hour).padStart(2, '0')}:30`);
  }

  // Pre-calculate availability for each slot
  const slotAvailabilityMap: Record<string, { isAvailable: boolean; conflictReason?: string }> = {};

  if (selectedService && isSalonOpenToday) {
    const durationMins = selectedService.durationMinutes;

    candidateSlots.forEach(slot => {
      const [h, m] = slot.split(':').map(Number);
      const endTotal = h * 60 + m + durationMins;
      const endH = Math.floor(endTotal / 60) % 24;
      const endM = endTotal % 60;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      // Public production availability is advisory. The booking RPC and its
      // database overlap lock make the final decision atomically.
      if (!isLocalDemoMode) {
        slotAvailabilityMap[slot] = { isAvailable: true };
        return;
      }

      // If user selected a specific staff member
      if (selectedStaffId !== 'any') {
        const check = StorageService.checkDoubleBooking(
          tenant.id,
          selectedStaffId,
          selectedDate,
          slot,
          endTimeStr
        );
        slotAvailabilityMap[slot] = { isAvailable: !check.isConflict };
      } else {
        // Any staff: available if AT LEAST ONE qualified staff member is free for this service
        const qualifiedStaff = staffList.filter(s => 
          selectedService.assignedStaffIds.length === 0 || selectedService.assignedStaffIds.includes(s.id)
        );

        const freeStaff = qualifiedStaff.find(s => {
          const check = StorageService.checkDoubleBooking(
            tenant.id,
            s.id,
            selectedDate,
            slot,
            endTimeStr
          );
          return !check.isConflict;
        });

        slotAvailabilityMap[slot] = { isAvailable: Boolean(freeStaff) };
      }
    });
  }

  // Validation: Step 1 (Client Details)
  const handleContinueFromStep1 = () => {
    setErrorMsg(null);
    if (!clientName.trim()) {
      setErrorMsg(t.validationNameRequired);
      return;
    }
    const cleanP = clientPhone.replace(/[^0-9]/g, '');
    if (!cleanP || cleanP.length < 9) {
      setErrorMsg(t.validationPhoneInvalid);
      return;
    }
    setCurrentStep(2);
  };

  // Validation: Step 2 (Service Selection)
  const handleContinueFromStep2 = () => {
    setErrorMsg(null);
    if (!selectedService) {
      setErrorMsg(t.validationServiceRequired);
      return;
    }
    setCurrentStep(3);
  };

  // Step 3 & Submission: Create Booking
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedService) {
      setErrorMsg(t.validationServiceRequired);
      return;
    }
    if (!selectedTimeSlot) {
      setErrorMsg(t.validationTimeRequired);
      return;
    }
    if (!isSalonOpenToday) {
      setErrorMsg(t.salonClosedOnDate);
      return;
    }

    // Determine assigned staff member
    let assignedStaff: Staff | undefined;
    if (selectedStaffId !== 'any') {
      assignedStaff = staffList.find(s => s.id === selectedStaffId);
    } else {
      const qualified = staffList.filter(s => 
        selectedService.assignedStaffIds.length === 0 || selectedService.assignedStaffIds.includes(s.id)
      );
      // Pick first staff free for this interval
      const [h, m] = selectedTimeSlot.split(':').map(Number);
      const endTotal = h * 60 + m + selectedService.durationMinutes;
      const endH = Math.floor(endTotal / 60) % 24;
      const endM = endTotal % 60;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      assignedStaff = (isLocalDemoMode ? qualified.find(s => {
        const check = StorageService.checkDoubleBooking(tenant.id, s.id, selectedDate, selectedTimeSlot, endTimeStr);
        return !check.isConflict;
      }) : undefined) || qualified[0] || staffList[0];
    }

    if (!assignedStaff) {
      setErrorMsg('No stylist available for this slot. Please choose another time.');
      return;
    }

    // Compute end time based on duration
    const [h, m] = selectedTimeSlot.split(':').map(Number);
    const endTotal = h * 60 + m + selectedService.durationMinutes;
    const endH = Math.floor(endTotal / 60) % 24;
    const endM = endTotal % 60;
    const computedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // CONCURRENCY & DOUBLE-BOOKING REVALIDATION (Database verification before saving)
    const liveConflictCheck = isLocalDemoMode ? StorageService.checkDoubleBooking(
      tenant.id,
      assignedStaff.id,
      selectedDate,
      selectedTimeSlot,
      computedEndTime
    ) : { isConflict: false };

    if (liveConflictCheck.isConflict) {
      setErrorMsg(t.validationConflictError);
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingRef = `MBX-${Math.floor(10000 + Math.random() * 90000)}`;

      const newAppointment: Appointment = {
        id: `apt_online_${Date.now()}`,
        tenantId: tenant.id,
        customerId: '',
        customerName: clientName.trim(),
        customerPhone: clientPhone.trim(),
        staffId: assignedStaff.id,
        staffName: assignedStaff.name,
        serviceIds: [selectedService.id],
        serviceNames: [selectedService.name],
        date: selectedDate,
        startTime: selectedTimeSlot,
        endTime: computedEndTime,
        durationMinutes: selectedService.durationMinutes,
        totalPriceLKR: selectedService.priceLKR,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        bookingSource: 'online_portal',
        notes: clientNotes.trim() ? `${clientNotes.trim()} (Ref: ${bookingRef})` : `Ref: ${bookingRef}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let confirmedAppointment = newAppointment;
      if (isSupabaseConfigured) {
        try {
        const rpcResult = await PublicWebsiteApi.submitBooking(slug, {
          clientName: newAppointment.customerName,
          clientPhone: newAppointment.customerPhone,
          date: newAppointment.date,
          startTime: newAppointment.startTime,
          endTime: newAppointment.endTime,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          durationMinutes: selectedService.durationMinutes,
          staffId: selectedStaffId === 'any' ? undefined : assignedStaff.id,
          staffName: assignedStaff.name,
          idempotencyKey: `${slug}:${clientPhone.replace(/\D/g, '')}:${selectedDate}:${selectedTimeSlot}:${selectedService.id}`,
          notes: newAppointment.notes,
          totalPriceLKR: newAppointment.totalPriceLKR,
        });
        const saved = rpcResult.booking;
        const appointmentId = String(saved.appointment_id || '');
        if (saved.success !== true || !appointmentId) throw new Error('The booking service did not confirm a saved appointment.');
        confirmedAppointment = {
          ...newAppointment,
          id: appointmentId,
          customerId: String(saved.customer_id || ''),
          staffId: String(saved.staff_id || assignedStaff.id),
          staffName: String(saved.staff_name || assignedStaff.name),
          totalPriceLKR: Number(saved.total_price_lkr ?? newAppointment.totalPriceLKR),
          status: String(saved.status || 'pending') as Appointment['status'],
        };
        } catch (error) {
          setErrorMsg(error instanceof Error ? error.message : 'The booking service is unavailable. Please try again.');
          return;
        }
      } else if (!isLocalDemoMode) {
        setErrorMsg('Online booking is temporarily unavailable because the booking database is not configured.');
        return;
      } else {
        const result = StorageService.saveAppointment(newAppointment);
        if (!result.success) {
          setErrorMsg(result.error || 'Failed to complete booking.');
          return;
        }
        StorageService.createNotification({
          tenantId: tenant.id,
          title: 'New Online Client Booking',
          message: `${clientName} booked ${selectedService.name} on ${selectedDate} at ${selectedTimeSlot} (Ref: ${bookingRef}).`,
          type: 'subscription'
        });
      }

      setConfirmedBooking(confirmedAppointment);
      setCurrentStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetBooking = () => {
    setSelectedTimeSlot('');
    setConfirmedBooking(null);
    setCurrentStep(1);
  };

  return (
    <div style={{ backgroundColor: isDark ? '#101225' : bookingSettings.backgroundColor } as React.CSSProperties} className={`min-h-screen transition-colors duration-200 antialiased ${
      isDark ? 'text-[#F6F3FB]' : 'text-[#101225]'
    }`}>
      {/* ======================================================== */}
      {/* 1. SALON-SPECIFIC HEADER (NO PLATFORM MARKETING)          */}
      {/* ======================================================== */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors ${
        isDark ? 'bg-[#151529]/95 border-[#343047]' : 'bg-white/95 border-[#E2DFF0]'
      }`}>
        {/* Salon Identity */}
        <div className="flex items-center gap-3">
          {tenant.logoUrl ? (
            <img 
              src={tenant.logoUrl} 
              alt={tenant.name} 
              className="w-10 h-10 rounded-2xl object-cover border border-[#343047]" 
            />
          ) : (
            <img src="/brand/moonbox-salon-mark.jpg" alt="Moonbox Salon" className="w-10 h-10 rounded-2xl object-cover border border-[#DDB27A]/40" />
          )}

          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight">
              {tenant.name}
            </h1>
            <p className="text-[11px] text-[#858198] dark:text-[#AAA6BD] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#8B5CF6]" />
              <span>{tenant.city}, Sri Lanka</span>
              {tenant.phone && <span className="hidden sm:inline">· {tenant.phone}</span>}
            </p>
          </div>
        </div>

        {/* Right Controls: WhatsApp, Bilingual Switcher, Theme */}
        <div className="flex items-center gap-2 sm:gap-3">
          {salonWhatsAppUrl && (
            <a
              href={salonWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#4BBF98] bg-[#4BBF98]/10 hover:bg-[#4BBF98]/20 border border-[#4BBF98]/30 transition-all"
              title={t.chatOnWhatsApp}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#4BBF98]" />
              <span>WhatsApp</span>
            </a>
          )}

          {/* Bilingual Language Switcher */}
          <button
            onClick={handleToggleLang}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#343047] bg-[#25223D]/30 hover:bg-[#25223D] text-xs font-extrabold text-[#B8A5FF] transition-all"
            title="Switch Language / භාෂාව මාරු කරන්න"
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{t.langSwitchLabel}</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN 3-STEP BOOKING CONTAINER                          */}
      {/* ======================================================== */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Step Indicator (Steps 1, 2, 3) */}
        {currentStep !== 4 && (
          <div className="mb-6">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-[#343047] -translate-y-1/2 z-0" />

              {[1, 2, 3].map(stepNum => {
                const isPassed = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;

                return (
                  <div key={stepNum} className="relative z-10 flex flex-col items-center">
                    <button
                      type="button"
                      disabled={stepNum > currentStep}
                      onClick={() => {
                        if (stepNum < currentStep) setCurrentStep(stepNum as any);
                      }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-extrabold text-xs transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-lg shadow-[#8B5CF6]/30 scale-105'
                          : isPassed
                            ? 'bg-[#4BBF98] text-[#101225]'
                            : 'bg-white dark:bg-[#1C1B31] border border-slate-200 dark:border-[#343047] text-[#858198]'
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : stepNum}
                    </button>
                    <span className={`text-[10px] sm:text-[11px] font-bold mt-1.5 text-center hidden sm:block ${
                      isCurrent ? 'text-[#8B5CF6] dark:text-[#B8A5FF]' : 'text-[#858198]'
                    }`}>
                      {stepNum === 1 ? t.step1Title : stepNum === 2 ? t.step2Title : t.step3Title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-[#EA7180]/15 border border-[#EA7180]/30 text-[#EA7180] text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#EA7180]" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 1: CUSTOMER DETAILS                                 */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-all ${
            isDark ? 'bg-[#1C1B31] border-[#343047]' : 'bg-white border-[#E2DFF0]'
          }`}>
            <div className="mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D5BD88]">
                {t.step1Title}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold mt-0.5">
                {bookingSettings.pageTitle || t.fullNameLabel.replace(' *', '')}
              </h2>
              <p className="text-xs text-[#858198] dark:text-[#AAA6BD] mt-1">
                {bookingSettings.pageSubtitle || t.step1Desc}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1.5 text-[#101225] dark:text-[#F6F3FB]">
                  {t.fullNameLabel}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={70}
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder={t.fullNamePlaceholder}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                      isDark 
                        ? 'bg-[#25223D] border border-[#343047] text-[#F6F3FB] placeholder:text-[#858198]' 
                        : 'bg-[#F8F7FC] border border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-[#101225] dark:text-[#F6F3FB]">
                  {t.phoneLabel}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    maxLength={15}
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder={t.phonePlaceholder}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                      isDark 
                        ? 'bg-[#25223D] border border-[#343047] text-[#F6F3FB] placeholder:text-[#858198]' 
                        : 'bg-[#F8F7FC] border border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-[#858198] dark:text-[#AAA6BD] mt-1">
                  {t.phoneHelp}
                </p>
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-[#101225] dark:text-[#F6F3FB]">
                  {t.notesLabel}
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={clientNotes}
                  onChange={e => setClientNotes(e.target.value)}
                  placeholder={t.notesPlaceholder}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                    isDark 
                      ? 'bg-[#25223D] border border-[#343047] text-[#F6F3FB] placeholder:text-[#858198]' 
                      : 'bg-[#F8F7FC] border border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>

              {/* Direct Salon WhatsApp Assistance link */}
              {salonWhatsAppUrl && (
                <div className="p-3.5 rounded-2xl bg-[#4BBF98]/10 border border-[#4BBF98]/25 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[#4BBF98]">
                    <MessageSquare className="w-4 h-4" />
                    <span>Have a question before booking?</span>
                  </div>
                  <a
                    href={salonWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#4BBF98] hover:underline"
                  >
                    {t.chatOnWhatsApp} →
                  </a>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleContinueFromStep1}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-extrabold shadow-lg shadow-[#8B5CF6]/25 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>{t.continueBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: SELECT SERVICE OR PACKAGE                         */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-all ${
            isDark ? 'bg-[#1C1B31] border-[#343047]' : 'bg-white border-[#E2DFF0]'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D5BD88]">
                  {t.step2Title}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold mt-0.5">
                  {t.selectServiceTitle}
                </h2>
                <p className="text-xs text-[#858198] dark:text-[#AAA6BD] mt-0.5">
                  {t.step2Desc}
                </p>
              </div>

              {selectedService && bookingSettings.showPrices && (
                <div className="px-3.5 py-1.5 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-xs font-bold text-[#B8A5FF] self-start sm:self-auto">
                  Rs. {selectedService.priceLKR.toLocaleString('en-US')} · {selectedService.durationMinutes} {t.mins}
                </div>
              )}
            </div>

            {/* Category Filter Pills */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-[#8B5CF6] text-white'
                      : 'bg-[#25223D] text-[#AAA6BD] border border-[#343047]'
                  }`}
                >
                  {t.allCategories}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-[#8B5CF6] text-white'
                        : 'bg-[#25223D] text-[#AAA6BD] border border-[#343047]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Service Cards Grid */}
            {filteredServices.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#858198]">
                {t.noServicesFound}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredServices.map(srv => {
                  const isSelected = selectedService?.id === srv.id;

                  return (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedService(srv)}
                      className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] shadow-md shadow-[#8B5CF6]/15'
                          : 'bg-[#25223D]/60 hover:bg-[#25223D] border-[#343047]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm sm:text-base text-[#F6F3FB]">
                            {srv.name}
                          </h4>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        {srv.description && (
                          <p className="text-xs text-[#AAA6BD] max-w-lg leading-relaxed">
                            {srv.description}
                          </p>
                        )}
                        <span className="inline-block text-[11px] text-[#858198]">
                          {t.duration}: <strong>{srv.durationMinutes} {t.mins}</strong>
                        </span>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-base sm:text-lg font-black text-[#F6F3FB] block">
                          Rs. {srv.priceLKR.toLocaleString('en-US')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isSelected ? 'bg-[#8B5CF6] text-white' : 'bg-[#151529] text-[#AAA6BD]'
                        }`}>
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-6 border-t border-[#343047] mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl border border-[#343047] text-[#AAA6BD] hover:text-[#F6F3FB] text-xs font-bold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.backBtn}</span>
              </button>

              <button
                type="button"
                onClick={handleContinueFromStep2}
                disabled={!selectedService}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-extrabold shadow-lg shadow-[#8B5CF6]/25 hover:opacity-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span>{t.continueBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: DATE & AVAILABLE TIME SLOT                        */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmitBooking} className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-all space-y-6 ${
            isDark ? 'bg-[#1C1B31] border-[#343047]' : 'bg-white border-[#E2DFF0]'
          }`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D5BD88]">
                {t.step3Title}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold mt-0.5">
                {t.selectDateTitle}
              </h2>
              <p className="text-xs text-[#858198] dark:text-[#AAA6BD] mt-0.5">
                {t.step3Desc}
              </p>
            </div>

            {/* Date Picker & Stylist Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold mb-1.5 text-[#101225] dark:text-[#F6F3FB]">
                  {t.selectDateTitle}
                </label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={selectedDate}
                    onChange={e => {
                      setSelectedDate(e.target.value);
                      setSelectedTimeSlot('');
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                      isDark 
                        ? 'bg-[#25223D] border border-[#343047] text-[#F6F3FB]' 
                        : 'bg-[#F8F7FC] border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {bookingSettings.showStaffSelection && (
              <div>
                <label className="block font-bold mb-1.5 text-[#101225] dark:text-[#F6F3FB]">
                  {t.selectStaffTitle}
                </label>
                <select
                  value={selectedStaffId}
                  onChange={e => {
                    setSelectedStaffId(e.target.value);
                    setSelectedTimeSlot('');
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                    isDark 
                      ? 'bg-[#25223D] border border-[#343047] text-[#F6F3FB]' 
                      : 'bg-[#F8F7FC] border border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="any">{t.anyStaff}</option>
                  {staffList.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>
              )}
            </div>

            {/* Time Slots Grid with Real Availability */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-xs text-[#101225] dark:text-[#F6F3FB]">
                  {t.selectTimeTitle}
                </label>
                <span className="text-[11px] text-[#AAA6BD]">
                  {isSalonOpenToday ? `${openTime} – ${closeTime}` : t.closed}
                </span>
              </div>

              {!isSalonOpenToday ? (
                <div className="p-6 rounded-2xl bg-[#EA7180]/15 border border-[#EA7180]/30 text-center text-xs text-[#EA7180]">
                  {t.salonClosedOnDate}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                  {candidateSlots.map(slot => {
                    const status = slotAvailabilityMap[slot];
                    const isAvailable = status?.isAvailable ?? false;
                    const isSelected = selectedTimeSlot === slot;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/30 scale-102'
                            : isAvailable
                              ? 'bg-[#25223D] hover:bg-[#8B5CF6]/20 border border-[#343047] text-[#F6F3FB]'
                              : 'bg-[#151529]/60 border border-[#343047]/40 text-[#858198]/50 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span className="font-mono text-xs">{slot}</span>
                        <span className="text-[9px] font-medium opacity-80">
                          {isAvailable ? t.slotAvailable : t.slotBooked}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Final Booking Summary Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#151529] border border-[#343047] space-y-2.5 text-xs">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#D5BD88]">
                {t.bookingSummary}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#AAA6BD]">
                <div>
                  <span className="block text-[10px] text-[#858198]">{t.serviceSelected}:</span>
                  <span className="font-bold text-[#F6F3FB]">{selectedService?.name}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#858198]">{t.totalPrice}:</span>
                  <span className="font-extrabold text-[#4BBF98]">
                    Rs. {selectedService?.priceLKR.toLocaleString('en-US')}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#858198]">{t.clientDetails}:</span>
                  <span className="font-semibold text-[#F6F3FB]">{clientName} ({clientPhone})</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#858198]">{t.dateTimeSelected}:</span>
                  <span className="font-semibold text-[#B8A5FF]">
                    {selectedDate} · {selectedTimeSlot || 'Select slot above'}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit & Back Action Buttons */}
            <div className="pt-4 border-t border-[#343047] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl border border-[#343047] text-[#AAA6BD] hover:text-[#F6F3FB] text-xs font-bold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.backBtn}</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !selectedTimeSlot || !isSalonOpenToday}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-extrabold shadow-lg shadow-[#8B5CF6]/30 hover:opacity-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <CalendarCheck2 className="w-4 h-4" />
                <span>{isSubmitting ? t.submittingBtn : t.submitBtn}</span>
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* STEP 4: BOOKING CONFIRMATION SCREEN                       */}
        {/* ======================================================== */}
        {currentStep === 4 && confirmedBooking && (
          <div className={`p-6 sm:p-10 rounded-3xl border shadow-2xl transition-all space-y-6 text-center animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-[#1C1B31] border-[#343047]' : 'bg-white border-[#E2DFF0]'
          }`}>
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#4BBF98]/20 text-[#4BBF98] border border-[#4BBF98]/40 flex items-center justify-center shadow-lg shadow-[#4BBF98]/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4BBF98]">
                {confirmedBooking.status === 'pending' ? 'Booking request received' : t.bookingConfirmedTitle}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black mt-1">
                {tenant.name}
              </h2>
              <p className="text-xs text-[#858198] dark:text-[#AAA6BD] max-w-md mx-auto mt-1 leading-relaxed">
                {confirmedBooking.status === 'pending' ? 'The salon will review and confirm your requested time shortly.' : t.bookingConfirmedSubtitle}
              </p>
            </div>

            {/* Reference Badge */}
            <div className="inline-block p-3 rounded-2xl bg-[#151529] border border-[#343047]">
              <span className="text-[10px] text-[#858198] block">{t.bookingRefLabel}:</span>
              <span className="font-mono text-base font-extrabold text-[#B8A5FF] tracking-wider">
                {confirmedBooking.notes?.split('Ref: ')[1] || confirmedBooking.id}
              </span>
            </div>

            {/* Confirmed Details Card */}
            <div className="p-5 rounded-2xl bg-[#25223D] border border-[#343047] text-xs text-left grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
              <div>
                <span className="block text-[10px] text-[#858198]">{t.serviceSelected}:</span>
                <span className="font-bold text-[#F6F3FB]">{confirmedBooking.serviceNames[0]}</span>
              </div>
              <div>
                <span className="block text-[10px] text-[#858198]">{t.totalPrice}:</span>
                <span className="font-extrabold text-[#4BBF98]">
                  Rs. {confirmedBooking.totalPriceLKR.toLocaleString('en-US')}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#858198]">{t.dateTimeSelected}:</span>
                <span className="font-semibold text-[#B8A5FF]">
                  {confirmedBooking.date} at {confirmedBooking.startTime}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#858198]">{t.stylistSelected}:</span>
                <span className="font-semibold text-[#F6F3FB]">{confirmedBooking.staffName}</span>
              </div>
              <div>
                <span className="block text-[10px] text-[#858198]">{t.clientDetails}:</span>
                <span className="font-semibold text-[#F6F3FB]">{confirmedBooking.customerName}</span>
              </div>
              <div>
                <span className="block text-[10px] text-[#858198]">{t.locationLabel}:</span>
                <span className="font-semibold text-[#F6F3FB]">{tenant.address}, {tenant.city}</span>
              </div>
            </div>

            {/* Actions: WhatsApp Salon, Book Another */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              {salonWhatsAppUrl && (
                <a
                  href={salonWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#4BBF98]/15 hover:bg-[#4BBF98]/25 text-[#4BBF98] border border-[#4BBF98]/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{t.chatOnWhatsApp}</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleResetBooking}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white font-bold text-xs shadow-md shadow-[#8B5CF6]/25 hover:opacity-95 transition-all"
              >
                {t.bookAnotherBtn}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
