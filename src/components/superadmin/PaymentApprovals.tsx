import React, { useState } from 'react';
import { ManualPaymentRequest } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatLKR } from '../../constants/brand';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, XCircle, FileText, Eye, AlertCircle, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { PrivateReceiptService } from '../../services/privateReceiptService';

export const PaymentApprovals: React.FC = () => {
  const { currentUser } = useAuth();
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewReceipt, setPreviewReceipt] = useState<{ url: string; fileName?: string } | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openingReceiptId, setOpeningReceiptId] = useState<string | null>(null);
  const [, setRefreshKey] = useState(0);
  const payments = StorageService.getManualPayments();
  const reviewer = currentUser?.email || 'superadmin@moonboxdigital.com';

  const handleApprove = async (payment: ManualPaymentRequest) => {
    if (payment.status !== 'pending') return;
    if (!payment.receiptUrl) {
      setActionError('This payment cannot be approved until an uploaded receipt is available.');
      return;
    }
    setActionError(null);
    try {
      await StorageService.reviewPaymentConfirmed(payment.id, 'approved');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Payment approval failed.');
      return;
    }
    setRefreshKey(value => value + 1);
  };

  const handleConfirmReject = async () => {
    if (!rejectingPaymentId) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      setActionError('A rejection reason is required.');
      return;
    }
    try {
      await StorageService.reviewPaymentConfirmed(rejectingPaymentId, 'rejected', reason);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Payment rejection failed.');
      return;
    }
    setRejectingPaymentId(null);
    setRejectionReason('');
    setActionError(null);
    setRefreshKey(value => value + 1);
  };

  const openReceipt = async (payment: ManualPaymentRequest) => {
    setActionError(null);
    if (!payment.receiptUrl || /^https?:\/\//i.test(payment.receiptUrl)) {
      setActionError('This receipt uses the legacy public-link format. Ask the salon owner to upload it again to private Supabase Storage before review.');
      return;
    }
    setOpeningReceiptId(payment.id);
    try {
      const signedUrl = await PrivateReceiptService.getAdminViewUrl(payment.id);
      setPreviewReceipt({ url: signedUrl, fileName: payment.receiptFileName });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not open the private payment receipt.');
    } finally {
      setOpeningReceiptId(null);
    }
  };

  const closePreview = () => {
    setPreviewReceipt(null);
    setPreviewScale(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-3xl border border-[#E8DFD6] bg-white p-5">
        <div>
          <h3 className="text-base font-bold text-[#1B0C2D]">Bank Transfer Approvals & Verification</h3>
          <p className="text-xs text-slate-500">Review deposited bank slips from Sri Lankan salons to activate or renew SaaS subscriptions.</p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{payments.filter(p => p.status === 'pending').length} Pending Review</span>
      </div>

      {actionError && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{actionError}</span></div>}

      {payments.length === 0 ? <EmptyState icon={FileText} title="No bank payment slips" description="When salon owners upload payment slips for plan renewals, they will appear here for verification." /> : (
        <div className="overflow-hidden rounded-3xl border border-[#E8DFD6] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="border-b border-[#E8DFD6] bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3.5">Submitted Date</th><th className="px-4 py-3.5">Salon / Account</th><th className="px-4 py-3.5">Plan & Cycle</th><th className="px-4 py-3.5">Reference</th><th className="px-4 py-3.5 text-center">Receipt</th><th className="px-4 py-3.5 text-right">Amount (LKR)</th><th className="px-4 py-3.5 text-center">Status</th><th className="px-4 py-3.5 text-center">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 text-slate-500">{new Date(payment.createdAt).toLocaleDateString('en-GB')}<span className="block text-[10px] text-slate-400">{new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                    <td className="px-4 py-3.5"><span className="block font-bold text-[#1B0C2D]">{payment.salonName}</span><span className="text-[11px] text-slate-400">{payment.ownerEmail}</span></td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">{payment.planName}<span className="block text-[10px] text-slate-400">{payment.billingCycle}</span></td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{payment.bankReference}</td>
                    <td className="px-4 py-3.5 text-center">{payment.receiptUrl ? <button type="button" disabled={openingReceiptId === payment.id} onClick={() => void openReceipt(payment)} className="inline-flex items-center gap-1 font-semibold text-[#9B3E88] hover:underline disabled:opacity-50"><Eye className="h-3.5 w-3.5" /> {openingReceiptId === payment.id ? 'Opening…' : 'View Slip'}</button> : <span className="text-slate-300">No Receipt</span>}</td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-[#1B0C2D]">{formatLKR(payment.amountLKR)}</td>
                    <td className="px-4 py-3.5 text-center"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${payment.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : payment.status === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{payment.status}</span></td>
                    <td className="px-4 py-3.5 text-center">{payment.status === 'pending' ? <div className="flex items-center justify-center gap-1.5"><button type="button" onClick={() => handleApprove(payment)} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700">Approve</button><button type="button" onClick={() => { setActionError(null); setRejectingPaymentId(payment.id); }} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">Reject</button></div> : <span className="text-[11px] text-slate-400">Reviewed by {payment.reviewedBy?.split('@')[0] || 'admin'}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rejectingPaymentId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"><div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-xs shadow-2xl"><h4 className="text-sm font-bold text-[#1B0C2D]">Reject Payment Slip</h4><p className="text-slate-600">A rejection reason is required and will be shown to the salon owner.</p><textarea autoFocus rows={3} value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} placeholder="e.g. Reference number could not be verified or receipt is unreadable." className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-rose-500 focus:outline-none" />{actionError && <p className="text-rose-600" role="alert">{actionError}</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => { setRejectingPaymentId(null); setActionError(null); }} className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" onClick={handleConfirmReject} disabled={!rejectionReason.trim()} className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">Confirm Reject</button></div></div></div>}

      {previewReceipt && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs" onClick={closePreview}><div className="relative flex max-h-[92vh] max-w-5xl flex-col rounded-2xl bg-white p-3 shadow-2xl" onClick={event => event.stopPropagation()}><div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2"><span className="max-w-[22rem] truncate text-xs font-semibold text-slate-700">{previewReceipt.fileName || 'Payment receipt'}</span><div className="flex items-center gap-1"><button type="button" onClick={() => setPreviewScale(value => Math.max(0.75, value - 0.25))} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button><button type="button" onClick={() => setPreviewScale(value => Math.min(2.5, value + 0.25))} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button><button type="button" onClick={() => setPreviewScale(1)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Reset zoom"><RotateCcw className="h-4 w-4" /></button><a href={previewReceipt.url} download={previewReceipt.fileName || 'payment-receipt'} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Download receipt"><Download className="h-4 w-4" /></a><button type="button" onClick={closePreview} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button></div></div>{/\.pdf(?:$|\?)/i.test(previewReceipt.url) || /\.pdf$/i.test(previewReceipt.fileName || '') ? <iframe title="Payment receipt PDF" src={previewReceipt.url} className="h-[78vh] w-[min(80vw,60rem)] rounded-xl border border-slate-200" /> : <div className="max-h-[80vh] overflow-auto rounded-xl bg-slate-100 p-2"><img src={previewReceipt.url} alt="Uploaded payment receipt" style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center' }} className="mx-auto max-h-[76vh] w-auto rounded-xl object-contain transition-transform" /></div>}<p className="mt-2 text-center text-xs text-slate-500">Only authorized Super Admins can open payment receipts.</p></div></div>}
    </div>
  );
};
