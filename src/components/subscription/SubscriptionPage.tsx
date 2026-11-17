import React, { useState } from 'react';
import { SalonTenant, SubscriptionPlan, BillingCycle } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatLKR } from '../../constants/brand';
import { BankTransferModal } from './BankTransferModal';
import { 
  CreditCard, 
  Check, 
  Sparkles, 
  Clock, 
  Building, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

interface SubscriptionPageProps {
  tenant: SalonTenant;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ tenant }) => {
  const { plan: currentPlan, trialDaysLeft, isTrial } = useTenant();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<SubscriptionPlan | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const plans = StorageService.getPlans();
  const myPaymentRequests = StorageService.getManualPayments(tenant.id);
  const maxAnnualSavings = plans.length
    ? Math.max(...plans.map(plan => Math.max(0, Math.round((1 - plan.yearlyPriceLKR / (plan.monthlyPriceLKR * 12)) * 100))))
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Subscription Status Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8DFD6] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#9B3E88]">
              Current Plan Status
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
              isTrial ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isTrial ? `14-Day Free Trial (${trialDaysLeft} days left)` : 'Active Subscription'}
            </span>
          </div>

          <h3 className="text-2xl font-extrabold text-[#1B0C2D] mt-1">
            {currentPlan?.name || 'Growth'} Plan
          </h3>

          <p className="text-xs text-slate-500 mt-0.5">
            Billing: <strong>{tenant.subscription.billingCycle}</strong> · Renewed via Moonbox Digital Manual Bank Transfer
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const target = plans.find(p => p.id === 'plan_premium') || plans[0];
              setSelectedPlanForUpgrade(target);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] text-xs font-bold shadow-md hover:from-[#2A113C] hover:to-[#552380] transition-all"
          >
            Upgrade / Renew Plan
          </button>
        </div>
      </div>

      {/* Monthly vs Yearly Toggle */}
      <div className="flex flex-col items-center justify-center space-y-2 pt-2">
        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-[#1B0C2D] text-[#F3C9AB] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-[#1B0C2D] text-[#F3C9AB] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Yearly Billing</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Save up to {maxAnnualSavings}%
            </span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          All subscriptions are processed via manual Commercial Bank slip upload and reviewed by Moonbox Digital after submission.
        </p>
      </div>

      {/* Plans Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(p => {
          const isCurrent = tenant.subscription.planId === p.id;
          const price = billingCycle === 'yearly' ? p.yearlyPriceLKR : p.monthlyPriceLKR;

          return (
            <div
              key={p.id}
              className={`rounded-3xl border p-6 flex flex-col justify-between bg-white relative transition-all ${
                p.isPopular
                  ? 'border-[#9B3E88] shadow-lg ring-1 ring-[#9B3E88]'
                  : 'border-[#E8DFD6] shadow-xs hover:border-slate-300'
              }`}
            >
              {p.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#9B3E88] to-[#DE9E74] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                  Most Popular for Salons
                </div>
              )}

              <div>
                <h4 className="text-base font-bold text-[#1B0C2D]">{p.name}</h4>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.description}</p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#1B0C2D] tracking-tight">
                    {formatLKR(price)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium ml-1">
                    /{billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>

                {/* Features List */}
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to <strong>{p.maxStaff} Staff Members</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to <strong>{p.maxCustomers.toLocaleString()} Clients</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Online Customer Booking Service</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {p.hasPortfolio ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className={p.hasPortfolio ? '' : 'text-slate-400'}>Public Website & Portfolio Builder</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {p.hasInventory ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className={p.hasInventory ? '' : 'text-slate-400'}>
                      Product Inventory & Stock Movements
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {p.hasCommissions ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className={p.hasCommissions ? '' : 'text-slate-400'}>
                      Automated Staff Commissions
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {p.hasCustomDomain ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className={p.hasCustomDomain ? '' : 'text-slate-400'}>
                      Custom Domain Connection (SSL)
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedPlanForUpgrade(p)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-md'
                  }`}
                >
                  {isCurrent ? 'Renew Current Plan' : `Upgrade to ${p.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Payment History */}
      <div className="bg-white rounded-3xl border border-[#E8DFD6] p-6 shadow-xs space-y-4">
        <h4 className="font-bold text-sm text-[#1B0C2D]">Bank Transfer Submissions & Approval History</h4>

        {myPaymentRequests.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No bank deposit slips submitted yet. Click any plan above to submit your first slip.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {myPaymentRequests.map(req => (
              <div key={req.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1B0C2D]">{req.planName}</span>
                    <span className="font-mono text-slate-400">({req.bankReference})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Submitted on {new Date(req.createdAt).toLocaleDateString('en-GB')} · Slip: {req.receiptFileName}
                  </p>
                  {req.rejectionReason && (
                    <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                      Declined reason: {req.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-bold text-[#1B0C2D] block">{formatLKR(req.amountLKR)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize inline-block mt-0.5 ${
                    req.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : req.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {req.status === 'approved' ? 'Approved & Active' : req.status === 'rejected' ? 'Declined' : 'Pending Review'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bank Transfer Modal */}
      {selectedPlanForUpgrade && (
        <BankTransferModal
          isOpen={true}
          onClose={() => setSelectedPlanForUpgrade(null)}
          tenant={tenant}
          selectedPlan={selectedPlanForUpgrade}
          billingCycle={billingCycle}
          onSubmitted={() => {
            setRefreshKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
};
