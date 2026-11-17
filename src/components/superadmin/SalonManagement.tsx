import React, { useState } from 'react';
import { SalonTenant, SubscriptionPlan, BillingCycle } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatLKR } from '../../constants/brand';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  Settings,
  MoreVertical,
  Sliders,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  CreditCard,
  UserCheck,
  Ban
} from 'lucide-react';

export const SalonManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'trial' | 'active' | 'suspended'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal States
  const [grantTrialTarget, setGrantTrialTarget] = useState<SalonTenant | null>(null);
  const [trialDurationDays, setTrialDurationDays] = useState<7 | 14 | 30>(14);
  const [trialPlanId, setTrialPlanId] = useState<string>('plan_growth');

  const [extendTrialTarget, setExtendTrialTarget] = useState<SalonTenant | null>(null);
  const [extendDays, setExtendDays] = useState<7 | 14 | 30>(7);

  const [assignPackageTarget, setAssignPackageTarget] = useState<SalonTenant | null>(null);
  const [packagePlanId, setPackagePlanId] = useState<string>('plan_growth');
  const [packageBillingCycle, setPackageBillingCycle] = useState<BillingCycle>('monthly');

  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const tenants = StorageService.getTenants();
  const plans = StorageService.getPlans();

  const pendingCount = tenants.filter(t => t.status === 'pending_approval' || t.subscription.status === 'pending').length;
  const trialCount = tenants.filter(t => t.subscription.status === 'trial').length;
  const activeCount = tenants.filter(t => t.status === 'active' && t.subscription.status === 'active').length;
  const suspendedCount = tenants.filter(t => t.status === 'suspended').length;

  const filtered = tenants.filter(t => {
    // Status filter
    if (statusFilter === 'pending' && !(t.status === 'pending_approval' || t.subscription.status === 'pending')) return false;
    if (statusFilter === 'trial' && t.subscription.status !== 'trial') return false;
    if (statusFilter === 'active' && (t.status !== 'active' || t.subscription.status !== 'active')) return false;
    if (statusFilter === 'suspended' && t.status !== 'suspended') return false;

    // Search filter
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) || 
      t.city.toLowerCase().includes(term) || 
      t.email.toLowerCase().includes(term) ||
      t.slug.toLowerCase().includes(term)
    );
  });

  // Action: Toggle Suspend/Reactivate
  const handleToggleSuspend = (t: SalonTenant) => {
    const isCurrentlySuspended = t.status === 'suspended';
    const newStatus = isCurrentlySuspended ? 'active' : 'suspended';
    const confirmText = isCurrentlySuspended
      ? `Reactivate workspace for "${t.name}"? Staff and clients will regain access.`
      : `SUSPEND workspace for "${t.name}"? This restricts access for all salon staff.`;

    if (window.confirm(confirmText)) {
      const updated: SalonTenant = { ...t, status: newStatus as any };
      StorageService.updateTenant(updated);
      StorageService.logAudit({
        actorEmail: currentUser?.email || 'superadmin@moonboxdigital.com',
        actorRole: 'superadmin',
        action: isCurrentlySuspended ? 'REACTIVATE_SALON' : 'SUSPEND_SALON',
        entity: 'tenant',
        entityId: t.id,
        details: `${isCurrentlySuspended ? 'Reactivated' : 'Suspended'} salon "${t.name}"`
      });

      setActionMessage({
        type: 'success',
        text: `Salon "${t.name}" has been ${isCurrentlySuspended ? 'reactivated' : 'suspended'}.`
      });
      setRefreshKey(k => k + 1);
    }
  };

  // Action: Explicitly Grant Trial (7, 14, 30 days)
  const handleConfirmGrantTrial = () => {
    if (!grantTrialTarget) return;

    const result = StorageService.grantTrial(
      grantTrialTarget.id,
      trialDurationDays,
      trialPlanId,
      currentUser?.email || 'superadmin@moonboxdigital.com'
    );

    if (result.success) {
      setActionMessage({
        type: 'success',
        text: `Successfully granted ${trialDurationDays}-day Free Trial on ${trialPlanId} to "${grantTrialTarget.name}".`
      });
      setGrantTrialTarget(null);
      setRefreshKey(k => k + 1);
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to grant trial.' });
    }
  };

  // Action: Extend Active Trial
  const handleConfirmExtendTrial = () => {
    if (!extendTrialTarget) return;

    const result = StorageService.extendTrial(
      extendTrialTarget.id,
      extendDays,
      currentUser?.email || 'superadmin@moonboxdigital.com'
    );

    if (result.success) {
      setActionMessage({
        type: 'success',
        text: `Extended trial for "${extendTrialTarget.name}" by ${extendDays} days.`
      });
      setExtendTrialTarget(null);
      setRefreshKey(k => k + 1);
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to extend trial.' });
    }
  };

  // Action: Revoke Trial (Data Preserved)
  const handleRevokeTrial = (t: SalonTenant) => {
    if (window.confirm(`Revoke trial for "${t.name}"? The salon's subscription will expire immediately, but all appointments, client records, and invoices will be safely preserved.`)) {
      const result = StorageService.revokeTrial(
        t.id,
        currentUser?.email || 'superadmin@moonboxdigital.com'
      );

      if (result.success) {
        setActionMessage({
          type: 'success',
          text: `Revoked trial for "${t.name}". All operational data remains preserved.`
        });
        setRefreshKey(k => k + 1);
      } else {
        setActionMessage({ type: 'error', text: result.error || 'Failed to revoke trial.' });
      }
    }
  };

  // Action: Assign Available Package & Activate
  const handleConfirmAssignPackage = () => {
    if (!assignPackageTarget) return;

    const result = StorageService.assignPackage(
      assignPackageTarget.id,
      packagePlanId,
      packageBillingCycle,
      currentUser?.email || 'superadmin@moonboxdigital.com'
    );

    if (result.success) {
      setActionMessage({
        type: 'success',
        text: `Assigned package ${packagePlanId} (${packageBillingCycle}) to "${assignPackageTarget.name}". Workspace is now active.`
      });
      setAssignPackageTarget(null);
      setRefreshKey(k => k + 1);
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to assign package.' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-md ${
          actionMessage.type === 'success'
            ? 'bg-[#4BBF98]/15 border-[#4BBF98]/40 text-[#4BBF98]'
            : 'bg-[#EA7180]/15 border-[#EA7180]/40 text-[#EA7180]'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
          <button 
            onClick={() => setActionMessage(null)}
            className="text-current hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Directory & Filter Header */}
      <div className="bg-[#1C1B31] p-5 rounded-3xl border border-[#343047] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-[#F6F3FB]">
              Salons Directory & Administrator-Controlled Trials
            </h3>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E7B363]/20 border border-[#E7B363]/40 text-[#E7B363] animate-pulse">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="text-xs text-[#AAA6BD] mt-0.5">
            Audit salon workspaces, grant explicit trials (7/14/30 days), revoke trials, or assign subscription packages.
          </p>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-[#858198] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search salon name, slug, city, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#25223D] border border-[#343047] text-[#F6F3FB] placeholder:text-[#858198] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === 'all'
              ? 'bg-[#8B5CF6] text-white'
              : 'bg-[#1C1B31] text-[#AAA6BD] hover:text-[#F6F3FB] border border-[#343047]'
          }`}
        >
          All Salons ({tenants.length})
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            statusFilter === 'pending'
              ? 'bg-[#E7B363] text-[#101225]'
              : 'bg-[#1C1B31] text-[#AAA6BD] hover:text-[#F6F3FB] border border-[#343047]'
          }`}
        >
          <span>Pending Approval</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#101225]/20 font-extrabold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('trial')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === 'trial'
              ? 'bg-[#B8A5FF] text-[#101225]'
              : 'bg-[#1C1B31] text-[#AAA6BD] hover:text-[#F6F3FB] border border-[#343047]'
          }`}
        >
          Active Trials ({trialCount})
        </button>

        <button
          onClick={() => setStatusFilter('active')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === 'active'
              ? 'bg-[#4BBF98] text-[#101225]'
              : 'bg-[#1C1B31] text-[#AAA6BD] hover:text-[#F6F3FB] border border-[#343047]'
          }`}
        >
          Subscribed ({activeCount})
        </button>

        <button
          onClick={() => setStatusFilter('suspended')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === 'suspended'
              ? 'bg-[#EA7180] text-white'
              : 'bg-[#1C1B31] text-[#AAA6BD] hover:text-[#F6F3FB] border border-[#343047]'
          }`}
        >
          Suspended ({suspendedCount})
        </button>
      </div>

      {/* Salons Table */}
      <div className="bg-[#1C1B31] rounded-3xl border border-[#343047] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151529] border-b border-[#343047] text-[#858198] font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Salon Identity</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-3">Plan Tier</th>
                <th className="py-3.5 px-4 text-center">Subscription Status</th>
                <th className="py-3.5 px-4 text-center">Salon Status</th>
                <th className="py-3.5 px-4 text-center">Admin Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#343047]/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#858198]">
                    No salon workspaces match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const currentPlan = plans.find(p => p.id === t.subscription.planId) || plans[0];
                  const isTrial = t.subscription.status === 'trial';
                  const isPending = t.status === 'pending_approval' || t.subscription.status === 'pending';
                  const isExpired = t.subscription.status === 'expired';

                  return (
                    <tr key={t.id} className="hover:bg-[#25223D]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#F6F3FB] block">{t.name}</span>
                        <span className="text-[11px] text-[#B8A5FF] font-mono">/book/{t.slug}</span>
                      </td>

                      <td className="py-3.5 px-4 text-[#AAA6BD]">
                        {t.city}, Sri Lanka
                      </td>

                      <td className="py-3.5 px-4 text-[#AAA6BD]">
                        <div>{t.phone}</div>
                        <div className="text-[11px] text-[#858198]">{t.email}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-[#F6F3FB]">
                          {currentPlan.name}
                        </span>
                        <span className="block text-[10px] text-[#858198] capitalize">
                          {t.subscription.billingCycle}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize inline-block ${
                          isPending
                            ? 'bg-[#E7B363]/15 text-[#E7B363] border border-[#E7B363]/30'
                            : isTrial
                              ? 'bg-[#B8A5FF]/15 text-[#B8A5FF] border border-[#B8A5FF]/30'
                              : isExpired
                                ? 'bg-[#EA7180]/15 text-[#EA7180] border border-[#EA7180]/30'
                                : 'bg-[#4BBF98]/15 text-[#4BBF98] border border-[#4BBF98]/30'
                        }`}>
                          {isPending ? 'Pending Trial/Plan' : t.subscription.status}
                        </span>

                        {isTrial && t.subscription.trialEndsAt && (
                          <span className="block text-[10px] text-[#AAA6BD] mt-0.5">
                            Until {t.subscription.trialEndsAt}
                          </span>
                        )}
                        {isPending && (
                          <span className="block text-[10px] text-[#E7B363] mt-0.5">
                            Awaiting Grant
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          t.status === 'active'
                            ? 'bg-[#4BBF98]/15 text-[#4BBF98]'
                            : t.status === 'pending_approval'
                              ? 'bg-[#E7B363]/15 text-[#E7B363]'
                              : 'bg-[#EA7180]/15 text-[#EA7180]'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Pending: Prominent Grant Trial Action */}
                          {isPending && (
                            <button
                              onClick={() => {
                                setGrantTrialTarget(t);
                                setTrialPlanId(t.subscription.planId || 'plan_growth');
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:opacity-90 shadow-sm flex items-center gap-1"
                              title="Explicitly approve and grant free trial"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Grant Trial</span>
                            </button>
                          )}

                          {/* Active Trial: Extend or Revoke */}
                          {isTrial && (
                            <>
                              <button
                                onClick={() => setExtendTrialTarget(t)}
                                className="px-2 py-1 rounded-lg text-xs font-bold text-[#B8A5FF] bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/30"
                                title="Extend active trial by 7, 14, or 30 days"
                              >
                                +Extend
                              </button>

                              <button
                                onClick={() => handleRevokeTrial(t)}
                                className="px-2 py-1 rounded-lg text-xs font-bold text-[#EA7180] bg-[#EA7180]/15 hover:bg-[#EA7180]/25 border border-[#EA7180]/30"
                                title="Revoke trial access (data preserved)"
                              >
                                Revoke
                              </button>
                            </>
                          )}

                          {/* Assign Package */}
                          <button
                            onClick={() => {
                              setAssignPackageTarget(t);
                              setPackagePlanId(t.subscription.planId || 'plan_growth');
                              setPackageBillingCycle(t.subscription.billingCycle || 'monthly');
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-bold text-[#D5BD88] bg-[#D5BD88]/10 hover:bg-[#D5BD88]/20 border border-[#D5BD88]/30"
                            title="Assign a package tier and activate"
                          >
                            Assign Plan
                          </button>

                          {/* Suspend / Reactivate */}
                          <button
                            onClick={() => handleToggleSuspend(t)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                              t.status === 'suspended'
                                ? 'bg-[#4BBF98] text-[#101225] hover:bg-[#4BBF98]/90'
                                : 'bg-[#EA7180]/15 text-[#EA7180] hover:bg-[#EA7180]/25 border border-[#EA7180]/30'
                            }`}
                          >
                            {t.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: EXPLICITLY GRANT TRIAL (7, 14, 30 Days)         */}
      {/* ======================================================== */}
      {grantTrialTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1C1B31] border border-[#343047] rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 text-[#B8A5FF] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#F6F3FB] text-base">Grant Free Trial</h3>
                  <p className="text-[11px] text-[#AAA6BD]">
                    {grantTrialTarget.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setGrantTrialTarget(null)}
                className="p-1 rounded-lg text-[#858198] hover:text-[#F6F3FB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#F6F3FB] mb-1.5">
                  Select Trial Duration (Administrator Authorized)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([7, 14, 30] as const).map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setTrialDurationDays(days)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        trialDurationDays === days
                          ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-xs'
                          : 'bg-[#25223D] border-[#343047] text-[#AAA6BD] hover:border-[#8B5CF6]/50'
                      }`}
                    >
                      <span className="block text-lg font-extrabold text-[#F6F3FB]">{days} Days</span>
                      <span className="text-[10px] text-[#AAA6BD]">Free Access</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#F6F3FB] mb-1.5">
                  Assigned Trial Package Tier
                </label>
                <select
                  value={trialPlanId}
                  onChange={e => setTrialPlanId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#25223D] border border-[#343047] text-[#F6F3FB] text-xs focus:outline-none focus:border-[#8B5CF6]"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatLKR(p.monthlyPriceLKR)}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#151529] border border-[#343047] text-[11px] text-[#AAA6BD] space-y-1">
                <span className="font-bold text-[#D5BD88] block">Policy Enforcement:</span>
                <p>
                  Granting this trial will activate the salon workspace immediately, establish an expiration timestamp {trialDurationDays} days from now, and create an audit log entry.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGrantTrialTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-[#343047] text-[#AAA6BD] hover:text-[#F6F3FB] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGrantTrial}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95"
              >
                Confirm Trial Grant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EXTEND TRIAL                                     */}
      {/* ======================================================== */}
      {extendTrialTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1C1B31] border border-[#343047] rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[#F6F3FB] text-base">Extend Active Trial</h3>
                <p className="text-[11px] text-[#AAA6BD]">{extendTrialTarget.name}</p>
              </div>
              <button 
                onClick={() => setExtendTrialTarget(null)}
                className="p-1 rounded-lg text-[#858198] hover:text-[#F6F3FB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-[#F6F3FB]">
                Additional Trial Days to Append
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([7, 14, 30] as const).map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setExtendDays(days)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      extendDays === days
                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                        : 'bg-[#25223D] border-[#343047] text-[#AAA6BD]'
                    }`}
                  >
                    <span className="block text-lg font-extrabold text-[#F6F3FB]">+{days}</span>
                    <span className="text-[10px] text-[#AAA6BD]">Days</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExtendTrialTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-[#343047] text-[#AAA6BD] hover:text-[#F6F3FB] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExtendTrial}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold"
              >
                Extend Trial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ASSIGN PACKAGE TIER                              */}
      {/* ======================================================== */}
      {assignPackageTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1C1B31] border border-[#343047] rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[#F6F3FB] text-base">Assign Package & Activate</h3>
                <p className="text-[11px] text-[#AAA6BD]">{assignPackageTarget.name}</p>
              </div>
              <button 
                onClick={() => setAssignPackageTarget(null)}
                className="p-1 rounded-lg text-[#858198] hover:text-[#F6F3FB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#F6F3FB] mb-1.5">Subscription Plan</label>
                <select
                  value={packagePlanId}
                  onChange={e => setPackagePlanId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#25223D] border border-[#343047] text-[#F6F3FB] text-xs focus:outline-none focus:border-[#8B5CF6]"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatLKR(p.monthlyPriceLKR)}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#F6F3FB] mb-1.5">Billing Cycle</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPackageBillingCycle('monthly')}
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      packageBillingCycle === 'monthly'
                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                        : 'bg-[#25223D] border-[#343047] text-[#AAA6BD]'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setPackageBillingCycle('yearly')}
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      packageBillingCycle === 'yearly'
                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                        : 'bg-[#25223D] border-[#343047] text-[#AAA6BD]'
                    }`}
                  >
                    Yearly (17% off)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignPackageTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-[#343047] text-[#AAA6BD] hover:text-[#F6F3FB] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignPackage}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold"
              >
                Activate Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
