import React, { useEffect, useRef, useState } from 'react';
import { Customer } from '../../types';
import { StorageService } from '../../services/storageService';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
  customer?: Customer | null;
  tenantId: string;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  customer,
  tenantId
}) => {
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [whatsapp, setWhatsapp] = useState(customer?.whatsapp || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [gender, setGender] = useState<Customer['gender']>(customer?.gender || 'female');
  const [birthday, setBirthday] = useState(customer?.birthday || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(customer?.name || '');
    setPhone(customer?.phone || '');
    setWhatsapp(customer?.whatsapp || '');
    setEmail(customer?.email || '');
    setGender(customer?.gender || 'female');
    setBirthday(customer?.birthday || '');
    setAddress(customer?.address || '');
    setNotes(customer?.notes || '');
    setErrorMsg(null);
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setErrorMsg(null);

    const newCust: Customer = {
      id: customer?.id || `cust_${Date.now()}`,
      tenantId,
      name,
      phone,
      whatsapp: whatsapp || phone,
      email,
      gender,
      birthday,
      address,
      notes,
      status: 'active',
      totalSpentLKR: customer?.totalSpentLKR || 0,
      visitsCount: customer?.visitsCount || 0,
      lastVisitAt: customer?.lastVisitAt,
      createdAt: customer?.createdAt || new Date().toISOString()
    };

    try {
      const savedCustomer = await StorageService.saveCustomerConfirmed(newCust);
      await StorageService.logAuditConfirmed({
        tenantId,
        actorEmail: 'Staff',
        actorRole: 'receptionist',
        action: customer ? 'UPDATE_CUSTOMER' : 'CREATE_CUSTOMER',
        entity: 'customer',
        entityId: savedCustomer.id,
        details: `${customer ? 'Updated' : 'Added'} customer ${name} (${phone})`
      }).catch(error => console.error('[CustomerModal] Customer was saved but its audit event could not be recorded.', error));
      onSaved(savedCustomer);
      onClose();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not save customer. Please try again.');
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
            {customer ? 'Edit Client Profile' : 'Add New Salon Client'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {errorMsg && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{errorMsg}</div>}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dilani Rajapakse"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile Phone *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0714561234"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="0714561234"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="client@gmail.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Birthday</label>
              <input
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#9B3E88]"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Address / City</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Rosmead Place, Colombo 07"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Styling Notes & Allergies</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Sensitive scalp, loves warm caramel tones, prefers herbal hair mask"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
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
              {saving ? 'Saving…' : customer ? 'Update Client' : 'Save Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
