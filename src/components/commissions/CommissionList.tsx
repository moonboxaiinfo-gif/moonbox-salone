import React, { useState } from 'react';
import { StaffCommissionRecord } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatLKR } from '../../constants/brand';
import { Percent, CheckCircle2, User, Search, Filter } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { invalidateTenantData, useTenantCommissions, useTenantStaff } from '../../services/asyncDataService';

interface CommissionListProps {
  tenantId: string;
}

export const CommissionList: React.FC<CommissionListProps> = ({ tenantId }) => {
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const staffResource = useTenantStaff(tenantId);
  const staffList = staffResource.data || [];
  const commissionResource = useTenantCommissions(tenantId);
  const commissions = commissionResource.data || [];

  const totalUnpaidLKR = commissions
    .filter(c => c.status === 'unpaid')
    .reduce((sum, c) => sum + c.commissionAmountLKR, 0);

  const totalPaidLKR = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.commissionAmountLKR, 0);

  const filtered = commissions.filter(c => {
    if (selectedStaffFilter !== 'all' && c.staffId !== selectedStaffFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const handleMarkPaid = async (cId: string) => {
    if (settlingId) return;
    setSettlingId(cId);
    try {
      await StorageService.markCommissionPaidConfirmed(tenantId, cId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not settle commission. Please try again.');
      return;
    } finally {
      setSettlingId(null);
    }
    invalidateTenantData(tenantId);
  };

  return (
    <div className="space-y-4">
      {/* Commission Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E8DFD6]">
          <span className="text-[10px] uppercase font-bold text-amber-600 block">Pending Payout Commissions</span>
          <h3 className="text-xl font-extrabold text-amber-700 mt-0.5">{formatLKR(totalUnpaidLKR)}</h3>
          <p className="text-xs text-slate-500 mt-1">Awaiting settlement to staff members</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8DFD6]">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Settled / Paid Commissions</span>
          <h3 className="text-xl font-extrabold text-emerald-700 mt-0.5">{formatLKR(totalPaidLKR)}</h3>
          <p className="text-xs text-slate-500 mt-1">Successfully disbursed to stylists</p>
        </div>
      </div>

      {/* Filter Bar */}
      {staffResource.loading && <div role="status" className="text-xs text-slate-500">Loading staff…</div>}
      {staffResource.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><p>{staffResource.error}</p><button onClick={staffResource.retry} className="mt-2 underline">Retry</button></div>}
      {commissionResource.loading && <div role="status" className="text-xs text-slate-500">Loading commission history…</div>}
      {commissionResource.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><p>{commissionResource.error}</p><button onClick={commissionResource.retry} className="mt-2 underline">Retry commissions</button></div>}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD6] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter Stylist</label>
            <select
              value={selectedStaffFilter}
              onChange={e => setSelectedStaffFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
            >
              <option value="all">All Stylists</option>
              {staffList.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Payout Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
            >
              <option value="all">All Records</option>
              <option value="unpaid">Unpaid Only</option>
              <option value="paid">Paid Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Commission Table */}
      {commissionResource.loading ? <div role="status" className="rounded-2xl border border-[#E8DFD6] bg-white p-8 text-center text-sm text-slate-500">Loading commission records…</div> : commissionResource.error ? <div className="rounded-2xl border border-[#E8DFD6] bg-white p-8 text-center text-sm text-slate-500">Commission results are unavailable until the server query succeeds.</div> : filtered.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="No commission records found"
          description="Commissions are automatically recorded when services and retail items are sold in the POS register."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8DFD6] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E8DFD6] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Stylist</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Service / Product Item</th>
                <th className="py-3 px-3 text-right">Item Amount</th>
                <th className="py-3 px-3 text-center">Rate</th>
                <th className="py-3 px-4 text-right">Commission (LKR)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#1B0C2D]">{c.staffName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{c.invoiceNumber}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800 block">{c.itemName}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{c.itemType}</span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">{formatLKR(c.itemAmountLKR)}</td>
                  <td className="py-3 px-3 text-center font-bold text-[#9B3E88]">{c.commissionPercentage}%</td>
                  <td className="py-3 px-4 text-right font-extrabold text-[#1B0C2D]">
                    {formatLKR(c.commissionAmountLKR)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {c.status === 'unpaid' ? (
                      <button
                        onClick={() => handleMarkPaid(c.id)}
                        disabled={Boolean(settlingId)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200"
                        title="Mark as paid out to stylist"
                      >
                        {settlingId === c.id ? 'Saving…' : 'Mark Paid'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Paid</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
