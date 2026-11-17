import React, { useEffect, useState } from 'react';
import { Service } from '../../types';
import { StorageService } from '../../services/storageService';
import { useTenantCatalog, useTenantStaff } from '../../services/asyncDataService';
import { formatLKR } from '../../constants/brand';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  service?: Service | null;
  tenantId: string;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  service,
  tenantId
}) => {
  const catalogResource = useTenantCatalog(tenantId, isOpen);
  const staffResource = useTenantStaff(tenantId, isOpen);
  const categories = catalogResource.data?.categories || [];
  const staffList = staffResource.data || [];

  const [name, setName] = useState(service?.name || '');
  const [categoryId, setCategoryId] = useState(service?.categoryId || (categories[0]?.id || ''));
  const [description, setDescription] = useState(service?.description || '');
  const [priceLKR, setPriceLKR] = useState(service?.priceLKR || 5000);
  const [durationMinutes, setDurationMinutes] = useState(service?.durationMinutes || 45);
  const [commissionRate, setCommissionRate] = useState(service?.commissionRate || 15);
  const [isOnlineBookingEnabled, setIsOnlineBookingEnabled] = useState(service ? service.isOnlineBookingEnabled : true);
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>(service?.assignedStaffIds || staffList.map(s => s.id));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(service?.name || '');
    setCategoryId(service?.categoryId || '');
    setDescription(service?.description || '');
    setPriceLKR(service?.priceLKR ?? 5000);
    setDurationMinutes(service?.durationMinutes ?? 45);
    setCommissionRate(service?.commissionRate ?? 15);
    setIsOnlineBookingEnabled(service?.isOnlineBookingEnabled ?? true);
    setAssignedStaffIds(service?.assignedStaffIds || []);
    setErrorMsg(null);
  }, [isOpen, service]);

  useEffect(() => {
    if (isOpen && !service && !categoryId && categories.length) setCategoryId(categories[0].id);
    if (isOpen && !service && assignedStaffIds.length === 0 && staffList.length) {
      setAssignedStaffIds(staffList.map(member => member.id));
    }
  }, [isOpen, service, categoryId, categories, assignedStaffIds, staffList]);

  if (!isOpen) return null;

  const toggleStaff = (sId: string) => {
    if (assignedStaffIds.includes(sId)) {
      setAssignedStaffIds(assignedStaffIds.filter(id => id !== sId));
    } else {
      setAssignedStaffIds([...assignedStaffIds, sId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setErrorMsg(null);

    const srv: Service = {
      id: service?.id || `srv_${Date.now()}`,
      tenantId,
      categoryId,
      name,
      description,
      priceLKR,
      durationMinutes,
      assignedStaffIds,
      commissionRate,
      isOnlineBookingEnabled,
      isActive: true
    };

    try {
      const savedService = await StorageService.saveServiceConfirmed(srv);
      await StorageService.logAuditConfirmed({
        tenantId,
        actorEmail: 'Owner',
        actorRole: 'owner',
        action: service ? 'UPDATE_SERVICE' : 'CREATE_SERVICE',
        entity: 'service',
        entityId: savedService.id,
        details: `${service ? 'Updated' : 'Added'} service ${name} (Rs. ${priceLKR})`
      }).catch(error => console.error('[ServiceModal] Service was saved but its audit event could not be recorded.', error));
      onSaved();
      onClose();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not save service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140921]/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E8DFD6] overflow-hidden">
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8DFD6] flex justify-between items-center">
          <h3 className="font-bold text-base text-[#1B0C2D]">
            {service ? 'Edit Salon Service' : 'Add New Service to Menu'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{errorMsg}</div>}
          {(catalogResource.error || staffResource.error) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700"><p>{catalogResource.error || staffResource.error}</p><button type="button" onClick={() => { catalogResource.retry(); staffResource.retry(); }} className="mt-2 rounded-lg border border-rose-200 bg-white px-2 py-1">Retry lookup data</button></div>}
          {(catalogResource.loading || staffResource.loading) && <p role="status" className="text-slate-500">Loading categories and staff…</p>}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Service Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. 24K Gold Cellular Radiance Facial"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Service Category</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
              >
                <option value="">No category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Price (LKR) *</label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={priceLKR}
                onChange={e => setPriceLKR(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
              <select
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins (1 hour)</option>
                <option value={90}>90 mins (1.5 hours)</option>
                <option value={120}>120 mins (2 hours)</option>
                <option value={180}>180 mins (3 hours)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Commission (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={commissionRate}
                onChange={e => setCommissionRate(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed treatment description, steps, and benefits"
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          {/* Assigned Stylists */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assigned Qualified Stylists</label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-xl bg-slate-50">
              {staffList.map(st => {
                const isSelected = assignedStaffIds.includes(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => toggleStaff(st.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                      isSelected
                        ? 'bg-[#1B0C2D] text-white border-[#1B0C2D]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {st.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Online Booking Visibility */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="onlineBooking"
              checked={isOnlineBookingEnabled}
              onChange={e => setIsOnlineBookingEnabled(e.target.checked)}
              className="w-4 h-4 text-[#9B3E88] rounded"
            />
            <label htmlFor="onlineBooking" className="font-semibold text-slate-700 cursor-pointer">
              Enable for Customer Online Booking Service
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || catalogResource.loading || staffResource.loading}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs disabled:opacity-60"
            >
              {saving ? 'Saving…' : service ? 'Update Service' : 'Save Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
