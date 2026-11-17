import React, { useState } from 'react';
import { useTenantData } from '../../services/asyncDataService';
import { formatLKR, formatLKRCompact } from '../../constants/brand';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Users, 
  CreditCard,
  Download,
  Filter
} from 'lucide-react';

interface ReportsDashboardProps {
  tenantId: string;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ tenantId }) => {
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const { data, loading, error, retry } = useTenantData(tenantId);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading reports…</div>;
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"><p>{error}</p><button onClick={retry} className="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Retry</button></div>;
  if (!data) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No salon workspace selected.</div>;

  const { invoices, expenses, appointments, staff: staffList, commissions, products } = data;

  // Financial aggregates
  const totalRevenue = invoices.reduce((sum, i) => sum + i.paidAmountLKR, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amountLKR, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Breakdown by payment method
  const paymentBreakdown: { [key: string]: number } = {};
  invoices.forEach(i => {
    paymentBreakdown[i.paymentMethod] = (paymentBreakdown[i.paymentMethod] || 0) + i.paidAmountLKR;
  });

  // Services vs Products sales
  let serviceRevenue = 0;
  let productRevenue = 0;
  invoices.forEach(i => {
    i.items.forEach(item => {
      if (item.type === 'service') serviceRevenue += item.totalLKR;
      else productRevenue += item.totalLKR;
    });
  });

  // Export report to CSV
  const handleExportCSV = () => {
    const csvRows = [
      ['Date', 'Invoice #', 'Customer', 'Payment Method', 'Amount (LKR)'],
      ...invoices.map(i => [
        new Date(i.createdAt).toLocaleDateString(),
        i.invoiceNumber,
        i.customerName,
        i.paymentMethod,
        i.paidAmountLKR
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `moonbox_salon_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD6] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#9B3E88]" />
          <div>
            <h3 className="font-bold text-sm text-[#1B0C2D]">Salon Financial Reports & Analytics</h3>
            <p className="text-[11px] text-slate-500">Live operational ledger in Sri Lankan Rupee (LKR)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#FAF8F5] p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1 rounded-lg ${dateFilter === 'today' ? 'bg-[#1B0C2D] text-white' : 'text-slate-600'}`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1 rounded-lg ${dateFilter === 'week' ? 'bg-[#1B0C2D] text-white' : 'text-slate-600'}`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1 rounded-lg ${dateFilter === 'month' ? 'bg-[#1B0C2D] text-white' : 'text-slate-600'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1 rounded-lg ${dateFilter === 'all' ? 'bg-[#1B0C2D] text-white' : 'text-slate-600'}`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Health Summary 3-Column */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8DFD6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Salon Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#1B0C2D] mt-2">{formatLKR(totalRevenue)}</h3>
          <p className="text-xs text-emerald-600 font-medium mt-1">From {invoices.length} settled invoices</p>
        </div>

        {/* Total Expenses */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8DFD6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operating Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-rose-700 mt-2">-{formatLKR(totalExpenses)}</h3>
          <p className="text-xs text-slate-500 mt-1">Rent, supplies, utilities, marketing</p>
        </div>

        {/* Estimated Net Operating Profit */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8DFD6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Net Profit</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#9B3E88] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-extrabold mt-2 ${netProfit >= 0 ? 'text-[#1B0C2D]' : 'text-rose-600'}`}>
            {formatLKR(netProfit)}
          </h3>
          <p className="text-xs text-purple-700 font-medium mt-1">
            {totalRevenue > 0 ? `${Math.round((netProfit / totalRevenue) * 100)}% profit margin` : '0% margin'}
          </p>
        </div>
      </div>

      {/* Service vs Retail Split & Payment Methods Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Services vs Products Ratio */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD6] space-y-4">
          <h4 className="font-bold text-sm text-[#1B0C2D]">Revenue Mix: Services vs. Retail Products</h4>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-purple-900">Styling & Aesthetic Services</span>
                <span className="text-[#1B0C2D] font-bold">{formatLKR(serviceRevenue)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#9B3E88] to-[#DE9E74] h-full"
                  style={{ width: `${totalRevenue > 0 ? (serviceRevenue / totalRevenue) * 100 : 80}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-800">Retail Inventory Take-Home Products</span>
                <span className="text-[#1B0C2D] font-bold">{formatLKR(productRevenue)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-600 h-full"
                  style={{ width: `${totalRevenue > 0 ? (productRevenue / totalRevenue) * 100 : 20}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD6] space-y-4">
          <h4 className="font-bold text-sm text-[#1B0C2D]">Settlement Methods Distribution</h4>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries(paymentBreakdown).map(([method, amt]) => (
              <div key={method} className="p-3 rounded-xl bg-[#FAF8F5] border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 capitalize block">
                  {method.replace('_', ' ')}
                </span>
                <span className="text-sm font-extrabold text-[#1B0C2D] mt-1 block">
                  {formatLKR(amt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Performance Leaderboard */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8DFD6]">
        <h4 className="font-bold text-sm text-[#1B0C2D] mb-3">Staff Performance & Production Leaderboard</h4>
        <div className="divide-y divide-slate-100 text-xs">
          {staffList.map(st => {
            const stCommissions = commissions.filter(c => c.staffId === st.id);
            const totalProduced = stCommissions.reduce((sum, c) => sum + c.itemAmountLKR, 0);
            const totalEarned = stCommissions.reduce((sum, c) => sum + c.commissionAmountLKR, 0);

            return (
              <div key={st.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-xl text-white font-bold flex items-center justify-center text-xs"
                    style={{ backgroundColor: st.color || '#9E4784' }}
                  >
                    {st.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-[#1B0C2D] block">{st.name}</span>
                    <span className="text-[11px] text-slate-500">{st.position}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-[#1B0C2D] block">{formatLKR(totalProduced)} generated</span>
                  <span className="text-[11px] text-[#9B3E88] font-semibold">{formatLKR(totalEarned)} commission</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
