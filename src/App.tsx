import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { Sidebar, SalonTab, SuperAdminTab } from './components/common/Sidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { AppointmentCalendar } from './components/appointments/AppointmentCalendar';
import { AppointmentModal } from './components/appointments/AppointmentModal';
import { CustomerList } from './components/customers/CustomerList';
import { CustomerModal } from './components/customers/CustomerModal';
import { ServiceList } from './components/services/ServiceList';
import { StaffList } from './components/staff/StaffList';
import { POSRegister } from './components/pos/POSRegister';
import { InvoiceList } from './components/invoices/InvoiceList';
import { InventoryList } from './components/inventory/InventoryList';
import { ExpenseList } from './components/expenses/ExpenseList';
import { ExpenseModal } from './components/expenses/ExpenseModal';
import { CommissionList } from './components/commissions/CommissionList';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { WebsiteWorkspace, WebsiteUpgradeGate } from './components/website/WebsiteWorkspace';
import { PublicSalonPage } from './components/public/PublicSalonPage';
import { PublicBookingFlow } from './components/public/PublicBookingFlow';
import { NewLandingPage } from './components/public/NewLandingPage';
import { PremiumLandingPage } from './components/public/PremiumLandingPage';
import { SubscriptionPage } from './components/subscription/SubscriptionPage';
import { SalonSettings } from './components/settings/SalonSettings';
import { OnlineBookingManager } from './components/settings/OnlineBookingManager';
import { SupportTicketsList } from './components/support/SupportTicketsList';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { SalonManagement } from './components/superadmin/SalonManagement';
import { PaymentApprovals } from './components/superadmin/PaymentApprovals';
import { PlanManagement } from './components/superadmin/PlanManagement';
import { AnnouncementsManager } from './components/superadmin/AnnouncementsManager';
import { AuditLogViewer } from './components/superadmin/AuditLogViewer';
import { PlatformSettings } from './components/superadmin/PlatformSettings';
import { LandingPageEditor } from './components/superadmin/LandingPageEditor';
import { EntitlementService } from './services/entitlementService';
import { Appointment, Invoice } from './types';
import { Logo } from './components/brand/Logo';
import { Sparkles, Calendar, Plus, CreditCard, Lock, ArrowRight, Globe } from 'lucide-react';

import { RouterProvider, useRouter } from './context/RouterContext';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { PublicBookingPage } from './components/public/PublicBookingPage';
import { PublicPortfolioPage } from './components/public/PublicPortfolioPage';
import { SuperAdminLogin } from './components/superadmin/SuperAdminLogin';
import { SalonPendingApproval } from './components/auth/SalonPendingApproval';

function SalonPlatformMain() {
  const { currentUser, isSuperAdmin, role, switchDemoUser } = useAuth();
  const { tenant, isTrial, trialDaysLeft, isPendingApproval, isTrialExpired, refreshTenant } = useTenant();
  const { route, params, searchParams, navigate } = useRouter();

  // Navigation states
  const [currentSalonTab, setCurrentSalonTab] = useState<SalonTab>('dashboard');
  const [currentAdminTab, setCurrentAdminTab] = useState<SuperAdminTab>('admin_dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPublicPortalOpen, setIsPublicPortalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    return searchParams.get('onboarding') === 'true';
  });

  // Global Quick Modals
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);
  const [posPreloadedAppointment, setPosPreloadedAppointment] = useState<Appointment | null>(null);

  const tenantId = tenant?.id || 'tenant_moonbox_flagship';

  // Checkout flow: Transition from Calendar directly to POS register
  const handleCheckoutToPOS = (apt: Appointment) => {
    setPosPreloadedAppointment(apt);
    setCurrentSalonTab('pos');
  };

  // Route 1: Public Landing Page
  if (route === 'landing') {
    return (
      <PremiumLandingPage
        onOpenLogin={() => navigate('/login')}
        onOpenSignUp={() => navigate('/register')}
        onExploreDemo={() => {
          switchDemoUser('owner');
          navigate('/app');
        }}
      />
    );
  }

  // Route 2: Login Page
  if (route === 'login') {
    return <LoginPage />;
  }

  // Route 3: Register Page
  if (route === 'register') {
    return <RegisterPage />;
  }

  // Route 4: Forgot Password Page
  if (route === 'forgot-password') {
    return <ForgotPasswordPage />;
  }

  // Route 5: Public Client Booking Page
  if (route === 'book') {
    return <PublicBookingPage />;
  }

  // Route 5.1: Public Client Portfolio Page
  if (route === 'portfolio') {
    return <PublicPortfolioPage />;
  }

  // Route 6: Super Admin Restricted Gateway
  if (route === 'superadmin') {
    const configuredAdminHost = import.meta.env.VITE_SUPER_ADMIN_HOST?.trim().toLowerCase();
    const currentHost = window.location.hostname.toLowerCase();
    const isAuthorizedHost = import.meta.env.DEV
      ? Boolean(configuredAdminHost && currentHost === configuredAdminHost) || currentHost === 'localhost' || currentHost === '127.0.0.1'
      : Boolean(configuredAdminHost && currentHost === configuredAdminHost);

    if (!isAuthorizedHost) {
      // Redirect or show not found
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#101225] text-white">
          <p>Access Denied: Unauthorized Hostname.</p>
        </div>
      );
    }

    if (!isSuperAdmin) {
      return (
        <SuperAdminLogin
          onSuccess={() => navigate('/superadmin')}
          onExitToPublic={() => navigate('/')}
        />
      );
    }
  }

  // Route 7: App Dashboard (Requires Authentication)
  if (route === 'app' && !currentUser) {
    return <LoginPage />;
  }

  // Route 7.1: If salon is in pending approval state, present explicit approval status screen
  if (route === 'app' && !isSuperAdmin && isPendingApproval) {
    return <SalonPendingApproval />;
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] dark:bg-[#101225] text-[#101225] dark:text-[#F6F3FB] flex flex-col antialiased transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={isSuperAdmin ? currentAdminTab : currentSalonTab}
        onSelectTab={(tab) => {
          if (isSuperAdmin) setCurrentAdminTab(tab);
          else setCurrentSalonTab(tab);
        }}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(value => !value)}
      />

      {/* Main Content Area (offset by sidebar on desktop) */}
      <div className={`${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'} flex flex-col flex-1 min-h-screen transition-[padding] duration-200`}>
        {/* Header */}
        <Header
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenLandingPage={() => navigate('/')}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* ======================================================== */}
          {/* SUPER ADMIN PLATFORM AREA                                */}
          {/* ======================================================== */}
          {isSuperAdmin ? (
            <div className="space-y-6">
              {currentAdminTab === 'admin_dashboard' && (
                <SuperAdminDashboard onNavigate={(tab) => setCurrentAdminTab(tab)} />
              )}
              {currentAdminTab === 'admin_salons' && (
                <SalonManagement />
              )}
              {currentAdminTab === 'admin_payments' && (
                <PaymentApprovals />
              )}
              {currentAdminTab === 'admin_plans' && (
                <PlanManagement />
              )}
              {currentAdminTab === 'admin_support' && (
                <SupportTicketsList tenantId="superadmin" />
              )}
              {currentAdminTab === 'admin_announcements' && (
                <AnnouncementsManager />
              )}
              {currentAdminTab === 'admin_audit' && (
                <AuditLogViewer />
              )}
              {currentAdminTab === 'admin_landing' && (
                <LandingPageEditor />
              )}
              {currentAdminTab === 'admin_settings' && (
                <PlatformSettings onNavigate={(tab) => setCurrentAdminTab(tab)} />
              )}
              {(currentAdminTab === 'admin_subscriptions' || currentAdminTab === 'admin_users') && (
                <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344]">
                  <h3 className="text-base font-bold text-[#1B0C2D] dark:text-[#F3C9AB] capitalize">
                    {currentAdminTab.replace('admin_', '')} Management
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#A893AF] mt-1">
                    System configuration and platform operational access controls.
                  </p>
                  <div className="mt-4">
                    <PlanManagement />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* SALON OPERATIONS AREA                                   */
            /* ======================================================== */
            <div className="space-y-6">
              {/* Trial Expired Graceful Preservation Banner */}
              {isTrialExpired && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#EA7180]/15 border border-[#EA7180]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EA7180]/20 text-[#EA7180] flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#101225] dark:text-[#F6F3FB]">Free Trial Period Concluded</h4>
                      <p className="text-xs text-[#858198] dark:text-[#AAA6BD] mt-0.5">
                        Your free trial has ended. All customer records, appointments, inventory, and invoices are <strong>safely preserved</strong>. Please subscribe or upload your bank transfer slip to continue full operations.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentSalonTab('subscription')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shrink-0 hover:opacity-95 shadow-md shadow-[#8B5CF6]/25"
                  >
                    Manage Subscription →
                  </button>
                </div>
              )}

              {currentSalonTab === 'dashboard' && (
                <DashboardOverview
                  onNavigate={(tab) => setCurrentSalonTab(tab)}
                  onNewAppointment={() => setIsNewAppointmentModalOpen(true)}
                  onNewSale={() => setCurrentSalonTab('pos')}
                  onAddCustomer={() => setIsNewCustomerModalOpen(true)}
                  onAddExpense={() => setIsNewExpenseModalOpen(true)}
                />
              )}

              {currentSalonTab === 'appointments' && (
                <AppointmentCalendar
                  tenantId={tenantId}
                  onCheckoutToPOS={handleCheckoutToPOS}
                />
              )}

              {currentSalonTab === 'customers' && (
                <CustomerList tenantId={tenantId} />
              )}

              {currentSalonTab === 'services' && (
                <ServiceList tenantId={tenantId} />
              )}

              {currentSalonTab === 'staff' && (
                <StaffList tenantId={tenantId} />
              )}

              {currentSalonTab === 'pos' && (
                <POSRegister
                  tenantId={tenantId}
                  preloadedAppointment={posPreloadedAppointment}
                  onClearPreloadedAppointment={() => setPosPreloadedAppointment(null)}
                />
              )}

              {currentSalonTab === 'invoices' && (
                <InvoiceList tenantId={tenantId} />
              )}

              {currentSalonTab === 'inventory' && (
                <InventoryList tenantId={tenantId} />
              )}

              {currentSalonTab === 'expenses' && (
                <ExpenseList tenantId={tenantId} />
              )}

              {currentSalonTab === 'commissions' && (
                <CommissionList tenantId={tenantId} />
              )}

              {currentSalonTab === 'reports' && (
                <ReportsDashboard tenantId={tenantId} />
              )}

              {currentSalonTab === 'portfolio' && tenant && (
                <>
                  <WebsiteUpgradeGate tenant={tenant} onNavigateSubscription={() => setCurrentSalonTab('subscription')} />
                  {EntitlementService.canAccessFeature(tenant, 'portfolio').allowed && (
                    <WebsiteWorkspace
                      tenant={tenant}
                      onOpenPublicPortal={() => navigate(`/portfolio/${tenant.slug}`)}
                      onTenantUpdated={refreshTenant}
                    />
                  )}
                </>
              )}

              {currentSalonTab === 'online_booking' && (
                tenant && <OnlineBookingManager tenant={tenant} onSaved={refreshTenant} />
              )}

              {currentSalonTab === 'subscription' && tenant && (
                <SubscriptionPage tenant={tenant} />
              )}

              {currentSalonTab === 'settings' && tenant && (
                <SalonSettings tenant={tenant} onSaved={refreshTenant} />
              )}

              {currentSalonTab === 'support' && (
                <SupportTicketsList tenantId={tenantId} />
              )}

              {currentSalonTab === 'notifications' && (
                <div className="bg-white p-6 rounded-3xl border border-[#E8DFD6]">
                  <NotificationCenter isOpen={true} onClose={() => setCurrentSalonTab('dashboard')} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Global Quick Action Modals */}
      <AppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => setIsNewAppointmentModalOpen(false)}
        onSaved={() => {
          setIsNewAppointmentModalOpen(false);
          refreshTenant();
        }}
        tenantId={tenantId}
      />

      <CustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onSaved={() => {
          setIsNewCustomerModalOpen(false);
          refreshTenant();
        }}
        tenantId={tenantId}
      />

      <ExpenseModal
        isOpen={isNewExpenseModalOpen}
        onClose={() => setIsNewExpenseModalOpen(false)}
        onSaved={() => {
          setIsNewExpenseModalOpen(false);
          refreshTenant();
        }}
        tenantId={tenantId}
      />

      {/* Public Salon Website & Booking Flow Lightbox */}
      {isPublicPortalOpen && tenant && (
        <PublicSalonPage
          tenant={tenant}
          onClose={() => setIsPublicPortalOpen(false)}
        />
      )}

      {/* Notification Drawer */}
      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Salon Onboarding Wizard */}
      <OnboardingWizard
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={() => {
          setIsOnboardingOpen(false);
          refreshTenant();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RouterProvider>
          <AuthProvider>
            <TenantProvider>
              <NotificationProvider>
                <SalonPlatformMain />
              </NotificationProvider>
            </TenantProvider>
          </AuthProvider>
        </RouterProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
