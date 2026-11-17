import React from 'react';
import { ShieldCheck, UserCircle2, Building2, CreditCard, DollarSign, HelpCircle, Megaphone, History, ArrowRight, LockKeyhole } from 'lucide-react';
import { SuperAdminTab } from '../common/Sidebar';
import { useAuth } from '../../context/AuthContext';

interface PlatformSettingsProps {
  onNavigate: (tab: SuperAdminTab) => void;
}

export const PlatformSettings: React.FC<PlatformSettingsProps> = ({ onNavigate }) => {
  const { currentUser, mfaAssuranceLevel, logout } = useAuth();

  const modules: Array<{ tab: SuperAdminTab; title: string; description: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = [
    { tab: 'admin_salons', title: 'Salon Management', description: 'Review salon access, approval status, suspension, and tenant operations.', icon: Building2, tone: 'text-[#B8A5FF] bg-[#8B5CF6]/15' },
    { tab: 'admin_plans', title: 'Subscription Plans', description: 'Manage plan features, pricing, limits, and availability.', icon: CreditCard, tone: 'text-[#F3C9AB] bg-[#E7B363]/15' },
    { tab: 'admin_payments', title: 'Payment Approvals', description: 'Review and process manual subscription payment requests.', icon: DollarSign, tone: 'text-[#4BBF98] bg-[#4BBF98]/15' },
    { tab: 'admin_announcements', title: 'Announcements', description: 'Publish business announcements to salon workspaces.', icon: Megaphone, tone: 'text-[#82B8F0] bg-[#82B8F0]/15' },
    { tab: 'admin_support', title: 'Support Operations', description: 'Respond to tenant support tickets and service requests.', icon: HelpCircle, tone: 'text-[#E7B363] bg-[#E7B363]/15' },
    { tab: 'admin_audit', title: 'Audit Logs', description: 'Review security and platform activity history.', icon: History, tone: 'text-[#EA7180] bg-[#EA7180]/15' }
  ];

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344]">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-base text-[#1B0C2D] dark:text-[#F3C9AB]">Platform Settings</h3>
                <p className="text-xs text-slate-500 dark:text-[#A893AF] mt-1">Business-facing controls for the Moonbox Salon platform. Technical deployment configuration stays in the hosting environment.</p>
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <LockKeyhole className="w-3.5 h-3.5" /> MFA {mfaAssuranceLevel === 'aal2' ? 'Verified' : 'Required'}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#1B0C2D] text-[#F3C9AB] flex items-center justify-center"><UserCircle2 className="w-4 h-4" /></div>
          <div><h4 className="font-bold text-sm text-[#1B0C2D] dark:text-[#F3C9AB]">Administrator Account</h4><p className="text-xs text-slate-500 dark:text-[#A893AF] mt-0.5">Current verified platform administrator session.</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-slate-50 dark:bg-[#25133A] border border-slate-200 dark:border-[#3A2050] px-3.5 py-3"><span className="block text-[10px] uppercase tracking-wide text-slate-400 dark:text-[#858198]">Name</span><span className="font-bold text-slate-800 dark:text-[#F6F3FB] mt-1 block">{currentUser?.name || 'Platform Administrator'}</span></div>
          <div className="rounded-xl bg-slate-50 dark:bg-[#25133A] border border-slate-200 dark:border-[#3A2050] px-3.5 py-3"><span className="block text-[10px] uppercase tracking-wide text-slate-400 dark:text-[#858198]">Email</span><span className="font-bold text-slate-800 dark:text-[#F6F3FB] mt-1 block break-all">{currentUser?.email || 'Not available'}</span></div>
          <div className="rounded-xl bg-slate-50 dark:bg-[#25133A] border border-slate-200 dark:border-[#3A2050] px-3.5 py-3"><span className="block text-[10px] uppercase tracking-wide text-slate-400 dark:text-[#858198]">Access</span><span className="font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">Super Admin · AAL2</span></div>
        </div>
        <button onClick={() => void logout()} className="mt-4 px-4 py-2.5 rounded-xl border border-[#EA7180]/30 text-[#EA7180] text-xs font-bold hover:bg-[#EA7180]/10">Sign out administrator session</button>
      </section>

      <section>
        <div className="mb-3"><h4 className="font-bold text-sm text-[#1B0C2D] dark:text-[#F3C9AB]">Business Operations</h4><p className="text-xs text-slate-500 dark:text-[#A893AF] mt-1">Open the dedicated module for each platform operation. This avoids duplicate or conflicting settings.</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.map(({ tab, title, description, icon: Icon, tone }) => (
            <button key={tab} onClick={() => onNavigate(tab)} className="text-left bg-white dark:bg-[#1A0A2A] rounded-2xl border border-[#E8DFD6] dark:border-[#2D1344] p-4 hover:border-[#8B5CF6]/50 transition-colors group">
              <div className="flex items-start justify-between gap-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-4 h-4" /></div><ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#8B5CF6] group-hover:translate-x-0.5 transition-all" /></div>
              <h5 className="font-bold text-sm text-[#1B0C2D] dark:text-[#F3C9AB] mt-3">{title}</h5><p className="text-xs text-slate-500 dark:text-[#A893AF] mt-1 leading-relaxed">{description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
