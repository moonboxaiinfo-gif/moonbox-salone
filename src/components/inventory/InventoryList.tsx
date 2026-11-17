import React, { useState } from 'react';
import { Product, StockMovement } from '../../types';
import { useTenantProducts, useTenantStockMovements } from '../../services/asyncDataService';
import { formatLKR } from '../../constants/brand';
import { ProductModal } from './ProductModal';
import { StockMovementModal } from './StockMovementModal';
import { 
  Boxes, 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowUpDown, 
  History, 
  Edit3, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp 
} from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface InventoryListProps {
  tenantId: string;
}

export const InventoryList: React.FC<InventoryListProps> = ({ tenantId }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'movements'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const productsResource = useTenantProducts(tenantId);
  const movementsResource = useTenantStockMovements(tenantId);
  const products = (productsResource.data || []).filter(product => product.status === 'active');
  const movements = movementsResource.data || [];

  const lowStockCount = products.filter(p => p.stockQuantity <= p.lowStockThreshold).length;
  const totalValuationLKR = products.reduce((sum, p) => sum + (p.sellingPriceLKR * p.stockQuantity), 0);

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4">
      {(productsResource.loading || movementsResource.loading) && <div role="status" className="text-xs text-slate-500">Loading inventory…</div>}
      {(productsResource.error || movementsResource.error) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><p>{productsResource.error || movementsResource.error}</p><button onClick={() => { productsResource.retry(); movementsResource.retry(); }} className="mt-2 underline">Retry inventory load</button></div>}
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E8DFD6]">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Active SKUs</span>
          <span className="text-xl font-bold text-[#1B0C2D] mt-1 block">{products.length} Products</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8DFD6]">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Low Stock Alert</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {lowStockCount} Items Low
            </span>
            {lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8DFD6]">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Retail Inventory Value</span>
          <span className="text-xl font-extrabold text-[#1B0C2D] mt-1 block">{formatLKR(totalValuationLKR)}</span>
        </div>
      </div>

      {/* Navigation & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFD6] flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tab Switcher */}
        <div className="flex bg-[#FAF8F5] p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-1.5 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-[#1B0C2D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Products & Stock
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-1.5 rounded-lg transition-colors ${activeTab === 'movements' ? 'bg-[#1B0C2D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Stock Movement History
          </button>
        </div>

        {/* Search & Add */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          <button
            onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Products Table */}
      {activeTab === 'products' && (
        productsResource.loading ? <div role="status" className="rounded-2xl border border-[#E8DFD6] bg-white p-8 text-center text-sm text-slate-500">Loading products…</div> : productsResource.error ? <div className="rounded-2xl border border-[#E8DFD6] bg-white p-8 text-center text-sm text-slate-500">Products are unavailable until the server query succeeds.</div> : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory products found"
            description="Add your shampoos, serums, oils, and cosmetic products to track inventory."
            actionText="Add Product"
            onAction={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8DFD6] overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#E8DFD6] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const isLow = p.stockQuantity <= p.lowStockThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1B0C2D] block">{p.name}</span>
                        {p.expiryDate && (
                          <span className="text-[10px] text-slate-400">Exp: {p.expiryDate}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.sku}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#1B0C2D]">{formatLKR(p.sellingPriceLKR)}</td>
                      <td className="py-3 px-4 text-right text-slate-500">{formatLKR(p.costPriceLKR)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-md ${
                          isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {isLow && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>{p.stockQuantity} units</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{p.supplier || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setAdjustingProduct(p)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#1B0C2D] bg-slate-100 hover:bg-slate-200"
                            title="Adjust quantity"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            title="Edit details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab 2: Stock Movements Audit */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-[#E8DFD6] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E8DFD6] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-4 text-center">Change</th>
                <th className="py-3 px-4 text-center">Balance After</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movementsResource.loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Loading stock history…</td></tr>
              ) : movementsResource.error ? (
                <tr><td colSpan={6} className="text-center py-8 text-rose-700">Stock history could not be loaded. Use Retry above.</td></tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No stock movements logged yet.
                  </td>
                </tr>
              ) : (
                movements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(m.createdAt).toLocaleDateString('en-GB')}{' '}
                      <span className="text-[10px] text-slate-400">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#1B0C2D]">{m.productName}</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize bg-slate-100 text-slate-700">
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-800">
                      {m.balanceAfter} units
                    </td>
                    <td className="py-3 px-4 text-slate-600">{m.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSaved={() => { productsResource.retry(); movementsResource.retry(); }}
        product={editingProduct}
        tenantId={tenantId}
      />

      {adjustingProduct && (
        <StockMovementModal
          isOpen={true}
          onClose={() => setAdjustingProduct(null)}
          onSaved={() => {
            setAdjustingProduct(null);
            productsResource.retry(); movementsResource.retry();
          }}
          product={adjustingProduct}
          tenantId={tenantId}
        />
      )}
    </div>
  );
};
