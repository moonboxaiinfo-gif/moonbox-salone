import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { Logo } from '../brand/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  CheckCircle2,
  Scissors,
  Eye,
  EyeOff
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn, switchDemoUser } = useAuth();
  const { navigate } = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await signIn(email, password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials. Please verify your email and password.');
        setIsSubmitting(false);
        return;
      }
      // If user is superadmin email, navigate to /superadmin, otherwise /app
      if (email.toLowerCase().includes('superadmin') || email.toLowerCase().includes('admin@moonbox')) {
        navigate('/superadmin');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoOwnerLogin = () => {
    switchDemoUser('owner');
    navigate('/app');
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
            onClick={() => navigate('/register')}
            className="text-xs font-bold text-[#DE9E74] hover:underline hidden sm:inline-block"
          >
            Create New Salon →
          </button>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="max-w-md w-full mx-auto my-8">
        <div className={`rounded-3xl border p-7 sm:p-8 shadow-2xl transition-colors ${
          isDark ? 'bg-[#1B0C2D] border-[#381A54]' : 'bg-white border-[#E8DFD6]'
        }`}>
          {/* Header Title */}
          <div className="space-y-1 mb-6 text-center">
            <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#181124]'}`}>
              Sign In to Your Salon
            </h1>
            <p className="text-xs opacity-75">
              Access your salon management dashboard, appointments, and POS.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 opacity-90">
                Salon Email Address
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold opacity-90">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-[11px] font-semibold text-[#DE9E74] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#DE9E74] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#DE9E74]/50 ${
                    isDark
                      ? 'bg-[#25103B] border-[#48206C] text-white placeholder:text-slate-500 focus:border-[#DE9E74]'
                      : 'bg-[#FAF8F5] border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#DE9E74]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-[#DE9E74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE9E74]/50 rounded"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Development-only shortcuts; never expose test access in production. */}
          {import.meta.env.DEV && <div className="mt-6 pt-5 border-t border-slate-200/20 text-center space-y-3">
            <span className="text-[11px] opacity-60 block">
              Testing & preview environment shortcuts:
            </span>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDemoOwnerLogin}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  isDark
                    ? 'bg-[#251239] border-[#3F1A5B] text-white hover:bg-[#30164A]'
                    : 'bg-[#FAF8F5] border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Scissors className="w-3.5 h-3.5 text-[#DE9E74]" />
                <span>Explore Demo Salon (Flagship Colombo)</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/superadmin')}
                className="text-[11px] text-[#A693AC] hover:text-[#DE9E74] transition-colors py-1 flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Platform Administrator Portal Access →</span>
              </button>
            </div>
          </div>}

          {/* Register Prompt */}
          <div className="mt-6 text-center text-xs opacity-80">
            <span>Don't have a salon workspace yet? </span>
            <button
              onClick={() => navigate('/register')}
              className="font-bold text-[#DE9E74] hover:underline ml-1"
            >
              Start 14-Day Free Trial
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
