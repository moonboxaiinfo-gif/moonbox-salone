import React, { useState } from 'react';
import { Expense } from '../../types';
import { StorageService } from '../../services/storageService';
import { invalidateTenantData, useTenantExpenseCategories, useTenantExpenses } from '../../services/asyncDataService';
import { formatLKR } from '../../constants/brand';
import { ExpenseModal } from './ExpenseModal';
import { Receipt, Plus, Search, Trash2, FileText, ExternalLink } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface ExpenseListProps {
  tenantId: string;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ tenantId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);
  const categoriesResource = useTenantExpenseCategories(tenantId);
  const expensesResource = useTenantExpenses(tenantId);
  const categories = categoriesResource.data || [];
  const expenses = expensesResource.data || [];

  const totalExpensesLKR = expenses.reduce((sum, e) => sum + e.amountLKR, 0);

  const filtered = expenses.filter(e => {
    if (categoryFilter !== 'all' && e.categoryId !== categoryFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return e.description.toLowerCase().includes(term) || e.categoryName.toLowerCase().includes(term);
    }
    return true;
  });

  const handleDelete = async (expId: string) => {
    if (confirm('Delete this expense record?')) {
      try {
        await StorageService.deleteExpenseConfirmed(tenantId, expId);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Could not delete expense. Please try again.');
        return;
      }
      invalidateTenantData(tenantId);
    }
  };

  return (
    <div className="space-y-4">
      {(expensesResource.loading || categoriesResource.loading) && <div role="status" className="text-xs text-slate-500">Loading expenses…</div>}
      {(expensesResource.error || categoriesResource.error) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><p>{expensesResource.error || categoriesResource.error}</p><button onClick={() => { expensesResource.retry(); categoriesResource.retry(); }} className="mt-2 underline">Retry expense data</button></div>}
      {/* Top Banner Metric */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8DFD6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-slate-400">Total Recorded Expenses</span>
          <h3 className="text-2xl font-extrabold text-[#1B0C2D] mt-0.5">{formatLKR(totalExpensesLKR)}</h3>
          <p className="text-xs text-slate-500 mt-1">Rent, electricity, salon supplies, and marketing</p>
        </div>

        <button
          onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD6] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search description or category..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#9B3E88]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      {expensesResource.loading ? <div role="status" className="rounded-2xl border border-[#E8DFD6] bg-white p-8 text-center text-sm text-slate-500">Loading expenses…</div> : expensesResource.error ? <div className="rounded-2xl border border-[#E8DFD6] bg-white p-8 text-center text-sm text-slate-500">Expense results are unavailable until the server query succeeds.</div> : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses found"
          description="Keep track of operational costs, utility bills, rent, and inventory purchase vouchers."
          actionText="Add First Expense"
          onAction={() => { setEditingExpense(null); setIsModalOpen(true); }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8DFD6] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E8DFD6] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-4 text-center">Receipt</th>
                <th className="py-3 px-4 text-right">Amount (LKR)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-600 font-medium">{exp.date}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-[#1B0C2D] block">{exp.description}</span>
                    {exp.notes && <span className="text-[10px] text-slate-400">{exp.notes}</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-[#9B3E88]">
                      {exp.categoryName}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="capitalize text-slate-600 font-medium">
                      {exp.paymentMethod.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {exp.receiptUrl ? (
                      <button
                        onClick={() => setPreviewReceipt(exp.receiptUrl!)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9B3E88] hover:underline"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-rose-700">
                    -{formatLKR(exp.amountLKR)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipt Preview Lightbox */}
      {previewReceipt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setPreviewReceipt(null)}
        >
          <div className="relative max-w-lg max-h-[85vh] bg-white p-2 rounded-2xl overflow-hidden shadow-2xl">
            <img src={previewReceipt} alt="Receipt preview" className="max-h-[80vh] w-auto object-contain rounded-xl" />
            <p className="text-center text-xs text-slate-500 py-1">Click anywhere to close</p>
          </div>
        </div>
      )}

      {/* Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => invalidateTenantData(tenantId)}
        expense={editingExpense}
        tenantId={tenantId}
      />
    </div>
  );
};
