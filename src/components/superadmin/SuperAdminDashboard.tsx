import React from 'react';
import { StorageService } from '../../services/storageService';
import { formatLKR } from '../../constants/brand';
import { 
  Building2, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { SuperAdminTab } from '../common/Sidebar';

interface SuperAdminDashboardProps {
  onNavigate: (tab: SuperAdminTab) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigate }) => {
  const tenants = StorageService.getTenants();
  const payments = StorageService.getManualPayments();
  const tickets = StorageService.getSupportTickets();
  const auditLogs = StorageService.getAuditLogs();

  const pendingTenants = tenants.filter(t => t.status === 'pending_approval' || t.subscription.status === 'pending');
  const activeTenants = tenants.filter(t => t.status === 'active' && t.subscription.status === 'active').length;
  const trialTenants = tenants.filter(t => t.subscription.status === 'trial').length;
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  const totalPlatformApprovedRevenue = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + p.amountLKR, 0);

  return (
    <div className="space-y-6">
      {/* Platform Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#1C1B31] via-[#25223D] to-[#151529] text-white border border-[#8B5CF6]/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D5BD88]">
            Moonbox Digital Command Center
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#F6F3FB] mt-0.5">
            Sri Lanka Multi-Tenant Platform Operations
          </h2>
          <p className="text-xs text-[#AAA6BD] mt-1 max-w-xl">
            Centralized orchestration of salon tenants, administrator-controlled trials, manual bank payment slip verifications, and SaaS subscription licensing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendingTenants.length > 0 && (
            <button
              onClick={() => onNavigate('admin_salons')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95 transition-all shrink-0 flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Review {pendingTenants.length} Pending Salon(s)</span>
            </button>
          )}

          {pendingPayments.length > 0 && (
            <button
              onClick={() => onNavigate('admin_payments')}
              className="px-4 py-2.5 rounded-xl bg-[#E7B363]/20 border border-[#E7B363]/40 text-[#E7B363] text-xs font-bold hover:bg-[#E7B363]/30 transition-all shrink-0 flex items-center gap-2"
            >
              <span>{pendingPayments.length} Bank Slip(s)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Registered Salons */}
        <div className="p-5 rounded-2xl bg-[#1C1B31] border border-[#343047] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858198] uppercase tracking-wider">Total Registered</span>
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 text-[#B8A5FF] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#F6F3FB] mt-2 tabular-nums">{tenants.length} Salons</h3>
          <p className="text-[11px] text-[#AAA6BD] mt-1">
            <span className="text-[#4BBF98] font-semibold">{activeTenants} paid</span> · <span className="text-[#B8A5FF] font-semibold">{trialTenants} in trial</span>
            {pendingTenants.length > 0 && (
              <span className="text-[#E7B363] font-semibold"> · {pendingTenants.length} pending</span>
            )}
          </p>
        </div>

        {/* Metric 2: Pending Bank Slips */}
        <div className="p-5 rounded-2xl bg-[#1C1B31] border border-[#343047] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858198] uppercase tracking-wider">Pending Bank Slips</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              pendingPayments.length > 0 ? 'bg-[#E7B363]/20 text-[#E7B363]' : 'bg-[#151529] text-[#858198]'
            }`}>
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold mt-2 tabular-nums ${pendingPayments.length > 0 ? 'text-[#E7B363]' : 'text-[#F6F3FB]'}`}>
            {pendingPayments.length} Slips
          </h3>
          <p className="text-[11px] text-[#858198] mt-1">Awaiting Super Admin verification</p>
        </div>

        {/* Metric 3: Open Support Tickets */}
        <div className="p-5 rounded-2xl bg-[#1C1B31] border border-[#343047] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858198] uppercase tracking-wider">Open Support Tickets</span>
            <div className="w-8 h-8 rounded-xl bg-[#82B8F0]/15 text-[#82B8F0] flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#F6F3FB] mt-2 tabular-nums">{openTickets} Open</h3>
          <p className="text-[11px] text-[#858198] mt-1">Tenant inquiries & assistance</p>
        </div>

        {/* Metric 4: Platform Revenue */}
        <div className="p-5 rounded-2xl bg-[#1C1B31] border border-[#343047] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858198] uppercase tracking-wider">Platform SaaS Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-[#4BBF98]/15 text-[#4BBF98] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#F6F3FB] mt-2 tabular-nums">
            {formatLKR(totalPlatformApprovedRevenue)}
          </h3>
          <p className="text-[11px] text-[#4BBF98] font-semibold mt-1">Verified manual bank deposits</p>
        </div>
      </div>

      {/* Two Column Layout: Recent Platform Salons & Audit Log Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Salons */}
        <div className="bg-[#1C1B31] rounded-3xl border border-[#343047] p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#343047]">
            <h4 className="font-bold text-sm text-[#F6F3FB]">Registered Salons Overview</h4>
            <button
              onClick={() => onNavigate('admin_salons')}
              className="text-xs font-semibold text-[#B8A5FF] hover:underline"
            >
              Manage Salons →
            </button>
          </div>

          <div className="divide-y divide-[#343047]/60 text-xs">
            {tenants.map(t => {
              const isPending = t.status === 'pending_approval' || t.subscription.status === 'pending';
              const isTrial = t.subscription.status === 'trial';

              return (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#F6F3FB] block">{t.name}</span>
                    <span className="text-[11px] text-[#858198]">{t.city} · {t.phone}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      isPending
                        ? 'bg-[#E7B363]/15 text-[#E7B363]'
                        : isTrial
                          ? 'bg-[#B8A5FF]/15 text-[#B8A5FF]'
                          : t.subscription.status === 'active'
                            ? 'bg-[#4BBF98]/15 text-[#4BBF98]'
                            : 'bg-[#EA7180]/15 text-[#EA7180]'
                    }`}>
                      {isPending ? 'Pending Trial' : t.subscription.status}
                    </span>
                    <span className="block text-[11px] font-medium text-[#AAA6BD] mt-0.5">
                      Plan: {t.subscription.planId.replace('plan_', '')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Platform Audit Log Feed */}
        <div className="bg-[#1C1B31] rounded-3xl border border-[#343047] p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#343047]">
            <h4 className="font-bold text-sm text-[#F6F3FB]">Security Audit Log Feed</h4>
            <button
              onClick={() => onNavigate('admin_audit')}
              className="text-xs font-semibold text-[#B8A5FF] hover:underline"
            >
              All Audit Logs →
            </button>
          </div>

          <div className="divide-y divide-[#343047]/60 text-xs">
            {auditLogs.slice(0, 5).map(log => (
              <div key={log.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#B8A5FF] font-mono text-[11px]">{log.action}</span>
                  <span className="text-[10px] text-[#858198]">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-[#AAA6BD] mt-0.5 leading-snug">{log.details}</p>
                <span className="text-[10px] text-[#858198] mt-0.5 block">
                  by {log.actorEmail} ({log.actorRole})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
