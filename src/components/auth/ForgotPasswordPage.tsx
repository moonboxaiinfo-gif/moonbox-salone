import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { Logo } from '../brand/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  KeyRound
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const { navigate } = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPassword(email.trim());
      if (!res.success) {
        setError(res.error || 'Unable to process password reset for this email.');
        setIsSubmitting(false);
        return;
      }
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col justify-between p-4 sm:p-6 antialiased ${
      isDark ? 'bg-[#10061A] text-[#F3C9AB]' : 'bg-[#FAF8F5] text-[#181124]'
    }`}>
      {/* Top Header Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 group transition-opacity hover:opacity-90 text-left"
        >
          <Logo variant={isDark ? 'dark' : 'light'} size="sm" showTagline={false} />
        </button>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-bold text-[#DE9E74] hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </header>

      {/* Main Password Recovery Card */}
      <main className="max-w-md w-full mx-auto my-8">
        <div className={`rounded-3xl border p-7 sm:p-8 shadow-2xl transition-colors ${
          isDark ? 'bg-[#1B0C2D] border-[#381A54]' : 'bg-white border-[#E8DFD6]'
        }`}>
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#DE9E74]/15 text-[#DE9E74] flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#181124]'}`}>
              Recover Account Access
            </h1>
            <p className="text-xs opacity-75">
              Enter your registered account email. We’ll send instructions to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm">Reset Link Dispatched</h3>
                <p className="text-xs opacity-75">
                  If an account exists for <strong>{email}</strong>, you will receive password reset instructions shortly.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] font-extrabold text-xs shadow-md mt-2"
              >
                Return to Salon Sign In
              </button>
              <button
                onClick={() => navigate('/superadmin')}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
              >
                Return to Super Admin Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 opacity-90">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#DE9E74] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="owner@your-salon.lk"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#DE9E74]/50 ${
                      isDark
                        ? 'bg-[#25103B] border-[#48206C] text-white placeholder:text-slate-500 focus:border-[#DE9E74]'
                        : 'bg-[#FAF8F5] border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#DE9E74]'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Sending Request...' : 'Send Password Reset Link'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-200/20 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-xs text-slate-400 hover:text-[#DE9E74] transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] opacity-60 py-2">
        <span>© {new Date().getFullYear()} Moonbox Salon SaaS · Engineered by Moonbox Digital (Sri Lanka)</span>
      </footer>
    </div>
  );
};
