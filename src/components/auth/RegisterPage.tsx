import React, { useState, useId } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { Logo } from '../brand/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Globe,
  FileCheck
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { signUpSalon } = useAuth();
  const { navigate } = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // 3-Step Wizard Navigation: 1 = Owner, 2 = Salon, 3 = Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Owner Account
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Salon Details
  const [salonName, setSalonName] = useState('');
  const [city, setCity] = useState('Colombo');
  const [businessPhone, setBusinessPhone] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Step 3: Review & Consent
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate slug from salon name unless manually altered
  const handleSalonNameChange = (val: string) => {
    setSalonName(val);
    if (!isSlugManuallyEdited) {
      const generated = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setSlug(generated);
    }
  };

  const sriLankanCities = [
    'Colombo', 'Kandy', 'Galle', 'Negombo', 'Kurunegala', 
    'Gampaha', 'Matara', 'Jaffna', 'Batticaloa', 'Anuradhapura', 
    'Ratnapura', 'Kalutara', 'Badulla', 'Trincomalee'
  ];

  // Validation for Step 1
  const validateStep1 = (): boolean => {
    setError(null);
    if (!ownerName.trim()) {
      setError('Please provide your full legal name.');
      return false;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid email address.');
      return false;
    }
    if (StorageService.getUserByEmail(email.trim().toLowerCase())) {
      setError('An account with this email address already exists. Please sign in instead.');
      return false;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setError('Please provide a valid Sri Lankan mobile number (e.g., 0771234567).');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return false;
    }
    return true;
  };

  // Validation for Step 2
  const validateStep2 = (): boolean => {
    setError(null);
    if (!salonName.trim()) {
      setError('Please enter your salon or studio name.');
      return false;
    }
    if (!city.trim()) {
      setError('Please select your city or primary location.');
      return false;
    }
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!cleanSlug || cleanSlug.length < 3) {
      setError('Booking web slug must be at least 3 alphanumeric characters.');
      return false;
    }
    if (!StorageService.isSlugAvailable(cleanSlug)) {
      setError(`The slug "${cleanSlug}" is already taken by another salon. Please choose another unique web address.`);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        // Pre-fill business phone from personal phone if empty
        if (!businessPhone) setBusinessPhone(phone);
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreeTerms) {
      setError('You must accept the Terms of Service & Privacy Policy to submit registration.');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const res = await signUpSalon({
        salonName: salonName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
        phone: (businessPhone || phone).trim(),
        city: city.trim(),
        slug: cleanSlug,
        password
      });

      if (!res.success) {
        setError(res.error || 'Registration failed. Please check your submission and try again.');
        setIsSubmitting(false);
        return;
      }

      // Success! Workspace is created in pending_approval status without automatic trial.
      // Redirect to /app where the personalized pending approval screen is presented.
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during salon registration.');
      setIsSubmitting(false);
    }
  };

  const cleanSlugDisplay = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'your-salon';

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col justify-between p-4 sm:p-6 antialiased ${
      isDark ? 'bg-[#101225] text-[#F6F3FB]' : 'bg-[#F8F7FC] text-[#101225]'
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
            className="text-xs font-bold text-[#8B5CF6] hover:underline hidden sm:inline-block"
          >
            Sign In to Existing Salon →
          </button>
        </div>
      </header>

      {/* Main Registration Card */}
      <main className="max-w-xl w-full mx-auto my-6">
        <div className={`rounded-3xl border p-6 sm:p-8 shadow-2xl transition-colors ${
          isDark ? 'bg-[#1C1B31] border-[#343047]' : 'bg-white border-[#E2DFF0]'
        }`}>
          {/* Header Title & 3-Step Wizard Progress */}
          <div className="space-y-3 mb-6 text-center">
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-[#F6F3FB]' : 'text-[#101225]'}`}>
              Salon Workspace Registration
            </h1>
            <p className="text-xs text-[#858198] dark:text-[#AAA6BD] max-w-md mx-auto">
              Register your salon workspace in 3 simple steps. No upfront payment required.
            </p>

            {/* Stepper Strip */}
            <div className="pt-2 flex items-center justify-center gap-2 text-xs">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all ${
                currentStep === 1 
                  ? 'bg-[#8B5CF6] text-white shadow-xs' 
                  : currentStep > 1 
                    ? 'bg-[#4BBF98]/20 text-[#4BBF98]' 
                    : 'bg-slate-100 dark:bg-[#25223D] text-[#858198]'
              }`}>
                <span>1. Owner</span>
              </div>
              <span className="text-[#858198]">→</span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all ${
                currentStep === 2 
                  ? 'bg-[#8B5CF6] text-white shadow-xs' 
                  : currentStep > 2 
                    ? 'bg-[#4BBF98]/20 text-[#4BBF98]' 
                    : 'bg-slate-100 dark:bg-[#25223D] text-[#858198]'
              }`}>
                <span>2. Salon</span>
              </div>
              <span className="text-[#858198]">→</span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all ${
                currentStep === 3 
                  ? 'bg-[#8B5CF6] text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-[#25223D] text-[#858198]'
              }`}>
                <span>3. Review</span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#EA7180]/15 border border-[#EA7180]/30 text-[#EA7180] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#EA7180]" />
              <span>{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: OWNER ACCOUNT                                     */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-100 dark:border-[#343047]">
                <h3 className="text-sm font-bold text-[#101225] dark:text-[#F6F3FB]">
                  Step 1: Salon Owner Account
                </h3>
                <p className="text-[11px] text-[#858198]">
                  Your credentials as the primary administrator of this salon workspace.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#101225] dark:text-[#F6F3FB]">
                  Full Legal Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Kasun Jayasuriya"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] text-[#101225] dark:text-[#F6F3FB] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#101225] dark:text-[#F6F3FB]">
                  Owner Business Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. owner@aurasalon.lk"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] text-[#101225] dark:text-[#F6F3FB] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#101225] dark:text-[#F6F3FB]">
                  Mobile Contact Number (Sri Lanka) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] text-[#101225] dark:text-[#F6F3FB] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#101225] dark:text-[#F6F3FB]">
                    Security Password (min 8) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] text-[#101225] dark:text-[#F6F3FB] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#858198] hover:text-[#B8A5FF]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#101225] dark:text-[#F6F3FB]">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] text-[#101225] dark:text-[#F6F3FB] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95 transition-all flex items-center gap-2"
                >
                  <span>Continue to Salon Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: SALON DETAILS                                     */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-100 dark:border-[#343047]">
                <h3 className="text-sm font-bold text-[#101225] dark:text-[#F6F3FB]">
                  Step 2: Salon & Studio Details
                </h3>
                <p className="text-[11px] text-[#858198]">
                  Information that identifies your salon business and configures your public booking address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#101225] dark:text-[#F6F3FB]">
                  Salon / Studio Business Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={salonName}
                    onChange={e => handleSalonNameChange(e.target.value)}
                    placeholder="e.g. Aura Luxury Hair Lounge"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] text-[#101225] dark:text-[#F6F3FB] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#101225] dark:text-[#F6F3FB]">
                    City / Location (Sri Lanka) *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                    <select
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] text-[#101225] dark:text-[#F6F3FB] focus:outline-none focus:border-[#8B5CF6]"
                    >
                      {sriLankanCities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#101225] dark:text-[#F6F3FB]">
                    Salon Contact Phone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      value={businessPhone}
                      onChange={e => setBusinessPhone(e.target.value)}
                      placeholder="e.g. 0112345678"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] text-[#101225] dark:text-[#F6F3FB] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#101225] dark:text-[#F6F3FB]">
                  Unique Public Booking URL Slug *
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={e => {
                      setIsSlugManuallyEdited(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="e.g. aura-colombo"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] text-[#101225] dark:text-[#F6F3FB] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <p className="text-[11px] text-[#858198] mt-1">
                  Public customer booking link: <span className="text-[#8B5CF6] font-mono">/book/{cleanSlugDisplay}</span>
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#343047] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#25223D] transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95 transition-all flex items-center gap-2"
                >
                  <span>Review Submission</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: REVIEW & CREATE                                  */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="pb-2 border-b border-slate-100 dark:border-[#343047]">
                <h3 className="text-sm font-bold text-[#101225] dark:text-[#F6F3FB]">
                  Step 3: Review & Confirm Registration
                </h3>
                <p className="text-[11px] text-[#858198]">
                  Please verify your submitted details prior to workspace provisioning.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-[#F8F7FC] dark:bg-[#151529] border border-[#E2DFF0] dark:border-[#343047] space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200 dark:border-[#343047]">
                  <div>
                    <span className="text-[#858198] text-[10px] block uppercase font-bold">Owner Name</span>
                    <span className="font-bold text-[#101225] dark:text-[#F6F3FB]">{ownerName}</span>
                  </div>
                  <div>
                    <span className="text-[#858198] text-[10px] block uppercase font-bold">Email Address</span>
                    <span className="font-bold text-[#101225] dark:text-[#F6F3FB] truncate block">{email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200 dark:border-[#343047]">
                  <div>
                    <span className="text-[#858198] text-[10px] block uppercase font-bold">Salon Name</span>
                    <span className="font-bold text-[#101225] dark:text-[#F6F3FB]">{salonName}</span>
                  </div>
                  <div>
                    <span className="text-[#858198] text-[10px] block uppercase font-bold">City</span>
                    <span className="font-bold text-[#101225] dark:text-[#F6F3FB]">{city}, Sri Lanka</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#858198] text-[10px] block uppercase font-bold">Public Booking Web Address</span>
                  <span className="font-mono text-[#8B5CF6] text-xs font-semibold">/book/{cleanSlugDisplay}</span>
                </div>
              </div>

              {/* Informative notice regarding registration approval process */}
              <div className="p-3.5 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 text-xs text-[#858198] dark:text-[#AAA6BD] space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#8B5CF6] dark:text-[#B8A5FF]">
                  <FileCheck className="w-4 h-4 text-[#8B5CF6]" />
                  <span>Administrative Activation Process</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Upon submission, your isolated tenant database is prepared in <strong>pending activation</strong> status. No upfront payment is required. Moonbox Platform Administrators will review your registration and activate your trial or selected package.
                </p>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agree-terms-checkbox"
                  required
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-1 rounded accent-[#8B5CF6] cursor-pointer"
                />
                <label htmlFor="agree-terms-checkbox" className="text-xs text-[#858198] dark:text-[#AAA6BD] cursor-pointer leading-tight">
                  I agree to the <span className="text-[#8B5CF6] font-semibold">Moonbox Salon Terms of Service</span> and <span className="text-[#8B5CF6] font-semibold">Privacy Policy</span> for multi-tenant salon management in Sri Lanka.
                </label>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#343047] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#25223D] transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !agreeTerms}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-extrabold shadow-md shadow-[#8B5CF6]/25 hover:opacity-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Provisioning Workspace...</span>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer Link to Login */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#343047] text-center">
            <p className="text-xs text-[#858198]">
              Already registered your salon?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-[#8B5CF6] font-bold hover:underline"
              >
                Sign In to Salon Workspace
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-[#858198] py-2">
        <span>© {new Date().getFullYear()} Moonbox Salon · Multi-Tenant Platform Engineering</span>
      </footer>
    </div>
  );
};
