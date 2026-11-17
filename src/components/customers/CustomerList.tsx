import React, { useState } from 'react';
import { Customer } from '../../types';
import { invalidateTenantData, useTenantCustomers } from '../../services/asyncDataService';
import { formatLKR } from '../../constants/brand';
import { CustomerModal } from './CustomerModal';
import { CustomerProfileDrawer } from './CustomerProfileDrawer';
import { Search, Plus, MessageSquare, Phone, User, ArrowUpDown } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface CustomerListProps {
  tenantId: string;
}

export const CustomerList: React.FC<CustomerListProps> = ({ tenantId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'spent' | 'visits' | 'name'>('spent');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [activeProfileCustomer, setActiveProfileCustomer] = useState<Customer | null>(null);
  const customerResource = useTenantCustomers(tenantId);
  const customers = customerResource.data || [];

  const filtered = customers.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.address?.toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    if (sortBy === 'spent') return b.totalSpentLKR - a.totalSpentLKR;
    if (sortBy === 'visits') return b.visitsCount - a.visitsCount;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD6] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#9B3E88]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
            >
              <option value="spent">Highest Spend</option>
              <option value="visits">Most Visits</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <button
            onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      {customerResource.loading ? (
        <div role="status" className="rounded-2xl border border-[#E8DFD6] bg-white p-8 text-center text-sm text-slate-500">Loading customers…</div>
      ) : customerResource.error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          <p>{customerResource.error}</p>
          <button onClick={customerResource.retry} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title="No customers found"
          description="Your salon CRM client list is empty. Add your first client to start tracking visits and spend."
          actionText="Add First Customer"
          onAction={() => { setEditingCustomer(null); setIsModalOpen(true); }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8DFD6] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E8DFD6] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Phone / WhatsApp</th>
                <th className="py-3 px-4">City / Area</th>
                <th className="py-3 px-3 text-center">Visits</th>
                <th className="py-3 px-4 text-right">Lifetime Spend</th>
                <th className="py-3 px-4 text-right">Last Visit</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => {
                const cleanPhone = (c.whatsapp || c.phone).replace(/[^0-9]/g, '');
                const waLink = cleanPhone.startsWith('0') 
                  ? `https://wa.me/94${cleanPhone.substring(1)}` 
                  : `https://wa.me/94${cleanPhone}`;

                return (
                  <tr 
                    key={c.id} 
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => setActiveProfileCustomer(c)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1B0C2D]">{c.name}</div>
                      {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                    </td>

                    <td className="py-3 px-4 text-slate-600" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span>{c.phone}</span>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50"
                          title="Message on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-500">{c.address || 'Colombo'}</td>

                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {c.visitsCount}
                    </td>

                    <td className="py-3 px-4 text-right font-extrabold text-[#1B0C2D]">
                      {formatLKR(c.totalSpentLKR)}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-500">
                      {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString('en-GB') : 'First Visit'}
                    </td>

                    <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#9B3E88] hover:bg-purple-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Add Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => invalidateTenantData(tenantId)}
        customer={editingCustomer}
        tenantId={tenantId}
      />

      {/* Customer Profile Drawer */}
      <CustomerProfileDrawer
        customer={activeProfileCustomer}
        onClose={() => setActiveProfileCustomer(null)}
        onEdit={(cust) => {
          setActiveProfileCustomer(null);
          setEditingCustomer(cust);
          setIsModalOpen(true);
        }}
        tenantId={tenantId}
      />
    </div>
  );
};
