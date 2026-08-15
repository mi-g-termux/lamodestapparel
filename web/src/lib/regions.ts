// Delivery geography + currency reference data.
// One source of truth for: country list, dial codes, phone rules, postcode
// labels, administrative divisions (state / province / division), major cities,
// shipping zones and per-country currency defaults.
//
// NOTE: this is a curated dataset that covers the countries Velora ships to.
// Street-level address validation (full postal address databases) is a paid
// third-party service — hook `validateAddress()` in this file up to one when
// you go live; the UI already funnels the shopper through
// country -> state -> city -> street -> postcode in that order.

export type ShippingZone = "domestic" | "europe" | "north-america" | "asia" | "rest";

export type Country = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  dial: string;
  currency: string; // ISO 4217
  zone: ShippingZone;
  postcodeLabel: string;
  /** Loose postcode shape. Empty string = country has no postal codes. */
  postcodePattern?: string;
  phoneMin: number;
  phoneMax: number;
  stateLabel?: string;
  states?: string[];
};

/** Currency definitions. `rate` is units per 1 USD (catalog base currency). */
export type Currency = {
  code: string;
  symbol: string;
  name: string;
  rate: number;
  decimals: number;
};

export const currencies: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar", rate: 1, decimals: 2 },
  { code: "EUR", symbol: "€", name: "Euro", rate: 0.92, decimals: 2 },
  { code: "GBP", symbol: "£", name: "British Pound", rate: 0.79, decimals: 2 },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar", rate: 1.36, decimals: 2 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", rate: 1.51, decimals: 2 },
  { code: "AED", symbol: "AED ", name: "UAE Dirham", rate: 3.67, decimals: 2 },
  { code: "SAR", symbol: "SR ", name: "Saudi Riyal", rate: 3.75, decimals: 2 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", rate: 83.2, decimals: 0 },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", rate: 118, decimals: 0 },
  { code: "PKR", symbol: "Rs ", name: "Pakistani Rupee", rate: 278, decimals: 0 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", rate: 152, decimals: 0 },
  { code: "CNY", symbol: "CN¥", name: "Chinese Yuan", rate: 7.24, decimals: 2 },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", rate: 1.34, decimals: 2 },
  { code: "MYR", symbol: "RM ", name: "Malaysian Ringgit", rate: 4.7, decimals: 2 },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", rate: 32.5, decimals: 2 },
  { code: "ZAR", symbol: "R ", name: "South African Rand", rate: 18.6, decimals: 2 },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", rate: 1480, decimals: 0 },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", rate: 5.4, decimals: 2 },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso", rate: 17.1, decimals: 2 },
  { code: "CHF", symbol: "CHF ", name: "Swiss Franc", rate: 0.89, decimals: 2 },
  { code: "SEK", symbol: "kr ", name: "Swedish Krona", rate: 10.5, decimals: 2 },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", rate: 1.64, decimals: 2 },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound", rate: 48, decimals: 0 },
  { code: "IDR", symbol: "Rp ", name: "Indonesian Rupiah", rate: 15800, decimals: 0 },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", rate: 57, decimals: 2 },
  { code: "THB", symbol: "฿", name: "Thai Baht", rate: 36, decimals: 2 },
  { code: "KRW", symbol: "₩", name: "South Korean Won", rate: 1360, decimals: 0 },
  { code: "PLN", symbol: "zł ", name: "Polish Zloty", rate: 3.95, decimals: 2 },
  { code: "NOK", symbol: "kr ", name: "Norwegian Krone", rate: 10.7, decimals: 2 },
  { code: "DKK", symbol: "kr ", name: "Danish Krone", rate: 6.86, decimals: 2 },
];

export const currencyByCode = (code: string) =>
  currencies.find((c) => c.code === code) ?? currencies[0]!;

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas",
  "Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York",
  "North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington",
  "West Virginia","Wisconsin","Wyoming",
];

const CA_PROVINCES = [
  "Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador",
  "Northwest Territories","Nova Scotia","Nunavut","Ontario","Prince Edward Island","Quebec",
  "Saskatchewan","Yukon",
];

const AU_STATES = [
  "Australian Capital Territory","New South Wales","Northern Territory","Queensland",
  "South Australia","Tasmania","Victoria","Western Australia",
];

const GB_REGIONS = [
  "England","Scotland","Wales","Northern Ireland","Greater London","Greater Manchester",
  "West Midlands","Yorkshire","Merseyside","Tyne and Wear",
];

const IN_STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
];

const BD_DIVISIONS = [
  "Barishal","Chattogram","Dhaka","Khulna","Mymensingh","Rajshahi","Rangpur","Sylhet",
];

const DE_STATES = [
  "Baden-Württemberg","Bavaria","Berlin","Brandenburg","Bremen","Hamburg","Hesse",
  "Lower Saxony","Mecklenburg-Vorpommern","North Rhine-Westphalia","Rhineland-Palatinate",
  "Saarland","Saxony","Saxony-Anhalt","Schleswig-Holstein","Thuringia",
];

const AE_EMIRATES = [
  "Abu Dhabi","Ajman","Dubai","Fujairah","Ras Al Khaimah","Sharjah","Umm Al Quwain",
];

const PK_PROVINCES = [
  "Azad Kashmir","Balochistan","Gilgit-Baltistan","Islamabad Capital Territory",
  "Khyber Pakhtunkhwa","Punjab","Sindh",
];

const ZA_PROVINCES = [
  "Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","North West",
  "Northern Cape","Western Cape",
];

const NG_STATES = [
  "Abia","Abuja (FCT)","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Edo",
  "Enugu","Imo","Kaduna","Kano","Katsina","Kwara","Lagos","Niger","Ogun","Ondo","Osun","Oyo",
  "Plateau","Rivers","Sokoto","Taraba","Zamfara",
];

const BR_STATES = [
  "Acre","Alagoas","Amapá","Amazonas","Bahia","Ceará","Distrito Federal","Espírito Santo","Goiás",
  "Maranhão","Mato Grosso","Mato Grosso do Sul","Minas Gerais","Pará","Paraíba","Paraná",
  "Pernambuco","Piauí","Rio de Janeiro","Rio Grande do Norte","Rio Grande do Sul","Rondônia",
  "Roraima","Santa Catarina","São Paulo","Sergipe","Tocantins",
];

const MX_STATES = [
  "Aguascalientes","Baja California","Campeche","Chiapas","Chihuahua","Ciudad de México",
  "Coahuila","Colima","Durango","Guanajuato","Guerrero","Hidalgo","Jalisco","México","Michoacán",
  "Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
  "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas",
];

export const countries: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸", dial: "+1", currency: "USD", zone: "north-america", postcodeLabel: "ZIP code", postcodePattern: "^\\d{5}(-\\d{4})?$", phoneMin: 10, phoneMax: 10, stateLabel: "State", states: US_STATES },
  { code: "CA", name: "Canada", flag: "🇨🇦", dial: "+1", currency: "CAD", zone: "north-america", postcodeLabel: "Postal code", postcodePattern: "^[A-Za-z]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d$", phoneMin: 10, phoneMax: 10, stateLabel: "Province", states: CA_PROVINCES },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "+44", currency: "GBP", zone: "europe", postcodeLabel: "Postcode", postcodePattern: "^[A-Za-z]{1,2}\\d[A-Za-z\\d]?[ ]?\\d[A-Za-z]{2}$", phoneMin: 9, phoneMax: 10, stateLabel: "Region", states: GB_REGIONS },
  { code: "IE", name: "Ireland", flag: "🇮🇪", dial: "+353", currency: "EUR", zone: "europe", postcodeLabel: "Eircode", phoneMin: 8, phoneMax: 9 },
  { code: "DE", name: "Germany", flag: "🇩🇪", dial: "+49", currency: "EUR", zone: "europe", postcodeLabel: "Postleitzahl", postcodePattern: "^\\d{5}$", phoneMin: 10, phoneMax: 11, stateLabel: "State", states: DE_STATES },
  { code: "FR", name: "France", flag: "🇫🇷", dial: "+33", currency: "EUR", zone: "europe", postcodeLabel: "Code postal", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 9 },
  { code: "ES", name: "Spain", flag: "🇪🇸", dial: "+34", currency: "EUR", zone: "europe", postcodeLabel: "Código postal", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 9 },
  { code: "IT", name: "Italy", flag: "🇮🇹", dial: "+39", currency: "EUR", zone: "europe", postcodeLabel: "CAP", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 10 },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", dial: "+31", currency: "EUR", zone: "europe", postcodeLabel: "Postcode", postcodePattern: "^\\d{4} ?[A-Za-z]{2}$", phoneMin: 9, phoneMax: 9 },
  { code: "BE", name: "Belgium", flag: "🇧🇪", dial: "+32", currency: "EUR", zone: "europe", postcodeLabel: "Postcode", postcodePattern: "^\\d{4}$", phoneMin: 8, phoneMax: 9 },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "+351", currency: "EUR", zone: "europe", postcodeLabel: "Código postal", postcodePattern: "^\\d{4}-\\d{3}$", phoneMin: 9, phoneMax: 9 },
  { code: "AT", name: "Austria", flag: "🇦🇹", dial: "+43", currency: "EUR", zone: "europe", postcodeLabel: "Postleitzahl", postcodePattern: "^\\d{4}$", phoneMin: 9, phoneMax: 11 },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", dial: "+41", currency: "CHF", zone: "europe", postcodeLabel: "Postcode", postcodePattern: "^\\d{4}$", phoneMin: 9, phoneMax: 9 },
  { code: "SE", name: "Sweden", flag: "🇸🇪", dial: "+46", currency: "SEK", zone: "europe", postcodeLabel: "Postnummer", postcodePattern: "^\\d{3} ?\\d{2}$", phoneMin: 9, phoneMax: 9 },
  { code: "NO", name: "Norway", flag: "🇳🇴", dial: "+47", currency: "NOK", zone: "europe", postcodeLabel: "Postnummer", postcodePattern: "^\\d{4}$", phoneMin: 8, phoneMax: 8 },
  { code: "DK", name: "Denmark", flag: "🇩🇰", dial: "+45", currency: "DKK", zone: "europe", postcodeLabel: "Postnummer", postcodePattern: "^\\d{4}$", phoneMin: 8, phoneMax: 8 },
  { code: "FI", name: "Finland", flag: "🇫🇮", dial: "+358", currency: "EUR", zone: "europe", postcodeLabel: "Postinumero", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 10 },
  { code: "PL", name: "Poland", flag: "🇵🇱", dial: "+48", currency: "PLN", zone: "europe", postcodeLabel: "Kod pocztowy", postcodePattern: "^\\d{2}-\\d{3}$", phoneMin: 9, phoneMax: 9 },
  { code: "GR", name: "Greece", flag: "🇬🇷", dial: "+30", currency: "EUR", zone: "europe", postcodeLabel: "Postcode", postcodePattern: "^\\d{3} ?\\d{2}$", phoneMin: 10, phoneMax: 10 },
  { code: "TR", name: "Türkiye", flag: "🇹🇷", dial: "+90", currency: "TRY", zone: "europe", postcodeLabel: "Posta kodu", postcodePattern: "^\\d{5}$", phoneMin: 10, phoneMax: 10 },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", dial: "+971", currency: "AED", zone: "asia", postcodeLabel: "PO Box (optional)", phoneMin: 8, phoneMax: 9, stateLabel: "Emirate", states: AE_EMIRATES },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dial: "+966", currency: "SAR", zone: "asia", postcodeLabel: "Postal code", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 9 },
  { code: "QA", name: "Qatar", flag: "🇶🇦", dial: "+974", currency: "USD", zone: "asia", postcodeLabel: "Postal code (optional)", phoneMin: 8, phoneMax: 8 },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", dial: "+965", currency: "USD", zone: "asia", postcodeLabel: "Postal code", phoneMin: 8, phoneMax: 8 },
  { code: "IN", name: "India", flag: "🇮🇳", dial: "+91", currency: "INR", zone: "asia", postcodeLabel: "PIN code", postcodePattern: "^\\d{6}$", phoneMin: 10, phoneMax: 10, stateLabel: "State", states: IN_STATES },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", dial: "+880", currency: "BDT", zone: "asia", postcodeLabel: "Post code", postcodePattern: "^\\d{4}$", phoneMin: 10, phoneMax: 10, stateLabel: "Division", states: BD_DIVISIONS },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", dial: "+92", currency: "PKR", zone: "asia", postcodeLabel: "Postal code", postcodePattern: "^\\d{5}$", phoneMin: 10, phoneMax: 10, stateLabel: "Province", states: PK_PROVINCES },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", dial: "+94", currency: "USD", zone: "asia", postcodeLabel: "Postal code", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 9 },
  { code: "SG", name: "Singapore", flag: "🇸🇬", dial: "+65", currency: "SGD", zone: "asia", postcodeLabel: "Postal code", postcodePattern: "^\\d{6}$", phoneMin: 8, phoneMax: 8 },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", dial: "+60", currency: "MYR", zone: "asia", postcodeLabel: "Postcode", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 10 },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dial: "+62", currency: "IDR", zone: "asia", postcodeLabel: "Kode pos", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 12 },
  { code: "PH", name: "Philippines", flag: "🇵🇭", dial: "+63", currency: "PHP", zone: "asia", postcodeLabel: "ZIP code", postcodePattern: "^\\d{4}$", phoneMin: 10, phoneMax: 10 },
  { code: "TH", name: "Thailand", flag: "🇹🇭", dial: "+66", currency: "THB", zone: "asia", postcodeLabel: "Postcode", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 9 },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", dial: "+84", currency: "USD", zone: "asia", postcodeLabel: "Postal code", postcodePattern: "^\\d{5,6}$", phoneMin: 9, phoneMax: 10 },
  { code: "CN", name: "China", flag: "🇨🇳", dial: "+86", currency: "CNY", zone: "asia", postcodeLabel: "Postal code", postcodePattern: "^\\d{6}$", phoneMin: 11, phoneMax: 11 },
  { code: "JP", name: "Japan", flag: "🇯🇵", dial: "+81", currency: "JPY", zone: "asia", postcodeLabel: "Postal code", postcodePattern: "^\\d{3}-?\\d{4}$", phoneMin: 10, phoneMax: 10 },
  { code: "KR", name: "South Korea", flag: "🇰🇷", dial: "+82", currency: "KRW", zone: "asia", postcodeLabel: "Postal code", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 10 },
  { code: "AU", name: "Australia", flag: "🇦🇺", dial: "+61", currency: "AUD", zone: "rest", postcodeLabel: "Postcode", postcodePattern: "^\\d{4}$", phoneMin: 9, phoneMax: 9, stateLabel: "State", states: AU_STATES },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", dial: "+64", currency: "NZD", zone: "rest", postcodeLabel: "Postcode", postcodePattern: "^\\d{4}$", phoneMin: 8, phoneMax: 10 },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", dial: "+27", currency: "ZAR", zone: "rest", postcodeLabel: "Postal code", postcodePattern: "^\\d{4}$", phoneMin: 9, phoneMax: 9, stateLabel: "Province", states: ZA_PROVINCES },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dial: "+234", currency: "NGN", zone: "rest", postcodeLabel: "Postal code", postcodePattern: "^\\d{6}$", phoneMin: 10, phoneMax: 10, stateLabel: "State", states: NG_STATES },
  { code: "EG", name: "Egypt", flag: "🇪🇬", dial: "+20", currency: "EGP", zone: "rest", postcodeLabel: "Postal code", postcodePattern: "^\\d{5}$", phoneMin: 10, phoneMax: 10 },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dial: "+254", currency: "USD", zone: "rest", postcodeLabel: "Postal code", postcodePattern: "^\\d{5}$", phoneMin: 9, phoneMax: 9 },
  { code: "BR", name: "Brazil", flag: "🇧🇷", dial: "+55", currency: "BRL", zone: "rest", postcodeLabel: "CEP", postcodePattern: "^\\d{5}-?\\d{3}$", phoneMin: 10, phoneMax: 11, stateLabel: "State", states: BR_STATES },
  { code: "MX", name: "Mexico", flag: "🇲🇽", dial: "+52", currency: "MXN", zone: "north-america", postcodeLabel: "Código postal", postcodePattern: "^\\d{5}$", phoneMin: 10, phoneMax: 10, stateLabel: "State", states: MX_STATES },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "+54", currency: "USD", zone: "rest", postcodeLabel: "Código postal", phoneMin: 10, phoneMax: 11 },
  { code: "CL", name: "Chile", flag: "🇨🇱", dial: "+56", currency: "USD", zone: "rest", postcodeLabel: "Código postal", phoneMin: 9, phoneMax: 9 },
];

export const countryByCode = (code: string) =>
  countries.find((c) => c.code === code) ?? countries[0]!;

/** Major cities per country, used to power the city picker where we have data. */
export const citiesByCountry: Record<string, string[]> = {
  US: ["New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego","Dallas","Austin","San Jose","Seattle","Denver","Boston","Miami","Atlanta"],
  CA: ["Toronto","Montreal","Vancouver","Calgary","Edmonton","Ottawa","Winnipeg","Quebec City","Hamilton","Halifax"],
  GB: ["London","Manchester","Birmingham","Leeds","Glasgow","Liverpool","Bristol","Edinburgh","Sheffield","Cardiff"],
  DE: ["Berlin","Hamburg","Munich","Cologne","Frankfurt","Stuttgart","Düsseldorf","Leipzig","Dresden"],
  FR: ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Strasbourg","Bordeaux","Lille"],
  AE: ["Dubai","Abu Dhabi","Sharjah","Al Ain","Ajman","Fujairah","Ras Al Khaimah"],
  IN: ["Mumbai","Delhi","Bengaluru","Hyderabad","Chennai","Kolkata","Pune","Ahmedabad","Jaipur","Surat"],
  BD: ["Dhaka","Chattogram","Khulna","Rajshahi","Sylhet","Barishal","Rangpur","Mymensingh","Cumilla","Narayanganj"],
  PK: ["Karachi","Lahore","Islamabad","Rawalpindi","Faisalabad","Multan","Peshawar","Quetta"],
  AU: ["Sydney","Melbourne","Brisbane","Perth","Adelaide","Canberra","Hobart","Darwin"],
  SG: ["Singapore"],
  MY: ["Kuala Lumpur","George Town","Johor Bahru","Ipoh","Shah Alam","Malacca City"],
  ZA: ["Johannesburg","Cape Town","Durban","Pretoria","Port Elizabeth","Bloemfontein"],
  NG: ["Lagos","Abuja","Kano","Ibadan","Port Harcourt","Benin City"],
  BR: ["São Paulo","Rio de Janeiro","Brasília","Salvador","Fortaleza","Belo Horizonte","Curitiba"],
  MX: ["Mexico City","Guadalajara","Monterrey","Puebla","Tijuana","Cancún","Mérida"],
  JP: ["Tokyo","Osaka","Yokohama","Nagoya","Sapporo","Fukuoka","Kyoto"],
  ES: ["Madrid","Barcelona","Valencia","Seville","Bilbao","Malaga"],
  IT: ["Rome","Milan","Naples","Turin","Florence","Bologna","Venice"],
  NL: ["Amsterdam","Rotterdam","The Hague","Utrecht","Eindhoven"],
};

export type ShippingMethod = {
  id: string;
  name: string;
  detail: string;
  /** Price in USD (base currency). */
  price: number;
  minDays: number;
  maxDays: number;
  /** Standard shipping becomes free above this subtotal (USD). 0 = never. */
  freeOver?: number;
};

const zoneRates: Record<ShippingZone, { base: number; express: number; days: [number, number]; expressDays: [number, number] }> = {
  domestic: { base: 4.5, express: 12, days: [2, 4], expressDays: [1, 2] },
  europe: { base: 6.5, express: 16, days: [3, 6], expressDays: [1, 3] },
  "north-america": { base: 7.5, express: 19, days: [3, 7], expressDays: [2, 3] },
  asia: { base: 11, express: 26, days: [5, 10], expressDays: [2, 4] },
  rest: { base: 14, express: 32, days: [7, 14], expressDays: [3, 6] },
};

export const FREE_SHIPPING_THRESHOLD = 75;

/** Delivery options for a country, priced in USD. */
export function shippingMethods(countryCode: string): ShippingMethod[] {
  const country = countryByCode(countryCode);
  const z = zoneRates[country.zone];
  return [
    {
      id: "standard",
      name: "Standard delivery",
      detail: "Tracked, signature not required",
      price: z.base,
      minDays: z.days[0],
      maxDays: z.days[1],
      freeOver: FREE_SHIPPING_THRESHOLD,
    },
    {
      id: "express",
      name: "Express delivery",
      detail: "Priority handling, tracked & signed",
      price: z.express,
      minDays: z.expressDays[0],
      maxDays: z.expressDays[1],
    },
  ];
}

/** Shipping cost in USD after the free-shipping rule. */
export function shippingCost(method: ShippingMethod, subtotalUsd: number) {
  if (subtotalUsd <= 0) return 0;
  if (method.freeOver && subtotalUsd >= method.freeOver) return 0;
  return method.price;
}

const addBusinessDays = (from: Date, days: number) => {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return d;
};

const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** "Tue 12 Aug – Fri 15 Aug" style estimate, skipping weekends. */
export function deliveryEstimate(method: ShippingMethod, from = new Date()) {
  const start = addBusinessDays(from, method.minDays);
  const end = addBusinessDays(from, method.maxDays);
  return method.minDays === method.maxDays
    ? fmtDay(start)
    : `${fmtDay(start)} – ${fmtDay(end)}`;
}

export function validatePhone(countryCode: string, digits: string) {
  const c = countryByCode(countryCode);
  const n = digits.replace(/\D/g, "");
  if (!n) return "Phone number is required.";
  if (n.length < c.phoneMin || n.length > c.phoneMax) {
    return c.phoneMin === c.phoneMax
      ? `Enter a ${c.phoneMin}-digit number for ${c.name}.`
      : `Enter a ${c.phoneMin}–${c.phoneMax} digit number for ${c.name}.`;
  }
  return "";
}

export function validatePostcode(countryCode: string, value: string) {
  const c = countryByCode(countryCode);
  if (!c.postcodePattern) return "";
  if (!value.trim()) return `${c.postcodeLabel} is required.`;
  return new RegExp(c.postcodePattern).test(value.trim())
    ? ""
    : `That doesn't look like a valid ${c.postcodeLabel.toLowerCase()} for ${c.name}.`;
}

/** Best-effort country guess from the browser locale / timezone. */
export function detectCountryCode(): string {
  if (typeof window === "undefined") return "US";
  try {
    const locales = [navigator.language, ...(navigator.languages ?? [])];
    for (const loc of locales) {
      const region = loc?.split("-")[1]?.toUpperCase();
      if (region && countries.some((c) => c.code === region)) return region;
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    const tzMap: Record<string, string> = {
      "Asia/Dhaka": "BD","Asia/Kolkata": "IN","Asia/Karachi": "PK","Asia/Dubai": "AE",
      "Europe/London": "GB","Europe/Berlin": "DE","Europe/Paris": "FR","Europe/Madrid": "ES",
      "Europe/Rome": "IT","Europe/Amsterdam": "NL","America/New_York": "US","America/Chicago": "US",
      "America/Denver": "US","America/Los_Angeles": "US","America/Toronto": "CA",
      "America/Sao_Paulo": "BR","America/Mexico_City": "MX","Australia/Sydney": "AU",
      "Asia/Singapore": "SG","Asia/Tokyo": "JP","Africa/Lagos": "NG","Africa/Johannesburg": "ZA",
    };
    if (tzMap[tz]) return tzMap[tz]!;
  } catch {
    /* fall through */
  }
  return "US";
}