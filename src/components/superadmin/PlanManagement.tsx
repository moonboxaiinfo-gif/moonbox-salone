import React, { useState } from 'react';
import { SubscriptionPlan } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatLKR } from '../../constants/brand';
import { useAuth } from '../../context/AuthContext';
import { Package, Edit3, Save, Check, X } from 'lucide-react';

export const PlanManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(StorageService.getPlans());
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    StorageService.updatePlan(editingPlan);
    StorageService.logAudit({
      actorEmail: currentUser?.email || 'superadmin@moonboxdigital.com',
      actorRole: 'superadmin',
      action: 'UPDATE_SUBSCRIPTION_PLAN',
      entity: 'plan',
      entityId: editingPlan.id,
      details: `Updated pricing & entitlements for ${editingPlan.name} (Rs. ${editingPlan.monthlyPriceLKR}/mo)`
    });

    setPlans(StorageService.getPlans());
    setEditingPlan(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-3xl border border-[#E8DFD6] flex justify-between items-center">
        <div>
          <h3 className="font-bold text-base text-[#1B0C2D]">SaaS Subscription Tier Configurations</h3>
          <p className="text-xs text-slate-500">
            Dynamically adjust LKR pricing, staff caps, client limits, and feature entitlements.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(p => (
          <div key={p.id} className="bg-white rounded-3xl border border-[#E8DFD6] p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-[#1B0C2D]">{p.name} Tier</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{p.slug}</p>
                </div>
                <button
                  onClick={() => setEditingPlan({ ...p })}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  title="Configure Plan"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly Price:</span>
                  <span className="font-extrabold text-[#1B0C2D]">{formatLKR(p.monthlyPriceLKR)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Yearly Price:</span>
                  <span className="font-extrabold text-[#1B0C2D]">{formatLKR(p.yearlyPriceLKR)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Staff:</span>
                  <span className="font-bold text-slate-800">{p.maxStaff} Team Members</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Customers:</span>
                  <span className="font-bold text-slate-800">{p.maxCustomers.toLocaleString()} Clients</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className={p.hasInventory ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                    {p.hasInventory ? '✓' : '✕'}
                  </span>
                  <span>Retail Inventory Management</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={p.hasCommissions ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                    {p.hasCommissions ? '✓' : '✕'}
                  </span>
                  <span>Staff Commissions Ledger</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={p.hasCustomDomain ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                    {p.hasCustomDomain ? '✓' : '✕'}
                  </span>
                  <span>Custom Domain & SSL</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingPlan({ ...p })}
                className="w-full py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit Pricing & Entitlements
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-[#1B0C2D]">Edit {editingPlan.name} Tier</h4>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tier Name</label>
                <input
                  type="text"
                  required
                  value={editingPlan.name}
                  onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Price (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editingPlan.monthlyPriceLKR}
                    onChange={e => setEditingPlan({ ...editingPlan, monthlyPriceLKR: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Yearly Price (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editingPlan.yearlyPriceLKR}
                    onChange={e => setEditingPlan({ ...editingPlan, yearlyPriceLKR: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Staff Cap</label>
                  <input
                    type="number"
                    min="1"
                    value={editingPlan.maxStaff}
                    onChange={e => setEditingPlan({ ...editingPlan, maxStaff: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Customers</label>
                  <input
                    type="number"
                    min="100"
                    value={editingPlan.maxCustomers}
                    onChange={e => setEditingPlan({ ...editingPlan, maxCustomers: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.hasOnlineBooking}
                    onChange={e => setEditingPlan({ ...editingPlan, hasOnlineBooking: e.target.checked })}
                    className="w-4 h-4 text-[#9B3E88] rounded"
                  />
                  <span>Enable Online Booking Feature</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.hasPortfolio}
                    onChange={e => setEditingPlan({ ...editingPlan, hasPortfolio: e.target.checked })}
                    className="w-4 h-4 text-[#9B3E88] rounded"
                  />
                  <span>Enable Website & Portfolio Feature</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.hasInventory}
                    onChange={e => setEditingPlan({ ...editingPlan, hasInventory: e.target.checked })}
                    className="w-4 h-4 text-[#9B3E88] rounded"
                  />
                  <span>Enable Product Inventory Feature</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.hasCommissions}
                    onChange={e => setEditingPlan({ ...editingPlan, hasCommissions: e.target.checked })}
                    className="w-4 h-4 text-[#9B3E88] rounded"
                  />
                  <span>Enable Staff Commissions Feature</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.hasCustomDomain}
                    onChange={e => setEditingPlan({ ...editingPlan, hasCustomDomain: e.target.checked })}
                    className="w-4 h-4 text-[#9B3E88] rounded"
                  />
                  <span>Enable Custom Domain (SSL) Feature</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1B0C2D] text-[#F3C9AB] font-bold hover:bg-[#2A113C]"
                >
                  Save Tier Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
