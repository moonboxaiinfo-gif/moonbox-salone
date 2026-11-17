import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, Search,
  CheckCircle2, CircleAlert, Scissors, UserCheck, LogOut, LayoutList, Grid2X2,
  XCircle, MoreHorizontal
} from 'lucide-react';
import { Appointment, AppointmentStatus } from '../../types';
import { StorageService } from '../../services/storageService';
import { invalidateTenantData, useTenantAppointments } from '../../services/asyncDataService';
import { formatLKR } from '../../constants/brand';
import { AppointmentModal } from './AppointmentModal';
import { EmptyState } from '../common/EmptyState';

interface AppointmentCalendarProps {
  tenantId: string;
  onCheckoutToPOS: (appointment: Appointment) => void;
}

type ViewMode = 'day' | 'week' | 'month' | 'agenda';
type QueueFilter = 'active' | 'all' | AppointmentStatus;

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Checked In',
  in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show'
};

const statusClasses: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100', confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  checked_in: 'bg-sky-50 text-sky-700 border-sky-100', in_progress: 'bg-violet-50 text-violet-700 border-violet-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100', cancelled: 'bg-rose-50 text-rose-700 border-rose-100',
  no_show: 'bg-slate-100 text-slate-600 border-slate-200'
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const timeValue = (value: string) => value.split(':').map(Number).reduce((h, n, i) => i === 0 ? n * 60 : h + n, 0);

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({ tenantId, onCheckoutToPOS }) => {
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const appointmentsResource = useTenantAppointments(tenantId);
  const appointments = appointmentsResource.data || [];
  const today = dateKey(new Date());

  const rangeDates = useMemo(() => {
    const anchor = new Date(`${selectedDate}T12:00:00`);
    if (viewMode !== 'week') return [selectedDate];
    const day = anchor.getDay();
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return dateKey(d); });
  }, [selectedDate, viewMode]);

  const summary = useMemo(() => ({
    total: appointments.filter(a => a.date === today).length,
    upcoming: appointments.filter(a => a.date >= today && !['completed', 'cancelled', 'no_show'].includes(a.status)).length,
    checkedIn: appointments.filter(a => a.status === 'checked_in' || a.status === 'in_progress').length,
    completed: appointments.filter(a => a.date === today && a.status === 'completed').length,
    cancelled: appointments.filter(a => a.date === today && a.status === 'cancelled').length,
    noShow: appointments.filter(a => a.date === today && a.status === 'no_show').length
  }), [appointments, today]);

  const filtered = useMemo(() => appointments.filter(apt => {
    if (viewMode === 'day' && apt.date !== selectedDate) return false;
    if (viewMode === 'week' && !rangeDates.includes(apt.date)) return false;
    if (queueFilter === 'active' && ['completed', 'cancelled', 'no_show'].includes(apt.status)) return false;
    if (queueFilter !== 'active' && queueFilter !== 'all' && apt.status !== queueFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (![apt.customerName, apt.customerPhone, apt.staffName, ...apt.serviceNames].some(v => v.toLowerCase().includes(term))) return false;
    }
    return true;
  }).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [appointments, selectedDate, viewMode, rangeDates, queueFilter, searchTerm]);

  const shiftDate = (direction: 'prev' | 'next') => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + (viewMode === 'week' ? 7 : viewMode === 'month' ? 30 : direction === 'next' ? 1 : -1));
    setSelectedDate(dateKey(date));
  };

  const updateStatus = async (apt: Appointment, next: AppointmentStatus) => {
    if (updatingStatusId) return;
    if (next === 'cancelled' || next === 'no_show') {
      const confirmed = window.confirm(`Mark ${apt.customerName}'s appointment as ${statusLabels[next].toLowerCase()}?`);
      if (!confirmed) return;
    }
    setUpdatingStatusId(apt.id);
    try {
      const result = await StorageService.updateAppointmentStatusConfirmed(tenantId, apt.id, next);
      setFeedback(result.success ? { type: 'success', text: `${apt.customerName}'s appointment is now ${statusLabels[next]}.` } : { type: 'error', text: result.error || 'Status update failed.' });
      if (result.success) invalidateTenantData(tenantId);
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Status update failed. Please retry.' });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openEdit = (apt?: Appointment) => { setEditingApt(apt || null); setIsModalOpen(true); };
  const statusOptions = (apt: Appointment) => {
    const map: Record<AppointmentStatus, AppointmentStatus[]> = {
      pending: ['confirmed', 'cancelled', 'no_show'], confirmed: ['checked_in', 'cancelled', 'no_show'],
      checked_in: ['in_progress', 'cancelled'], in_progress: ['completed', 'cancelled'], completed: [], cancelled: [], no_show: []
    };
    return map[apt.status];
  };

  return <div className="space-y-5">
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
      <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9B3E88]">Operations</p><h2 className="text-2xl font-extrabold text-[#1B0C2D] mt-1">Appointments</h2><p className="text-xs text-slate-500 mt-1">{displayDate(selectedDate)}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search appointments" className="w-52 pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs" /></div>
        <button onClick={() => setSelectedDate(today)} className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold">Today</button>
        <button onClick={() => shiftDate('prev')} className="p-2.5 rounded-xl bg-white border border-slate-200"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={() => shiftDate('next')} className="p-2.5 rounded-xl bg-white border border-slate-200"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => openEdit()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] text-xs font-bold"><Plus className="w-4 h-4" /> Add Appointment</button>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {([
        ['Total today', summary.total, 'all', CalendarIcon], ['Upcoming', summary.upcoming, 'active', Clock], ['Checked in', summary.checkedIn, 'checked_in', UserCheck],
        ['Completed', summary.completed, 'completed', CheckCircle2], ['Cancelled', summary.cancelled, 'cancelled', XCircle], ['No show', summary.noShow, 'no_show', CircleAlert]
      ] as const).map(([label, value, filter, Icon]) => <button key={label} onClick={() => setQueueFilter(filter as QueueFilter)} className={`text-left bg-white rounded-2xl border p-4 transition-all ${queueFilter === filter ? 'border-[#9B3E88] ring-2 ring-[#9B3E88]/10' : 'border-[#E8DFD6] hover:border-[#C9B6D8]'}`}><Icon className="w-4 h-4 text-[#9B3E88]" /><span className="block text-2xl font-extrabold text-[#1B0C2D] mt-2">{value}</span><span className="text-[11px] text-slate-500">{label}</span></button>)}
    </div>

    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div className="flex items-center gap-2 overflow-x-auto">{(['active', 'all', 'pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'] as QueueFilter[]).map(filter => <button key={filter} onClick={() => setQueueFilter(filter)} className={`whitespace-nowrap px-3 py-2 rounded-xl text-[11px] font-bold ${queueFilter === filter ? 'bg-[#1B0C2D] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{filter === 'active' ? 'All Active' : filter === 'all' ? 'All History' : statusLabels[filter as AppointmentStatus]}</button>)}</div><div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">{([['day', LayoutList], ['week', Grid2X2], ['month', CalendarIcon], ['agenda', MoreHorizontal]] as const).map(([mode, Icon]) => <button key={mode} onClick={() => setViewMode(mode)} className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-bold capitalize ${viewMode === mode ? 'bg-white shadow text-[#1B0C2D]' : 'text-slate-500'}`}><Icon className="w-3.5 h-3.5" />{mode}</button>)}</div></div>

    {feedback && <div className={`rounded-xl px-4 py-3 text-xs font-semibold ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>{feedback.text}</div>}

    {appointmentsResource.loading && <div role="status" className="rounded-xl border border-[#E8DFD6] bg-white p-5 text-sm text-slate-500">Loading appointments…</div>}
    {appointmentsResource.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p>{appointmentsResource.error}</p><button onClick={appointmentsResource.retry} className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold">Retry</button></div>}

    {!appointmentsResource.loading && !appointmentsResource.error && (viewMode === 'month' ? <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">{Array.from({ length: 35 }, (_, i) => { const d = new Date(`${selectedDate}T12:00:00`); d.setDate(1); d.setDate(i - d.getDay() + 1); const key = dateKey(d); const dayAppointments = appointments.filter(a => a.date === key); return <button key={key} onClick={() => { setSelectedDate(key); setViewMode('day'); }} className={`min-h-24 p-3 text-left rounded-2xl border ${key === selectedDate ? 'border-[#9B3E88] bg-purple-50/40' : 'bg-white border-slate-200'}`}><span className="text-xs font-bold text-slate-700">{d.getDate()}</span><span className="block mt-3 text-[11px] text-[#9B3E88] font-bold">{dayAppointments.length ? `${dayAppointments.length} appointment${dayAppointments.length > 1 ? 's' : ''}` : '—'}</span></button> })}</div> : <div className="space-y-3">{filtered.length === 0 ? <EmptyState icon={CalendarIcon} title="No appointments found" description="Try another date, filter, or search term." actionText="Add Appointment" onAction={() => openEdit()} /> : filtered.map(apt => <div key={apt.id} className="bg-white rounded-2xl border border-[#E8DFD6] p-4 shadow-xs"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div className="flex items-start gap-4 min-w-0"><div className="w-20 shrink-0 text-center rounded-xl bg-[#FAF8F5] border border-[#E8DFD6] p-2"><span className="block text-sm font-extrabold text-[#1B0C2D]">{apt.startTime}</span><span className="text-[10px] text-slate-400">{apt.endTime}</span><span className="block text-[10px] text-[#9B3E88] font-bold mt-1">{apt.durationMinutes} min</span></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-bold text-[#1B0C2D]">{apt.customerName}</h4><span className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${statusClasses[apt.status]}`}>{statusLabels[apt.status]}</span>{apt.date !== selectedDate && <span className="text-[10px] text-slate-400">{apt.date}</span>}</div><p className="text-xs text-slate-600 mt-1"><Scissors className="inline w-3.5 h-3.5 mr-1 text-[#9B3E88]" />{apt.serviceNames.join(' + ')}</p><p className="text-[11px] text-slate-400 mt-1">{apt.staffName} · {apt.customerPhone} · {apt.bookingSource.replace('_', ' ')}</p>{apt.checkInAt && <p className="text-[10px] text-sky-600 mt-1">Checked in {new Date(apt.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{apt.checkOutAt ? ` · Checked out ${new Date(apt.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>}</div></div><div className="flex flex-wrap items-center justify-end gap-2"><div className="text-right mr-1"><strong className="block text-sm text-[#1B0C2D]">{formatLKR(apt.totalPriceLKR)}</strong><span className="text-[10px] text-slate-400">{apt.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}</span></div>{apt.status === 'confirmed' && <button disabled={updatingStatusId === apt.id} onClick={() => updateStatus(apt, 'checked_in')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 text-sky-700 text-[11px] font-bold disabled:opacity-50"><UserCheck className="w-3.5 h-3.5" /> Check in</button>}{(apt.status === 'checked_in' || apt.status === 'in_progress') && <button disabled={updatingStatusId === apt.id} onClick={() => updateStatus(apt, apt.status === 'checked_in' ? 'in_progress' : 'completed')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold disabled:opacity-50"><LogOut className="w-3.5 h-3.5" /> {apt.status === 'checked_in' ? 'Start service' : 'Check out'}</button>}{apt.status !== 'completed' && apt.status !== 'cancelled' && apt.status !== 'no_show' && <button onClick={() => onCheckoutToPOS(apt)} className="px-3 py-2 rounded-xl bg-[#1B0C2D] text-[#F3C9AB] text-[11px] font-bold">Open POS</button>}<select disabled={updatingStatusId === apt.id} aria-label={`Change status for ${apt.customerName}`} value="" onChange={e => e.target.value && updateStatus(apt, e.target.value as AppointmentStatus)} className="px-2.5 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600"><option value="">Change status</option>{statusOptions(apt).map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><button onClick={() => openEdit(apt)} className="px-3 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600">Details / Edit</button></div></div></div>)}</div>)}

    <AppointmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={() => { invalidateTenantData(tenantId); setFeedback({ type: 'success', text: 'Appointment saved successfully.' }); }} appointment={editingApt} tenantId={tenantId} />
  </div>;
};
