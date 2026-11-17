import React from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  AlertTriangle, 
  Plus, 
  CreditCard, 
  Receipt, 
  Boxes, 
  Sparkles,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Sparkle
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useTenantData } from '../../services/asyncDataService';
import { formatLKR, formatLKRCompact } from '../../constants/brand';
import { SalonTab } from '../common/Sidebar';

interface DashboardOverviewProps {
  onNavigate: (tab: SalonTab) => void;
  onNewAppointment: () => void;
  onNewSale: () => void;
  onAddCustomer: () => void;
  onAddExpense: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  onNewAppointment,
  onNewSale,
  onAddCustomer,
  onAddExpense
}) => {
  const { tenant, plan, trialDaysLeft, isTrial } = useTenant();
  const tenantId = tenant?.id || '';
  const { data, loading, error, retry } = useTenantData(tenantId);

  const todayStr = new Date().toISOString().split('T')[0];

  if (loading) return <div className="rounded-2xl border border-[#E2DFF0] bg-white p-6 text-sm text-slate-500">Loading salon dashboard…</div>;
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"><p>{error}</p><button onClick={retry} className="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Retry</button></div>;
  if (!data) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Select a salon workspace to continue.</div>;

  const { appointments, invoices, expenses, customers, products } = data;
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const completedToday = todayAppointments.filter(a => a.status === 'completed').length;
  const pendingToday = todayAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length;

  const todayInvoices = invoices.filter(inv => inv.createdAt.startsWith(todayStr));
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + inv.paidAmountLKR, 0);

  const todayExpenses = expenses.filter(e => e.date === todayStr);
  const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + e.amountLKR, 0);

  const lowStockProducts = products.filter(p => p.stockQuantity <= p.lowStockThreshold);

  return (
    <div className="space-y-6">
      {/* 14-Day Free Trial Alert Banner */}
      {isTrial && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1C1B31] via-[#25223D] to-[#151529] text-white border border-[#8B5CF6]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-[#8B5CF6]/5">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#8B5CF6]/15 text-[#B8A5FF] border border-[#8B5CF6]/30 shrink-0">
              <Sparkle className="w-5 h-5 text-[#B8A5FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#F6F3FB]">14-Day Free Trial Active</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#8B5CF6] text-white">
                  {trialDaysLeft} days remaining
                </span>
              </div>
              <p className="text-xs text-[#AAA6BD] mt-1">
                Enjoy full access to {plan?.name || 'Growth'} tier features. Submit a bank deposit slip anytime to activate your annual or monthly billing.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('subscription')}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white hover:opacity-95 transition-all shadow-md shadow-[#8B5CF6]/20 shrink-0"
          >
            Upgrade Subscription
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1B31] border border-[#E2DFF0] dark:border-[#343047] shadow-xs hover:border-[#8B5CF6]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858198] dark:text-[#AAA6BD] uppercase tracking-wider">Today's Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-[#4BBF98]/15 text-[#4BBF98] flex items-center justify-center border border-[#4BBF98]/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#101225] dark:text-[#F6F3FB] tracking-tight tabular-nums">
              {formatLKR(todayRevenue)}
            </h3>
            <p className="text-[11px] text-[#4BBF98] font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{todayInvoices.length} transactions processed</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Today's Appointments */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1B31] border border-[#E2DFF0] dark:border-[#343047] shadow-xs hover:border-[#8B5CF6]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858198] dark:text-[#AAA6BD] uppercase tracking-wider">Today's Appointments</span>
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 text-[#B8A5FF] flex items-center justify-center border border-[#8B5CF6]/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#101225] dark:text-[#F6F3FB] tracking-tight tabular-nums">
              {todayAppointments.length}
            </h3>
            <div className="text-[11px] text-[#858198] dark:text-[#AAA6BD] font-medium mt-1 flex items-center gap-2">
              <span className="text-[#4BBF98] font-semibold">{completedToday} completed</span>
              <span>·</span>
              <span className="text-[#E7B363] font-semibold">{pendingToday} upcoming</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Active Customers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1B31] border border-[#E2DFF0] dark:border-[#343047] shadow-xs hover:border-[#8B5CF6]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858198] dark:text-[#AAA6BD] uppercase tracking-wider">Total Clients</span>
            <div className="w-8 h-8 rounded-xl bg-[#82B8F0]/15 text-[#82B8F0] flex items-center justify-center border border-[#82B8F0]/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#101225] dark:text-[#F6F3FB] tracking-tight tabular-nums">
              {customers.length}
            </h3>
            <p className="text-[11px] text-[#858198] dark:text-[#AAA6BD] font-medium mt-1">
              Recorded in salon CRM
            </p>
          </div>
        </div>

        {/* Metric 4: Inventory Low Stock Alerts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1B31] border border-[#E2DFF0] dark:border-[#343047] shadow-xs hover:border-[#8B5CF6]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858198] dark:text-[#AAA6BD] uppercase tracking-wider">Low Stock Alert</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              lowStockProducts.length > 0 ? 'bg-[#E7B363]/15 text-[#E7B363] border-[#E7B363]/30' : 'bg-slate-100 dark:bg-[#25223D] text-slate-400 border-transparent'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-bold tracking-tight tabular-nums ${
              lowStockProducts.length > 0 ? 'text-[#E7B363]' : 'text-[#101225] dark:text-[#F6F3FB]'
            }`}>
              {lowStockProducts.length}
            </h3>
            <p className="text-[11px] text-[#858198] dark:text-[#AAA6BD] font-medium mt-1">
              {lowStockProducts.length > 0 ? 'Items below reorder threshold' : 'All stock levels optimal'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="p-5 rounded-2xl bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047]">
        <h4 className="text-xs font-bold text-[#101225] dark:text-[#F6F3FB] uppercase tracking-wider mb-3">
          Quick Salon Actions
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={onNewAppointment}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-[#1C1B31] border border-[#E2DFF0] dark:border-[#343047] hover:border-[#8B5CF6] text-xs font-semibold text-[#101225] dark:text-[#F6F3FB] hover:text-[#8B5CF6] dark:hover:text-[#B8A5FF] shadow-2xs transition-all active:scale-95"
          >
            <Calendar className="w-4 h-4 text-[#8B5CF6]" />
            <span>New Appointment</span>
          </button>

          <button
            onClick={onNewSale}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-semibold shadow-xs hover:opacity-95 transition-all active:scale-95"
          >
            <CreditCard className="w-4 h-4 text-[#D4C8FF]" />
            <span>Open POS Sale</span>
          </button>

          <button
            onClick={onAddCustomer}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-[#1C1B31] border border-[#E2DFF0] dark:border-[#343047] hover:border-[#8B5CF6] text-xs font-semibold text-[#101225] dark:text-[#F6F3FB] hover:text-[#8B5CF6] dark:hover:text-[#B8A5FF] shadow-2xs transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-[#4BBF98]" />
            <span>Add Customer</span>
          </button>

          <button
            onClick={onAddExpense}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-[#1C1B31] border border-[#E2DFF0] dark:border-[#343047] hover:border-[#8B5CF6] text-xs font-semibold text-[#101225] dark:text-[#F6F3FB] hover:text-[#8B5CF6] dark:hover:text-[#B8A5FF] shadow-2xs transition-all active:scale-95"
          >
            <Receipt className="w-4 h-4 text-[#EA7180]" />
            <span>Add Expense</span>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-[#1C1B31] border border-[#E2DFF0] dark:border-[#343047] hover:border-[#8B5CF6] text-xs font-semibold text-[#101225] dark:text-[#F6F3FB] hover:text-[#8B5CF6] dark:hover:text-[#B8A5FF] shadow-2xs transition-all active:scale-95"
          >
            <Boxes className="w-4 h-4 text-[#E7B363]" />
            <span>Stock Product</span>
          </button>

          <button
            onClick={() => onNavigate('services')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-[#1C1B31] border border-[#E2DFF0] dark:border-[#343047] hover:border-[#8B5CF6] text-xs font-semibold text-[#101225] dark:text-[#F6F3FB] hover:text-[#8B5CF6] dark:hover:text-[#B8A5FF] shadow-2xs transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-[#D5BD88]" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Today's Appointments & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule Card */}
        <div className="bg-white dark:bg-[#1C1B31] rounded-2xl border border-[#E2DFF0] dark:border-[#343047] p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#343047]">
            <div>
              <h4 className="text-sm font-bold text-[#101225] dark:text-[#F6F3FB]">Today's Appointment Schedule</h4>
              <p className="text-[11px] text-[#858198] dark:text-[#AAA6BD]">Live chair occupancy & client arrivals</p>
            </div>
            <button
              onClick={() => onNavigate('appointments')}
              className="text-xs font-semibold text-[#8B5CF6] dark:text-[#B8A5FF] hover:underline"
            >
              View Calendar
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#343047] mt-2">
            {todayAppointments.length === 0 ? (
              <p className="text-xs text-[#858198] dark:text-[#858198] py-8 text-center">
                No appointments booked for today.
              </p>
            ) : (
              todayAppointments.slice(0, 5).map((apt) => (
                <div key={apt.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center w-12 py-1 px-1.5 rounded-lg bg-[#F8F7FC] dark:bg-[#25223D] border border-[#E2DFF0] dark:border-[#343047]">
                      <span className="block text-[11px] font-bold text-[#101225] dark:text-[#F6F3FB] tabular-nums">{apt.startTime}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#101225] dark:text-[#F6F3FB]">{apt.customerName}</p>
                      <p className="text-[11px] text-[#858198] dark:text-[#AAA6BD]">
                        {apt.serviceNames.join(', ')} · <span className="text-[#8B5CF6] dark:text-[#B8A5FF] font-medium">{apt.staffName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                      apt.status === 'completed' 
                        ? 'bg-[#4BBF98]/15 text-[#4BBF98] border border-[#4BBF98]/30' 
                        : apt.status === 'checked_in'
                          ? 'bg-[#82B8F0]/15 text-[#82B8F0] border border-[#82B8F0]/30'
                          : 'bg-[#E7B363]/15 text-[#E7B363] border border-[#E7B363]/30'
                    }`}>
                      {apt.status.replace('_', ' ')}
                    </span>
                    <p className="text-[11px] font-semibold text-[#101225] dark:text-[#F6F3FB] mt-0.5 tabular-nums">
                      {formatLKR(apt.totalPriceLKR)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices / Sales Card */}
        <div className="bg-white dark:bg-[#1C1B31] rounded-2xl border border-[#E2DFF0] dark:border-[#343047] p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#343047]">
            <div>
              <h4 className="text-sm font-bold text-[#101225] dark:text-[#F6F3FB]">Recent Transactions & Invoices</h4>
              <p className="text-[11px] text-[#858198] dark:text-[#AAA6BD]">Completed payments and receipts</p>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-[#8B5CF6] dark:text-[#B8A5FF] hover:underline"
            >
              View Invoices
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#343047] mt-2">
            {invoices.length === 0 ? (
              <p className="text-xs text-[#858198] py-8 text-center">
                No invoices recorded yet.
              </p>
            ) : (
              invoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#101225] dark:text-[#F6F3FB]">{inv.invoiceNumber}</span>
                      <span className="text-[10px] uppercase font-bold text-[#858198]">
                        ({inv.paymentMethod.replace('_', ' ')})
                      </span>
                    </div>
                    <p className="text-[11px] text-[#858198] dark:text-[#AAA6BD] mt-0.5">
                      {inv.customerName} · {inv.items.length} item(s)
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[#4BBF98] tabular-nums">
                      {formatLKR(inv.paidAmountLKR)}
                    </span>
                    <p className="text-[10px] text-[#858198] mt-0.5 tabular-nums">
                      {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
