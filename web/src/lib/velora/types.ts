import type { Minor } from "./money";
import type { ModerationState, OrderStatus, PaymentStatus, ProductStatus } from "./status";
import type { Permission, Role } from "./permissions";

/* ── Media ───────────────────────────────────────────────────────────────── */
export type MediaAsset = {
  id: string;
  url: string;
  filename: string;
  alt: string;
  caption?: string | undefined;
  folder: string;
  width: number;
  height: number;
  bytes: number;
  mime: string;
  focal: { x: number; y: number };
  createdAt: string;
  derivatives: number[];
};

/* ── Catalogue ───────────────────────────────────────────────────────────── */
export type OptionValue = { value: string; hex?: string };
export type ProductOption = { name: string; values: OptionValue[] };

export type Variant = {
  id: string;
  options: Record<string, string>;
  sku: string;
  barcode: string;
  price: Minor;
  compareAt: Minor | null;
  cost: Minor;
  stock: number;
  lowStock: number;
  weightG: number;
  imageId: string | null;
  active: boolean;
};

export type DetailRow = { title: string; body: string; snippetId?: string };

export type Product = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  publishAt: string;
  category: string;
  collection: string;
  brand: string;
  tags: string[];
  badge: string;
  shortDescription: string;
  longDescription: string;
  details: DetailRow[];
  primaryImageId: string | null;
  galleryIds: string[];
  galleryByColour: Record<string, string[]>;
  price: Minor;
  compareAt: Minor | null;
  cost: Minor;
  taxClass: string;
  options: ProductOption[];
  variants: Variant[];
  trackInventory: boolean;
  backorder: "deny" | "allow" | "notify";
  lowStock: number;
  incoming: number;
  weightG: number;
  dimensionsCm: { l: number; w: number; h: number };
  shipsAlone: boolean;
  ratingOverride: number | null;
  reviewCountOverride: number | null;
  seo: SeoFields;
  relatedIds: string[];
  relatedMode: "manual" | "collection";
};

export type SeoFields = {
  title: string;
  description: string;
  ogImageId: string | null;
  canonical: string;
  index: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageId: string | null;
  alt: string;
  ctaLabel: string;
  description: string;
  sort: number;
  visible: boolean;
  seo: SeoFields;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageId: string | null;
  sort: number;
  visible: boolean;
};

export type InventoryEntry = {
  id: string;
  at: string;
  productId: string;
  variantId: string;
  delta: number;
  reason: string;
  actor: string;
  balance: number;
};

/* ── Orders ──────────────────────────────────────────────────────────────── */
export type Address = {
  name: string;
  line1: string;
  line2?: string | undefined;
  city: string;
  postcode: string;
  country: string;
  phone: string;
};

/** Immutable purchase-time snapshot (§4.7). */
export type OrderItem = {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  variantLabel: string;
  imageId: string | null;
  qty: number;
  unitPrice: Minor;
  unitCost: Minor;
  taxMinor: Minor;
};

export type OrderEvent = {
  at: string;
  label: string;
  actor: string;
  note?: string | undefined;
  notified?: boolean | undefined;
};

export type Order = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
  placedAt: string;
  status: OrderStatus;
  payment: PaymentStatus;
  method: string;
  device: "Mobile" | "Desktop" | "Tablet";
  channel: "Online store" | "Draft" | "Phone";
  country: string;
  city: string;
  couponCode: string | null;
  items: OrderItem[];
  discountMinor: Minor;
  shippingMinor: Minor;
  shippingCostMinor: Minor;
  taxMinor: Minor;
  refundedMinor: Minor;
  courier: string | null;
  tracking: string | null;
  shippingAddress: Address;
  billingAddress: Address;
  notes: { at: string; text: string; actor: string }[];
  history: OrderEvent[];
  isFirstOrder: boolean;
  invoiceNumber: string | null;
};

export type DraftOrder = {
  id: string;
  number: string;
  customerName: string;
  email: string;
  items: OrderItem[];
  createdAt: string;
  status: "Open" | "Payment link sent" | "Converted";
};

export type AbandonedCart = {
  id: string;
  email: string;
  name: string;
  valueMinor: Minor;
  items: number;
  lastActiveAt: string;
  recovered: boolean;
  emailsSent: number;
};

export type Shipment = {
  id: string;
  orderNumber: string;
  courier: string;
  tracking: string;
  status: "Label created" | "In transit" | "Delivered" | "Error";
  error: string | null;
  createdAt: string;
};

export type ReturnRequest = {
  id: string;
  orderNumber: string;
  customerName: string;
  reason: string;
  amountMinor: Minor;
  status: "Requested" | "Approved" | "Restocked" | "Refunded" | "Rejected";
  createdAt: string;
};

/* ── People ──────────────────────────────────────────────────────────────── */
export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  joined: string;
  tier: "New" | "Returning" | "VIP";
  marketing: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  blocked: boolean;
  tags: string[];
  notes: string;
  addresses: Address[];
  wishlist: string[];
};

export type Subscriber = {
  id: string;
  email: string;
  source: string;
  consentAt: string;
  status: "Subscribed" | "Unsubscribed";
};

export type BackInStockRequest = {
  id: string;
  email: string;
  productId: string;
  variantLabel: string;
  at: string;
  notified: boolean;
};

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "Active" | "Suspended" | "Invited";
  lastLogin: string | null;
  twoFactor: boolean;
  mustChangePassword: boolean;
  overrides: Partial<Record<Permission, boolean>>;
  password: string;
  failedAttempts: number;
  lockedUntil: string | null;
};

export type Session = {
  id: string;
  userId: string;
  device: string;
  ip: string;
  startedAt: string;
  current: boolean;
};

/* ── Marketing ───────────────────────────────────────────────────────────── */
export type Discount = {
  id: string;
  code: string;
  type: "Percent" | "Fixed" | "Free shipping" | "Buy X get Y";
  value: number;
  appliesTo: { products: string[]; categories: string[]; collections: string[] };
  excludes: { products: string[]; categories: string[] };
  minSpendMinor: Minor;
  maxDiscountMinor: Minor | null;
  startsAt: string;
  endsAt: string | null;
  totalLimit: number | null;
  perCustomerLimit: number | null;
  firstOrderOnly: boolean;
  combinable: boolean;
  autoApply: boolean;
  uses: number;
  revenueMinor: Minor;
  discountGivenMinor: Minor;
  active: boolean;
};

export type Offer = {
  id: string;
  name: string;
  kind: "Flash sale" | "Bundle" | "Tiered" | "Free gift" | "Free shipping threshold";
  detail: string;
  startsAt: string;
  endsAt: string | null;
  priority: number;
  stacking: "Exclusive" | "Stackable";
  active: boolean;
};

export type GiftCard = {
  id: string;
  code: string;
  initialMinor: Minor;
  balanceMinor: Minor;
  recipient: string;
  issuedAt: string;
  status: "Active" | "Disabled" | "Redeemed";
  transactions: { at: string; amountMinor: Minor; note: string }[];
};

export type Review = {
  id: string;
  productId: string;
  orderNumber: string | null;
  author: string;
  email: string;
  rating: number;
  title: string;
  body: string;
  at: string;
  state: ModerationState;
  reply: string | null;
  featured: boolean;
  verified: boolean;
};

export type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  at: string;
  state: ModerationState;
  assignee: string | null;
  replies: { at: string; actor: string; body: string }[];
};

/* ── Content studio ──────────────────────────────────────────────────────── */
export type LinkRow = { label: string; href: string; newTab?: boolean; children?: LinkRow[] };

export type Announcement = {
  id: string;
  icon: "truck" | "refresh" | "shield" | "cash";
  label: string;
  href: string;
  bg: string;
  fg: string;
  speed: number;
  dismissible: boolean;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  sort: number;
};

export type HeroSlide = {
  id: string;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  imageId: string | null;
  alt: string;
  align: "left" | "center" | "right";
  overlay: number;
  textColour: string;
  sort: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export type FeatureRow = {
  id: string;
  icon: "truck" | "refresh" | "shield" | "headset";
  title: string;
  body: string;
  sort: number;
  active: boolean;
};

export type CategoryTile = {
  id: string;
  name: string;
  ctaLabel: string;
  href: string;
  imageId: string | null;
  alt: string;
  sort: number;
  active: boolean;
};

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  stars: number;
  avatarId: string | null;
  sort: number;
  active: boolean;
};

export type HomeSection = {
  key:
    | "announcements"
    | "hero"
    | "features"
    | "categories"
    | "arrivals"
    | "promo"
    | "social"
    | "testimonials"
    | "newsletter";
  label: string;
  visible: boolean;
  sort: number;
  startsAt: string | null;
  endsAt: string | null;
};

export type ContentPage = {
  id: string;
  title: string;
  slug: string;
  body: string;
  heroImageId: string | null;
  status: "Published" | "Draft";
  publishAt: string;
  sort: number;
  showInFooter: boolean;
  showInNav: boolean;
  seo: SeoFields;
  faq?: { id: string; category: string; q: string; a: string }[];
  sizeGuide?: { columns: string[]; rows: string[][] };
};

export type Banner = {
  id: string;
  name: string;
  placement: "Home hero" | "Category top" | "PDP strip" | "Cart" | "Checkout" | "Sitewide";
  desktopImageId: string | null;
  mobileImageId: string | null;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  active: boolean;
};

export type Snippet = { id: string; name: string; body: string };

export type Redirect = { id: string; from: string; to: string; code: 301 | 302; hits: number };

export type Content = {
  brand: {
    wordmark: string;
    useWordmark: boolean;
    tagline: string;
    taglineVisible: boolean;
    taglineTracking: string;
    logoId: string | null;
    logoLightId: string | null;
    logoDarkId: string | null;
    logoCompactId: string | null;
    logoEmailId: string | null;
    logoInvoiceId: string | null;
    logoMaxHeight: number;
    logoAlt: string;
    faviconId: string | null;
    faviconOverrides: Record<string, string | null>;
    themeColour: string;
    ogImageId: string | null;
    twitterCard: "summary" | "summary_large_image";
    splashMarkId: string | null;
    illustration404Id: string | null;
    emptyCartId: string | null;
  };
  theme: {
    colours: Record<string, string>;
    displayFont: string;
    uiFont: string;
    baseFontSize: number;
    headingScale: number;
    sectionTitleSize: number;
    sectionTitleTracking: number;
    eyebrowSize: number;
    eyebrowTracking: number;
    bodyLineHeight: number;
    radius: number;
    containerMax: number;
    gutter: number;
    sectionRhythm: number;
    shadow: string;
    productAspect: string;
    heroAspect: string;
    hoverMs: number;
    imageZoom: number;
    sliderInterval: number;
  };
  announcements: Announcement[];
  header: {
    homeHref: string;
    nav: LinkRow[];
    showSearch: boolean;
    showWishlist: boolean;
    showAccount: boolean;
    showCart: boolean;
    showCurrency: boolean;
  };
  hero: { slides: HeroSlide[]; autoplay: boolean; intervalMs: number };
  features: FeatureRow[];
  categorySection: { title: string; viewAllLabel: string; viewAllHref: string; tiles: CategoryTile[] };
  arrivalsSection: {
    title: string;
    viewAllLabel: string;
    viewAllHref: string;
    mode: "manual" | "collection" | "newest" | "bestselling";
    collection: string;
    count: number;
    manualIds: string[];
  };
  promo: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    ctaLabel: string;
    ctaHref: string;
    imageId: string | null;
    alt: string;
    wash: string;
    startsAt: string | null;
    endsAt: string | null;
    active: boolean;
  };
  social: { title: string; ratingLabel: string; stars: number; avatarIds: string[] };
  testimonials: Testimonial[];
  newsletter: {
    title: string;
    body: string;
    placeholder: string;
    ctaLabel: string;
    consentNote: string;
    successMessage: string;
    errorMessage: string;
    list: string;
  };
  footerColumns: { id: string; heading: string; links: LinkRow[] }[];
  footerAbout: string;
  footerSocial: { platform: string; url: string }[];
  paymentBadges: string[];
  legal: { copyright: string; paymentMethods: string[] };
  sections: HomeSection[];
  pages: ContentPage[];
  strings: Record<string, string>;
  banners: Banner[];
  snippets: Snippet[];
  seo: {
    titleTemplate: string;
    defaultDescription: string;
    canonicalHost: string;
    index: boolean;
    robotsTxt: string;
    sitemap: Record<string, boolean>;
    structuredData: Record<string, boolean>;
    ga4: string;
    gtm: string;
    metaPixel: string;
    tiktok: string;
    verification: string;
    headScripts: string;
    bodyScripts: string;
    customCss: string;
    redirects: Redirect[];
  };
};

/* ── Commerce configuration ──────────────────────────────────────────────── */
export type ShippingRate = {
  id: string;
  label: string;
  calc: "Flat" | "Weight tier" | "Price tier" | "Free over" | "Live rate";
  amountMinor: Minor;
  etaMin: number;
  etaMax: number;
  cod: boolean;
};

export type ShippingZone = {
  id: string;
  name: string;
  countries: string[];
  priority: number;
  rates: ShippingRate[];
};

export type TaxRule = {
  id: string;
  country: string;
  region: string;
  rateBps: number;
  inclusive: boolean;
  taxClass: string;
};

export type PaymentProvider = {
  id: string;
  name: string;
  enabled: boolean;
  mode: "test" | "live";
  displayName: string;
  credentials: Record<string, string>;
  countries: string[];
  currencies: string[];
  minMinor: Minor;
  maxMinor: Minor | null;
  surchargeBps: number;
  sort: number;
  webhookUrl: string;
  lastEventAt: string | null;
};

export type Courier = {
  id: string;
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
  countries: string[];
  autoCreateShipment: boolean;
  autoPickup: boolean;
  failoverOrder: number;
  lastVerifiedAt: string | null;
};

export type CountryConfig = {
  code: string;
  name: string;
  shipping: boolean;
  billing: boolean;
  cities: string[];
  postcodePattern: string;
  phonePattern: string;
  dialCode: string;
};

export type EmailTemplate = {
  id: string;
  name: string;
  enabled: boolean;
  subject: string;
  preheader: string;
  body: string;
  plain: string;
};

export type EmailLogEntry = {
  id: string;
  to: string;
  template: string;
  at: string;
  status: "Sent" | "Failed" | "Queued";
  providerId: string;
  error: string | null;
};

export type Settings = {
  store: {
    legalName: string;
    displayName: string;
    supportEmail: string;
    phone: string;
    whatsapp: string;
    hours: string;
    address: Address;
    vatNumber: string;
    registrationNumber: string;
    social: { platform: string; url: string }[];
  };
  currency: {
    base: string;
    symbol: string;
    decimals: number;
    position: "before" | "after";
    thousands: string;
    decimalSep: string;
    active: { code: string; symbol: string; rate: number; manual: boolean }[];
    rounding: "none" | "nearest" | "up";
  };
  countries: CountryConfig[];
  shipping: {
    zones: ShippingZone[];
    freeOverMinor: Minor;
    handlingMinor: Minor;
    cutoff: string;
  };
  tax: { rules: TaxRule[]; classes: string[]; pricesIncludeTax: boolean };
  payments: PaymentProvider[];
  orderRules: {
    prefix: string;
    start: number;
    padding: number;
    yearlyReset: boolean;
    invoicePrefix: string;
    autoCancelHours: number;
    autoCompleteDays: number;
    returnsDays: number;
    minOrderMinor: Minor;
    guestCheckout: boolean;
    requireTerms: boolean;
  };
  couriers: Courier[];
  smtp: {
    host: string;
    port: number;
    security: "None" | "SSL" | "TLS";
    username: string;
    password: string;
    fromName: string;
    fromEmail: string;
    replyTo: string;
    bccAll: string;
    configured: boolean;
    lastTestAt: string | null;
    lastTestResult: string | null;
  };
  emails: EmailTemplate[];
  emailLog: EmailLogEntry[];
  sms: {
    provider: string;
    credentials: Record<string, string>;
    mode: "test" | "live";
    countries: string[];
    triggers: Record<string, boolean>;
    codeLength: number;
    expiryMinutes: number;
    resendCooldown: number;
    attemptLimit: number;
    spendCapMinor: Minor;
    template: string;
  };
  invoice: {
    logoId: string | null;
    legalDetails: string;
    vatNumbers: string;
    footerTerms: string;
    thankYou: string;
    accent: string;
    paper: "A4" | "Letter";
  };
  notifications: { event: string; recipients: string[]; email: boolean; inApp: boolean }[];
  security: {
    minPasswordLength: number;
    requireSymbol: boolean;
    requireNumber: boolean;
    twoFactorRoles: Role[];
    sessionHours: number;
    idleMinutes: number;
    adminPath: string;
    ipAllowlist: string[];
  };
  maintenance: { on: boolean; message: string; returnsAt: string; adminBypass: boolean };
  environment: "development" | "production";
  settingsVersion: number;
};

/* ── System ──────────────────────────────────────────────────────────────── */
export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  ip: string;
  before: unknown;
  after: unknown;
};

export type Backup = {
  id: string;
  at: string;
  bytes: number;
  integrity: "Verified" | "Unverified";
  destination: string;
};

export type WebhookEvent = {
  id: string;
  source: string;
  event: string;
  at: string;
  signature: "Valid" | "Invalid";
  result: "Processed" | "Failed";
  payload: string;
};

export type Job = {
  id: string;
  name: string;
  state: "Pending" | "Running" | "Failed" | "Dead letter" | "Done";
  attempts: number;
  at: string;
  error: string | null;
};

export type SavedView = {
  id: string;
  scope: string;
  name: string;
  query: string;
};

export type AdminState = {
  media: MediaAsset[];
  products: Product[];
  categories: Category[];
  collections: Collection[];
  inventoryLedger: InventoryEntry[];
  orders: Order[];
  draftOrders: DraftOrder[];
  abandonedCarts: AbandonedCart[];
  shipments: Shipment[];
  returns: ReturnRequest[];
  customers: Customer[];
  subscribers: Subscriber[];
  backInStock: BackInStockRequest[];
  discounts: Discount[];
  offers: Offer[];
  giftCards: GiftCard[];
  reviews: Review[];
  messages: Message[];
  content: Content;
  settings: Settings;
  staff: StaffUser[];
  sessions: Session[];
  audit: AuditEntry[];
  backups: Backup[];
  webhooks: WebhookEvent[];
  jobs: Job[];
  savedViews: SavedView[];
  setupSteps: Record<string, boolean>;
  auth: { userId: string | null; startedAt: string | null };
};
