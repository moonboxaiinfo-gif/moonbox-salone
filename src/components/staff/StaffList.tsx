import React, { useState } from 'react';
import { Staff } from '../../types';
import { invalidateTenantData, useTenantStaff } from '../../services/asyncDataService';
import { StaffModal } from './StaffModal';
import { Plus, UserCheck, Phone, Mail, Clock, Percent, Edit3 } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface StaffListProps {
  tenantId: string;
}

export const StaffList: React.FC<StaffListProps> = ({ tenantId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const staffResource = useTenantStaff(tenantId);
  const staffList = staffResource.data || [];

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD6] flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-[#1B0C2D]">Salon Stylists & Staff Roster</h3>
          <p className="text-xs text-slate-500">Configure team commissions, schedules, and service assignments</p>
        </div>

        <button
          onClick={() => { setEditingStaff(null); setIsModalOpen(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {staffResource.loading ? (
        <div role="status" className="rounded-2xl border border-[#E8DFD6] bg-white p-8 text-center text-sm text-slate-500">Loading staff…</div>
      ) : staffResource.error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><p>{staffResource.error}</p><button onClick={staffResource.retry} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold">Retry</button></div>
      ) : staffList.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No staff members configured"
          description="Add your hairstylists, nail artists, and aestheticians to assign appointments."
          actionText="Add Team Member"
          onAction={() => { setEditingStaff(null); setIsModalOpen(true); }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map(st => (
            <div
              key={st.id}
              className="bg-white rounded-2xl border border-[#E8DFD6] p-5 shadow-2xs hover:border-[#9B3E88] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs"
                      style={{ backgroundColor: st.color || '#9E4784' }}
                    >
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1B0C2D]">{st.name}</h4>
                      <p className="text-xs text-[#9B3E88] font-medium">{st.position}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                    st.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : st.status === 'on_leave'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {st.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{st.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{st.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mon–Sat: 09:00 AM – 06:00 PM</span>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded-xl bg-[#FAF8F5] border border-slate-200/80 grid grid-cols-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Service Comm</span>
                    <span className="font-extrabold text-[#1B0C2D] mt-0.5 block">{st.defaultServiceCommission}%</span>
                  </div>
                  <div className="border-l border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Product Comm</span>
                    <span className="font-extrabold text-[#1B0C2D] mt-0.5 block">{st.defaultProductCommission}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => { setEditingStaff(st); setIsModalOpen(true); }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#9B3E88] hover:bg-purple-50 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Modal */}
      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => invalidateTenantData(tenantId)}
        staff={editingStaff}
        tenantId={tenantId}
      />
    </div>
  );
};
