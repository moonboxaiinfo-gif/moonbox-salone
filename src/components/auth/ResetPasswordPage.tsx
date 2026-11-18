import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { Logo } from '../brand/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { validatePasswordChange } from '../../services/passwordRecovery';

export const ResetPasswordPage: React.FC = () => {
  const { isLoading, isPasswordRecovery, completePasswordRecovery } = useAuth();
  const { navigate } = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setWarning(null);

    const validationError = validatePasswordChange(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completePasswordRecovery(password, confirmation);
      if (!result.success) {
        setError(result.error || 'Password update failed. Request a new recovery link and try again.');
        return;
      }
      setWarning(result.warning || null);
      setIsSuccess(true);
      setPassword('');
      setConfirmation('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Password update failed. Request a new recovery link and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerClass = `min-h-screen flex flex-col justify-between p-4 sm:p-6 antialiased ${
    isDark ? 'bg-[#10061A] text-[#F3C9AB]' : 'bg-[#FAF8F5] text-[#181124]'
  }`;
  const cardClass = `rounded-3xl border p-7 sm:p-8 shadow-2xl ${
    isDark ? 'bg-[#1B0C2D] border-[#381A54]' : 'bg-white border-[#E8DFD6]'
  }`;

  return (
    <div className={containerClass}>
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <button onClick={() => navigate('/')} className="text-left" aria-label="Return to Moonbox Salon home">
          <Logo variant={isDark ? 'dark' : 'light'} size="sm" showTagline={false} />
        </button>
        <ThemeToggle />
      </header>

      <main className="max-w-md w-full mx-auto my-8">
        <section className={cardClass}>
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#DE9E74]/15 text-[#DE9E74] flex items-center justify-center mx-auto">
              {isSuccess ? <CheckCircle2 className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
            </div>
            <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#181124]'}`}>
              {isSuccess ? 'Password Updated' : 'Choose a New Password'}
            </h1>
            <p className="text-xs opacity-75">
              {isSuccess
                ? 'Your password was updated. Sign in again to continue.'
                : 'Use a strong password you have not used for this account before.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2.5" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {warning && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs" role="status">
              {warning}
            </div>
          )}

          {isLoading ? (
            <div className="py-6 text-center text-xs opacity-75" role="status">Verifying your recovery link…</div>
          ) : isSuccess ? (
            <div className="space-y-3">
              <button onClick={() => navigate('/superadmin')} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] font-extrabold text-xs">
                Continue to Super Admin sign in
              </button>
              <button onClick={() => navigate('/login')} className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-bold">
                Continue to salon sign in
              </button>
            </div>
          ) : !isPasswordRecovery ? (
            <div className="space-y-4">
              <p className="text-xs text-center opacity-75">
                This recovery link is invalid, expired, or already used. Request a new link to continue.
              </p>
              <button onClick={() => navigate('/forgot-password')} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] font-extrabold text-xs">
                Request a new recovery link
              </button>
              <button onClick={() => navigate('/login')} className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-bold inline-flex items-center justify-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-xs font-bold mb-1.5">New password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#DE9E74] absolute left-3.5 top-3" />
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-[#DE9E74]/50"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-xs font-bold mb-1.5">Confirm new password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#DE9E74] absolute left-3.5 top-3" />
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={event => setConfirmation(event.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-[#DE9E74]/50"
                  />
                </div>
              </div>
              <p className="text-[11px] opacity-70">
                At least 12 characters, including uppercase and lowercase letters, a number, and a symbol.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] font-extrabold text-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Updating password…' : 'Update password'}
              </button>
            </form>
          )}
        </section>
      </main>

      <footer className="text-center text-[11px] opacity-60 py-2">
        <span>© {new Date().getFullYear()} Moonbox Salon SaaS · Engineered by Moonbox Digital (Sri Lanka)</span>
      </footer>
    </div>
  );
};
