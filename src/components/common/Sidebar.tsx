import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  UserCheck,
  CreditCard,
  FileText,
  Boxes,
  Receipt,
  Percent,
  BarChart3,
  Globe,
  Clock,
  Bell,
  Settings,
  HelpCircle,
  Building2,
  DollarSign,
  Package,
  ShieldCheck,
  Megaphone,
  History,
  X,
  ChevronRight,
  Lock,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { EntitlementService } from '../../services/entitlementService';
import { Logo } from '../brand/Logo';

export type SalonTab = 
  | 'dashboard' 
  | 'appointments' 
  | 'customers' 
  | 'services' 
  | 'staff' 
  | 'pos' 
  | 'invoices' 
  | 'inventory' 
  | 'expenses' 
  | 'commissions' 
  | 'reports' 
  | 'portfolio' 
  | 'online_booking' 
  | 'notifications' 
  | 'settings' 
  | 'support'
  | 'subscription';

export type SuperAdminTab =
  | 'admin_dashboard'
  | 'admin_salons'
  | 'admin_subscriptions'
  | 'admin_payments'
  | 'admin_plans' // legacy deep-link compatibility; intentionally hidden from navigation
  | 'admin_users' // legacy deep-link compatibility; intentionally hidden from navigation
  | 'admin_support'
  | 'admin_announcements'
  | 'admin_audit'
  | 'admin_landing'
  | 'admin_settings';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: 'main' | 'business' | 'growth' | 'system';
  highlight?: boolean;
  badge?: string;
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: any) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { isSuperAdmin, role } = useAuth();
  const { tenant, plan, trialDaysLeft, isTrial } = useTenant();

  // Salon navigation items
  const salonNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'main' },
    { id: 'appointments', label: 'Appointments', icon: Calendar, group: 'main' },
    { id: 'customers', label: 'Customers CRM', icon: Users, group: 'main' },
    { id: 'services', label: 'Services', icon: Sparkles, group: 'business' },
    { id: 'staff', label: 'Staff Team', icon: UserCheck, group: 'business' },
    { id: 'pos', label: 'Point of Sale (POS)', icon: CreditCard, highlight: true, group: 'business' },
    { id: 'invoices', label: 'Invoices & Sales', icon: FileText, group: 'business' },
    { id: 'inventory', label: 'Inventory & Stock', icon: Boxes, group: 'business' },
    { id: 'expenses', label: 'Expenses', icon: Receipt, group: 'business' },
    { id: 'commissions', label: 'Commissions', icon: Percent, group: 'business' },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, group: 'growth' },
    { id: 'portfolio', label: 'Website & Portfolio', icon: Globe, group: 'growth' },
    { id: 'online_booking', label: 'Online Booking', icon: Clock, group: 'growth' },
    { id: 'notifications', label: 'Notifications', icon: Bell, group: 'system' },
    { id: 'settings', label: 'Salon Settings', icon: Settings, group: 'system' },
    { id: 'support', label: 'Help & Support', icon: HelpCircle, group: 'system' },
  ];

  // Super Admin navigation items
  const superAdminNavItems: NavItem[] = [
    { id: 'admin_dashboard', label: 'Platform Dashboard', icon: LayoutDashboard },
    { id: 'admin_salons', label: 'Salons Directory', icon: Building2 },
    { id: 'admin_subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'admin_payments', label: 'Payment Approvals', icon: DollarSign, badge: 'Review' },
    { id: 'admin_support', label: 'Support Tickets', icon: HelpCircle },
    { id: 'admin_announcements', label: 'Announcements', icon: Megaphone },
    { id: 'admin_audit', label: 'Audit Logs', icon: History },
    { id: 'admin_landing', label: 'Landing Page Editor', icon: Globe },
    { id: 'admin_settings', label: 'Platform Settings', icon: Settings },
  ];

  // All nav items are available in the list, locked/hidden per entitlement in render
  const navItems = isSuperAdmin ? superAdminNavItems : salonNavItems;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 ${isCollapsed ? 'w-20' : 'w-64'} bg-[#151529] border-r border-[#343047] flex flex-col transition-[width,transform] duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand Logo Area */}
        <div className={`h-20 ${isCollapsed ? 'px-3 justify-center' : 'px-5'} flex items-center justify-between border-b border-[#343047] bg-[#101225]`}>
          <Logo variant="dark" size={isCollapsed ? 'xs' : 'sm'} showTagline={!isCollapsed} />
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'} py-4 space-y-1`}>

          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const previous = navItems[index - 1];
            const groupLabel = item.group && item.group !== previous?.group
              ? { main: 'Main', business: 'Business', growth: 'Growth', system: 'System' }[item.group]
              : null;
            
            // Check entitlement
            let isAllowed = true;
            if (['online_booking', 'portfolio', 'inventory', 'commissions', 'reports'].includes(item.id)) {
              isAllowed = EntitlementService.canAccessFeature(tenant, item.id as any).allowed;
            }

            return (
              <React.Fragment key={item.id}>
              {groupLabel && !isCollapsed && (
                <div className="px-3 pt-4 pb-1 text-[9px] font-bold tracking-[0.2em] text-[#858198] uppercase">
                  {groupLabel}
                </div>
              )}
              <button
                disabled={!isAllowed}
                onClick={() => {
                  if (!isAllowed) {
                    // Optionally show upgrade modal
                    return;
                  }
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'} py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white font-semibold shadow-md shadow-[#8B5CF6]/25'
                    : isAllowed
                      ? 'text-[#AAA6BD] hover:text-[#F6F3FB] hover:bg-[#1C1B31]'
                      : 'text-[#555268] cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon 
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : isAllowed ? 'text-[#858198] group-hover:text-[#B8A5FF]' : 'text-[#555268]'
                    }`} 
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isAllowed && <Lock className="w-3 h-3 text-[#555268]" />}
                {isAllowed && item.highlight && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                )}

                {isAllowed && item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#8B5CF6]/20 text-[#B8A5FF]">
                    {item.badge}
                  </span>
                )}
              </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Subscription Status Card (Salon users only) */}
        {!isSuperAdmin && tenant && (
          <div className="p-3 border-t border-[#343047] bg-[#101225]">
            <div
              onClick={() => onSelectTab('subscription')}
              title={isCollapsed ? 'Manage Subscription' : undefined}
              className={`${isCollapsed ? 'p-2 flex justify-center' : 'p-3'} rounded-xl bg-gradient-to-b from-[#1C1B31] to-[#25223D] border border-[#343047] hover:border-[#8B5CF6]/50 cursor-pointer transition-all group`}
            >
              {isCollapsed ? <CreditCard className="w-4 h-4 text-[#B8A5FF]" /> : <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-[#D4C8FF] tracking-wide uppercase">
                  {plan?.name || 'Growth'} Plan
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  isTrial ? 'bg-amber-500/20 text-[#E7B363]' : 'bg-emerald-500/20 text-[#4BBF98]'
                }`}>
                  {isTrial ? `Trial (${trialDaysLeft}d)` : 'Active'}
                </span>
              </div>
              <p className="text-[11px] text-[#AAA6BD] leading-tight">
                {isTrial 
                  ? `${trialDaysLeft} days left in free trial. Tap to upgrade.` 
                  : 'Full access activated via Moonbox Digital.'}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#B8A5FF] font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>Manage Subscription</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
              </>}
            </div>
          </div>
        )}

        {/* Super admin branding footer */}
        {isSuperAdmin && (
          <div className="p-3 border-t border-[#343047] bg-[#101225]">
            <div className="p-2.5 rounded-xl bg-[#1C1B31] border border-[#343047] text-center">
              <span className="text-[10px] uppercase tracking-widest text-[#B8A5FF] font-bold block">
                Moonbox Cloud Engine
              </span>
              <p className="text-[11px] text-[#AAA6BD] mt-0.5">
                Multi-Tenant SaaS v2.4 (Sri Lanka)
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
