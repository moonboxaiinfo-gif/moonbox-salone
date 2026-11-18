import React, { useEffect, useRef, useState } from 'react';
import { Appointment, Customer, Service, Staff } from '../../types';
import { StorageService } from '../../services/storageService';
import { useTenantAppointments, useTenantCatalog, useTenantCustomers, useTenantStaff } from '../../services/asyncDataService';
import { formatLKR } from '../../constants/brand';
import { AlertCircle, Clock, Calendar as CalendarIcon, User, Sparkles } from 'lucide-react';

const appointmentStatusLabels: Record<Appointment['status'], string> = {
  pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Checked In', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show',
};
const allowedAppointmentTransitions: Record<Appointment['status'], Appointment['status'][]> = {
  pending: ['confirmed', 'cancelled', 'no_show'], confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'cancelled'], in_progress: ['completed', 'cancelled'],
  completed: [], cancelled: [], no_show: [],
};

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  appointment?: Appointment | null;
  tenantId: string;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  appointment,
  tenantId
}) => {
  const customerResource = useTenantCustomers(tenantId, isOpen);
  const catalogResource = useTenantCatalog(tenantId, isOpen);
  const staffResource = useTenantStaff(tenantId, isOpen);
  const appointmentsResource = useTenantAppointments(tenantId, isOpen);
  const customers = customerResource.data || [];
  const services = (catalogResource.data?.services || []).filter(s => s.isActive);
  const staffMembers = (staffResource.data || []).filter(s => s.status === 'active');

  const [selectedCustomerId, setSelectedCustomerId] = useState(appointment?.customerId || (customers[0]?.id || ''));
  const [selectedStaffId, setSelectedStaffId] = useState(appointment?.staffId || (staffMembers[0]?.id || ''));
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(appointment?.serviceIds || []);
  const [date, setDate] = useState(appointment?.date || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(appointment?.startTime || '10:00');
  const [status, setStatus] = useState<Appointment['status']>(appointment?.status || 'confirmed');
  const [bookingSource, setBookingSource] = useState<Appointment['bookingSource']>(appointment?.bookingSource || 'in_salon');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const chosenServices = services.filter(s => selectedServiceIds.includes(s.id));
  const qualifiedStaffMembers = staffMembers.filter(member => chosenServices.every(service => service.assignedStaffIds.length === 0 || service.assignedStaffIds.includes(member.id)));

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCustomerId(appointment?.customerId || customers[0]?.id || '');
    setSelectedStaffId(appointment?.staffId || staffMembers[0]?.id || '');
    setSelectedServiceIds(appointment?.serviceIds?.length ? appointment.serviceIds : (services[0]?.id ? [services[0].id] : []));
    setDate(appointment?.date || new Date().toISOString().split('T')[0]);
    setStartTime(appointment?.startTime || '10:00');
    setStatus(appointment?.status || 'confirmed');
    setBookingSource(appointment?.bookingSource || 'in_salon');
    setNotes(appointment?.notes || '');
    setErrorMsg(null);
  }, [isOpen, appointment]);

  useEffect(() => {
    if (!isOpen || appointment) return;
    if (!selectedCustomerId && customers.length) setSelectedCustomerId(customers[0].id);
    if (!selectedStaffId && qualifiedStaffMembers.length) setSelectedStaffId(qualifiedStaffMembers[0].id);
    else if (selectedStaffId && !qualifiedStaffMembers.some(member => member.id === selectedStaffId)) setSelectedStaffId(qualifiedStaffMembers[0]?.id || '');
    if (!selectedServiceIds.length && services.length) setSelectedServiceIds([services[0].id]);
  }, [isOpen, appointment, customers, qualifiedStaffMembers, services, selectedCustomerId, selectedStaffId, selectedServiceIds]);

  if (!isOpen) return null;
  const lookupLoading = customerResource.loading || catalogResource.loading || staffResource.loading || appointmentsResource.loading;
  const lookupError = customerResource.error || catalogResource.error || staffResource.error || appointmentsResource.error;
  const editableStatuses: Appointment['status'][] = appointment
    ? [appointment.status, ...allowedAppointmentTransitions[appointment.status]]
    : ['pending', 'confirmed'];

  // Compute total duration and total price based on selected services
  const totalDuration = chosenServices.reduce((acc, s) => acc + s.durationMinutes, 0) || 30;
  const totalPrice = chosenServices.reduce((acc, s) => acc + s.priceLKR, 0);

  // Calculate end time
  const [startH, startM] = startTime.split(':').map(Number);
  const endMinutesTotal = (startH || 0) * 60 + (startM || 0) + totalDuration;
  const endH = Math.floor(endMinutesTotal / 60) % 24;
  const endM = endMinutesTotal % 60;
  const computedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = startMinutes + totalDuration;
  const hasScheduleConflict = (appointmentsResource.data || []).some(existing => {
    if (existing.id === appointment?.id || existing.date !== date || existing.staffId !== selectedStaffId || ['cancelled', 'no_show'].includes(existing.status)) return false;
    const [existingStartHour, existingStartMinute] = existing.startTime.split(':').map(Number);
    const [existingEndHour, existingEndMinute] = existing.endTime.split(':').map(Number);
    const existingStart = (existingStartHour || 0) * 60 + (existingStartMinute || 0);
    const existingEnd = (existingEndHour || 0) * 60 + (existingEndMinute || 0);
    return startMinutes < existingEnd && endMinutes > existingStart;
  });

  const toggleService = (srvId: string) => {
    if (selectedServiceIds.includes(srvId)) {
      if (selectedServiceIds.length > 1) {
        setSelectedServiceIds(selectedServiceIds.filter(id => id !== srvId));
      }
    } else {
      setSelectedServiceIds([...selectedServiceIds, srvId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const customer = customers.find(c => c.id === selectedCustomerId);
    const staff = qualifiedStaffMembers.find(s => s.id === selectedStaffId);

    if (!customer) {
      setErrorMsg('Please select a valid customer.');
      return;
    }
    if (!staff) {
      setErrorMsg('Please assign a staff member.');
      return;
    }
    if (selectedServiceIds.length === 0) {
      setErrorMsg('Please select at least one service.');
      return;
    }
    if (hasScheduleConflict) {
      setErrorMsg('This stylist already has an overlapping appointment. Choose another time or stylist.');
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    const aptToSave: Appointment = {
      id: appointment?.id || `apt_${Date.now()}`,
      tenantId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      staffId: staff.id,
      staffName: staff.name,
      serviceIds: selectedServiceIds,
      serviceNames: chosenServices.map(s => s.name),
      date,
      startTime,
      endTime: computedEndTime,
      durationMinutes: totalDuration,
      totalPriceLKR: totalPrice,
      status,
      paymentStatus: appointment?.paymentStatus || 'unpaid',
      bookingSource,
      notes,
      createdAt: appointment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const result = await StorageService.saveAppointmentConfirmed(aptToSave);
      if (!result.success) {
        setErrorMsg(result.error || 'Failed to save appointment. Time slot unavailable.');
        return;
      }
      await StorageService.logAuditConfirmed({
        tenantId,
        actorEmail: 'Staff',
        actorRole: 'receptionist',
        action: appointment ? 'UPDATE_APPOINTMENT' : 'CREATE_APPOINTMENT',
        entity: 'appointment',
        entityId: result.appointment?.id || aptToSave.id,
        details: `${appointment ? 'Updated' : 'Booked'} appointment for ${customer.name} with ${staff.name} at ${startTime}`
      }).catch(error => console.error('[AppointmentModal] Appointment was saved but its audit event could not be recorded.', error));
      onSaved();
      onClose();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Database write failed.');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140921]/70 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E8DFD6] overflow-hidden my-6">
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8DFD6] flex items-center justify-between">
          <h3 className="font-bold text-base text-[#1B0C2D]">
            {appointment ? 'Edit Appointment' : 'Create New Salon Appointment'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {lookupLoading && <p role="status" className="text-xs text-slate-500">Loading customers, services and staff…</p>}
          {lookupError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><p>{lookupError}</p><button type="button" onClick={() => { customerResource.retry(); catalogResource.retry(); staffResource.retry(); appointmentsResource.retry(); }} className="mt-2 rounded-lg border border-rose-200 bg-white px-2 py-1">Retry lookup data</button></div>}
          {!lookupLoading && !lookupError && (customers.length === 0 || staffMembers.length === 0 || services.length === 0) && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Add at least one customer, active stylist and active service before creating an appointment.</p>}

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Staff Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Stylist / Specialist</label>
            <select
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            >
              {qualifiedStaffMembers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.position}
                </option>
              ))}
            </select>
          </div>
          {selectedServiceIds.length > 0 && chosenServices.length > 0 && qualifiedStaffMembers.length === 0 && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">No active stylist is qualified for every selected service. Change the service selection or update service assignments.</p>}

          {/* Multi-Service Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Services ({chosenServices.length} selected · {totalDuration} mins · {formatLKR(totalPrice)})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
              {services.map(s => {
                const isSelected = selectedServiceIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-purple-50 border-[#9B3E88] text-[#1B0C2D] font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="truncate pr-1">{s.name}</span>
                      <span className="font-bold text-[#9B3E88] shrink-0">{formatLKR(s.priceLKR)}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{s.durationMinutes} mins</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated End</label>
              <input
                type="text"
                value={computedEndTime}
                disabled
                className="w-full px-3.5 py-2 rounded-xl border border-slate-100 bg-slate-100 text-xs text-slate-500 font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          {hasScheduleConflict && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">This stylist has another appointment during the selected time. The database will also enforce conflict protection.</p>}

          {/* Status & Booking Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Appointment['status'])}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              >
                 {editableStatuses.map(nextStatus => <option key={nextStatus} value={nextStatus}>{appointmentStatusLabels[nextStatus]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Source</label>
              <select
                value={bookingSource}
                onChange={e => setBookingSource(e.target.value as Appointment['bookingSource'])}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <option value="in_salon">In Salon (Walk-In)</option>
                <option value="phone">Telephone Call</option>
                <option value="whatsapp">WhatsApp Booking</option>
                <option value="online_portal">Online Customer Portal</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Client Notes / Preferences</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Sensitive scalp, wedding guest style, requested iced tea"
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || lookupLoading || Boolean(lookupError) || hasScheduleConflict || customers.length === 0 || qualifiedStaffMembers.length === 0 || services.length === 0}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-sm transition-all disabled:opacity-60"
            >
              {saving ? 'Saving…' : appointment ? 'Save Changes' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
