import React, { useState } from 'react';
import { SalonTenant, SubscriptionPlan, BillingCycle, ManualPaymentRequest } from '../../types';
import { StorageService } from '../../services/storageService';
import { PrivateReceiptService } from '../../services/privateReceiptService';
import { formatLKR, BRAND_CONFIG } from '../../constants/brand';
import { Upload, X, AlertCircle, Building, CheckCircle2 } from 'lucide-react';

interface BankTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: SalonTenant;
  selectedPlan: SubscriptionPlan;
  billingCycle: BillingCycle;
  onSubmitted: () => void;
}

export const BankTransferModal: React.FC<BankTransferModalProps> = ({
  isOpen,
  onClose,
  tenant,
  selectedPlan,
  billingCycle,
  onSubmitted
}) => {
  const amountLKR = billingCycle === 'yearly' ? selectedPlan.yearlyPriceLKR : selectedPlan.monthlyPriceLKR;

  const [bankReference, setBankReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Deposit slip image exceeds 5MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Accepted formats: JPG, PNG, WebP or PDF.');
      return;
    }

    setErrorMsg(null);
    setReceiptFileName(file.name);
    setReceiptUrl('');
    setIsUploading(true);

    const upload = await PrivateReceiptService.upload(file, tenant.id);
    setIsUploading(false);
    if (!upload.success) {
      setReceiptFileName('');
      setErrorMsg(upload.error || 'Receipt upload failed. Please try again.');
      return;
    }
    setReceiptUrl(upload.path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankReference) {
      setErrorMsg('Please enter your Bank Deposit or CEFT Reference Number.');
      return;
    }
    if (!receiptUrl) {
      setErrorMsg('Please upload the actual payment slip before submitting for review.');
      return;
    }

    const newReq: ManualPaymentRequest = {
      id: `pay_slip_${Date.now()}`,
      tenantId: tenant.id,
      salonName: tenant.name,
      ownerEmail: tenant.email,
      planId: selectedPlan.id,
      planName: `${selectedPlan.name} (${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})`,
      billingCycle,
      amountLKR,
      bankReference,
      paymentDate,
      receiptFileName,
      receiptUrl,
      notes,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await StorageService.submitManualPaymentConfirmed(newReq);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Payment submission failed. Please try again.');
      return;
    }
    StorageService.logAudit({
      tenantId: tenant.id,
      actorEmail: tenant.email,
      actorRole: 'owner',
      action: 'SUBMIT_PAYMENT_SLIP',
      entity: 'payment_receipt',
      entityId: newReq.id,
      details: `Submitted bank slip for ${selectedPlan.name} plan (${formatLKR(amountLKR)}, Ref: ${bankReference})`
    });

    setSubmittedSuccessfully(true);
    onSubmitted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140921]/75 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E8DFD6] overflow-hidden my-6">
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8DFD6] flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#9B3E88] uppercase">
              Manual Bank Payment
            </span>
            <h3 className="font-bold text-base text-[#1B0C2D]">
              Upgrade to {selectedPlan.name} ({billingCycle})
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedSuccessfully ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-[#1B0C2D]">Payment Slip Submitted!</h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your deposit reference <strong>{bankReference}</strong> ({formatLKR(amountLKR)}) is now under review by Moonbox Digital Platform Admins. Your subscription will activate promptly upon verification.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-[#1B0C2D] text-[#F3C9AB] text-xs font-bold shadow-md"
            >
              Back to Subscriptions
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Official Moonbox Digital Bank Details Card */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#DE9E74]/40 space-y-2">
              <div className="flex items-center gap-2 text-[#9B3E88] font-bold">
                <Building className="w-4 h-4 text-[#DE9E74]" />
                <span>Moonbox Digital (Pvt) Ltd Official Account</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Bank Name</span>
                  <span className="font-semibold">{BRAND_CONFIG.bankDetails.bankName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Branch</span>
                  <span className="font-semibold">{BRAND_CONFIG.bankDetails.branch}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Account Name</span>
                  <span className="font-semibold">{BRAND_CONFIG.bankDetails.accountName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Account Number</span>
                  <span className="font-bold text-[#1B0C2D] font-mono">{BRAND_CONFIG.bankDetails.accountNumber}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold">
                <span className="text-slate-600">Total Due:</span>
                <span className="text-base text-[#1B0C2D]">{formatLKR(amountLKR)}</span>
              </div>
            </div>

            {/* Slip Inputs */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Bank Reference / CEFT Transfer ID *
              </label>
              <input
                type="text"
                required
                value={bankReference}
                onChange={e => setBankReference(e.target.value)}
                placeholder="e.g. COMB-CEFT-849201"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            {/* Receipt Upload */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Upload Payment Slip / Screenshot * (JPG/PNG/PDF &lt; 5MB)
              </label>
              <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                {receiptFileName ? (
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-xs font-medium text-slate-700 truncate">{isUploading ? 'Uploading securely…' : receiptFileName}</span>
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
                    <span className="text-xs font-semibold text-[#9B3E88]">Choose receipt image or deposit voucher</span>
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
              <label className="block font-semibold text-slate-700 mb-1">Notes / Instructions</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Deposited from Commercial Bank Kollupitiya CDM machine"
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
                disabled={isUploading}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-md transition-all"
              >
                Submit Payment for Review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
