import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useRouter } from '../../context/RouterContext';
import { Logo } from '../brand/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { BRAND_CONFIG } from '../../constants/brand';
import { 
  Clock, 
  Building2, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  RefreshCw, 
  LogOut, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

export const SalonPendingApproval: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { tenant, refreshTenant } = useTenant();
  const { navigate } = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      refreshTenant();
      setTimeout(() => {
        setIsRefreshing(false);
        setRefreshMessage('Checked platform status. Salon workspace is currently in review queue.');
      }, 600);
    } catch {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const rawWa = BRAND_CONFIG.whatsapp;
  const cleanWa = rawWa.replace(/[^0-9]/g, '');
  const waUrl = cleanWa.startsWith('0') 
    ? `https://wa.me/94${cleanWa.substring(1)}?text=Hello%20Moonbox%20Team%2C%20I%20have%20registered%20my%20salon%20${encodeURIComponent(tenant?.name || '')}%20and%20would%20like%20to%20request%20trial%20activation.`
    : `https://wa.me/94${cleanWa}`;

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col justify-between p-4 sm:p-6 antialiased ${
      isDark ? 'bg-[#101225] text-[#F6F3FB]' : 'bg-[#F8F7FC] text-[#101225]'
    }`}>
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <Logo variant={isDark ? 'dark' : 'light'} size="sm" showTagline={true} />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#343047] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#25223D] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-[#EA7180]" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Status Container */}
      <main className="max-w-2xl w-full mx-auto my-6">
        <div className={`rounded-3xl border p-6 sm:p-8 shadow-2xl transition-colors space-y-6 ${
          isDark ? 'bg-[#1C1B31] border-[#343047]' : 'bg-white border-[#E2DFF0]'
        }`}>
          {/* Status Badge & Icon */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#E7B363]/15 text-[#E7B363] border border-[#E7B363]/30 flex items-center justify-center shadow-lg shadow-[#E7B363]/10">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7B363]/15 text-[#E7B363] border border-[#E7B363]/30 text-xs font-bold uppercase tracking-wider">
              <span>Registration Status: Pending Approval</span>
            </div>

            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#101225]'}`}>
              {tenant?.name || 'Your Salon Workspace'}
            </h1>

            <p className="text-xs text-[#858198] dark:text-[#AAA6BD] max-w-lg mx-auto leading-relaxed">
              Your salon registration has been securely provisioned in our database. In accordance with platform policy, new salon workspaces are reviewed by Moonbox Digital Platform Administrators before trial activation or package assignment.
            </p>
          </div>

          {/* Refresh Notification message */}
          {refreshMessage && (
            <div className="p-3 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-xs text-[#B8A5FF] text-center">
              {refreshMessage}
            </div>
          )}

          {/* Provisioned Workspace Identity Summary */}
          <div className="p-5 rounded-2xl bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] space-y-3 text-xs">
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-[#858198] dark:text-[#AAA6BD]">
              Registered Salon Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <div>
                  <span className="text-[10px] text-[#858198] block">Salon Name</span>
                  <span className="font-bold text-[#101225] dark:text-[#F6F3FB]">{tenant?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <div>
                  <span className="text-[10px] text-[#858198] block">Owner Account</span>
                  <span className="font-bold text-[#101225] dark:text-[#F6F3FB]">{currentUser?.name} ({currentUser?.email})</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <div>
                  <span className="text-[10px] text-[#858198] block">Location</span>
                  <span className="font-bold text-[#101225] dark:text-[#F6F3FB]">{tenant?.city}, Sri Lanka</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <div>
                  <span className="text-[10px] text-[#858198] block">Contact Number</span>
                  <span className="font-bold text-[#101225] dark:text-[#F6F3FB]">{tenant?.phone}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-[#343047] flex items-center justify-between">
              <span className="text-[11px] text-[#858198]">Reserved Booking URL:</span>
              <span className="font-mono text-xs text-[#8B5CF6] font-semibold">/book/{tenant?.slug}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking Platform Status...' : 'Check Approval Status'}</span>
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-xl border border-[#4BBF98]/40 bg-[#4BBF98]/10 text-[#4BBF98] text-xs font-bold hover:bg-[#4BBF98]/20 transition-all flex items-center justify-center gap-2 text-center"
            >
              <MessageSquare className="w-4 h-4 text-[#4BBF98]" />
              <span>WhatsApp Moonbox Support</span>
            </a>
          </div>

          {/* Support Information */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#343047] text-center text-[11px] text-[#858198] space-y-1">
            <p>
              Direct Support Helpline: <strong className="text-[#101225] dark:text-[#F6F3FB]">{BRAND_CONFIG.phone}</strong> · Email: <strong className="text-[#101225] dark:text-[#F6F3FB]">{BRAND_CONFIG.supportEmail}</strong>
            </p>
            <p>
              Colombo 03 Headquarters · Moonbox Digital (Pvt) Ltd
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-[#858198] py-2">
        <span>© {new Date().getFullYear()} Moonbox Salon Platform</span>
      </footer>
    </div>
  );
};
