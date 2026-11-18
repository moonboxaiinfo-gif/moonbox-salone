import React, { useEffect, useRef, useState } from 'react';
import { Staff, StaffWorkingHours } from '../../types';
import { StorageService } from '../../services/storageService';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  staff?: Staff | null;
  tenantId: string;
}

export const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  staff,
  tenantId
}) => {
  const [name, setName] = useState(staff?.name || '');
  const [position, setPosition] = useState(staff?.position || 'Senior Hair Stylist');
  const [phone, setPhone] = useState(staff?.phone || '');
  const [email, setEmail] = useState(staff?.email || '');
  const [staffAuthUserId, setStaffAuthUserId] = useState(staff?.authUserId || '');
  const [staffAccounts, setStaffAccounts] = useState<Array<{ userId: string; fullName: string; email: string }>>([]);
  const [staffAccountsError, setStaffAccountsError] = useState<string | null>(null);
  const [status, setStatus] = useState<Staff['status']>(staff?.status || 'active');
  const [serviceComm, setServiceComm] = useState(staff?.defaultServiceCommission || 20);
  const [productComm, setProductComm] = useState(staff?.defaultProductCommission || 10);
  const [color, setColor] = useState(staff?.color || '#9E4784');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(staff?.name || '');
    setPosition(staff?.position || 'Senior Hair Stylist');
    setPhone(staff?.phone || '');
    setEmail(staff?.email || '');
    setStaffAuthUserId(staff?.authUserId || '');
    setStatus(staff?.status || 'active');
    setServiceComm(staff?.defaultServiceCommission ?? 20);
    setProductComm(staff?.defaultProductCommission ?? 10);
    setColor(staff?.color || '#9E4784');
    setErrorMsg(null);
  }, [isOpen, staff]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setStaffAccountsError(null);
    void StorageService.staffLoginAccounts(tenantId, staff?.id)
      .then(accounts => { if (!cancelled) setStaffAccounts(accounts); })
      .catch(error => {
        if (!cancelled) {
          setStaffAccounts([]);
          setStaffAccountsError(error instanceof Error ? error.message : 'Staff login accounts could not be loaded.');
        }
      });
    return () => { cancelled = true; };
  }, [isOpen, tenantId, staff?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setErrorMsg(null);

    const defaultHours: StaffWorkingHours = {
      start: '09:00',
      end: '18:00',
      isWorking: true,
      breakStart: '13:00',
      breakEnd: '14:00'
    };

    const newStaff: Staff = {
      id: staff?.id || `stf_${Date.now()}`,
      tenantId,
      authUserId: staffAuthUserId || undefined,
      name,
      position,
      phone,
      email,
      status,
      assignedServiceIds: staff?.assignedServiceIds || [],
      defaultServiceCommission: serviceComm,
      defaultProductCommission: productComm,
      workingHours: staff?.workingHours || {
        monday: defaultHours,
        tuesday: defaultHours,
        wednesday: defaultHours,
        thursday: defaultHours,
        friday: defaultHours,
        saturday: defaultHours,
        sunday: { ...defaultHours, isWorking: false }
      },
      color,
      createdAt: staff?.createdAt || new Date().toISOString()
    };

    try {
      const savedStaff = await StorageService.saveStaffConfirmed(newStaff);
      await StorageService.logAuditConfirmed({
        tenantId,
        actorEmail: 'Owner',
        actorRole: 'owner',
        action: staff ? 'UPDATE_STAFF' : 'CREATE_STAFF',
        entity: 'staff',
        entityId: savedStaff.id,
        details: `${staff ? 'Updated' : 'Added'} staff member ${name} (${position})`
      }).catch(error => console.error('[StaffModal] Staff member was saved but its audit event could not be recorded.', error));
      onSaved();
      onClose();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not save staff member. Please try again.');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140921]/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E8DFD6] overflow-hidden">
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8DFD6] flex justify-between items-center">
          <h3 className="font-bold text-base text-[#1B0C2D]">
            {staff ? 'Edit Staff Profile' : 'Add New Team Member'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {errorMsg && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{errorMsg}</div>}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Staff Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dinithi Fernando"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Position / Title</label>
            <input
              type="text"
              required
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="e.g. Senior Creative Hair Stylist"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0712345678"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Staff login account</label>
              <select
                value={staffAuthUserId}
                onChange={event => setStaffAuthUserId(event.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
              >
                <option value="">No login linked</option>
                {staffAccounts.map(account => (
                  <option key={account.userId} value={account.userId}>
                    {account.fullName} ({account.email})
                  </option>
                ))}
              </select>
              {staffAccountsError
                ? <p role="alert" className="mt-1 text-[11px] text-rose-600">{staffAccountsError}</p>
                : <p className="mt-1 text-[11px] text-slate-500">Only active Staff-role accounts in this salon can be linked. Email matching is not used.</p>}
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Staff Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@moonboxsalon.lk"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Service Comm (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={serviceComm}
                onChange={e => setServiceComm(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Comm (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={productComm}
                onChange={e => setProductComm(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Calendar Color</label>
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-full h-9 p-1 rounded-xl border border-slate-200 cursor-pointer"
              />
            </div>
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
              disabled={saving}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs disabled:opacity-60"
            >
              {saving ? 'Saving…' : staff ? 'Update Staff' : 'Save Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
