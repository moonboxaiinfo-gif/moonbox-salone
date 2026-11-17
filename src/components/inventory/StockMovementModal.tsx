import React, { useState } from 'react';
import { Product, StockMovementType } from '../../types';
import { StorageService } from '../../services/storageService';
import { AlertCircle } from 'lucide-react';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: Product;
  tenantId: string;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  product,
  tenantId
}) => {
  if (!isOpen) return null;

  const [type, setType] = useState<StockMovementType>('purchase');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const change = (type === 'sale' || type === 'damaged') ? -Math.abs(quantity) : Math.abs(quantity);

    try {
      await StorageService.recordStockMovementConfirmed({ tenantId, productId: product.id, productName: product.name, type, quantityChange: change, reason: reason || `Manual ${type} stock entry` });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Stock adjustment failed.');
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140921]/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E8DFD6] overflow-hidden">
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8DFD6] flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-[#1B0C2D]">Adjust Stock Quantity</h3>
            <p className="text-[11px] text-slate-500">{product.name} (Current: {product.stockQuantity})</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Movement Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as StockMovementType)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
            >
              <option value="purchase">Restock / Supplier Delivery (+)</option>
              <option value="return">Customer Return (+)</option>
              <option value="adjustment">Stock Audit Adjustment (+/-)</option>
              <option value="damaged">Damaged / Expired Bottles (-)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Quantity Units</label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason / Supplier Invoice Ref</label>
            <textarea
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Received shipment from Colombo distributor, Invoice #9918"
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
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs"
            >
              Commit Stock Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
