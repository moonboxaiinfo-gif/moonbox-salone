import React, { useRef, useState } from 'react';
import { Expense, PaymentMethod } from '../../types';
import { StorageService } from '../../services/storageService';
import { invalidateTenantData, useTenantExpenseCategories } from '../../services/asyncDataService';
import { Upload, X, AlertCircle } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  expense?: Expense | null;
  tenantId: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  expense,
  tenantId
}) => {
  const categoriesResource = useTenantExpenseCategories(tenantId);
  const categories = categoriesResource.data || [];

  const [categoryId, setCategoryId] = useState(expense?.categoryId || (categories[0]?.id || ''));
  const [description, setDescription] = useState(expense?.description || '');
  const [amountLKR, setAmountLKR] = useState(expense?.amountLKR || 5000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(expense?.paymentMethod || 'cash');
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(expense?.notes || '');
  const [receiptFileName, setReceiptFileName] = useState(expense?.receiptFileName || '');
  const [receiptUrl, setReceiptUrl] = useState(expense?.receiptUrl || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const submittingRef = useRef(false);

  if (!isOpen) return null;

  // File upload simulation & validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Receipt file size exceeds 5MB limit.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Only JPG, PNG, WebP or PDF files are accepted.');
      return;
    }

    setErrorMsg(null);
    setReceiptFileName(file.name);

    // Create object URL for local display
    const url = URL.createObjectURL(file);
    setReceiptUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amountLKR <= 0 || submittingRef.current) return;
    submittingRef.current = true;

    const cat = categories.find(c => c.id === categoryId);

    const exp: Expense = {
      id: expense?.id || `exp_${Date.now()}`,
      tenantId,
      categoryId,
      categoryName: cat?.name || 'General Expense',
      description,
      amountLKR,
      paymentMethod,
      date,
      notes,
      receiptFileName,
      receiptUrl,
      createdAt: expense?.createdAt || new Date().toISOString()
    };

    setIsSaving(true);
    try {
      await StorageService.saveExpenseConfirmed(exp);
      invalidateTenantData(tenantId);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not save expense. Please try again.');
      return;
    } finally {
      submittingRef.current = false;
      setIsSaving(false);
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140921]/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E8DFD6] overflow-hidden">
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8DFD6] flex justify-between items-center">
          <h3 className="font-bold text-base text-[#1B0C2D]">
            {expense ? 'Edit Expense Record' : 'Record Salon Operational Expense'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Expense Category *</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              disabled={categoriesResource.loading}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#9B3E88]"
            >
              <option value="">General Expense</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {categoriesResource.error && <p role="alert" className="mt-1 text-[10px] text-rose-700">{categoriesResource.error} <button type="button" onClick={categoriesResource.retry} className="underline">Retry</button></p>}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description *</label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. CEB Electricity Bill / Shampoo supplies"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount (LKR) *</label>
              <input
                type="number"
                min="1"
                step="50"
                required
                value={amountLKR}
                onChange={e => setAmountLKR(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
              >
                <option value="cash">Cash / Petty Cash</option>
                <option value="bank_transfer">Bank Transfer (CEFT)</option>
                <option value="card">Company Card</option>
                <option value="digital_qr">QR Code</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date Paid</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              required
            />
          </div>

          {/* Receipt Upload with Validation */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Attach Receipt / Bill Slip (JPG, PNG, PDF &lt; 5MB)
            </label>
            <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors">
              {receiptFileName ? (
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-slate-700 truncate">{receiptFileName}</span>
                  <button
                    type="button"
                    onClick={() => { setReceiptFileName(''); setReceiptUrl(''); }}
                    className="p-1 rounded text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-[#9B3E88]">Click to upload bill image</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Supports Camera photos, PDF, PNG</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Voucher #412 signed by salon manager"
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || categoriesResource.loading}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs"
            >
              {isSaving ? 'Saving…' : expense ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
