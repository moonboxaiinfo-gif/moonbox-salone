export type BookingLanguage = 'en' | 'si';

export interface BookingTranslationDictionary {
  languageName: string;
  langSwitchLabel: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  phoneHelp: string;
  notesLabel: string;
  notesPlaceholder: string;
  selectServiceTitle: string;
  allCategories: string;
  mins: string;
  price: string;
  duration: string;
  selectDateTitle: string;
  selectStaffTitle: string;
  anyStaff: string;
  selectTimeTitle: string;
  slotAvailable: string;
  slotBooked: string;
  continueBtn: string;
  backBtn: string;
  submitBtn: string;
  submittingBtn: string;
  bookingSummary: string;
  serviceSelected: string;
  stylistSelected: string;
  dateTimeSelected: string;
  totalPrice: string;
  clientDetails: string;
  bookingConfirmedTitle: string;
  bookingConfirmedSubtitle: string;
  bookingRefLabel: string;
  bookAnotherBtn: string;
  chatOnWhatsApp: string;
  callSalon: string;
  locationLabel: string;
  openingHoursLabel: string;
  validationNameRequired: string;
  validationPhoneRequired: string;
  validationPhoneInvalid: string;
  validationServiceRequired: string;
  validationTimeRequired: string;
  validationConflictError: string;
  noServicesFound: string;
  noSlotsAvailable: string;
  salonClosedOnDate: string;
  closed: string;
}

export const BOOKING_TRANSLATIONS: Record<BookingLanguage, BookingTranslationDictionary> = {
  en: {
    languageName: "English",
    langSwitchLabel: "සිංහල",
    step1Title: "1. Your Details",
    step1Desc: "Please provide your contact information to reserve your appointment.",
    step2Title: "2. Select Service",
    step2Desc: "Choose your preferred salon service or styling package.",
    step3Title: "3. Date & Time",
    step3Desc: "Select an available date and appointment slot.",
    fullNameLabel: "Full Name *",
    fullNamePlaceholder: "e.g. Kasun Fernando",
    phoneLabel: "Mobile Phone Number *",
    phonePlaceholder: "07X XXXXXXX",
    phoneHelp: "Enter a valid Sri Lankan mobile number for SMS & WhatsApp confirmation.",
    notesLabel: "Special Requests or Styling Notes (Optional)",
    notesPlaceholder: "Any hair/skin preferences, allergies, or special notes for your stylist...",
    selectServiceTitle: "Available Salon Services & Packages",
    allCategories: "All Treatments",
    mins: "mins",
    price: "Price",
    duration: "Duration",
    selectDateTitle: "Choose Appointment Date",
    selectStaffTitle: "Preferred Stylist",
    anyStaff: "Any Qualified Stylist",
    selectTimeTitle: "Available Time Slots",
    slotAvailable: "Available",
    slotBooked: "Booked",
    continueBtn: "Continue",
    backBtn: "Back",
    submitBtn: "Confirm & Book Appointment",
    submittingBtn: "Securing Appointment...",
    bookingSummary: "Booking Summary",
    serviceSelected: "Service",
    stylistSelected: "Stylist",
    dateTimeSelected: "Date & Time",
    totalPrice: "Total Amount",
    clientDetails: "Client",
    bookingConfirmedTitle: "Appointment Confirmed!",
    bookingConfirmedSubtitle: "Your styling session is scheduled. The salon team looks forward to welcoming you.",
    bookingRefLabel: "Booking Reference",
    bookAnotherBtn: "Book Another Appointment",
    chatOnWhatsApp: "Chat with Salon on WhatsApp",
    callSalon: "Call Salon Directly",
    locationLabel: "Location",
    openingHoursLabel: "Salon Opening Hours",
    validationNameRequired: "Please enter your full name.",
    validationPhoneRequired: "Please enter your mobile phone number.",
    validationPhoneInvalid: "Please enter a valid Sri Lankan phone number (e.g. 077 123 4567).",
    validationServiceRequired: "Please select a service before proceeding.",
    validationTimeRequired: "Please choose an available appointment time slot.",
    validationConflictError: "This time slot was just booked by another client. Please select an alternate time.",
    noServicesFound: "No public services are currently available for online booking at this salon.",
    noSlotsAvailable: "No available slots on this date. Please pick another date.",
    salonClosedOnDate: "The salon is closed on this day. Please select another date.",
    closed: "Closed"
  },
  si: {
    languageName: "සිංහල",
    langSwitchLabel: "English",
    step1Title: "1. ඔබගේ තොරතුරු",
    step1Desc: "වේලාවක් වෙන්කරවා ගැනීම සඳහා ඔබගේ සම්බන්ධතා තොරතුරු ඇතුළත් කරන්න.",
    step2Title: "2. සේවාව තෝරන්න",
    step2Desc: "ඔබට අවශ්‍ය සැලෝන් සේවාව හෝ පැකේජය තෝරන්න.",
    step3Title: "3. දිනය සහ වේලාව",
    step3Desc: "ඔබට පහසු දිනයක් සහ වේලාවක් තෝරාගන්න.",
    fullNameLabel: "සම්පූර්ණ නම *",
    fullNamePlaceholder: "උදා: කසුන් ප්‍රනාන්දු",
    phoneLabel: "ජංගම දුරකථන අංකය *",
    phonePlaceholder: "07X XXXXXXX",
    phoneHelp: "තහවුරු කිරීමේ පණිවිඩ සඳහා නිවැරදි ශ්‍රී ලාංකික ජංගම දුරකථන අංකයක් ඇතුළත් කරන්න.",
    notesLabel: "විශේෂ සටහන් (විකල්ප)",
    notesPlaceholder: "ඔබගේ කොණ්ඩා හෝ සමේ මනාපයන්, විශේෂ අවශ්‍යතා ආදිය...",
    selectServiceTitle: "ලබාගත හැකි සැලෝන් සේවාවන්",
    allCategories: "සියලු සේවාවන්",
    mins: "මිනිත්තු",
    price: "මිල",
    duration: "කාලය",
    selectDateTitle: "දිනය තෝරන්න",
    selectStaffTitle: "කැමති ශිල්පියා / ශිල්පිනිය",
    anyStaff: "ලබාගත හැකි ඕනෑම ශිල්පියෙක්",
    selectTimeTitle: "ලබාගත හැකි වේලාවන්",
    slotAvailable: "වේලාව ඇත",
    slotBooked: "වෙන්කර ඇත",
    continueBtn: "ඉදිරියට යන්න",
    backBtn: "ආපසු",
    submitBtn: "වෙන්කිරීම තහවුරු කරන්න",
    submittingBtn: "වේලාව වෙන්කරමින් පවතී...",
    bookingSummary: "වෙන්කිරීමේ සාරාංශය",
    serviceSelected: "සේවාව",
    stylistSelected: "ශිල්පියා",
    dateTimeSelected: "දිනය සහ වේලාව",
    totalPrice: "මුළු මුදල",
    clientDetails: "සේවාලාභියා",
    bookingConfirmedTitle: "වේලාව සාර්ථකව වෙන්කරන ලදී!",
    bookingConfirmedSubtitle: "ඔබගේ වේලාව සැලෝන් දිනදර්ශනයේ සටහන් විය. ඔබව සාදරයෙන් පිළිගැනීමට අපි බලාපොරොත්තු වෙමු.",
    bookingRefLabel: "වෙන්කිරීමේ අංකය",
    bookAnotherBtn: "තවත් වේලාවක් වෙන්කරන්න",
    chatOnWhatsApp: "WhatsApp මගින් සම්බන්ධ වන්න",
    callSalon: "සැලෝන් අමතන්න",
    locationLabel: "ස්ථානය",
    openingHoursLabel: "විවෘත වේලාවන්",
    validationNameRequired: "කරුණාකර ඔබගේ සම්පූර්ණ නම ඇතුළත් කරන්න.",
    validationPhoneRequired: "කරුණාකර ඔබගේ ජංගම දුරකථන අංකය ඇතුළත් කරන්න.",
    validationPhoneInvalid: "කරුණාකර නිවැරදි ජංගම දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 077 123 4567).",
    validationServiceRequired: "කරුණාකර ඉදිරියට යාමට පෙර සේවාවක් තෝරන්න.",
    validationTimeRequired: "කරුණාකර ඔබට පහසු වේලාවක් තෝරන්න.",
    validationConflictError: "මෙම වේලාව වෙනත් අයෙකු විසින් මීට සුළු මොහොතකට පෙර වෙන්කරගෙන ඇත. කරුණාකර වෙනත් වේලාවක් තෝරන්න.",
    noServicesFound: "මෙම සැලෝන් ආයතනයේ දැනට අන්තර්ජාලය හරහා වෙන්කරගත හැකි සේවාවන් නොමැත.",
    noSlotsAvailable: "මෙම දිනයේ ලබාගත හැකි වේලාවන් නොමැත. කරුණාකර වෙනත් දිනයක් තෝරන්න.",
    salonClosedOnDate: "මෙම දිනයේ සැලෝන් ආයතනය වසා ඇත. කරුණාකර වෙනත් දිනයක් තෝරන්න.",
    closed: "වසා ඇත"
  }
};
