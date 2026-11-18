import React, { useEffect, useRef, useState } from 'react';
import { Product } from '../../types';
import { StorageService } from '../../services/storageService';
import { invalidateTenantData, useTenantProductCategories } from '../../services/asyncDataService';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product?: Product | null;
  tenantId: string;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  product,
  tenantId
}) => {
  const categoriesResource = useTenantProductCategories(tenantId);
  const categories = categoriesResource.data || [];

  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || `MBX-${Math.floor(100 + Math.random() * 900)}`);
  const [categoryId, setCategoryId] = useState(product?.categoryId || (categories[0]?.id || ''));
  const [sellingPriceLKR, setSellingPriceLKR] = useState(product?.sellingPriceLKR || 4500);
  const [costPriceLKR, setCostPriceLKR] = useState(product?.costPriceLKR || 2500);
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity || 10);
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.lowStockThreshold || 5);
  const [supplier, setSupplier] = useState(product?.supplier || 'Lanka Beauty Imports Ltd');
  const [expiryDate, setExpiryDate] = useState(product?.expiryDate || '2028-12-31');
  const [isSaving, setIsSaving] = useState(false);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) setSavedProductId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || submittingRef.current) return;
    submittingRef.current = true;

    const prod: Product = {
      id: product?.id || `prod_${Date.now()}`,
      tenantId,
      categoryId,
      name,
      sku,
      sellingPriceLKR,
      costPriceLKR,
      // Stock is changed only by the atomic movement RPC. A new record starts
      // at zero so opening stock is not written twice or without history.
      stockQuantity: product ? product.stockQuantity : 0,
      lowStockThreshold,
      supplier,
      expiryDate,
      status: 'active',
      createdAt: product?.createdAt || new Date().toISOString()
    };

    setIsSaving(true);
    try {
      const saved = savedProductId
        ? { ...prod, id: savedProductId }
        : await StorageService.saveProductConfirmed(prod);
      if (!product && !savedProductId) setSavedProductId(saved.id);

      // Opening stock uses the canonical server-returned product UUID. Retain
      // that ID if the movement fails so a retry does not create another item.
      if (!product && stockQuantity > 0) {
        await StorageService.recordStockMovementConfirmed({ tenantId, productId: saved.id, productName: saved.name, type: 'purchase', quantityChange: stockQuantity, reason: 'Initial Stock Opening Inventory' });
      }
      invalidateTenantData(tenantId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not save product and confirm stock. Please retry.');
      return;
    } finally {
      submittingRef.current = false;
      setIsSaving(false);
    }

    StorageService.logAudit({
      tenantId,
      actorEmail: 'Owner',
      actorRole: 'owner',
      action: product ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
      entity: 'product',
      entityId: prod.id,
      details: `${product ? 'Updated' : 'Added'} product ${name} (Stock: ${stockQuantity})`
    });

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140921]/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E8DFD6] overflow-hidden">
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8DFD6] flex justify-between items-center">
          <h3 className="font-bold text-base text-[#1B0C2D]">
            {product ? 'Edit Inventory Item' : 'Add Retail / Backbar Product'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Keratin Silk Infusion Shampoo 500ml"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU / Barcode *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="MBX-SHM-202"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Selling Price (LKR) *</label>
              <input
                type="number"
                min="0"
                required
                value={sellingPriceLKR}
                onChange={e => setSellingPriceLKR(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Price (LKR)</label>
              <input
                type="number"
                min="0"
                value={costPriceLKR}
                onChange={e => setCostPriceLKR(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opening Stock Quantity</label>
              <input
                type="number"
                min="0"
              value={stockQuantity}
              onChange={e => setStockQuantity(Number(e.target.value))}
              disabled={Boolean(product)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
            {product && <p className="mt-1 text-[10px] text-slate-500">Use Adjust to change stock so an auditable movement is recorded.</p>}
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Low-Stock Alert Threshold</label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
              <input
                type="text"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="e.g. Lanka Beauty Imports Ltd"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>
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
              {isSaving ? 'Saving…' : product ? 'Update Product' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
