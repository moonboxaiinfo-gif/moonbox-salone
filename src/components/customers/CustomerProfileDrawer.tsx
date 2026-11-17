import React from 'react';
import { Customer } from '../../types';
import { formatLKR } from '../../constants/brand';
import { useTenantCustomerHistory } from '../../services/asyncDataService';
import { 
  X, 
  Phone, 
  MessageSquare, 
  Calendar, 
  CreditCard, 
  Clock, 
  Mail, 
  MapPin, 
  Edit3,
  ExternalLink
} from 'lucide-react';

interface CustomerProfileDrawerProps {
  customer: Customer | null;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  tenantId: string;
}

export const CustomerProfileDrawer: React.FC<CustomerProfileDrawerProps> = ({
  customer,
  onClose,
  onEdit,
  tenantId
}) => {
  const historyResource = useTenantCustomerHistory(tenantId, Boolean(customer));
  if (!customer) return null;

  const appointments = (historyResource.data?.appointments || []).filter(a => a.customerId === customer.id);
  const invoices = (historyResource.data?.invoices || []).filter(i => i.customerId === customer.id);

  // Format Sri Lankan number for direct WhatsApp link
  const rawWa = customer.whatsapp || customer.phone || '';
  const cleanWa = rawWa.replace(/[^0-9]/g, '');
  const waUrl = cleanWa.startsWith('0') 
    ? `https://wa.me/94${cleanWa.substring(1)}` 
    : cleanWa.startsWith('94')
      ? `https://wa.me/${cleanWa}`
      : `https://wa.me/94${cleanWa}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#140921]/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-[#E8DFD6] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 bg-[#FAF8F5] border-b border-[#E8DFD6] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] flex items-center justify-center font-bold text-lg shadow-sm">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1B0C2D]">{customer.name}</h3>
              <p className="text-xs text-slate-500 capitalize">{customer.gender || 'Client'} · Since {new Date(customer.createdAt).getFullYear()}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(customer)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              title="Edit Profile"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action quick links (Phone & WhatsApp) */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-2">
          <a
            href={`tel:${customer.phone}`}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call {customer.phone}</span>
          </a>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </a>
        </div>

        {/* Stats Grid */}
        <div className="p-6 grid grid-cols-2 gap-3 border-b border-slate-100 bg-[#FCFAF8]">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Lifetime Spend</span>
            <span className="text-base font-extrabold text-[#1B0C2D] block mt-0.5">
              {formatLKR(customer.totalSpentLKR)}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Salon Visits</span>
            <span className="text-base font-extrabold text-[#1B0C2D] block mt-0.5">
              {customer.visitsCount} visits
            </span>
          </div>
        </div>

        {/* Tabbed / Segmented History Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Client Details Section */}
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2">
              Client Details & Preferences
            </h4>
            <div className="space-y-2 text-slate-600">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.address}</span>
                </div>
              )}
              {customer.birthday && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Birthday: {new Date(customer.birthday).toLocaleDateString('en-GB')}</span>
                </div>
              )}
              {customer.notes && (
                <div className="p-3 rounded-xl bg-purple-50 text-purple-900 border border-purple-100 text-xs mt-2">
                  <p className="font-semibold text-[11px] text-[#9B3E88] mb-0.5">Stylist Notes:</p>
                  <p>{customer.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Past Appointments */}
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2 flex items-center justify-between">
              <span>Appointment History ({historyResource.loading ? '…' : appointments.length})</span>
            </h4>
            <div className="space-y-2">
              {historyResource.loading ? (
                <p role="status" className="text-slate-400">Loading appointment history…</p>
              ) : historyResource.error ? (
                <div role="alert" className="text-rose-700"><p>{historyResource.error}</p><button onClick={historyResource.retry} className="mt-2 rounded-lg border border-rose-200 px-2 py-1 text-xs">Retry</button></div>
              ) : appointments.length === 0 ? (
                <p className="text-slate-400 italic">No past appointments recorded.</p>
              ) : (
                appointments.map(a => (
                  <div key={a.id} className="p-2.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800">{a.serviceNames.join(', ')}</span>
                      <span className="font-bold text-[#1B0C2D]">{formatLKR(a.totalPriceLKR)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                      <span>{a.date} at {a.startTime} · with {a.staffName}</span>
                      <span className="capitalize font-semibold text-[#9B3E88]">{a.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Past Invoices */}
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2 flex items-center justify-between">
              <span>Purchase Invoices ({historyResource.loading ? '…' : invoices.length})</span>
            </h4>
            <div className="space-y-2">
              {historyResource.loading ? (
                <p role="status" className="text-slate-400">Loading invoice history…</p>
              ) : historyResource.error ? (
                <div role="alert" className="text-rose-700"><p>{historyResource.error}</p><button onClick={historyResource.retry} className="mt-2 rounded-lg border border-rose-200 px-2 py-1 text-xs">Retry</button></div>
              ) : invoices.length === 0 ? (
                <p className="text-slate-400 italic">No past invoices found.</p>
              ) : (
                invoices.map(inv => (
                  <div key={inv.id} className="p-2.5 rounded-xl border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#1B0C2D]">{inv.invoiceNumber}</span>
                      <span className="block text-[11px] text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString('en-GB')} · {inv.items.length} item(s)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700">{formatLKR(inv.paidAmountLKR)}</span>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">{inv.paymentMethod}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
