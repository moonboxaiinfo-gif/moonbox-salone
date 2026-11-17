import React, { useState } from 'react';
import { Invoice, SalonTenant } from '../../types';
import { formatLKR, BRAND_CONFIG } from '../../constants/brand';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Logo } from '../brand/Logo';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  tenant?: SalonTenant | null;
}

type ReceiptWidth = '58mm' | '80mm';

const getSavedWidth = (tenantId?: string): ReceiptWidth => {
  if (!tenantId) return '80mm';
  try {
    const saved = window.localStorage.getItem(`moonbox-receipt-width:${tenantId}`);
    return saved === '58mm' ? '58mm' : '80mm';
  } catch {
    return '80mm';
  }
};

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({ isOpen, onClose, invoice, tenant }) => {
  const [paperWidth, setPaperWidth] = useState<ReceiptWidth>(() => getSavedWidth(tenant?.id));
  if (!isOpen) return null;

  const changePaperWidth = (value: ReceiptWidth) => {
    setPaperWidth(value);
    if (tenant?.id) {
      try { window.localStorage.setItem(`moonbox-receipt-width:${tenant.id}`, value); } catch { /* Browser storage may be unavailable; print remains usable. */ }
    }
  };
  const date = new Date(invoice.createdAt);
  const salonName = tenant?.name || BRAND_CONFIG.name;
  const amountPaid = invoice.paidAmountLKR;
  const change = Math.max(0, (invoice.cashReceivedLKR || amountPaid) - invoice.totalLKR);

  return (
    <div className="receipt-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#140921]/75 backdrop-blur-xs overflow-y-auto">
      <style>{`
        .thermal-receipt { width: 100%; max-width: ${paperWidth === '58mm' ? '58mm' : '80mm'}; margin-inline: auto; color: #000; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.35; }
        .thermal-receipt * { box-sizing: border-box; }
        .receipt-rule { border: 0; border-top: 1px dashed #555; margin: 7px 0; }
        @media print {
          @page { size: ${paperWidth} auto; margin: 0; }
          html, body, #root { width: ${paperWidth}; min-width: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; color: #000 !important; overflow: visible !important; }
          body * { visibility: hidden !important; }
          .receipt-modal, .receipt-modal * { visibility: visible !important; }
          .receipt-modal { position: absolute !important; inset: 0 auto auto 0 !important; display: block !important; width: ${paperWidth} !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: #fff !important; }
          .receipt-modal .receipt-actions { display: none !important; }
          .thermal-receipt { display: block !important; width: ${paperWidth} !important; max-width: ${paperWidth} !important; margin: 0 !important; padding: 3mm !important; font-size: ${paperWidth === '58mm' ? '9px' : '10px'} !important; color: #000 !important; background: #fff !important; }
          .receipt-rule { border-top: 1px dashed #000 !important; }
          a { color: #000 !important; text-decoration: none !important; }
        }
      `}</style>
      <div className="w-full max-w-[440px] my-auto rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="receipt-actions flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><h3 className="text-sm font-bold text-slate-900">Sale confirmed</h3><p className="text-[11px] text-slate-500">Receipt {invoice.invoiceNumber}</p></div></div>
          <button type="button" onClick={onClose} aria-label="Close receipt" className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
        </div>
        <div className="receipt-actions flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
          <label htmlFor="receipt-width" className="text-xs font-medium text-slate-600">Paper width</label>
          <select id="receipt-width" value={paperWidth} onChange={event => changePaperWidth(event.target.value as ReceiptWidth)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs">
            <option value="58mm">58mm thermal</option><option value="80mm">80mm thermal</option>
          </select>
          <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1B0C2D] px-4 py-2 text-xs font-bold text-white hover:bg-[#32154B]"><Printer className="h-4 w-4" /> Print Receipt</button>
        </div>
        <article className="thermal-receipt px-5 py-4" aria-label="Receipt preview">
          <header className="text-center">
            <div className="mb-1 flex justify-center"><Logo variant="light" size="xs" showTagline={false} /></div>
            <p className="text-base font-extrabold tracking-wide">{salonName}</p>
            {tenant?.address && <p>{tenant.address}</p>}
            {(tenant?.city || tenant?.phone) && <p>{[tenant?.city, tenant?.phone].filter(Boolean).join(' · ')}</p>}
            <p className="mt-2 text-xs font-bold tracking-widest">SALES RECEIPT</p>
          </header>
          <hr className="receipt-rule" />
          <div className="space-y-0.5">
            <p><strong>Receipt / Invoice:</strong> {invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> {date.toLocaleDateString('en-GB')} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Customer:</strong> {invoice.customerName}</p>
            {invoice.customerPhone && <p><strong>Phone:</strong> {invoice.customerPhone}</p>}
          </div>
          <hr className="receipt-rule" />
          <div className="space-y-2">
            {invoice.items.map((item, index) => <div key={`${item.itemId}-${index}`}>
              <p className="break-words font-semibold">{item.name}</p>
              <div className="flex justify-between gap-2"><span>{item.quantity} × {formatLKR(item.unitPriceLKR)}</span><span className="shrink-0 font-semibold">{formatLKR(item.totalLKR)}</span></div>
            </div>)}
          </div>
          <hr className="receipt-rule" />
          <div className="space-y-1">
            <div className="flex justify-between gap-2"><span>Subtotal</span><span>{formatLKR(invoice.subtotalLKR)}</span></div>
            {invoice.discountLKR > 0 && <div className="flex justify-between gap-2"><span>Discount</span><span>-{formatLKR(invoice.discountLKR)}</span></div>}
            {invoice.taxLKR > 0 && <div className="flex justify-between gap-2"><span>Tax</span><span>{formatLKR(invoice.taxLKR)}</span></div>}
            {invoice.tipLKR > 0 && <div className="flex justify-between gap-2"><span>Tip</span><span>{formatLKR(invoice.tipLKR)}</span></div>}
            <div className="flex justify-between gap-2 border-t border-black pt-1 text-sm font-extrabold"><span>TOTAL</span><span>{formatLKR(invoice.totalLKR)}</span></div>
            <div className="flex justify-between gap-2"><span>Payment</span><span className="capitalize">{invoice.paymentMethod.replaceAll('_', ' ')}</span></div>
            {invoice.cashReceivedLKR !== undefined && <div className="flex justify-between gap-2"><span>Cash received</span><span>{formatLKR(invoice.cashReceivedLKR)}</span></div>}
            <div className="flex justify-between gap-2"><span>Amount paid</span><span>{formatLKR(amountPaid)}</span></div>
            {change > 0 && <div className="flex justify-between gap-2"><span>Change</span><span>{formatLKR(change)}</span></div>}
            {invoice.balanceLKR > 0 && <div className="flex justify-between gap-2 font-bold"><span>Balance due</span><span>{formatLKR(invoice.balanceLKR)}</span></div>}
          </div>
          <hr className="receipt-rule" />
          <footer className="text-center"><p className="font-bold">Thank you for visiting {salonName}!</p><p className="mt-1">We look forward to seeing you again.</p></footer>
        </article>
        <div className="receipt-actions border-t border-slate-100 px-4 py-3 text-right"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Close</button></div>
      </div>
    </div>
  );
};
