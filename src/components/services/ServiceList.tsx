import React, { useState } from 'react';
import { Service, ServiceCategory } from '../../types';
import { invalidateTenantData, useTenantCatalog } from '../../services/asyncDataService';
import { StorageService } from '../../services/storageService';
import { formatLKR } from '../../constants/brand';
import { ServiceModal } from './ServiceModal';
import { Plus, Search, Sparkles, Clock, Percent, Edit3, Trash2, Globe } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface ServiceListProps {
  tenantId: string;
}

export const ServiceList: React.FC<ServiceListProps> = ({ tenantId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const catalogResource = useTenantCatalog(tenantId);
  const categories = catalogResource.data?.categories || [];
  const services = catalogResource.data?.services || [];

  const filtered = services.filter(s => {
    if (selectedCategory !== 'all' && s.categoryId !== selectedCategory) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return s.name.toLowerCase().includes(term) || s.description?.toLowerCase().includes(term);
    }
    return true;
  });

  const handleDelete = async (sId: string) => {
    if (!confirm('Are you sure you want to remove this service from your active menu?') || deletingId) return;
    setDeletingId(sId);
    setErrorMsg(null);
    try {
      await StorageService.deleteServiceConfirmed(tenantId, sId);
      await StorageService.logAuditConfirmed({ tenantId, action: 'DELETE_SERVICE', entity: 'service', entityId: sId, details: `Removed service ${services.find(service => service.id === sId)?.name || sId}` })
        .catch(error => console.error('[ServiceList] Service was deleted but its audit event could not be recorded.', error));
      invalidateTenantData(tenantId);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not delete service. Please retry.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD6] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search service name or description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#9B3E88]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={() => { setEditingService(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {errorMsg && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{errorMsg}</div>}

      {/* Services Grid */}
      {catalogResource.loading ? (
        <div role="status" className="rounded-2xl border border-[#E8DFD6] bg-white p-8 text-center text-sm text-slate-500">Loading services…</div>
      ) : catalogResource.error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><p>{catalogResource.error}</p><button onClick={catalogResource.retry} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold">Retry</button></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No services found"
          description="Create your first salon treatment or styling service to display in POS and booking."
          actionText="Add New Service"
          onAction={() => { setEditingService(null); setIsModalOpen(true); }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(srv => {
            const cat = categories.find(c => c.id === srv.categoryId);
            return (
              <div
                key={srv.id}
                className="bg-white rounded-2xl border border-[#E8DFD6] p-5 shadow-2xs hover:border-[#9B3E88] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold text-[#9B3E88] uppercase tracking-wider">
                      {cat?.name || 'General'}
                    </span>
                    {srv.isOnlineBookingEnabled && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        <Globe className="w-3 h-3 text-emerald-600" />
                        <span>Online</span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-[#1B0C2D] mt-1.5">{srv.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {srv.description || 'Professional styling service.'}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{srv.durationMinutes} mins</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-slate-400" />
                      <span>{srv.commissionRate}% comm</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-base font-extrabold text-[#1B0C2D]">
                    {formatLKR(srv.priceLKR)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingService(srv); setIsModalOpen(true); }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      title="Edit Service"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(srv.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete Service"
                      disabled={deletingId === srv.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Service Modal */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => invalidateTenantData(tenantId)}
        service={editingService}
        tenantId={tenantId}
      />
    </div>
  );
};
