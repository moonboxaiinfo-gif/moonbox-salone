import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SalonTenant, Service, Staff, Appointment } from '../../types';
import { StorageService } from '../../services/storageService';
import { EmailService } from '../../services/emailService';
import { PublicWebsiteApi } from '../../services/publicWebsiteApi';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { isLocalDemoMode } from '../../services/storageService';
import { useTenantCatalog, useTenantStaff } from '../../services/asyncDataService';
import { formatLKR } from '../../constants/brand';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  ArrowRight,
  X,
  Mail
} from 'lucide-react';

interface PublicBookingFlowProps {
  tenant: SalonTenant;
  isOpen: boolean;
  onClose: () => void;
  preselectedService?: Service | null;
}

export const PublicBookingFlow: React.FC<PublicBookingFlowProps> = ({
  tenant,
  isOpen,
  onClose,
  preselectedService
}) => {
  const catalogResource = useTenantCatalog(tenant.id, isOpen);
  const staffResource = useTenantStaff(tenant.id, isOpen);
  const services = useMemo(() => (catalogResource.data?.services || []).filter(s => s.isActive && s.isOnlineBookingEnabled), [catalogResource.data?.services]);
  const staffList = useMemo(() => (staffResource.data || []).filter(s => s.status === 'active'), [staffResource.data]);

  const [step, setStep] = useState(preselectedService ? 2 : 1);
  const [selectedService, setSelectedService] = useState<Service | null>(preselectedService || services[0] || null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('any');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:30');

  // Client Details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<Appointment | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const bookingIdempotency = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    if (!isOpen || catalogResource.loading) return;
    const availableService = preselectedService && services.some(service => service.id === preselectedService.id)
      ? services.find(service => service.id === preselectedService.id)
      : services[0];
    if (availableService && (!selectedService || !services.some(service => service.id === selectedService.id))) setSelectedService(availableService);
  }, [isOpen, catalogResource.loading, preselectedService, services, selectedService]);

  if (!isOpen) return null;

  // Available Time Slots calculation based on staff availability & buffer
  const timeSlots = [
    '09:30', '10:00', '10:30', '11:15', '12:00', '13:00', 
    '14:00', '14:45', '15:30', '16:15', '17:00', '17:45', '18:30'
  ];

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (submittingRef.current) return;

    if (!selectedService) {
      setErrorMsg('Please select a service.');
      return;
    }
    if (!clientName || !clientPhone) {
      setErrorMsg('Please enter your name and phone number.');
      return;
    }

    // Determine staff member (if 'any', pick first available staff assigned to this service)
    let assignedStaff = staffList.find(s => s.id === selectedStaffId);
    if (!assignedStaff) {
      assignedStaff = staffList.find(s => selectedService.assignedStaffIds.includes(s.id)) || staffList[0];
    }

    if (!assignedStaff) {
      setErrorMsg('No qualified stylists are available for this slot.');
      return;
    }

    // Compute end time based on duration
    const [h, m] = selectedTimeSlot.split(':').map(Number);
    const endTotal = h * 60 + m + selectedService.durationMinutes;
    const endH = Math.floor(endTotal / 60) % 24;
    const endM = endTotal % 60;
    const computedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // Verify double booking
    const conflict = isLocalDemoMode ? StorageService.checkDoubleBooking(
      tenant.id,
      assignedStaff.id,
      selectedDate,
      selectedTimeSlot,
      computedEndTime
    ) : { isConflict: false };

    if (conflict.isConflict) {
      setErrorMsg(`Sorry, the slot ${selectedTimeSlot} is no longer available with ${assignedStaff.name}. Please select another time.`);
      return;
    }

    // Find or create customer in CRM
    let custId: string | undefined;
    if (isLocalDemoMode) {
      const customers = StorageService.getCustomers(tenant.id);
      const existingCust = customers.find(c => c.phone === clientPhone);
      custId = existingCust?.id;
    }

    if (!custId && isLocalDemoMode) {
      custId = `cust_${Date.now()}`;
      StorageService.saveCustomer({
        id: custId,
        tenantId: tenant.id,
        name: clientName,
        phone: clientPhone,
        whatsapp: clientPhone,
        email: clientEmail,
        status: 'active',
        totalSpentLKR: 0,
        visitsCount: 1,
        lastVisitAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
    }

    const newApt: Appointment = {
      id: `apt_web_${Date.now()}`,
      tenantId: tenant.id,
      customerId: custId!,
      customerName: clientName,
      customerPhone: clientPhone,
      customerEmail: clientEmail,
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
      notes: clientNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let confirmationAppointment = newApt;
    const fingerprint = JSON.stringify([tenant.id, clientPhone.trim(), selectedDate, selectedTimeSlot, selectedService.id, assignedStaff.id]);
    if (!bookingIdempotency.current || bookingIdempotency.current.fingerprint !== fingerprint) {
      bookingIdempotency.current = { fingerprint, key: crypto.randomUUID() };
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    if (isSupabaseConfigured) {
      try {
        const result = await PublicWebsiteApi.submitBooking(tenant.slug, {
          clientName: newApt.customerName,
          clientPhone: newApt.customerPhone,
          clientEmail: newApt.customerEmail,
          date: newApt.date,
          startTime: newApt.startTime,
          endTime: newApt.endTime,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          durationMinutes: newApt.durationMinutes,
          staffId: selectedStaffId === 'any' ? undefined : assignedStaff.id,
          staffName: assignedStaff.name,
          totalPriceLKR: newApt.totalPriceLKR,
          notes: newApt.notes,
          idempotencyKey: bookingIdempotency.current.key,
        });
        const saved = result.booking;
        const appointmentId = String(saved.appointment_id || '');
        if (saved.success !== true || !appointmentId) throw new Error('The booking service did not confirm a saved appointment.');
        confirmationAppointment = {
          ...newApt,
          id: appointmentId,
          customerId: String(saved.customer_id || ''),
          staffId: String(saved.staff_id || assignedStaff.id),
          staffName: String(saved.staff_name || assignedStaff.name),
          totalPriceLKR: Number(saved.total_price_lkr ?? newApt.totalPriceLKR),
          status: String(saved.status || 'pending') as Appointment['status'],
        };
        bookingIdempotency.current = null;
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'The booking service is unavailable.');
        submittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
    } else if (isLocalDemoMode) {
      const result = StorageService.saveAppointment(newApt);
      if (!result.success) {
        setErrorMsg(result.error || 'Failed to complete booking.');
        setIsSubmitting(false);
        return;
      }
    } else {
      setErrorMsg('Online booking is temporarily unavailable because the booking database is not configured.');
      setIsSubmitting(false);
      return;
    }

    // Add alert notification for salon staff
    if (isLocalDemoMode) {
      StorageService.createNotification({
        tenantId: tenant.id,
        title: 'New Online Customer Booking',
        message: `${clientName} booked ${selectedService.name} on ${selectedDate} at ${selectedTimeSlot}.`,
        type: 'appointment'
      });
    }

    // The server resolves recipient and email content from the persisted booking.
    if (clientEmail && isSupabaseConfigured && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(confirmationAppointment.id)) {
      setEmailStatus('Sending confirmation email...');
      EmailService.sendAppointmentConfirmation(confirmationAppointment.id, tenant.slug).then(emailRes => {
        if (emailRes.success) {
          setEmailStatus('Confirmation email sent to the address provided.');
        } else {
          setEmailStatus(emailRes.error || 'Your booking was received; confirmation email could not be sent.');
        }
      });
    } else if (clientEmail && isSupabaseConfigured) {
      setEmailStatus('Your booking request was received. The salon will confirm the appointment shortly.');
    }

    setBookingConfirmation(confirmationAppointment);
    submittingRef.current = false;
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12051E]/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E8DFD6] overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8DFD6] flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#9B3E88] uppercase">
              Online Appointment Portal
            </span>
            <h3 className="text-base font-bold text-[#1B0C2D]">{tenant.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation View */}
        {bookingConfirmation ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-bold text-[#1B0C2D]">{bookingConfirmation.status === 'pending' ? 'Booking Request Received' : 'Appointment Confirmed!'}</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Thank you, <strong>{bookingConfirmation.customerName}</strong>! {bookingConfirmation.status === 'pending' ? `Your request has been sent to ${tenant.name}; the salon will confirm shortly.` : `Your styling appointment has been reserved at ${tenant.name}.`}
            </p>

            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8DFD6] text-xs max-w-md mx-auto text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-bold text-slate-800">{bookingConfirmation.serviceNames.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-bold text-slate-800">{bookingConfirmation.date} at {bookingConfirmation.startTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stylist:</span>
                <span className="font-bold text-[#9B3E88]">{bookingConfirmation.staffName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-slate-700">Estimated Price:</span>
                <span className="text-base text-[#1B0C2D]">{formatLKR(bookingConfirmation.totalPriceLKR)}</span>
              </div>
            </div>

            {/* Email Dispatch Notice */}
            {clientEmail && emailStatus && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] max-w-md mx-auto flex items-start gap-2 text-left">
                <Mail className="w-4 h-4 text-[#9B3E88] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Email Notification ({clientEmail}):</span>
                  <span>{emailStatus}</span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Payment is made upon arrival at the salon via Cash, Card or QR in Sri Lankan Rupees.
            </p>

            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] text-xs font-bold shadow-md"
            >
              Done
            </button>
          </div>
        ) : (
          /* Multi-step Booking Form */
          <div className="p-6 space-y-5">
            {(catalogResource.loading || staffResource.loading) && <p role="status" className="text-xs text-slate-500">Loading bookable services and stylists…</p>}
            {(catalogResource.error || staffResource.error) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><p>{catalogResource.error || staffResource.error}</p><button type="button" onClick={() => { catalogResource.retry(); staffResource.retry(); }} className="mt-2 underline">Retry</button></div>}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Select Service */}
            {step === 1 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Step 1: Select Salon Treatment
                </h4>
                {!catalogResource.loading && !catalogResource.error && services.length === 0 && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">No active bookable services are available right now. Please contact the salon.</p>}
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {services.map(s => {
                    const isSelected = selectedService?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedService(s)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#9B3E88] bg-purple-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-xs font-bold text-[#1B0C2D]">{s.name}</h5>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{s.description}</p>
                          </div>
                          <span className="text-xs font-bold text-[#9B3E88] shrink-0 ml-2">
                            {formatLKR(s.priceLKR)}
                          </span>
                        </div>
                        <span className="inline-block mt-2 text-[10px] text-slate-400 font-medium">
                          Duration: {s.durationMinutes} minutes
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedService || catalogResource.loading || staffResource.loading || Boolean(catalogResource.error || staffResource.error)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] text-xs font-bold"
                  >
                    <span>Choose Date & Time</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Date, Time Slot & Stylist */}
            {step === 2 && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                    Step 2: Schedule & Stylist
                  </h4>
                  <button
                    onClick={() => setStep(1)}
                    className="text-[#9B3E88] font-semibold text-xs hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Service</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#1B0C2D] block">{selectedService?.name}</span>
                    <span className="text-[11px] text-slate-500">{selectedService?.durationMinutes} mins</span>
                  </div>
                  <span className="font-bold text-[#9B3E88] text-sm">{formatLKR(selectedService?.priceLKR || 0)}</span>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Appointment Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  />
                </div>

                {/* Stylist Preference */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Stylist</label>
                  <select
                    value={selectedStaffId}
                    onChange={e => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
                  >
                    <option value="any">Any Qualified Stylist (Fastest Availability)</option>
                    {staffList.map(st => (
                      <option key={st.id} value={st.id}>{st.name} — {st.position}</option>
                    ))}
                  </select>
                </div>

                {/* Available Slots Grid */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Available Time Slots</label>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1">
                    {timeSlots.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTimeSlot(time)}
                        className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all ${
                          selectedTimeSlot === time
                            ? 'bg-[#1B0C2D] text-[#F3C9AB] border-[#1B0C2D] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] text-xs font-bold"
                  >
                    <span>Customer Information</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Customer Information & Final Confirmation */}
            {step === 3 && (
              <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                    Step 3: Contact Information
                  </h4>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[#9B3E88] font-semibold text-xs hover:underline"
                  >
                    Edit Time
                  </button>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DFD6] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service:</span>
                    <span className="font-bold text-slate-800">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time:</span>
                    <span className="font-bold text-slate-800">{selectedDate} at {selectedTimeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total:</span>
                    <span className="font-bold text-[#1B0C2D]">{formatLKR(selectedService?.priceLKR || 0)}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="e.g. Ananya Senanayake"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mobile / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      placeholder="0771239876"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      placeholder="client@gmail.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Special Notes / Allergies</label>
                  <textarea
                    value={clientNotes}
                    onChange={e => setClientNotes(e.target.value)}
                    placeholder="e.g. Sensitive scalp, bridal styling consultation"
                    rows={2}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
                  />
                </div>

                <div className="pt-3 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || catalogResource.loading || staffResource.loading || Boolean(catalogResource.error || staffResource.error)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] text-xs font-bold shadow-md hover:from-[#2A113C] hover:to-[#552380]"
                  >
                    {isSubmitting ? 'Submitting…' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
