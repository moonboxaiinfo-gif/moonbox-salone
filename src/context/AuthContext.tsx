import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, SalonTenant } from '../types';
import { StorageService } from '../services/storageService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { createSupabaseRepository } from '../services/supabaseRepository';
import { clearAsyncDataCache } from '../services/asyncDataService';
import { hasPasswordRecoverySession, validatePasswordChange } from '../services/passwordRecovery';

const PASSWORD_RECOVERY_USER_KEY = 'moonbox_password_recovery_user_id';

function readPasswordRecoveryUserId(): string | null {
  try {
    return sessionStorage.getItem(PASSWORD_RECOVERY_USER_KEY);
  } catch {
    return null;
  }
}

function storePasswordRecoveryUserId(userId: string): void {
  try {
    sessionStorage.setItem(PASSWORD_RECOVERY_USER_KEY, userId);
  } catch (error) {
    console.warn('[AuthContext] Could not persist password recovery state:', error);
  }
}

function clearPasswordRecoveryUserId(): void {
  try {
    sessionStorage.removeItem(PASSWORD_RECOVERY_USER_KEY);
  } catch (error) {
    console.warn('[AuthContext] Could not clear password recovery state:', error);
  }
}

export interface MFAEnrollmentData {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isSuperAdmin: boolean;
  isSalonStaff: boolean;
  isLoading: boolean;
  mfaAssuranceLevel: 'aal1' | 'aal2' | null;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInSuperAdmin: (email: string, password: string) => Promise<{ 
    success: boolean; 
    requiresMFA?: boolean; 
    factorId?: string;
    error?: string;
  }>;
  enrollSuperAdminMFA: () => Promise<{ success: boolean; data?: MFAEnrollmentData; error?: string }>;
  verifySuperAdminMFA: (factorId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  signUpSalon: (params: {
    salonName: string;
    ownerName: string;
    email: string;
    phone: string;
    city?: string;
    slug?: string;
    password: string;
  }) => Promise<{ success: boolean; tenantId?: string; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  completePasswordRecovery: (password: string, confirmation: string) => Promise<{ success: boolean; error?: string; warning?: string }>;
  logout: () => Promise<void>;
  switchDemoUser: (role: 'owner' | 'receptionist' | 'staff' | 'superadmin') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaAssuranceLevel, setMfaAssuranceLevel] = useState<'aal1' | 'aal2' | null>(null);
  const [passwordRecoveryUserId, setPasswordRecoveryUserId] = useState<string | null>(null);
  const isPasswordRecovery = passwordRecoveryUserId !== null;

  // Supabase is the only production identity source. Listen for sign-out and
  // identity changes so cached tenant data can never survive account switches.
  useEffect(() => {
    let disposed = false;
    let authRevision = 0;
    const clearSession = () => {
      StorageService.clearProductionCache();
      clearAsyncDataCache();
      setCurrentUser(null);
      setMfaAssuranceLevel(null);
      setPasswordRecoveryUserId(null);
      clearPasswordRecoveryUserId();
    };
    const restorePasswordRecovery = (userId: string) => {
      const recoveryUserId = readPasswordRecoveryUserId();
      if (recoveryUserId === userId) {
        setPasswordRecoveryUserId(userId);
      } else if (recoveryUserId) {
        clearPasswordRecoveryUserId();
      }
    };
    const hydrateSession = async (expectedUserId: string, revision: number) => {
      try {
        const { data: sessionData } = await supabase!.auth.getSession();
        if (disposed || revision !== authRevision || sessionData.session?.user.id !== expectedUserId) return;
        const { data: aalData } = await supabase!.auth.mfa.getAuthenticatorAssuranceLevel();
        const currentAAL = aalData?.currentLevel === 'aal2' ? 'aal2' : 'aal1';
        const repository = createSupabaseRepository();
        const resolvedUser = repository ? await repository.currentUser() : null;
        if (disposed || revision !== authRevision) return;
        setMfaAssuranceLevel(currentAAL);
        if (resolvedUser?.role === 'superadmin') {
          setCurrentUser(currentAAL === 'aal2' ? resolvedUser : null);
        } else if (resolvedUser) {
          const tenant = (await repository?.tenantsForCurrentUser())?.find(item => item.id === resolvedUser.tenantId);
          if (!disposed && revision === authRevision && tenant && tenant.status !== 'suspended') {
            setCurrentUser(resolvedUser);
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.warn('[AuthContext] Supabase session check error:', err);
        if (!disposed && revision === authRevision) clearSession();
      } finally {
        if (!disposed && revision === authRevision) setIsLoading(false);
      }
    };

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        const revision = ++authRevision;
        if (event === 'SIGNED_OUT' || !session?.user) {
          clearSession();
          setIsLoading(false);
          return;
        }
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecoveryUserId(session.user.id);
          storePasswordRecoveryUserId(session.user.id);
        } else if (event === 'INITIAL_SESSION') {
          restorePasswordRecovery(session.user.id);
        }
        if (event === 'SIGNED_IN') {
          setPasswordRecoveryUserId(null);
          clearPasswordRecoveryUserId();
          StorageService.clearProductionCache();
          clearAsyncDataCache();
          setCurrentUser(null);
          setMfaAssuranceLevel(null);
          setIsLoading(true);
        }
        // Defer Supabase reads outside the auth callback to avoid auth-lock deadlocks.
        setTimeout(() => void hydrateSession(session.user.id, revision), 0);
      });
      void (async () => {
        setIsLoading(true);
        const { data: { session } } = await supabase!.auth.getSession();
        if (session?.user) {
          restorePasswordRecovery(session.user.id);
          const revision = ++authRevision;
          await hydrateSession(session.user.id, revision);
        } else if (!disposed) {
          clearSession();
          setIsLoading(false);
        }
      })();
      return () => {
        disposed = true;
        subscription.unsubscribe();
      };
    }

    // Browser-local accounts are fixtures only; they are never a production fallback.
    if (!import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOCAL_ADMIN_DEMO !== 'true') {
      clearSession();
      setIsLoading(false);
      return () => { disposed = true; };
    }
    try {
      const storedUserId = localStorage.getItem('moonbox_session_user_id');
      const found = storedUserId ? StorageService.getUsers().find(u => u.id === storedUserId) : null;
      if (found && found.role !== 'superadmin') setCurrentUser(found);
      else if (found?.role === 'superadmin' && sessionStorage.getItem('moonbox_superadmin_mfa_verified') === 'true') {
        setCurrentUser(found);
        setMfaAssuranceLevel('aal2');
      } else setCurrentUser(null);
    } catch {
      setCurrentUser(null);
    }
    setIsLoading(false);
    return () => { disposed = true; };
  }, []);

  // Standard Salon User Sign In with Email & Password
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // If Supabase is connected, authenticate via Supabase Auth
    if (isSupabaseConfigured && supabase) {
      StorageService.clearProductionCache();
      clearAsyncDataCache();
      setCurrentUser(null);
      setMfaAssuranceLevel(null);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          const repository = createSupabaseRepository();
          const profile = repository ? await repository.currentUser() : null;
          if (profile?.role === 'superadmin') {
            // Must use the dedicated private portal with MFA
            return { 
              success: false, 
              error: 'Platform Administrator account detected. Please use the private administrator control portal with authenticator-app TOTP MFA.' 
            };
          }

          if (!profile) {
            await supabase.auth.signOut();
            return { success: false, error: 'Your account is authenticated but has no active salon membership. Please contact the salon administrator.' };
          }
          const tenant = (await repository?.tenantsForCurrentUser())?.find(item => item.id === profile.tenantId);
          if (!tenant) {
            await supabase.auth.signOut();
            return { success: false, error: 'Your salon membership could not be resolved from Supabase.' };
          }
          if (tenant.status === 'suspended') {
            await supabase.auth.signOut();
            return { success: false, error: 'This salon workspace has been suspended. Please contact Moonbox Digital support.' };
          }

          setCurrentUser(profile);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Authentication failed' };
      }
    }

    if (isSupabaseConfigured) {
      return { success: false, error: 'Supabase authentication is configured, but no active database membership was found.' };
    }
    if (!import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOCAL_ADMIN_DEMO !== 'true') {
      return { success: false, error: 'Supabase must be configured before salon users can sign in.' };
    }
    // Explicit local demo authentication only
    const user = StorageService.getUserByEmail(cleanEmail);
    if (!user) {
      return { success: false, error: 'No salon user found with this email address.' };
    }

    if (user.role === 'superadmin') {
      return { 
        success: false, 
        error: 'Platform Administrator account detected. Please access the private administrator control portal.' 
      };
    }

    // Verify user account status
    const tenant = StorageService.getTenantById(user.tenantId);
    if (tenant && tenant.status === 'suspended') {
      return { success: false, error: 'This salon workspace has been suspended. Please contact Moonbox Digital support.' };
    }

    setCurrentUser(user);
    localStorage.setItem('moonbox_session_user_id', user.id);
    return { success: true };
  };

  // Secure Super Admin Authentication: Step 1 (Credentials & Authorization)
  const signInSuperAdmin = async (email: string, password: string): Promise<{ 
    success: boolean; 
    requiresMFA?: boolean; 
    factorId?: string;
      error?: string;
  }> => {
    if (!email || !password) {
      return { success: false, error: 'Administrator email and security password are required.' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // Disallow default / placeholder passwords
    if (password === 'admin12345' || password === 'admin' || password === 'password') {
      return { 
        success: false, 
        error: 'Default or insecure passwords are prohibited for platform administrator accounts. Please provide a verified strong security credential.' 
      };
    }

    StorageService.clearProductionCache();
    clearAsyncDataCache();
    setCurrentUser(null);
    setMfaAssuranceLevel(null);

    // If Supabase is connected: Authenticate via Supabase Auth & check MFA status
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (!data.user) {
          return { success: false, error: 'Authentication failed.' };
        }

        // Explicit authorization check against platform_admins table (never email substring!)
        const { data: adminRecord } = await supabase
          .from('platform_admins')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!adminRecord || adminRecord.role !== 'superadmin') {
          await supabase.auth.signOut();
          return { 
            success: false, 
            error: 'Access Denied: This account is not authorized in platform_admins.' 
          };
        }

        // Check MFA enrollment
        const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
        if (factorsErr) {
          return { success: false, error: factorsErr.message };
        }

        const verifiedTotp = factorsData.totp?.find(f => f.status === 'verified');

        if (verifiedTotp) {
          // Verified TOTP exists -> requires MFA verification challenge
          return {
            success: true,
            requiresMFA: true,
            factorId: verifiedTotp.id
          };
        } else {
          // No verified TOTP -> requires MFA enrollment before access
          return {
            success: true,
            requiresMFA: true,
            factorId: 'needs_enrollment'
          };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Administrator authentication failed.' };
      }
    }

    // Local repository check: Explicit user check
    const user = StorageService.getUserByEmail(cleanEmail);
    if (!user || user.role !== 'superadmin' || user.tenantId !== 'superadmin') {
      StorageService.logAudit({
        actorEmail: cleanEmail,
        actorRole: 'unauthorized',
        action: 'SUPERADMIN_LOGIN_FAILED',
        entity: 'auth',
        details: 'Attempted login to superadmin portal with non-admin credentials.'
      });
      return { 
        success: false, 
        error: 'Access Denied: Invalid administrator identity.' 
      };
    }

    if (import.meta.env.VITE_ALLOW_LOCAL_ADMIN_DEMO !== 'true') {
      return {
        success: false,
        error: 'Secure Supabase MFA is required for Super Admin access.'
      };
    }

    // Explicit development-only local MFA demo step.
    return {
      success: true,
      requiresMFA: true,
      factorId: 'local_totp_factor'
    };
  };

  // Super Admin MFA Step 2: Enroll TOTP factor
  const enrollSuperAdminMFA = async (): Promise<{ success: boolean; data?: MFAEnrollmentData; error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return { success: false, error: 'An authenticated administrator session is required.' };
        const { data: admin, error: adminError } = await supabase.from('platform_admins')
          .select('role').eq('user_id', user.id).maybeSingle();
        if (adminError || admin?.role !== 'superadmin') return { success: false, error: 'Platform administrator authorization is required before MFA enrollment.' };

        const [{ data: factors, error: factorsError }, { data: aal, error: aalError }] = await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        ]);
        if (factorsError || aalError) {
          return { success: false, error: factorsError?.message || aalError?.message || 'Administrator MFA status could not be verified.' };
        }
        const enrolledFactors = [...(factors.totp || []), ...(factors.phone || [])];
        const hasVerifiedFactor = enrolledFactors.some(factor => factor.status === 'verified');
        if (enrolledFactors.some(factor => factor.status !== 'verified')) {
          return { success: false, error: 'An unfinished MFA enrollment exists. Complete the controlled recovery process before enrolling another factor.' };
        }
        if (hasVerifiedFactor && aal?.currentLevel !== 'aal2') {
          return { success: false, error: 'A current AAL2 session is required to add or replace an administrator MFA factor.' };
        }

        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'Moonbox Salon Platform',
          friendlyName: 'Super Admin Authenticator'
        });

        if (error) return { success: false, error: error.message };
        if (!data || !data.totp) return { success: false, error: 'Failed to generate TOTP challenge.' };

        return {
          success: true,
          data: {
            factorId: data.id,
            qrCode: data.totp.qr_code,
            secret: data.totp.secret,
            uri: data.totp.uri
          }
        };
      } catch (err: any) {
        return { success: false, error: err.message || 'MFA enrollment failed.' };
      }
    }

    if (!import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOCAL_ADMIN_DEMO !== 'true') {
      return { success: false, error: 'Secure Supabase MFA is required for Super Admin enrollment.' };
    }

    // Deterministic enrollment parameters for the explicitly enabled local demo.
    return {
      success: true,
      data: {
        factorId: 'local_totp_factor',
        qrCode: '',
        secret: 'JBSWY3DPEHPK3PXP', // Sample base32 secret for authenticator apps
        uri: 'otpauth://totp/Moonbox%20Salon:superadmin@moonboxdigital.com?secret=JBSWY3DPEHPK3PXP&issuer=Moonbox%20Salon'
      }
    };
  };

  // Super Admin MFA Step 2: Verify TOTP Code
  const verifySuperAdminMFA = async (factorId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    if (!code || code.trim().length !== 6 || !/^\d{6}$/.test(code.trim())) {
      return { success: false, error: 'Please enter a valid 6-digit numeric authenticator code.' };
    }

    const cleanCode = code.trim();

    if (isSupabaseConfigured && supabase) {
      try {
        // Step A: Create Challenge
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) return { success: false, error: challengeError.message };

        // Step B: Verify Code
        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code: cleanCode
        });

        if (verifyError) {
          return { success: false, error: verifyError.message };
        }

        // Check resulting AAL
        const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalError || aalData?.currentLevel !== 'aal2') {
          await supabase.auth.signOut();
          setCurrentUser(null);
          setMfaAssuranceLevel(null);
          return { success: false, error: 'The authenticator did not establish an AAL2 session.' };
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        const { data: admin, error: adminError } = user
          ? await supabase.from('platform_admins').select('role').eq('user_id', user.id).maybeSingle()
          : { data: null, error: null };
        if (user && !userError && !adminError && admin?.role === 'superadmin') {
          setMfaAssuranceLevel('aal2');
          const adminUser: User = {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || 'Platform Administrator',
            role: 'superadmin',
            tenantId: 'superadmin',
            createdAt: new Date().toISOString()
          };
          setCurrentUser(adminUser);
          localStorage.setItem('moonbox_session_user_id', adminUser.id);
          sessionStorage.setItem('moonbox_superadmin_mfa_verified', 'true');

          StorageService.logAudit({
            actorEmail: adminUser.email,
            actorRole: 'superadmin',
            action: 'MFA_VERIFIED_AAL2',
            entity: 'auth',
            details: 'Super Admin successfully completed TOTP MFA authentication at assurance level AAL2.'
          });

          return { success: true };
        }
        await supabase.auth.signOut();
        setCurrentUser(null);
        setMfaAssuranceLevel(null);
        return { success: false, error: 'Platform administrator authorization could not be verified.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'MFA verification failed' };
      }
    }

    // Local repository mode has no secure TOTP verifier. Never accept an
    // arbitrary six-digit code as MFA; local admin demos must be explicitly
    // enabled and are never a production authentication path.
    if (!import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOCAL_ADMIN_DEMO !== 'true') {
      return { success: false, error: 'Secure Supabase MFA is required for Super Admin access.' };
    }

    // Explicit development-only demo path.
    const users = StorageService.getUsers();
    const adminUser = users.find(u => u.role === 'superadmin' && u.tenantId === 'superadmin');
    if (!adminUser) return { success: false, error: 'Platform administrator user not found.' };

    setCurrentUser(adminUser);
    localStorage.setItem('moonbox_session_user_id', adminUser.id);
    sessionStorage.setItem('moonbox_superadmin_mfa_verified', 'true');
    setMfaAssuranceLevel('aal2');

    StorageService.logAudit({
      actorEmail: adminUser.email,
      actorRole: 'superadmin',
      action: 'MFA_VERIFIED',
      entity: 'auth',
      details: 'Super Admin completed TOTP second-factor verification.'
    });

    return { success: true };
  };

  // Sign up new Salon Workspace (Starts in PENDING_APPROVAL - No automatic trial)
  const signUpSalon = async (params: {
    salonName: string;
    ownerName: string;
    email: string;
    phone: string;
    city?: string;
    slug?: string;
    password: string;
  }): Promise<{ success: boolean; tenantId?: string; error?: string }> => {
    const { salonName, ownerName, email, phone, city, slug, password } = params;

    if (!isSupabaseConfigured && (!import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOCAL_ADMIN_DEMO !== 'true')) {
      return { success: false, error: 'Supabase must be configured before salon registration is available.' };
    }

    if (!salonName.trim() || !ownerName.trim() || !email.trim() || !password) {
      return { success: false, error: 'All fields including password are required.' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long for security.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const repository = isSupabaseConfigured ? createSupabaseRepository() : null;
    const existingUser = !isSupabaseConfigured ? StorageService.getUserByEmail(cleanEmail) : undefined;
    if (existingUser) {
      return { success: false, error: 'An account with this email address is already registered.' };
    }

    // Slug validation and uniqueness
    const rawSlug = slug?.trim() || salonName.trim();
    const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'salon';

    if (!isSupabaseConfigured && !StorageService.isSlugAvailable(cleanSlug)) {
      return { 
        success: false, 
        error: `The booking web address "${cleanSlug}" is already taken by another salon. Please choose another slug.` 
      };
    }

    // If Supabase is connected, create Supabase Auth User
    let authUserId = `user_${Date.now()}`;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: ownerName,
              salon_name: salonName,
              phone
            }
          }
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data.user) {
          authUserId = data.user.id;
        }
        if (data.session && repository) {
          const registration = await repository.registerSalon({
            salonName: salonName.trim(),
            ownerName: ownerName.trim(),
            email: cleanEmail,
            phone: phone.trim(),
            city: city?.trim() || 'Colombo',
            slug: cleanSlug,
          });
          const registeredUser = await repository.currentUser();
          if (!registeredUser) return { success: false, error: 'Registration completed but the new salon membership could not be resolved.' };
          setCurrentUser(registeredUser);
          return { success: true, tenantId: registration.salonId };
        }
        if (data.user && !data.session) {
          return { success: false, error: 'Your account was created, but Supabase requires email confirmation before the salon can be registered. Confirm your email, then sign in and complete registration.' };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to create auth credentials' };
      }
    }

    const newTenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date();

    // Mandatory business rule: Salons enter explicit PENDING_APPROVAL state with NO automatic trial
    const newTenant: SalonTenant = {
      id: newTenantId,
      name: salonName.trim(),
      slug: cleanSlug,
      tagline: 'Building a smarter salon.',
      country: 'Sri Lanka',
      currency: 'LKR',
      phone: phone.trim(),
      whatsapp: phone.trim(),
      email: cleanEmail,
      address: 'Main Street',
      city: city?.trim() || 'Colombo',
      openingHours: {
        monday: { open: '09:00', close: '18:00', isOpen: true },
        tuesday: { open: '09:00', close: '18:00', isOpen: true },
        wednesday: { open: '09:00', close: '18:00', isOpen: true },
        thursday: { open: '09:00', close: '18:00', isOpen: true },
        friday: { open: '09:00', close: '18:00', isOpen: true },
        saturday: { open: '09:00', close: '19:00', isOpen: true },
        sunday: { open: '10:00', close: '17:00', isOpen: false },
      },
      subscription: {
        planId: 'plan_growth',
        status: 'pending', // NOT active, NOT trial! Enters pending status awaiting Super Admin grant
        billingCycle: 'monthly',
        startDate: now.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
        trialEndsAt: '', // Empty until granted by platform administrator
        autoRenew: false
      },
      settings: {
        taxRate: 0,
        currencySymbol: 'Rs.',
        appointmentBufferMinutes: 15,
        minAdvanceBookingHours: 2,
        maxBookingWindowDays: 30,
        allowCustomerStaffSelection: true,
        requireBookingDeposit: false
      },
      portfolio: {
        heroTitle: `Welcome to ${salonName}`,
        heroSubtitle: 'Exceptional styling and personalized aesthetic treatments.',
        aboutText: `${salonName} is dedicated to luxury beauty and customer satisfaction in Sri Lanka.`,
        theme: 'luxury',
        primaryColor: '#101225',
        accentColor: '#8B5CF6',
        gallery: [],
        seoTitle: `${salonName} | Salon & Spa in Sri Lanka`,
        seoDescription: `Book premier salon and spa services at ${salonName}.`
      },
      onboardingCompleted: false,
      onboardingStep: 1,
      status: 'pending_approval', // Requires Super Admin review & trial grant
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    const newUser: User = {
      id: authUserId,
      email: cleanEmail,
      name: ownerName.trim(),
      role: 'owner', // Strictly 'owner' role — NEVER superadmin!
      tenantId: newTenantId,
      phone: phone.trim(),
      createdAt: now.toISOString()
    };

    StorageService.createTenant(newTenant);
    StorageService.createUser(newUser);

    StorageService.logAudit({
      tenantId: newTenantId,
      actorEmail: cleanEmail,
      actorRole: 'owner',
      action: 'REGISTER_SALON',
      entity: 'tenant',
      entityId: newTenantId,
      details: `Registered new salon "${salonName}" with status pending_approval (Awaiting administrator trial activation)`
    });

    setCurrentUser(newUser);
    localStorage.setItem('moonbox_session_user_id', newUser.id);

    return { success: true, tenantId: newTenantId };
  };

  // Password Reset
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!email) return { success: false, error: 'Email address is required.' };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: new URL('/reset-password', window.location.origin).toString()
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Password reset request failed' };
      }
    }

    return {
      success: false,
      error: 'Secure password recovery is unavailable because Supabase is not configured.'
    };
  };

  const completePasswordRecovery = async (
    password: string,
    confirmation: string
  ): Promise<{ success: boolean; error?: string; warning?: string }> => {
    const validationError = validatePasswordChange(password, confirmation);
    if (validationError) return { success: false, error: validationError };
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Secure password recovery is unavailable because Supabase is not configured.' };
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) return { success: false, error: sessionError.message };
      const sessionUserId = sessionData.session?.user.id;
      if (!sessionUserId || !hasPasswordRecoverySession(isPasswordRecovery, passwordRecoveryUserId, sessionUserId)) {
        setPasswordRecoveryUserId(null);
        clearPasswordRecoveryUserId();
        return { success: false, error: 'This recovery link is invalid, expired, or has already been used. Request a new link to continue.' };
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user || userData.user.id !== sessionUserId) {
        setPasswordRecoveryUserId(null);
        clearPasswordRecoveryUserId();
        return { success: false, error: 'Your recovery session could not be verified. Request a new link to continue.' };
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) return { success: false, error: updateError.message };

      setPasswordRecoveryUserId(null);
      clearPasswordRecoveryUserId();

      try {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          return {
            success: true,
            warning: 'Your password was updated, but this session could not be ended automatically. Sign out before signing in again.'
          };
        }
      } catch {
        return {
          success: true,
          warning: 'Your password was updated, but this session could not be ended automatically. Sign out before signing in again.'
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Password update failed. Request a new recovery link and try again.'
      };
    }
  };

  // Secure Sign Out
  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Continue clearing local session
      }
    }
    StorageService.clearProductionCache();
    clearAsyncDataCache();
    setCurrentUser(null);
    setMfaAssuranceLevel(null);
    setPasswordRecoveryUserId(null);
    clearPasswordRecoveryUserId();
    localStorage.removeItem('moonbox_session_user_id');
    sessionStorage.removeItem('moonbox_superadmin_mfa_verified');
  };

  // Demo user switcher. Super Admin remains a local demo-only switch and marks
  // the session as MFA-verified so the existing guarded admin workspace opens.
  const switchDemoUser = (role: 'owner' | 'receptionist' | 'staff' | 'superadmin') => {
    if (isSupabaseConfigured || !import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOCAL_ADMIN_DEMO !== 'true') return;
    const users = StorageService.getUsers();
    const user = users.find(u => u.role === role);
    if (user) {
      StorageService.clearProductionCache();
      clearAsyncDataCache();
      setCurrentUser(user);
      localStorage.setItem('moonbox_session_user_id', user.id);
      if (role === 'superadmin') {
        sessionStorage.setItem('moonbox_superadmin_mfa_verified', 'true');
        setMfaAssuranceLevel('aal2');
      }
    }
  };

  const isSuperAdmin = currentUser?.role === 'superadmin' && mfaAssuranceLevel === 'aal2';
  const isSalonStaff = currentUser !== null && !isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isSuperAdmin,
        isSalonStaff,
        isLoading,
        mfaAssuranceLevel,
        isPasswordRecovery,
        signIn,
        signInSuperAdmin,
        enrollSuperAdminMFA,
        verifySuperAdminMFA,
        signUpSalon,
        resetPassword,
        completePasswordRecovery,
        logout,
        switchDemoUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
