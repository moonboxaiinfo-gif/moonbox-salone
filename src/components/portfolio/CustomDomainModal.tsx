import React, { useState } from 'react';
import { SalonTenant } from '../../types';
import { StorageService } from '../../services/storageService';
import { Globe, CheckCircle2, ShieldCheck, Copy, Check, AlertCircle } from 'lucide-react';

interface CustomDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: SalonTenant;
  onSaved: () => void;
}

export const CustomDomainModal: React.FC<CustomDomainModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onSaved
}) => {
  if (!isOpen) return null;

  const [domainInput, setDomainInput] = useState(tenant.portfolio.customDomain?.domain || 'colombo.moonboxsalon.lk');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const verificationToken = tenant.portfolio.customDomain?.token || `mbx_verify_${tenant.slug}_${Date.now().toString(36)}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDomain = () => {
    setIsSaving(true);
    setStatusMessage(null);

    // Normalize domain
    const cleanDomain = domainInput.toLowerCase().trim().replace(/https?:\/\//, '').replace(/\/.*$/, '');
    if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(cleanDomain)) {
      setStatusMessage('Enter a valid domain name before saving DNS instructions.');
      setIsSaving(false);
      return;
    }

    const updated = {
      ...tenant,
      portfolio: {
        ...tenant.portfolio,
        customDomain: {
          domain: cleanDomain,
          // Verification and SSL activation require a hosting/DNS provider integration.
          verified: false,
          sslActive: false,
          token: verificationToken
        }
      }
    };

    StorageService.updateTenant(updated);
    setIsSaving(false);
    setStatusMessage('DNS instructions saved. Verification and SSL activation will be available after a domain provider integration is connected.');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140921]/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E8DFD6] overflow-hidden">
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8DFD6] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#9B3E88]" />
            <h3 className="font-bold text-sm text-[#1B0C2D]">Custom Domain & SSL Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
            Cancel
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Connect your salon's custom web address (e.g. <strong>salon.yourbrand.lk</strong>) to your public Moonbox booking portal.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Your Custom Domain</label>
            <input
              type="text"
              value={domainInput}
              onChange={e => setDomainInput(e.target.value)}
              placeholder="e.g. booking.glamoursalon.lk"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#9B3E88]"
            />
          </div>

          {/* DNS Configuration Instructions */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              DNS Records Setup Instructions
            </h4>
            <p className="text-[11px] text-slate-500">
              Add the following CNAME record in your domain registrar DNS settings (LK Domain Registry / Cloudflare / GoDaddy):
            </p>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Type & Host</span>
                  <span className="font-bold text-slate-800">CNAME  @ / sub-domain</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Target Value</span>
                  <span className="font-bold text-[#9B3E88]">edge.moonboxdigital.com</span>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Verification Token</span>
                  <span className="font-bold text-slate-700 truncate max-w-[200px] block">{verificationToken}</span>
                </div>
                <button
                  onClick={() => handleCopy(verificationToken)}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-sans text-xs"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveDomain}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs flex items-center gap-1.5"
            >
              {isSaving ? <span>Saving...</span> : <span>Save DNS Instructions</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
