import React, { useState } from 'react';
import { Invoice } from '../../types';
import { useTenantInvoices } from '../../services/asyncDataService';
import { formatLKR } from '../../constants/brand';
import { InvoiceViewModal } from './InvoiceViewModal';
import { Search, Printer, Eye, FileText, Filter, ArrowUpDown } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { useTenant } from '../../context/TenantContext';

interface InvoiceListProps {
  tenantId: string;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ tenantId }) => {
  const { tenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const invoiceResource = useTenantInvoices(tenantId);
  const invoices = invoiceResource.data || [];

  const filtered = invoices.filter(inv => {
    if (methodFilter !== 'all' && inv.paymentMethod !== methodFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNum = inv.invoiceNumber.toLowerCase().includes(term);
      const matchCust = inv.customerName.toLowerCase().includes(term);
      if (!matchNum && !matchCust) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD6] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice number or client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#9B3E88]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Payment:</span>
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
          >
            <option value="all">All Methods</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="digital_qr">Digital QR</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      {invoiceResource.loading ? (
        <div role="status" className="rounded-2xl border border-[#E8DFD6] bg-white p-8 text-center text-sm text-slate-500">Loading invoices…</div>
      ) : invoiceResource.error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><p>{invoiceResource.error}</p><button onClick={invoiceResource.retry} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold">Retry</button></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description="Invoices will automatically generate when sales are settled in the POS register."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8DFD6] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E8DFD6] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-4 text-right">Items</th>
                <th className="py-3 px-4 text-right">Total (LKR)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#1B0C2D]">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(inv.createdAt).toLocaleDateString('en-GB')}{' '}
                    <span className="text-[10px] text-slate-400">
                      {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{inv.customerName}</td>
                  <td className="py-3 px-3">
                    <span className="capitalize text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {inv.paymentMethod.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-600">{inv.items.length}</td>
                  <td className="py-3 px-4 text-right font-bold text-[#1B0C2D]">
                    {formatLKR(inv.paidAmountLKR)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#9B3E88] hover:bg-purple-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View / Reprint Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedInvoice && (
        <InvoiceViewModal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          tenant={tenant}
        />
      )}
    </div>
  );
};
