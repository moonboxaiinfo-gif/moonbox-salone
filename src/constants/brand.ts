/**
 * Official Brand Identity & Details
 * Brand: Moonbox salon
 * Company: Moonbox digital
 * Tagline: Building a smarter salon.
 * Country: Sri Lanka | Currency: LKR
 */

export const BRAND_CONFIG = {
  name: "Moonbox Salon",
  company: "Moonbox Digital",
  tagline: "Building a smarter salon.",
  category: "Multi-Tenant Salon Management SaaS",
  country: "Sri Lanka",
  currency: "LKR",
  currencySymbol: "Rs.",
  phone: "014241555",
  whatsapp: "0714241555",
  email: "moonboxdigital@gmail.com",
  supportEmail: "moonboxdigital@gmail.com",
  website: "www.moonboxdigital.com",
  facebook: "moonbox digital",
  address: "No. 45, Galle Road, Colombo 03, Sri Lanka",

  // Manual Bank Payment details for Sri Lankan banks
  bankDetails: {
    bankName: "Commercial Bank of Ceylon",
    branch: "Kollupitiya Branch (014)",
    accountName: "Moonbox Digital (Pvt) Ltd",
    accountNumber: "1000 8472 9104",
    swiftCode: "CCEYLKX",
    instructions: "Please make the deposit or CEFT/SLIPS transfer and upload the clear payment slip or screenshot with your reference number."
  },

  // Official Design Theme: MOONBOX SALON — MIDNIGHT AMETHYST LUXURY
  colors: {
    midnightPlum: "#101225", // Main page background
    sidebarBg: "#151529",    // Sidebar background
    primaryCard: "#1C1B31",  // Primary card background
    elevatedCard: "#25223D", // Elevated card background
    primaryViolet: "#8B5CF6",// Primary brand violet
    secondaryLavender: "#B8A5FF", // Secondary lavender
    softHighlight: "#D4C8FF",// Soft highlight
    mutedRose: "#DFA4C1",    // Muted rose accent
    champagne: "#D5BD88",    // Champagne accent
    primaryText: "#F6F3FB",  // Primary text
    secondaryText: "#AAA6BD",// Secondary text
    mutedText: "#858198",    // Muted text
    border: "#343047",       // Borders
    subtleBrandSurface: "rgba(139, 92, 246, 0.10)",
    success: "#4BBF98",
    warning: "#E7B363",
    error: "#EA7180",
    information: "#82B8F0",
    // Backward compatibility aliases
    plumDeep: "#151529",
    plumCard: "#1C1B31",
    plumBorder: "#343047",
    crescentPurple: "#8B5CF6",
    orchidGlow: "#B8A5FF",
    champagneGold: "#D5BD88",
    champagneLight: "#D4C8FF",
    champagneDark: "#C4A66B",
    bgWarm: "#F8F7FC",
    surfaceWhite: "#FFFFFF",
    borderBeige: "#E2DFF0",
    textDark: "#101225",
    textMuted: "#6B6684"
  }
};

/**
 * Format LKR Currency reliably
 */
export function formatLKR(amount: number): string {
  if (isNaN(amount)) return "Rs. 0";
  return `Rs. ${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * Format compact LKR (e.g. Rs. 24.5k)
 */
export function formatLKRCompact(amount: number): string {
  if (amount >= 1000000) {
    return `Rs. ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `Rs. ${(amount / 1000).toFixed(1)}k`;
  }
  return `Rs. ${amount.toLocaleString('en-US')}`;
}
