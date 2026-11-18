import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { Logo } from '../brand/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  AlertCircle, 
  KeyRound, 
  QrCode, 
  Copy, 
  Check, 
  ArrowLeft,
  ShieldAlert,
  Smartphone
} from 'lucide-react';

interface SuperAdminLoginProps {
  onSuccess: () => void;
  onExitToPublic: () => void;
}

export const SuperAdminLogin: React.FC<SuperAdminLoginProps> = ({ onSuccess, onExitToPublic }) => {
  const { signInSuperAdmin, enrollSuperAdminMFA, verifySuperAdminMFA } = useAuth();
  const { navigate } = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Step 1: Credentials | Step 2: MFA Challenge
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');

  // Credentials State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // MFA State
  const [factorId, setFactorId] = useState<string>('');
  const [totpCode, setTotpCode] = useState('');
  const [enrollmentData, setEnrollmentData] = useState<{
    qrCode?: string;
    secret?: string;
    uri?: string;
  } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Handle Initial Password Authentication
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide administrator email and security password.');
      return;
    }

    if (password === 'admin12345' || password === 'admin' || password === 'password') {
      setError('Insecure default passwords are prohibited. Please supply authorized security credentials.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signInSuperAdmin(email.trim(), password);

      if (!res.success) {
        setError(res.error || 'Invalid platform administrator credentials or unauthorized account.');
        setIsSubmitting(false);
        return;
      }

      if (res.requiresMFA) {
        setFactorId(res.factorId || 'totp');

        // Check if user requires TOTP enrollment
        if (res.factorId === 'needs_enrollment' || res.factorId === 'local_totp_factor') {
          const enrollRes = await enrollSuperAdminMFA();
          if (!enrollRes.success || !enrollRes.data) {
            setError(enrollRes.error || 'Controlled administrator MFA enrollment is unavailable.');
            return;
          }
          setEnrollmentData(enrollRes.data);
          setFactorId(enrollRes.data.factorId);
        }

        setStep('mfa');
      } else {
        // Direct success if assurance level already achieved
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Platform administrator authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Handle TOTP MFA Verification (AAL2 enforcement)
  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = totpCode.trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError('Please enter a valid 6-digit numeric authenticator code.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await verifySuperAdminMFA(factorId, cleanCode);

      if (!res.success) {
        setError(res.error || 'Invalid authenticator code. MFA verification failed.');
        setIsSubmitting(false);
        return;
      }

      // Verification passed at assurance level AAL2
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Multi-Factor verification error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col justify-center items-center p-4 antialiased ${
      isDark ? 'bg-[#101225] text-[#F6F3FB]' : 'bg-[#F8F7FC] text-[#101225]'
    }`}>
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-block p-1 rounded-2xl border border-[#343047] shadow-xl bg-[#151529]">
            <Logo variant="dark" size="lg" showTagline={true} />
          </div>

          <div className="pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7B363]/15 border border-[#E7B363]/30 text-[#E7B363] text-[11px] font-bold tracking-wider uppercase">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Platform Administration Gateway</span>
            </div>
            <h2 className={`text-2xl font-extrabold mt-2 tracking-tight ${isDark ? 'text-[#F6F3FB]' : 'text-[#101225]'}`}>
              Super Admin Portal
            </h2>
            <p className="text-xs text-[#858198] dark:text-[#AAA6BD] mt-1">
              Restricted to verified Moonbox Digital administrators with mandatory TOTP MFA.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className={`rounded-3xl border p-7 shadow-2xl space-y-5 transition-colors ${
          isDark ? 'bg-[#1C1B31] border-[#343047]' : 'bg-white border-[#E2DFF0]'
        }`}>
          {error && (
            <div className="p-3.5 rounded-xl bg-[#EA7180]/15 border border-[#EA7180]/30 text-[#EA7180] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EA7180] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'credentials' ? (
            /* ======================================================== */
            /* STEP 1: CREDENTIALS (Email & Strong Password)            */
            /* ======================================================== */
            <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1.5 text-[#101225] dark:text-[#F6F3FB]">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter platform administrator email"
                    autoComplete="username"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                      isDark 
                        ? 'bg-[#25223D] border border-[#343047] text-[#F6F3FB] placeholder:text-[#858198]' 
                        : 'bg-[#F8F7FC] border border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-[#101225] dark:text-[#F6F3FB]">
                  Security Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter strong security credential"
                    autoComplete="current-password"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                      isDark 
                        ? 'bg-[#25223D] border border-[#343047] text-[#F6F3FB] placeholder:text-[#858198]' 
                        : 'bg-[#F8F7FC] border border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white font-extrabold text-xs shadow-lg shadow-[#8B5CF6]/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Verifying Credentials...' : 'Continue to Second Factor (MFA)'}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="w-full text-center text-[11px] font-semibold text-[#8B5CF6] hover:underline dark:text-[#B8A5FF]"
              >
                Forgot administrator password?
              </button>
            </form>
          ) : (
            /* ======================================================== */
            /* STEP 2: TOTP MULTI-FACTOR AUTHENTICATION (AAL2)          */
            /* ======================================================== */
            <form onSubmit={handleMFASubmit} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-[#B8A5FF] shrink-0" />
                <div>
                  <h4 className="font-bold text-[#F6F3FB] text-xs">Authenticator App Verification</h4>
                  <p className="text-[11px] text-[#AAA6BD]">
                    Second factor required (Google Authenticator, Microsoft Authenticator, Authy, or 1Password).
                  </p>
                </div>
              </div>

              {/* If newly enrolling TOTP, show the QR Code / Secret Key */}
              {enrollmentData && (
                <div className="p-4 rounded-2xl bg-[#25223D] border border-[#343047] space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D5BD88] block">
                    Authenticator Enrollment Setup
                  </span>

                  {enrollmentData.qrCode ? (
                    <div className="bg-white p-3 rounded-xl w-36 h-36 mx-auto flex items-center justify-center">
                      <img 
                        src={enrollmentData.qrCode} 
                        alt="TOTP Authenticator QR Code" 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#151529] border border-[#343047] text-center">
                      <QrCode className="w-10 h-10 text-[#8B5CF6] mx-auto mb-1" />
                      <span className="text-[11px] text-[#AAA6BD]">
                        Add manual account to your Authenticator:
                      </span>
                    </div>
                  )}

                  {enrollmentData.secret && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#AAA6BD] block">Secret Key (Base32):</span>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 rounded-lg bg-[#151529] border border-[#343047] font-mono text-xs text-[#B8A5FF] select-all truncate">
                          {enrollmentData.secret}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="p-2 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#B8A5FF] hover:text-white text-xs flex items-center gap-1 transition-colors"
                          title="Copy Secret Key"
                        >
                          {copiedSecret ? <Check className="w-4 h-4 text-[#4BBF98]" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold mb-1.5 text-[#101225] dark:text-[#F6F3FB]">
                  6-Digit Authenticator Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                    autoFocus
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-center font-mono text-base tracking-[0.3em] font-bold focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                      isDark 
                        ? 'bg-[#25223D] border border-[#343047] text-[#F6F3FB] placeholder:text-[#858198]' 
                        : 'bg-[#F8F7FC] border border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-[#858198] mt-1 text-center">
                  Enter the 6-digit one-time code currently displayed in your authenticator app.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setError(null);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-[#343047] text-[#AAA6BD] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || totpCode.trim().length !== 6}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white font-extrabold text-xs shadow-lg shadow-[#8B5CF6]/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Verifying Second Factor...' : 'Verify & Enter Control Portal'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center">
          <button
            onClick={onExitToPublic}
            className="text-xs text-[#858198] hover:text-[#B8A5FF] transition-colors"
          >
            ← Return to Moonbox Salon Public Site
          </button>
        </div>
      </div>
    </div>
  );
};
