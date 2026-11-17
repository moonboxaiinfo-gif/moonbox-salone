import { 
  SalonTenant, 
  User, 
  Customer, 
  Service, 
  ServiceCategory, 
  Staff, 
  Product, 
  ProductCategory, 
  Appointment, 
  Invoice, 
  Expense, 
  ExpenseCategory, 
  StockMovement, 
  StaffCommissionRecord, 
  ManualPaymentRequest, 
  SupportTicket, 
  Announcement, 
  NotificationItem, 
  AuditLog 
} from '../types';

export const INITIAL_TENANTS: SalonTenant[] = [
  {
    id: "tenant_moonbox_flagship",
    name: "Moonbox Salon - Flagship Colombo",
    slug: "moonbox-colombo",
    tagline: "Luxury beauty & transformative hair artistry",
    country: "Sri Lanka",
    currency: "LKR",
    phone: "014241555",
    whatsapp: "0714241555",
    email: "colombo@moonboxsalon.lk",
    website: "www.moonboxdigital.com",
    address: "No. 45, Galle Road",
    city: "Colombo 03",
    openingHours: {
      monday: { open: "09:00", close: "19:00", isOpen: true },
      tuesday: { open: "09:00", close: "19:00", isOpen: true },
      wednesday: { open: "09:00", close: "19:00", isOpen: true },
      thursday: { open: "09:00", close: "20:00", isOpen: true },
      friday: { open: "09:00", close: "20:00", isOpen: true },
      saturday: { open: "08:30", close: "20:00", isOpen: true },
      sunday: { open: "09:00", close: "18:00", isOpen: true },
    },
    subscription: {
      planId: "plan_growth",
      status: "active",
      billingCycle: "monthly",
      startDate: "2026-09-01",
      endDate: "2026-11-01",
      trialEndsAt: "2026-09-15",
      autoRenew: true
    },
    settings: {
      taxRate: 2.5, // 2.5% Social Security / VAT
      currencySymbol: "Rs.",
      appointmentBufferMinutes: 15,
      minAdvanceBookingHours: 2,
      maxBookingWindowDays: 60,
      allowCustomerStaffSelection: true,
      requireBookingDeposit: false
    },
    portfolio: {
      heroTitle: "Elegance Reimagined for the Modern Sri Lankan Woman",
      heroSubtitle: "Experience haute coiffure, bespoke aesthetic skin treatments, and opulent nail artistry in the heart of Colombo.",
      aboutText: "Founded under the vision of Moonbox Digital, Moonbox Salon brings international salon standards, clean cruelty-free formulations, and bespoke artistry to Sri Lanka.",
      theme: "luxury",
      primaryColor: "#1C0D2E",
      accentColor: "#DE9E74",
      gallery: [
        {
          id: "gal_1",
          url: "/salon-stylist-still.jpg",
          caption: "Haute Balayage & Silk Infusion styling",
          category: "Hair Artistry",
          isPublic: true
        },
        {
          id: "gal_2",
          url: "/salon-client-still.jpg",
          caption: "24K Gold Cellular Rejuvenation suite",
          category: "Skin & Spa",
          isPublic: true
        },
        {
          id: "gal_3",
          url: "/salon-interior-still.jpg",
          caption: "Russian Gel sculpture with rose-gold metallic flakes",
          category: "Nail Lounge",
          isPublic: true
        },
        {
          id: "gal_4",
          url: "/salon-interior-still.jpg",
          caption: "Kandyan & Western Bridal Dressing Suite",
          category: "Bridal Couture",
          isPublic: true
        }
      ],
      customDomain: {
        domain: "colombo.moonboxsalon.lk",
        verified: true,
        sslActive: true,
        token: "mbx_verify_c0l0mb0_2026"
      },
      seoTitle: "Moonbox Salon Colombo | Luxury Hair, Skin & Bridal Salon in Sri Lanka",
      seoDescription: "Book premier salon services in Colombo 03. Luxury haircuts, keratin treatments, 24k facials, nail extensions, and bridal dressing."
    },
    onboardingCompleted: true,
    onboardingStep: 10,
    status: "active",
    createdAt: "2026-08-15T08:00:00Z",
    updatedAt: "2026-10-10T12:00:00Z"
  },
  {
    id: "tenant_aura_kandy",
    name: "Aura Beauty Lounge - Kandy",
    slug: "aura-kandy",
    tagline: "Ayurvedic wellness meets modern cosmetic artistry",
    country: "Sri Lanka",
    currency: "LKR",
    phone: "0812234567",
    whatsapp: "0771234567",
    email: "kandy@aurabeautylounge.lk",
    address: "No. 18, Peradeniya Road",
    city: "Kandy",
    openingHours: {
      monday: { open: "09:30", close: "18:30", isOpen: true },
      tuesday: { open: "09:30", close: "18:30", isOpen: true },
      wednesday: { open: "09:30", close: "18:30", isOpen: true },
      thursday: { open: "09:30", close: "18:30", isOpen: true },
      friday: { open: "09:30", close: "18:30", isOpen: true },
      saturday: { open: "09:00", close: "19:00", isOpen: true },
      sunday: { open: "10:00", close: "17:00", isOpen: true },
    },
    subscription: {
      planId: "plan_growth",
      status: "trial",
      billingCycle: "monthly",
      startDate: "2026-10-05",
      endDate: "2026-10-19",
      trialEndsAt: "2026-10-19",
      autoRenew: false
    },
    settings: {
      taxRate: 0,
      currencySymbol: "Rs.",
      appointmentBufferMinutes: 10,
      minAdvanceBookingHours: 3,
      maxBookingWindowDays: 30,
      allowCustomerStaffSelection: true,
      requireBookingDeposit: false
    },
    portfolio: {
      heroTitle: "Holistic Hill Country Radiance",
      heroSubtitle: "Handcrafted treatments blending ancient Ceylon herbs with contemporary aesthetic excellence.",
      aboutText: "Nestled in the historic city of Kandy, Aura Beauty Lounge invites you to unwind.",
      theme: "elegant",
      primaryColor: "#2A183A",
      accentColor: "#DE9E74",
      gallery: [],
      seoTitle: "Aura Beauty Lounge Kandy",
      seoDescription: "Premier salon in Kandy"
    },
    onboardingCompleted: true,
    onboardingStep: 10,
    status: "active",
    createdAt: "2026-10-05T09:00:00Z",
    updatedAt: "2026-10-05T09:00:00Z"
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: "user_superadmin",
    email: "superadmin@moonboxdigital.com",
    name: "Kasun Jayasuriya",
    role: "superadmin",
    tenantId: "superadmin",
    phone: "014241555",
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "user_owner_colombo",
    email: "owner@moonboxsalon.lk",
    name: "Eishcharya Hemini",
    role: "owner",
    tenantId: "tenant_moonbox_flagship",
    phone: "0714241555",
    createdAt: "2026-08-15T08:00:00Z"
  },
  {
    id: "user_reception_colombo",
    email: "reception@moonboxsalon.lk",
    name: "Shanika Wickramasinghe",
    role: "receptionist",
    tenantId: "tenant_moonbox_flagship",
    phone: "0778899001",
    createdAt: "2026-08-20T08:00:00Z"
  },
  {
    id: "user_staff_dinithi",
    email: "dinithi@moonboxsalon.lk",
    name: "Dinithi Fernando",
    role: "staff",
    tenantId: "tenant_moonbox_flagship",
    phone: "0712345678",
    createdAt: "2026-08-20T08:00:00Z"
  }
];

export const INITIAL_SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: "cat_hair", tenantId: "tenant_moonbox_flagship", name: "Hair Artistry & Styling" },
  { id: "cat_skin", tenantId: "tenant_moonbox_flagship", name: "Skin & Clinical Facials" },
  { id: "cat_nails", tenantId: "tenant_moonbox_flagship", name: "Nail Lounge & Pedicure" },
  { id: "cat_bridal", tenantId: "tenant_moonbox_flagship", name: "Bridal Couture & Makeup" }
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: "srv_cut_blow",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "cat_hair",
    name: "Signature Cut, Wash & Luxury Blow Dry",
    description: "Personalized style consultation, clarifying botanical wash, precision cut, and salon finish.",
    priceLKR: 4500,
    durationMinutes: 45,
    assignedStaffIds: ["stf_dinithi", "stf_sachini"],
    commissionRate: 15,
    isOnlineBookingEnabled: true,
    isActive: true
  },
  {
    id: "srv_keratin",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "cat_hair",
    name: "Brazilian Keratin Silk Therapy",
    description: "Deep formaldehyde-free keratin infusion eliminating frizz with high-shine luster for 4 months.",
    priceLKR: 28000,
    durationMinutes: 120,
    assignedStaffIds: ["stf_dinithi"],
    commissionRate: 20,
    isOnlineBookingEnabled: true,
    isActive: true
  },
  {
    id: "srv_balayage",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "cat_hair",
    name: "Custom Balayage & Olaplex Bond Builder",
    description: "Freehand dimensional hand-painting, gloss toning, and bonding therapy.",
    priceLKR: 36000,
    durationMinutes: 180,
    assignedStaffIds: ["stf_dinithi"],
    commissionRate: 22,
    isOnlineBookingEnabled: true,
    isActive: true
  },
  {
    id: "srv_facial_gold",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "cat_skin",
    name: "24K Gold Cellular Radiance Facial",
    description: "Infusion of pure 24K leaf flakes, hyaluronic ultrasound, collagen mask, and neck massage.",
    priceLKR: 14000,
    durationMinutes: 60,
    assignedStaffIds: ["stf_kavindi"],
    commissionRate: 18,
    isOnlineBookingEnabled: true,
    isActive: true
  },
  {
    id: "srv_hydra_cleanse",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "cat_skin",
    name: "Hydra-Glow Hydro-Dermabrasion",
    description: "Vortex suction pore purification, antioxidant peptide serum bath, and cryo-sculpting.",
    priceLKR: 12500,
    durationMinutes: 50,
    assignedStaffIds: ["stf_kavindi"],
    commissionRate: 15,
    isOnlineBookingEnabled: true,
    isActive: true
  },
  {
    id: "srv_russian_gel",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "cat_nails",
    name: "Russian E-File Gel Manicure & Nail Art",
    description: "Flawless cuticle diamond buffing, rubber base reinforcement, and bespoke chrome or nail art.",
    priceLKR: 6800,
    durationMinutes: 60,
    assignedStaffIds: ["stf_chamari"],
    commissionRate: 20,
    isOnlineBookingEnabled: true,
    isActive: true
  },
  {
    id: "srv_spa_pedi",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "cat_nails",
    name: "Royal Rose Petal Spa Pedicure",
    description: "Dead Sea mineral soak, gentle callus buffing, lavender scrub, hot stone massage & polish.",
    priceLKR: 7500,
    durationMinutes: 60,
    assignedStaffIds: ["stf_chamari"],
    commissionRate: 15,
    isOnlineBookingEnabled: true,
    isActive: true
  },
  {
    id: "srv_bridal_package",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "cat_bridal",
    name: "Luxury Kandyan / Western Bridal Dressing",
    description: "Full bridal makeup, hair architectural styling, sari draping or veil fixing with dressing assistant.",
    priceLKR: 65000,
    durationMinutes: 180,
    assignedStaffIds: ["stf_sachini", "stf_dinithi"],
    commissionRate: 25,
    isOnlineBookingEnabled: true,
    isActive: true
  }
];

export const INITIAL_STAFF: Staff[] = [
  {
    id: "stf_dinithi",
    tenantId: "tenant_moonbox_flagship",
    name: "Dinithi Fernando",
    position: "Senior Creative Hair Stylist",
    phone: "0712345678",
    email: "dinithi@moonboxsalon.lk",
    status: "active",
    assignedServiceIds: ["srv_cut_blow", "srv_keratin", "srv_balayage", "srv_bridal_package"],
    defaultServiceCommission: 20,
    defaultProductCommission: 10,
    workingHours: {
      monday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      tuesday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      wednesday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      thursday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      friday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      saturday: { start: "09:00", end: "19:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      sunday: { start: "09:00", end: "17:00", isWorking: false },
    },
    color: "#9E4784",
    createdAt: "2026-08-20T08:00:00Z"
  },
  {
    id: "stf_kavindi",
    tenantId: "tenant_moonbox_flagship",
    name: "Kavindi Silva",
    position: "Lead Skin Specialist & Aesthetician",
    phone: "0773456789",
    email: "kavindi@moonboxsalon.lk",
    status: "active",
    assignedServiceIds: ["srv_facial_gold", "srv_hydra_cleanse"],
    defaultServiceCommission: 18,
    defaultProductCommission: 10,
    workingHours: {
      monday: { start: "09:30", end: "18:30", isWorking: true, breakStart: "13:30", breakEnd: "14:30" },
      tuesday: { start: "09:30", end: "18:30", isWorking: true, breakStart: "13:30", breakEnd: "14:30" },
      wednesday: { start: "09:30", end: "18:30", isWorking: true, breakStart: "13:30", breakEnd: "14:30" },
      thursday: { start: "09:30", end: "18:30", isWorking: true, breakStart: "13:30", breakEnd: "14:30" },
      friday: { start: "09:30", end: "18:30", isWorking: true, breakStart: "13:30", breakEnd: "14:30" },
      saturday: { start: "09:00", end: "19:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      sunday: { start: "09:30", end: "17:00", isWorking: false },
    },
    color: "#DE9E74",
    createdAt: "2026-08-22T08:00:00Z"
  },
  {
    id: "stf_chamari",
    tenantId: "tenant_moonbox_flagship",
    name: "Chamari Perera",
    position: "Master Nail Artist",
    phone: "0764567890",
    email: "chamari@moonboxsalon.lk",
    status: "active",
    assignedServiceIds: ["srv_russian_gel", "srv_spa_pedi"],
    defaultServiceCommission: 18,
    defaultProductCommission: 8,
    workingHours: {
      monday: { start: "10:00", end: "19:00", isWorking: true, breakStart: "14:00", breakEnd: "15:00" },
      tuesday: { start: "10:00", end: "19:00", isWorking: true, breakStart: "14:00", breakEnd: "15:00" },
      wednesday: { start: "10:00", end: "19:00", isWorking: false },
      thursday: { start: "10:00", end: "19:00", isWorking: true, breakStart: "14:00", breakEnd: "15:00" },
      friday: { start: "10:00", end: "19:00", isWorking: true, breakStart: "14:00", breakEnd: "15:00" },
      saturday: { start: "09:00", end: "19:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      sunday: { start: "10:00", end: "18:00", isWorking: true, breakStart: "13:30", breakEnd: "14:30" },
    },
    color: "#6B2D68",
    createdAt: "2026-08-25T08:00:00Z"
  },
  {
    id: "stf_sachini",
    tenantId: "tenant_moonbox_flagship",
    name: "Sachini Jayawardena",
    position: "Bridal Director & Makeup Artist",
    phone: "0715678901",
    email: "sachini@moonboxsalon.lk",
    status: "active",
    assignedServiceIds: ["srv_bridal_package", "srv_cut_blow"],
    defaultServiceCommission: 25,
    defaultProductCommission: 10,
    workingHours: {
      monday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      tuesday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      wednesday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      thursday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      friday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      saturday: { start: "08:00", end: "19:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
      sunday: { start: "09:00", end: "18:00", isWorking: true, breakStart: "13:00", breakEnd: "14:00" },
    },
    color: "#B9764C",
    createdAt: "2026-08-25T08:00:00Z"
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "cust_ananya",
    tenantId: "tenant_moonbox_flagship",
    name: "Ananya Senanayake",
    phone: "0771239876",
    whatsapp: "0771239876",
    email: "ananya.s@gmail.com",
    gender: "female",
    birthday: "1994-06-18",
    address: "Havelock City, Colombo 05",
    notes: "Prefers organic sulfate-free aftercare. Sensitive scalp.",
    status: "active",
    totalSpentLKR: 98500,
    visitsCount: 5,
    lastVisitAt: "2026-10-10T11:00:00Z",
    createdAt: "2026-08-25T00:00:00Z"
  },
  {
    id: "cust_dilani",
    tenantId: "tenant_moonbox_flagship",
    name: "Dilani Rajapakse",
    phone: "0714561234",
    whatsapp: "0714561234",
    email: "dilani.rajapakse@yahoo.com",
    gender: "female",
    birthday: "1988-11-04",
    address: "Rosmead Place, Colombo 07",
    notes: "VIP Client. Loves warm rose-gold tones on nails.",
    status: "active",
    totalSpentLKR: 145000,
    visitsCount: 8,
    lastVisitAt: "2026-10-12T14:30:00Z",
    createdAt: "2026-08-22T00:00:00Z"
  },
  {
    id: "cust_tanya",
    tenantId: "tenant_moonbox_flagship",
    name: "Tanya De Alwis",
    phone: "0767894561",
    whatsapp: "0767894561",
    email: "tanya.dealwis@outlook.com",
    gender: "female",
    birthday: "1997-02-14",
    address: "Mount Lavinia",
    notes: "Wedding scheduled for December 2026.",
    status: "active",
    totalSpentLKR: 65000,
    visitsCount: 2,
    lastVisitAt: "2026-10-08T16:00:00Z",
    createdAt: "2026-09-02T00:00:00Z"
  },
  {
    id: "cust_shehan",
    tenantId: "tenant_moonbox_flagship",
    name: "Shehan Wickrematunge",
    phone: "0778899112",
    whatsapp: "0778899112",
    email: "shehan.w@gmail.com",
    gender: "male",
    birthday: "1992-09-29",
    address: "Kollupitiya, Colombo 03",
    notes: "Regular monthly styling.",
    status: "active",
    totalSpentLKR: 22500,
    visitsCount: 4,
    lastVisitAt: "2026-10-01T15:00:00Z",
    createdAt: "2026-08-28T00:00:00Z"
  }
];

export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: "pcat_haircare", tenantId: "tenant_moonbox_flagship", name: "Luxury Haircare & Serums" },
  { id: "pcat_skincare", tenantId: "tenant_moonbox_flagship", name: "Clinical Skincare & Masks" },
  { id: "pcat_nailcare", tenantId: "tenant_moonbox_flagship", name: "Nail Care & Oils" }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod_argan_oil",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "pcat_haircare",
    name: "Moroccan Argan Elixir 100ml",
    sku: "MBX-OIL-101",
    sellingPriceLKR: 8200,
    costPriceLKR: 4800,
    stockQuantity: 14,
    lowStockThreshold: 5,
    supplier: "Lanka Beauty Imports Ltd",
    expiryDate: "2027-12-31",
    status: "active",
    createdAt: "2026-08-20T00:00:00Z"
  },
  {
    id: "prod_keratin_shampoo",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "pcat_haircare",
    name: "Keratin Silk Infusion Shampoo 500ml",
    sku: "MBX-SHM-202",
    sellingPriceLKR: 6500,
    costPriceLKR: 3800,
    stockQuantity: 3, // LOW STOCK TRIGGER!
    lowStockThreshold: 6,
    supplier: "Lanka Beauty Imports Ltd",
    expiryDate: "2027-08-30",
    status: "active",
    createdAt: "2026-08-20T00:00:00Z"
  },
  {
    id: "prod_cuticle_oil",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "pcat_nailcare",
    name: "Rose Gold Cuticle Botanical Drops 30ml",
    sku: "MBX-NAIL-303",
    sellingPriceLKR: 3200,
    costPriceLKR: 1600,
    stockQuantity: 28,
    lowStockThreshold: 8,
    supplier: "Ceylon Natural Alchemy",
    expiryDate: "2028-01-15",
    status: "active",
    createdAt: "2026-08-20T00:00:00Z"
  },
  {
    id: "prod_gold_mask",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "pcat_skincare",
    name: "24K Gold Collagen Peptide Sheet Mask (Box of 5)",
    sku: "MBX-MSK-404",
    sellingPriceLKR: 5800,
    costPriceLKR: 2900,
    stockQuantity: 9,
    lowStockThreshold: 4,
    supplier: "Seoul Glow Lanka",
    expiryDate: "2027-11-20",
    status: "active",
    createdAt: "2026-08-20T00:00:00Z"
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "apt_101",
    tenantId: "tenant_moonbox_flagship",
    customerId: "cust_ananya",
    customerName: "Ananya Senanayake",
    customerPhone: "0771239876",
    customerEmail: "ananya.s@gmail.com",
    staffId: "stf_dinithi",
    staffName: "Dinithi Fernando",
    serviceIds: ["srv_cut_blow"],
    serviceNames: ["Signature Cut, Wash & Luxury Blow Dry"],
    date: new Date().toISOString().split('T')[0], // Today!
    startTime: "10:30",
    endTime: "11:15",
    durationMinutes: 45,
    totalPriceLKR: 4500,
    status: "confirmed",
    paymentStatus: "unpaid",
    bookingSource: "online_portal",
    notes: "Anniversary dinner in the evening.",
    createdAt: "2026-10-11T10:00:00Z",
    updatedAt: "2026-10-11T10:00:00Z"
  },
  {
    id: "apt_102",
    tenantId: "tenant_moonbox_flagship",
    customerId: "cust_dilani",
    customerName: "Dilani Rajapakse",
    customerPhone: "0714561234",
    customerEmail: "dilani.rajapakse@yahoo.com",
    staffId: "stf_kavindi",
    staffName: "Kavindi Silva",
    serviceIds: ["srv_facial_gold"],
    serviceNames: ["24K Gold Cellular Radiance Facial"],
    date: new Date().toISOString().split('T')[0], // Today!
    startTime: "14:00",
    endTime: "15:00",
    durationMinutes: 60,
    totalPriceLKR: 14000,
    status: "checked_in",
    paymentStatus: "unpaid",
    bookingSource: "in_salon",
    notes: "Welcomed with iced jasmine tea.",
    createdAt: "2026-10-10T14:00:00Z",
    updatedAt: "2026-10-13T13:55:00Z"
  },
  {
    id: "apt_103",
    tenantId: "tenant_moonbox_flagship",
    customerId: "cust_tanya",
    customerName: "Tanya De Alwis",
    customerPhone: "0767894561",
    customerEmail: "tanya.dealwis@outlook.com",
    staffId: "stf_chamari",
    staffName: "Chamari Perera",
    serviceIds: ["srv_russian_gel", "srv_spa_pedi"],
    serviceNames: ["Russian E-File Gel Manicure & Nail Art", "Royal Rose Petal Spa Pedicure"],
    date: new Date().toISOString().split('T')[0], // Today!
    startTime: "16:00",
    endTime: "18:00",
    durationMinutes: 120,
    totalPriceLKR: 14300,
    status: "pending",
    paymentStatus: "unpaid",
    bookingSource: "whatsapp",
    notes: "Wants rose-gold chrome powder nails.",
    createdAt: "2026-10-12T09:00:00Z",
    updatedAt: "2026-10-12T09:00:00Z"
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: "inv_2026_089",
    invoiceNumber: "INV-2026-089",
    tenantId: "tenant_moonbox_flagship",
    customerId: "cust_dilani",
    customerName: "Dilani Rajapakse",
    customerPhone: "0714561234",
    items: [
      {
        type: "service",
        itemId: "srv_balayage",
        name: "Custom Balayage & Olaplex Bond Builder",
        quantity: 1,
        unitPriceLKR: 36000,
        discountLKR: 0,
        totalLKR: 36000,
        staffId: "stf_dinithi",
        staffName: "Dinithi Fernando",
        commissionLKR: 7920
      },
      {
        type: "product",
        itemId: "prod_argan_oil",
        name: "Moroccan Argan Elixir 100ml",
        quantity: 1,
        unitPriceLKR: 8200,
        discountLKR: 0,
        totalLKR: 8200,
        staffId: "stf_dinithi",
        staffName: "Dinithi Fernando",
        commissionLKR: 820
      }
    ],
    subtotalLKR: 44200,
    discountLKR: 2000,
    taxLKR: 1055,
    tipLKR: 1500,
    totalLKR: 44755,
    paidAmountLKR: 44755,
    balanceLKR: 0,
    paymentMethod: "card",
    status: "paid",
    notes: "Commercial Bank Visa Card payment",
    createdBy: "Shanika Wickramasinghe",
    createdAt: "2026-10-12T17:30:00Z"
  },
  {
    id: "inv_2026_090",
    invoiceNumber: "INV-2026-090",
    tenantId: "tenant_moonbox_flagship",
    customerId: "cust_ananya",
    customerName: "Ananya Senanayake",
    customerPhone: "0771239876",
    items: [
      {
        type: "service",
        itemId: "srv_russian_gel",
        name: "Russian E-File Gel Manicure & Nail Art",
        quantity: 1,
        unitPriceLKR: 6800,
        discountLKR: 0,
        totalLKR: 6800,
        staffId: "stf_chamari",
        staffName: "Chamari Perera",
        commissionLKR: 1360
      }
    ],
    subtotalLKR: 6800,
    discountLKR: 0,
    taxLKR: 170,
    tipLKR: 500,
    totalLKR: 7470,
    paidAmountLKR: 7470,
    balanceLKR: 0,
    paymentMethod: "digital_qr",
    status: "paid",
    notes: "LANKAQR FriMi transfer",
    createdBy: "Shanika Wickramasinghe",
    createdAt: "2026-10-13T09:45:00Z"
  }
];

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "ecat_rent", tenantId: "tenant_moonbox_flagship", name: "Salon Premises Rent" },
  { id: "ecat_utilities", tenantId: "tenant_moonbox_flagship", name: "Electricity & Water (CEB/NWSDB)" },
  { id: "ecat_supplies", tenantId: "tenant_moonbox_flagship", name: "Cosmetic & Bleach Supplies" },
  { id: "ecat_welfare", tenantId: "tenant_moonbox_flagship", name: "Staff Refreshments & Welfare" },
  { id: "ecat_marketing", tenantId: "tenant_moonbox_flagship", name: "Social Media & Meta Ads" }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: "exp_01",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "ecat_utilities",
    categoryName: "Electricity & Water (CEB/NWSDB)",
    description: "CEB Commercial Electricity Bill for AC & styling dryers",
    amountLKR: 42500,
    paymentMethod: "bank_transfer",
    date: "2026-10-08",
    notes: "Paid online via Commercial Bank direct debit",
    createdAt: "2026-10-08T10:00:00Z"
  },
  {
    id: "exp_02",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "ecat_supplies",
    categoryName: "Cosmetic & Bleach Supplies",
    description: "Lanka Beauty Imports - 5x developer packs, gloves, tint bowls",
    amountLKR: 18400,
    paymentMethod: "cash",
    date: "2026-10-10",
    notes: "Petty cash voucher #412",
    createdAt: "2026-10-10T15:30:00Z"
  },
  {
    id: "exp_03",
    tenantId: "tenant_moonbox_flagship",
    categoryId: "ecat_marketing",
    categoryName: "Social Media & Meta Ads",
    description: "Meta Ads campaign for Kandyan Bridal bookings",
    amountLKR: 15000,
    paymentMethod: "card",
    date: "2026-10-12",
    createdAt: "2026-10-12T11:00:00Z"
  }
];

export const INITIAL_COMMISSIONS: StaffCommissionRecord[] = [
  {
    id: "com_01",
    tenantId: "tenant_moonbox_flagship",
    staffId: "stf_dinithi",
    staffName: "Dinithi Fernando",
    invoiceId: "inv_2026_089",
    invoiceNumber: "INV-2026-089",
    itemType: "service",
    itemName: "Custom Balayage & Olaplex Bond Builder",
    itemAmountLKR: 36000,
    commissionPercentage: 22,
    commissionAmountLKR: 7920,
    status: "unpaid",
    createdAt: "2026-10-12T17:30:00Z"
  },
  {
    id: "com_02",
    tenantId: "tenant_moonbox_flagship",
    staffId: "stf_dinithi",
    staffName: "Dinithi Fernando",
    invoiceId: "inv_2026_089",
    invoiceNumber: "INV-2026-089",
    itemType: "product",
    itemName: "Moroccan Argan Elixir 100ml",
    itemAmountLKR: 8200,
    commissionPercentage: 10,
    commissionAmountLKR: 820,
    status: "unpaid",
    createdAt: "2026-10-12T17:30:00Z"
  },
  {
    id: "com_03",
    tenantId: "tenant_moonbox_flagship",
    staffId: "stf_chamari",
    staffName: "Chamari Perera",
    invoiceId: "inv_2026_090",
    invoiceNumber: "INV-2026-090",
    itemType: "service",
    itemName: "Russian E-File Gel Manicure & Nail Art",
    itemAmountLKR: 6800,
    commissionPercentage: 20,
    commissionAmountLKR: 1360,
    status: "unpaid",
    createdAt: "2026-10-13T09:45:00Z"
  }
];

export const INITIAL_MANUAL_PAYMENTS: ManualPaymentRequest[] = [
  {
    id: "pay_slip_001",
    tenantId: "tenant_aura_kandy",
    salonName: "Aura Beauty Lounge - Kandy",
    ownerEmail: "kandy@aurabeautylounge.lk",
    planId: "plan_growth",
    planName: "Growth (Monthly)",
    billingCycle: "monthly",
    amountLKR: 18500,
    bankReference: "COMB-CEFT-994821",
    paymentDate: "2026-10-12",
    receiptUrl: "",
    receiptFileName: "commercial_bank_deposit_slip_aura.jpg",
    notes: "Paid via Commercial Bank online banking for monthly renewal",
    status: "pending",
    createdAt: "2026-10-12T16:00:00Z"
  }
];

export const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: "tkt_501",
    tenantId: "tenant_moonbox_flagship",
    salonName: "Moonbox Salon - Flagship Colombo",
    userEmail: "owner@moonboxsalon.lk",
    subject: "Custom domain SSL verification assistance",
    category: "technical",
    priority: "normal",
    status: "in_progress",
    assignedTo: "superadmin@moonboxdigital.com",
    messages: [
      {
        id: "msg_1",
        senderEmail: "owner@moonboxsalon.lk",
        senderRole: "tenant",
        senderName: "Eishcharya Hemini",
        content: "Hi Moonbox Digital team, I added CNAME records for colombo.moonboxsalon.lk pointing to edge.moonboxdigital.com. Could you please check the SSL activation status?",
        createdAt: "2026-10-11T09:15:00Z"
      },
      {
        id: "msg_2",
        senderEmail: "superadmin@moonboxdigital.com",
        senderRole: "support",
        senderName: "Kasun Jayasuriya (Moonbox Platform Admin)",
        content: "Hello Eishcharya, we checked your DNS propagation. The Cloudflare Edge SSL certificate is active now and your salon public site is routing securely!",
        createdAt: "2026-10-11T11:30:00Z"
      }
    ],
    createdAt: "2026-10-11T09:15:00Z",
    updatedAt: "2026-10-11T11:30:00Z"
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann_01",
    title: "✨ Moonbox Salon 2.0: Automated WhatsApp Booking Confirmations",
    content: "We have upgraded customer messaging to support instant WhatsApp confirmations for all Sri Lankan mobile numbers (07X-XXXXXXX). Enjoy seamless client communications!",
    type: "info",
    targetAudience: "all",
    isActive: true,
    publishedAt: "2026-10-10T00:00:00Z"
  },
  {
    id: "ann_02",
    title: "⚡ Festival & Wedding Season Peak Capacity Tips",
    content: "Tip: Configure your staff break buffers in Settings -> Online Booking to avoid peak bridal rush delays during upcoming holiday weekends.",
    type: "success",
    targetAudience: "active",
    isActive: true,
    publishedAt: "2026-10-08T00:00:00Z"
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif_1",
    tenantId: "tenant_moonbox_flagship",
    title: "New Online Booking Confirmed",
    message: "Ananya Senanayake booked Signature Cut & Blow Dry for today at 10:30 AM.",
    type: "appointment",
    read: false,
    createdAt: "2026-10-13T08:00:00Z"
  },
  {
    id: "notif_2",
    tenantId: "tenant_moonbox_flagship",
    title: "⚠️ Low Stock Warning: Keratin Shampoo",
    message: "Only 3 units of Keratin Silk Infusion Shampoo 500ml remaining (Threshold: 6).",
    type: "inventory",
    read: false,
    createdAt: "2026-10-13T09:00:00Z"
  },
  {
    id: "notif_3",
    tenantId: "superadmin",
    title: "New Bank Slip Submitted for Review",
    message: "Aura Beauty Lounge - Kandy submitted slip COMB-CEFT-994821 (Rs. 18,500) for approval.",
    type: "payment",
    read: false,
    createdAt: "2026-10-12T16:05:00Z"
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "aud_1",
    tenantId: "tenant_moonbox_flagship",
    actorEmail: "reception@moonboxsalon.lk",
    actorRole: "receptionist",
    action: "CHECK_IN_APPOINTMENT",
    entity: "appointment",
    entityId: "apt_102",
    details: "Checked in Dilani Rajapakse for 24K Gold Cellular Facial",
    createdAt: "2026-10-13T13:55:00Z"
  },
  {
    id: "aud_2",
    tenantId: "tenant_moonbox_flagship",
    actorEmail: "reception@moonboxsalon.lk",
    actorRole: "receptionist",
    action: "CREATE_INVOICE",
    entity: "invoice",
    entityId: "inv_2026_090",
    details: "Created and settled invoice INV-2026-090 for Rs. 7,470 (LANKAQR)",
    createdAt: "2026-10-13T09:45:00Z"
  },
  {
    id: "aud_3",
    tenantId: "tenant_moonbox_flagship",
    actorEmail: "owner@moonboxsalon.lk",
    actorRole: "owner",
    action: "UPDATE_PORTFOLIO",
    entity: "portfolio",
    details: "Updated public portfolio gallery images and theme to 'luxury'",
    createdAt: "2026-10-10T12:00:00Z"
  },
  {
    id: "aud_4",
    tenantId: "superadmin",
    actorEmail: "superadmin@moonboxdigital.com",
    actorRole: "superadmin",
    action: "UPDATE_PLAN_PRICING",
    entity: "subscription_plan",
    entityId: "plan_growth",
    details: "Verified Growth tier LKR pricing at Rs. 18,500/month",
    createdAt: "2026-10-09T14:20:00Z"
  }
];
