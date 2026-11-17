import React, { useState } from 'react';
import { 
  Bell, 
  UserCheck, 
  LogOut, 
  ShieldAlert, 
  ShieldCheck,
  Menu,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useNotifications } from '../../context/NotificationContext';
import { Logo } from '../brand/Logo';

import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onToggleMobileNav: () => void;
  onOpenNotifications: () => void;
  onOpenLandingPage?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileNav,
  onOpenNotifications,
  onOpenLandingPage,
}) => {
  const { currentUser, isSuperAdmin, switchDemoUser, logout } = useAuth();
  const { tenant } = useTenant();
  const { unreadCount } = useNotifications();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  return (
    <header className="h-16 bg-white/95 dark:bg-[#151529]/95 backdrop-blur-md border-b border-[#E2DFF0] dark:border-[#343047] sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left side: Mobile Toggle & Salon Name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-[#AAA6BD] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1B31]"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isSuperAdmin ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/15 text-[#B8A5FF] flex items-center justify-center font-bold text-xs border border-[#8B5CF6]/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[#B8A5FF] block">
                Platform Admin Area
              </span>
              <h2 className="text-sm font-bold text-[#101225] dark:text-[#F6F3FB] -mt-0.5">Moonbox Digital Engine</h2>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-[#101225] dark:text-[#F6F3FB] tracking-tight">
              {tenant?.name || 'Moonbox Salon'}
            </span>
            <span className="text-xs text-[#858198] hidden md:inline">
              · {tenant?.city || 'Colombo'}
            </span>
          </div>
        )}
      </div>

      {/* Right side: Actions & User Switcher */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Theme Mode Toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 dark:text-[#AAA6BD] hover:text-[#101225] dark:hover:text-[#F6F3FB] hover:bg-slate-100 dark:hover:bg-[#1C1B31] transition-colors"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EA7180] ring-2 ring-white dark:ring-[#151529]" />
          )}
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-[#343047] mx-0.5" />

        {/* Demo Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1C1B31] hover:bg-slate-50 dark:hover:bg-[#25223D] border border-[#E2DFF0] dark:border-[#343047] transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block leading-tight pr-1">
              <span className="block text-xs font-bold text-[#1B0C2D] dark:text-[#F3C9AB] truncate max-w-[120px]">
                {currentUser?.name}
              </span>
              <span className="block text-[10px] text-[#7E6F80] dark:text-[#A893AF] capitalize font-medium">
                {currentUser?.role === 'superadmin' ? 'Super Admin' : currentUser?.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300" />
          </button>

          {/* Role selection dropdown */}
          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1C1B31] rounded-2xl shadow-xl border border-[#E2DFF0] dark:border-[#343047] py-2 z-50">
              <div className="px-3.5 py-2 border-b border-slate-100 dark:border-[#343047]">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-[#858198]">
                  Account
                </p>
                <p className="text-xs text-slate-600 dark:text-[#AAA6BD] mt-0.5">
                  {import.meta.env.DEV ? 'Development role preview:' : 'Signed in to your salon workspace.'}
                </p>
              </div>

              {import.meta.env.DEV && <div className="py-1">
                <button
                  onClick={() => { switchDemoUser('owner'); setShowRoleMenu(false); }}
                  className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#25223D] ${currentUser?.role === 'owner' ? 'text-[#8B5CF6] dark:text-[#B8A5FF] font-bold bg-[#8B5CF6]/5 dark:bg-[#8B5CF6]/15' : 'text-slate-700 dark:text-[#F6F3FB]'}`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#8B5CF6] dark:text-[#B8A5FF]" />
                    <div>
                      <p className="font-semibold">Salon Owner</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#858198]">Full Salon & Portfolio Access</p>
                    </div>
                  </div>
                  {currentUser?.role === 'owner' && <span className="text-[10px] font-bold text-[#8B5CF6] dark:text-[#B8A5FF]">Current</span>}
                </button>

                <button
                  onClick={() => { switchDemoUser('receptionist'); setShowRoleMenu(false); }}
                  className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#25223D] ${currentUser?.role === 'receptionist' ? 'text-[#8B5CF6] dark:text-[#B8A5FF] font-bold bg-[#8B5CF6]/5 dark:bg-[#8B5CF6]/15' : 'text-slate-700 dark:text-[#F6F3FB]'}`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#4BBF98]" />
                    <div>
                      <p className="font-semibold">Receptionist</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#858198]">POS, Appointments & CRM</p>
                    </div>
                  </div>
                  {currentUser?.role === 'receptionist' && <span className="text-[10px] font-bold text-[#8B5CF6] dark:text-[#B8A5FF]">Current</span>}
                </button>

                <button
                  onClick={() => { switchDemoUser('staff'); setShowRoleMenu(false); }}
                  className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#25223D] ${currentUser?.role === 'staff' ? 'text-[#8B5CF6] dark:text-[#B8A5FF] font-bold bg-[#8B5CF6]/5 dark:bg-[#8B5CF6]/15' : 'text-slate-700 dark:text-[#F6F3FB]'}`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#B8A5FF]" />
                    <div>
                      <p className="font-semibold">Staff Stylist</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#858198]">Schedule & Commission Only</p>
                    </div>
                  </div>
                  {currentUser?.role === 'staff' && <span className="text-[10px] font-bold text-[#8B5CF6] dark:text-[#B8A5FF]">Current</span>}
                </button>

                <button
                  onClick={() => { switchDemoUser('superadmin'); setShowRoleMenu(false); }}
                  className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#25223D] ${currentUser?.role === 'superadmin' ? 'text-[#8B5CF6] dark:text-[#B8A5FF] font-bold bg-[#8B5CF6]/5 dark:bg-[#8B5CF6]/15' : 'text-slate-700 dark:text-[#F6F3FB]'}`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#E7B363]" />
                    <div>
                      <p className="font-semibold">Super Admin</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#858198]">Platform management & tenant control</p>
                    </div>
                  </div>
                  {currentUser?.role === 'superadmin' && <span className="text-[10px] font-bold text-[#8B5CF6] dark:text-[#B8A5FF]">Current</span>}
                </button>
              </div>}

              <div className="pt-1 border-t border-slate-100 dark:border-[#343047] px-2">
                <button
                  onClick={async () => {
                    await logout();
                    setShowRoleMenu(false);
                    if (onOpenLandingPage) onOpenLandingPage();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-[#EA7180] hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
