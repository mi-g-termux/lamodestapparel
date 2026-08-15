import type {
  AdminState,
  Content,
  Customer,
  MediaAsset,
  Order,
  OrderItem,
  Product,
  Settings,
  Variant,
} from "./types";
import type { OrderStatus, PaymentStatus } from "./status";

/* Deterministic PRNG so every reload shows the same "real" sales record. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(20260811);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]!;
const between = (a: number, b: number) => Math.floor(rand() * (b - a + 1)) + a;
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number, hour = 12) => {
  const d = new Date();
  d.setHours(hour, between(0, 59), 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

const img = (seed: string, w = 900, h = 1200): string =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

/* ── Media library ───────────────────────────────────────────────────────── */
const mediaSpecs: [string, string, string, string][] = [
  ["m-hero-1", "hero-atelier.jpg", "Hero", "Model in a camel wool coat on a stone staircase"],
  ["m-hero-2", "hero-linen.jpg", "Hero", "Linen shirt dress against a plaster wall"],
  ["m-hero-3", "hero-evening.jpg", "Hero", "Evening silhouette in low golden light"],
  ["m-cat-women", "cat-women.jpg", "Categories", "Woman in a tailored blazer"],
  ["m-cat-men", "cat-men.jpg", "Categories", "Man in an overshirt and trousers"],
  ["m-cat-kids", "cat-kids.jpg", "Categories", "Child in a knitted cardigan"],
  ["m-cat-acc", "cat-accessories.jpg", "Categories", "Leather bag and silk scarf flat lay"],
  ["m-p-dress", "p-silk-dress.jpg", "Products", "Silk slip dress on a hanger"],
  ["m-p-coat", "p-wool-coat.jpg", "Products", "Camel wool overcoat, front view"],
  ["m-p-knit", "p-cashmere-knit.jpg", "Products", "Cashmere crew neck folded"],
  ["m-p-shirt", "p-poplin-shirt.jpg", "Products", "White poplin shirt, front view"],
  ["m-p-trouser", "p-wide-trouser.jpg", "Products", "Wide-leg trousers on a model"],
  ["m-p-bag", "p-leather-bag.jpg", "Products", "Structured leather tote"],
  ["m-p-scarf", "p-silk-scarf.jpg", "Products", "Printed silk scarf, folded"],
  ["m-p-boot", "p-chelsea-boot.jpg", "Products", "Black leather Chelsea boots"],
  ["m-promo", "sale-banner.jpg", "Banners", "Summer edit promotional banner"],
  ["m-og", "og-default.jpg", "Brand", "Velora social share image"],
  ["m-logo", "velora-logo.svg", "Brand", "Velora wordmark logo"],
  ["m-avatar-1", "avatar-1.jpg", "People", "Customer portrait"],
  ["m-avatar-2", "avatar-2.jpg", "People", "Customer portrait"],
  ["m-avatar-3", "avatar-3.jpg", "People", "Customer portrait"],
];

const media: MediaAsset[] = mediaSpecs.map(([id, filename, folder, alt], i) => ({
  id,
  filename,
  folder,
  alt,
  url: img(id, folder === "People" ? 240 : 900, folder === "People" ? 240 : folder === "Hero" ? 900 : 1200),
  width: 900,
  height: folder === "People" ? 900 : 1200,
  bytes: 120_000 + i * 8_400,
  mime: filename.endsWith(".svg") ? "image/svg+xml" : "image/jpeg",
  focal: { x: 0.5, y: 0.4 },
  createdAt: iso(daysAgo(120 - i)),
  derivatives: [320, 480, 768, 1024, 1440, 1920],
}));

/* ── Catalogue ───────────────────────────────────────────────────────────── */
const sharedDetails = [
  {
    id: "sn-fit",
    name: "Fit details",
    body: "Model is 178cm and wears a size S. Regular fit through the body with a relaxed shoulder.",
  },
  {
    id: "sn-care",
    name: "Fabrication & care",
    body: "Responsibly sourced fabric. Dry clean only. Cool iron on the reverse. Do not tumble dry.",
  },
  {
    id: "sn-ship",
    name: "Shipping & returns",
    body: "Complimentary shipping over the free-shipping threshold. Free returns within the returns window.",
  },
];

const colourPalette: Record<string, string> = {
  Ivory: "#f2ece2",
  Camel: "#b9915f",
  Black: "#1c1a18",
  Sage: "#8f9c85",
  Clay: "#c19a7b",
  Navy: "#2b3448",
};

type Spec = {
  id: string;
  name: string;
  category: string;
  collection: string;
  price: number;
  compareAt?: number;
  cost: number;
  badge: string;
  imageId: string;
  colours: string[];
  sizes: string[];
  short: string;
};

const specs: Spec[] = [
  {
    id: "p-silk-dress",
    name: "Bias-Cut Silk Slip Dress",
    category: "Women",
    collection: "New Collection",
    price: 24900,
    compareAt: 29900,
    cost: 9800,
    badge: "New",
    imageId: "m-p-dress",
    colours: ["Ivory", "Black", "Sage"],
    sizes: ["XS", "S", "M", "L"],
    short: "A fluid bias-cut slip in sand-washed silk that skims rather than clings.",
  },
  {
    id: "p-wool-coat",
    name: "Double-Faced Wool Overcoat",
    category: "Women",
    collection: "Atelier",
    price: 58000,
    compareAt: 65000,
    cost: 24000,
    badge: "Sale",
    imageId: "m-p-coat",
    colours: ["Camel", "Black"],
    sizes: ["XS", "S", "M", "L", "XL"],
    short: "An unlined double-faced wool coat, hand-finished at the edges.",
  },
  {
    id: "p-cashmere-knit",
    name: "Grade-A Cashmere Crew",
    category: "Women",
    collection: "Essentials",
    price: 19500,
    cost: 7200,
    badge: "",
    imageId: "m-p-knit",
    colours: ["Ivory", "Camel", "Navy"],
    sizes: ["XS", "S", "M", "L"],
    short: "Two-ply Grade-A cashmere with a clean rib at the neck and cuff.",
  },
  {
    id: "p-poplin-shirt",
    name: "Compact Poplin Shirt",
    category: "Men",
    collection: "Essentials",
    price: 12500,
    cost: 4100,
    badge: "",
    imageId: "m-p-shirt",
    colours: ["Ivory", "Navy"],
    sizes: ["S", "M", "L", "XL"],
    short: "Crisp compact poplin with a soft-roll collar and mother-of-pearl buttons.",
  },
  {
    id: "p-wide-trouser",
    name: "High-Rise Wide Trouser",
    category: "Women",
    collection: "Summer Edit",
    price: 16500,
    compareAt: 19500,
    cost: 6100,
    badge: "Sale",
    imageId: "m-p-trouser",
    colours: ["Black", "Clay", "Sage"],
    sizes: ["XS", "S", "M", "L"],
    short: "A high-rise trouser with a long, fluid leg and a hidden hook closure.",
  },
  {
    id: "p-leather-bag",
    name: "Structured Leather Tote",
    category: "Accessories",
    collection: "Atelier",
    price: 42000,
    cost: 17000,
    badge: "Limited",
    imageId: "m-p-bag",
    colours: ["Camel", "Black"],
    sizes: ["One size"],
    short: "Vegetable-tanned leather with a reinforced base and suede lining.",
  },
  {
    id: "p-silk-scarf",
    name: "Printed Silk Twill Scarf",
    category: "Accessories",
    collection: "Summer Edit",
    price: 8900,
    cost: 2600,
    badge: "",
    imageId: "m-p-scarf",
    colours: ["Ivory", "Clay"],
    sizes: ["One size"],
    short: "Hand-rolled silk twill, printed in a small Como mill.",
  },
  {
    id: "p-chelsea-boot",
    name: "Calfskin Chelsea Boot",
    category: "Men",
    collection: "Atelier",
    price: 34500,
    cost: 13800,
    badge: "New",
    imageId: "m-p-boot",
    colours: ["Black", "Camel"],
    sizes: ["40", "41", "42", "43", "44"],
    short: "Blake-stitched calfskin boots on a slim leather sole.",
  },
];

function buildVariants(spec: Spec): Variant[] {
  const out: Variant[] = [];
  spec.sizes.forEach((size, si) => {
    spec.colours.forEach((colour, ci) => {
      out.push({
        id: `${spec.id}-v${si}${ci}`,
        options: { Size: size, Colour: colour },
        sku: `${spec.id.replace("p-", "VEL-").toUpperCase()}-${size}-${colour.slice(0, 3).toUpperCase()}`,
        barcode: String(5_000_000_000_000 + between(1, 899999)),
        price: spec.price,
        compareAt: spec.compareAt ?? null,
        cost: spec.cost,
        stock: between(0, 42),
        lowStock: 5,
        weightG: 400,
        imageId: spec.imageId,
        active: true,
      });
    });
  });
  return out;
}

const products: Product[] = specs.map((spec, index) => ({
  id: spec.id,
  name: spec.name,
  slug: spec.id.replace("p-", ""),
  status: index === 7 ? "Scheduled" : index === 6 ? "Draft" : "Active",
  publishAt: iso(daysAgo(200 - index * 10)),
  category: spec.category,
  collection: spec.collection,
  brand: "Velora",
  tags: [spec.collection.toLowerCase().replace(/\s/g, "-"), spec.category.toLowerCase()],
  badge: spec.badge,
  shortDescription: spec.short,
  longDescription: `<p>${spec.short}</p><p>Cut in a small European atelier from responsibly sourced material, this piece is designed to be worn for years rather than seasons.</p>`,
  details: [
    { title: "Fit details", body: sharedDetails[0]!.body, snippetId: "sn-fit" },
    { title: "Fabrication & care", body: sharedDetails[1]!.body, snippetId: "sn-care" },
    { title: "Shipping & returns", body: sharedDetails[2]!.body, snippetId: "sn-ship" },
  ],
  primaryImageId: spec.imageId,
  galleryIds: [spec.imageId, "m-hero-1", "m-hero-2"],
  galleryByColour: Object.fromEntries(spec.colours.map((c) => [c, [spec.imageId]])),
  price: spec.price,
  compareAt: spec.compareAt ?? null,
  cost: spec.cost,
  taxClass: "Standard",
  options: [
    { name: "Size", values: spec.sizes.map((v) => ({ value: v })) },
    { name: "Colour", values: spec.colours.map((v) => ({ value: v, hex: colourPalette[v] })) },
  ],
  variants: buildVariants(spec),
  trackInventory: true,
  backorder: "deny",
  lowStock: 5,
  incoming: index % 3 === 0 ? 40 : 0,
  weightG: 500,
  dimensionsCm: { l: 30, w: 24, h: 6 },
  shipsAlone: false,
  ratingOverride: null,
  reviewCountOverride: null,
  seo: {
    title: `${spec.name} — Velora`,
    description: spec.short,
    ogImageId: spec.imageId,
    canonical: `/product/${spec.id.replace("p-", "")}`,
    index: true,
  },
  relatedIds: [],
  relatedMode: "collection",
}));

/* ── Customers ───────────────────────────────────────────────────────────── */
const firstNames = [
  "Amara","Julian","Noor","Elena","Tobias","Mira","Hugo","Sofia","Idris","Lena",
  "Rafael","Ines","Kaito","Freya","Omar","Nadia","Lucas","Zara","Emil","Priya",
];
const lastNames = [
  "Whitfield","Moreau","Haddad","Rossi","Berger","Novak","Lindqvist","Okafor","Tanaka","Duarte",
];
const countries = [
  ["United Kingdom", "London"],
  ["United States", "New York"],
  ["France", "Paris"],
  ["Germany", "Berlin"],
  ["Japan", "Tokyo"],
  ["Australia", "Sydney"],
  ["United Arab Emirates", "Dubai"],
  ["Bangladesh", "Dhaka"],
];

const customers: Customer[] = Array.from({ length: 48 }, (_, i) => {
  const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
  const [country, city] = pick(countries) as [string, string];
  return {
    id: `c-${100 + i}`,
    name,
    email: `${name.toLowerCase().replace(/\s/g, ".")}@example.com`,
    phone: `+44 7${between(100000000, 999999999)}`,
    country,
    city,
    joined: iso(daysAgo(between(5, 700))),
    tier: i % 9 === 0 ? "VIP" : i % 3 === 0 ? "New" : "Returning",
    marketing: i % 4 !== 0,
    emailVerified: i % 7 !== 0,
    phoneVerified: i % 5 !== 0,
    blocked: false,
    tags: i % 9 === 0 ? ["vip", "press"] : [],
    notes: "",
    addresses: [
      {
        name,
        line1: `${between(1, 220)} Marlow Street`,
        city,
        postcode: `${between(10, 99)}${between(100, 999)}`,
        country,
        phone: `+44 7${between(100000000, 999999999)}`,
      },
    ],
    wishlist: [pick(products).id],
  };
});

/* ── Orders (real sales record: 18 months of trading) ────────────────────── */
const methods = ["Visa •••• 4242", "Mastercard •••• 8210", "PayPal", "Apple Pay", "Cash on delivery"];
const couriers = ["DHL Express", "Royal Mail", "FedEx", "Evri"];

function makeOrder(index: number, dayOffset: number): Order {
  const customer = pick(customers);
  const lineCount = between(1, 3);
  const items: OrderItem[] = [];
  for (let i = 0; i < lineCount; i++) {
    const product = pick(products);
    const variant = pick(product.variants);
    const qty = between(1, 2);
    items.push({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      sku: variant.sku,
      variantLabel: `${variant.options['Size']} · ${variant.options['Colour']}`,
      imageId: product.primaryImageId,
      qty,
      unitPrice: variant.price,
      unitCost: variant.cost,
      taxMinor: Math.round(variant.price * qty * 0.2),
    });
  }
  const gross = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
  const hasCoupon = rand() < 0.28;
  const discount = hasCoupon ? Math.round(gross * 0.1) : 0;
  const shipping = gross - discount > 7500 ? 0 : 795;
  const tax = Math.round((gross - discount) * 0.2);
  const roll = rand();
  const age = dayOffset;
  let status: OrderStatus;
  if (age < 2) status = roll < 0.4 ? "Pending" : roll < 0.75 ? "Confirmed" : "Packed";
  else if (age < 5) status = roll < 0.35 ? "Packed" : roll < 0.7 ? "Shipped" : "Out for delivery";
  else if (roll < 0.86) status = "Delivered";
  else if (roll < 0.91) status = "Cancelled";
  else if (roll < 0.95) status = "Returned";
  else if (roll < 0.98) status = "Failed";
  else status = "Shipped";

  let payment: PaymentStatus = "Paid";
  if (roll > 0.995) payment = "Partially refunded";
  if (status === "Pending") payment = roll < 0.5 ? "Pending" : "Authorised";
  if (status === "Failed") payment = "Failed";
  if (status === "Returned") payment = "Refunded";
  if (status === "Cancelled") payment = roll < 0.5 ? "Refunded" : "Pending";

  const refunded = payment === "Refunded" ? gross - discount + shipping + tax : payment === "Partially refunded" ? Math.round(gross * 0.3) : 0;
  const placed = daysAgo(dayOffset, between(7, 22));
  const number = `VEL-${String(10240 + index).padStart(5, "0")}`;
  const shipped = status !== "Pending" && status !== "Failed" && status !== "Cancelled";

  const address = customer.addresses[0]!;
  return {
    id: `o-${index}`,
    number,
    customerId: customer.id,
    customerName: customer.name,
    email: customer.email,
    phone: customer.phone,
    placedAt: iso(placed),
    status,
    payment,
    method: pick(methods),
    device: rand() < 0.62 ? "Mobile" : rand() < 0.9 ? "Desktop" : "Tablet",
    channel: "Online store",
    country: customer.country,
    city: customer.city,
    couponCode: hasCoupon ? pick(["WELCOME10", "SUMMER10", "VIP10"]) : null,
    items,
    discountMinor: discount,
    shippingMinor: shipping,
    shippingCostMinor: shipping === 0 ? 620 : 540,
    taxMinor: tax,
    refundedMinor: refunded,
    courier: shipped ? pick(couriers) : null,
    tracking: shipped ? `TRK${between(10000000, 99999999)}` : null,
    shippingAddress: address,
    billingAddress: address,
    notes: [],
    history: [
      { at: iso(placed), label: "Order placed", actor: customer.name },
      ...(payment === "Paid"
        ? [{ at: iso(placed), label: "Payment captured", actor: "System" }]
        : []),
      ...(shipped ? [{ at: iso(daysAgo(Math.max(0, dayOffset - 1))), label: `Marked ${status}`, actor: "Aisha Rahman" }] : []),
    ],
    isFirstOrder: rand() < 0.42,
    invoiceNumber: payment === "Paid" ? `INV-${String(4820 + index).padStart(5, "0")}` : null,
  };
}

const orders: Order[] = [];
let orderIndex = 0;
for (let day = 0; day < 540; day++) {
  // Weekend + seasonal lift so charts have a real shape.
  const date = daysAgo(day);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const seasonal = 1 + 0.45 * Math.sin((day / 540) * Math.PI * 3);
  const base = day < 90 ? 2.4 : day < 240 ? 1.8 : 1.2;
  const count = Math.max(0, Math.round((base * seasonal + (weekend ? 1.2 : 0)) * (0.5 + rand())));
  for (let i = 0; i < count; i++) orders.push(makeOrder(orderIndex++, day));
}
orders.sort((a, b) => (a.placedAt < b.placedAt ? 1 : -1));

/* ── Content ─────────────────────────────────────────────────────────────── */
const uiStrings: Record<string, string> = {
  "btn.addToBag": "Add to bag",
  "btn.buyNow": "Buy now",
  "btn.checkout": "Checkout",
  "btn.continueShopping": "Continue shopping",
  "btn.apply": "Apply",
  "btn.save": "Save",
  "btn.notifyMe": "Notify me when available",
  "btn.viewAll": "View all",
  "cart.empty.title": "Your bag is empty",
  "cart.empty.body": "Pieces you add will appear here.",
  "wishlist.empty.title": "Nothing saved yet",
  "wishlist.empty.body": "Tap the heart on any piece to save it.",
  "pdp.size": "Size",
  "pdp.colour": "Colour",
  "pdp.quantity": "Quantity",
  "pdp.sizeGuide": "Size guide",
  "pdp.inStock": "In stock",
  "pdp.lowStock": "Only {n} left",
  "pdp.outOfStock": "Out of stock",
  "pdp.freeShipping": "Free shipping over {amount}",
  "checkout.step.information": "Information",
  "checkout.step.shipping": "Shipping",
  "checkout.step.payment": "Payment",
  "field.email": "Email address",
  "field.phone": "Phone number",
  "field.postcode": "Postcode",
  "field.email.placeholder": "you@example.com",
  "validation.required": "This field is required",
  "validation.email": "Enter a valid email address",
  "validation.phone": "Enter a valid phone number for the selected country",
  "validation.postcode": "That postcode doesn't look right",
  "otp.title": "Verify your phone",
  "otp.body": "We sent a {n}-digit code to {phone}.",
  "otp.resend": "Resend code in {seconds}s",
  "order.confirmed.title": "Thank you — your order is confirmed",
  "order.tracking.label": "Track your parcel",
  "account.login.title": "Sign in",
  "account.register.title": "Create an account",
  "account.reset.title": "Reset your password",
  "search.empty": "No pieces match that search.",
  "filter.label": "Filter",
  "sort.label": "Sort",
  "pagination.next": "Next",
  "pagination.prev": "Previous",
  "cookie.title": "We use cookies",
  "cookie.body": "We use cookies to run the shop and understand what works.",
  "maintenance.title": "We'll be right back",
  "404.title": "We couldn't find that page",
  "500.title": "Something went wrong",
  "toast.addedToBag": "Added to your bag",
  "switcher.currency": "Currency",
  "switcher.country": "Country",
  "aria.openMenu": "Open menu",
  "aria.closeDialog": "Close dialog",
  "aria.productImage": "Product image of {name}",
};

const content: Content = {
  brand: {
    wordmark: "VELORA",
    useWordmark: true,
    tagline: "Considered clothing",
    taglineVisible: true,
    taglineTracking: "0.3em",
    logoId: "m-logo",
    logoLightId: "m-logo",
    logoDarkId: "m-logo",
    logoCompactId: "m-logo",
    logoEmailId: "m-logo",
    logoInvoiceId: "m-logo",
    logoMaxHeight: 32,
    logoAlt: "Velora",
    faviconId: "m-logo",
    faviconOverrides: { "16": null, "32": null, "48": null, "180": null, "192": null, "512": null },
    themeColour: "#1c1a18",
    ogImageId: "m-og",
    twitterCard: "summary_large_image",
    splashMarkId: "m-logo",
    illustration404Id: null,
    emptyCartId: null,
  },
  theme: {
    colours: {
      ink: "#1c1a18",
      cream: "#f7f2ea",
      sand: "#efe6d8",
      clay: "#dcc9b4",
      gold: "#a5794e",
      background: "#fbf9f5",
      card: "#ffffff",
      border: "#e7dfd3",
      muted: "#6b6459",
      destructive: "#a8433a",
      chart1: "#a5794e",
      chart2: "#2f7d5d",
      chart3: "#3c5ba8",
      chart4: "#b4802a",
      chart5: "#7a4fa8",
      sidebar: "#ffffff",
      sidebarInk: "#1c1a18",
    },
    displayFont: "Cormorant Garamond",
    uiFont: "Jost",
    baseFontSize: 16,
    headingScale: 1.25,
    sectionTitleSize: 34,
    sectionTitleTracking: 0.02,
    eyebrowSize: 11,
    eyebrowTracking: 0.24,
    bodyLineHeight: 1.65,
    radius: 14,
    containerMax: 1280,
    gutter: 24,
    sectionRhythm: 96,
    shadow: "0 18px 40px -28px rgba(28,26,24,0.35)",
    productAspect: "3 / 4",
    heroAspect: "16 / 9",
    hoverMs: 220,
    imageZoom: 1.04,
    sliderInterval: 6000,
  },
  announcements: [
    {
      id: "a-1",
      icon: "truck",
      label: "Complimentary shipping over $75",
      href: "/shipping-returns",
      bg: "#1c1a18",
      fg: "#ffffff",
      speed: 30,
      dismissible: true,
      startsAt: null,
      endsAt: null,
      active: true,
      sort: 0,
    },
    {
      id: "a-2",
      icon: "refresh",
      label: "Free 30-day returns",
      href: "/shipping-returns",
      bg: "#1c1a18",
      fg: "#ffffff",
      speed: 30,
      dismissible: true,
      startsAt: null,
      endsAt: null,
      active: true,
      sort: 1,
    },
  ],
  header: {
    homeHref: "/",
    nav: [
      { label: "Women", href: "/category/women" },
      { label: "Men", href: "/category/men" },
      { label: "Kids", href: "/category/kids" },
      { label: "Accessories", href: "/category/accessories" },
      { label: "Summer Edit", href: "/collection/summer-edit" },
    ],
    showSearch: true,
    showWishlist: true,
    showAccount: true,
    showCart: true,
    showCurrency: true,
  },
  hero: {
    autoplay: true,
    intervalMs: 6000,
    slides: [
      {
        id: "h-1",
        eyebrow: "Autumn / Winter",
        titleLine1: "Cloth that keeps",
        titleLine2: "its shape",
        body: "Double-faced wool, hand-finished, made to be worn for a decade.",
        ctaLabel: "Shop the atelier",
        ctaHref: "/collection/atelier",
        imageId: "m-hero-1",
        alt: "Model in a camel wool coat on a stone staircase",
        align: "left",
        overlay: 0.25,
        textColour: "#ffffff",
        sort: 0,
        active: true,
        startsAt: null,
        endsAt: null,
      },
      {
        id: "h-2",
        eyebrow: "New Collection",
        titleLine1: "Light, washed,",
        titleLine2: "lived in",
        body: "Sand-washed silk and compact poplin for the in-between season.",
        ctaLabel: "Shop new in",
        ctaHref: "/collection/new-collection",
        imageId: "m-hero-2",
        alt: "Linen shirt dress against a plaster wall",
        align: "center",
        overlay: 0.3,
        textColour: "#ffffff",
        sort: 1,
        active: true,
        startsAt: null,
        endsAt: null,
      },
    ],
  },
  features: [
    { id: "f-1", icon: "truck", title: "Complimentary shipping", body: "On every order over $75.", sort: 0, active: true },
    { id: "f-2", icon: "refresh", title: "30-day returns", body: "Free returns, no questions.", sort: 1, active: true },
    { id: "f-3", icon: "shield", title: "Secure checkout", body: "Encrypted end to end.", sort: 2, active: true },
    { id: "f-4", icon: "headset", title: "Real people", body: "Reply within one working day.", sort: 3, active: true },
  ],
  categorySection: {
    title: "Shop by category",
    viewAllLabel: "View all",
    viewAllHref: "/shop",
    tiles: [
      { id: "t-1", name: "Women", ctaLabel: "Shop women", href: "/category/women", imageId: "m-cat-women", alt: "Woman in a tailored blazer", sort: 0, active: true },
      { id: "t-2", name: "Men", ctaLabel: "Shop men", href: "/category/men", imageId: "m-cat-men", alt: "Man in an overshirt", sort: 1, active: true },
      { id: "t-3", name: "Kids", ctaLabel: "Shop kids", href: "/category/kids", imageId: "m-cat-kids", alt: "Child in a knitted cardigan", sort: 2, active: true },
      { id: "t-4", name: "Accessories", ctaLabel: "Shop accessories", href: "/category/accessories", imageId: "m-cat-acc", alt: "Leather bag and silk scarf", sort: 3, active: true },
    ],
  },
  arrivalsSection: {
    title: "New arrivals",
    viewAllLabel: "View all",
    viewAllHref: "/collection/new-collection",
    mode: "collection",
    collection: "New Collection",
    count: 8,
    manualIds: [],
  },
  promo: {
    eyebrow: "Summer Edit",
    titleLine1: "Up to 30% off",
    titleLine2: "selected pieces",
    ctaLabel: "Shop the edit",
    ctaHref: "/collection/summer-edit",
    imageId: "m-promo",
    alt: "Summer edit promotional banner",
    wash: "#efe6d8",
    startsAt: null,
    endsAt: null,
    active: true,
  },
  social: { title: "Loved by 12,000 customers", ratingLabel: "4.8 out of 5", stars: 5, avatarIds: ["m-avatar-1", "m-avatar-2", "m-avatar-3"] },
  testimonials: [
    { id: "ts-1", quote: "The coat is the best thing in my wardrobe. Three winters in and it still looks new.", author: "Elena R.", stars: 5, avatarId: "m-avatar-1", sort: 0, active: true },
    { id: "ts-2", quote: "Sizing was exactly as described and delivery took two days.", author: "Tobias B.", stars: 5, avatarId: "m-avatar-2", sort: 1, active: true },
    { id: "ts-3", quote: "Quiet, well-made clothes. Nothing shouts and everything lasts.", author: "Noor H.", stars: 4, avatarId: "m-avatar-3", sort: 2, active: true },
  ],
  newsletter: {
    title: "Join the list",
    body: "Early access to new pieces and the occasional letter from the atelier.",
    placeholder: "you@example.com",
    ctaLabel: "Subscribe",
    consentNote: "By subscribing you agree to our privacy policy.",
    successMessage: "You're on the list.",
    errorMessage: "That email doesn't look right.",
    list: "General",
  },
  footerColumns: [
    { id: "fc-1", heading: "Shop", links: [{ label: "Women", href: "/category/women" }, { label: "Men", href: "/category/men" }, { label: "Accessories", href: "/category/accessories" }] },
    { id: "fc-2", heading: "Help", links: [{ label: "FAQ", href: "/faq" }, { label: "Shipping & returns", href: "/shipping-returns" }, { label: "Size guide", href: "/size-guide" }, { label: "Contact", href: "/contact" }] },
    { id: "fc-3", heading: "About", links: [{ label: "Our story", href: "/about" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }] },
  ],
  footerAbout: "Velora makes considered clothing in small runs, from mills we visit ourselves.",
  footerSocial: [
    { platform: "Instagram", url: "https://instagram.com/velora" },
    { platform: "Pinterest", url: "https://pinterest.com/velora" },
  ],
  paymentBadges: ["Visa", "Mastercard", "Amex", "PayPal", "Apple Pay"],
  legal: { copyright: "© {year} Velora. All rights reserved.", paymentMethods: ["Visa", "Mastercard", "PayPal"] },
  sections: [
    { key: "announcements", label: "Announcement bar", visible: true, sort: 0, startsAt: null, endsAt: null },
    { key: "hero", label: "Hero slider", visible: true, sort: 1, startsAt: null, endsAt: null },
    { key: "features", label: "Trust strip", visible: true, sort: 2, startsAt: null, endsAt: null },
    { key: "categories", label: "Category section", visible: true, sort: 3, startsAt: null, endsAt: null },
    { key: "arrivals", label: "New arrivals rail", visible: true, sort: 4, startsAt: null, endsAt: null },
    { key: "promo", label: "Promo banner", visible: true, sort: 5, startsAt: null, endsAt: null },
    { key: "social", label: "Social proof bar", visible: true, sort: 6, startsAt: null, endsAt: null },
    { key: "testimonials", label: "Testimonials", visible: true, sort: 7, startsAt: null, endsAt: null },
    { key: "newsletter", label: "Newsletter band", visible: true, sort: 8, startsAt: null, endsAt: null },
  ],
  pages: [
    {
      id: "pg-faq",
      title: "FAQ",
      slug: "faq",
      body: "<p>Answers to the questions we get most often.</p>",
      heroImageId: null,
      status: "Published",
      publishAt: iso(daysAgo(300)),
      sort: 0,
      showInFooter: true,
      showInNav: false,
      seo: { title: "FAQ — Velora", description: "Answers about shipping, returns, sizing and care.", ogImageId: null, canonical: "/faq", index: true },
      faq: [
        { id: "q1", category: "Shipping", q: "How long does delivery take?", a: "Two to four working days in the UK, three to seven internationally." },
        { id: "q2", category: "Returns", q: "How do I return something?", a: "Use the returns portal in your account within 30 days of delivery." },
        { id: "q3", category: "Sizing", q: "Do pieces run true to size?", a: "Yes. Where a piece runs small we say so on the product page." },
      ],
    },
    {
      id: "pg-privacy",
      title: "Privacy policy",
      slug: "privacy",
      body: "<p>We collect only what we need to fulfil your order.</p>",
      heroImageId: null,
      status: "Published",
      publishAt: iso(daysAgo(300)),
      sort: 1,
      showInFooter: true,
      showInNav: false,
      seo: { title: "Privacy policy — Velora", description: "How Velora handles your data.", ogImageId: null, canonical: "/privacy", index: true },
    },
    {
      id: "pg-terms",
      title: "Terms of sale",
      slug: "terms",
      body: "<p>These terms govern every purchase made through this store.</p>",
      heroImageId: null,
      status: "Published",
      publishAt: iso(daysAgo(300)),
      sort: 2,
      showInFooter: true,
      showInNav: false,
      seo: { title: "Terms — Velora", description: "Terms of sale.", ogImageId: null, canonical: "/terms", index: true },
    },
    {
      id: "pg-shipping",
      title: "Shipping & returns",
      slug: "shipping-returns",
      body: "<p>Complimentary shipping over $75. Free returns within 30 days.</p>",
      heroImageId: null,
      status: "Published",
      publishAt: iso(daysAgo(300)),
      sort: 3,
      showInFooter: true,
      showInNav: false,
      seo: { title: "Shipping & returns — Velora", description: "Delivery times, costs and the returns window.", ogImageId: null, canonical: "/shipping-returns", index: true },
    },
    {
      id: "pg-size",
      title: "Size guide",
      slug: "size-guide",
      body: "<p>Measurements are of the body, not the garment.</p>",
      heroImageId: null,
      status: "Published",
      publishAt: iso(daysAgo(300)),
      sort: 4,
      showInFooter: true,
      showInNav: false,
      seo: { title: "Size guide — Velora", description: "Body measurements for every size we make.", ogImageId: null, canonical: "/size-guide", index: true },
      sizeGuide: {
        columns: ["Size", "Bust (cm)", "Waist (cm)", "Hip (cm)"],
        rows: [
          ["XS", "80", "62", "88"],
          ["S", "84", "66", "92"],
          ["M", "88", "70", "96"],
          ["L", "94", "76", "102"],
          ["XL", "100", "82", "108"],
        ],
      },
    },
    {
      id: "pg-contact",
      title: "Contact",
      slug: "contact",
      body: "<p>We answer every message within one working day.</p>",
      heroImageId: null,
      status: "Published",
      publishAt: iso(daysAgo(300)),
      sort: 5,
      showInFooter: true,
      showInNav: true,
      seo: { title: "Contact — Velora", description: "Talk to the Velora team.", ogImageId: null, canonical: "/contact", index: true },
    },
    {
      id: "pg-about",
      title: "About",
      slug: "about",
      body: "<p>Velora began in a two-room atelier and has stayed small on purpose.</p>",
      heroImageId: "m-hero-3",
      status: "Published",
      publishAt: iso(daysAgo(300)),
      sort: 6,
      showInFooter: true,
      showInNav: true,
      seo: { title: "About — Velora", description: "Who we are and how we make things.", ogImageId: null, canonical: "/about", index: true },
    },
  ],
  strings: uiStrings,
  banners: [
    {
      id: "b-1",
      name: "Summer edit strip",
      placement: "Sitewide",
      desktopImageId: "m-promo",
      mobileImageId: "m-promo",
      heading: "Summer Edit",
      body: "Up to 30% off selected pieces",
      ctaLabel: "Shop now",
      ctaHref: "/collection/summer-edit",
      startsAt: null,
      endsAt: null,
      priority: 1,
      active: true,
    },
  ],
  snippets: sharedDetails,
  seo: {
    titleTemplate: "%s — Velora",
    defaultDescription: "Considered clothing, made in small runs.",
    canonicalHost: "https://velora.example",
    index: true,
    robotsTxt: "User-agent: *\nAllow: /\nSitemap: https://velora.example/sitemap.xml",
    sitemap: { products: true, categories: true, collections: true, pages: true },
    structuredData: { organization: true, product: true, breadcrumb: true, faq: true },
    ga4: "",
    gtm: "",
    metaPixel: "",
    tiktok: "",
    verification: "",
    headScripts: "",
    bodyScripts: "",
    customCss: "",
    redirects: [{ id: "r-1", from: "/sale", to: "/collection/summer-edit", code: 301, hits: 412 }],
  },
};

/* ── Settings ────────────────────────────────────────────────────────────── */
const emailTemplateSpecs: [string, string, string][] = [
  ["welcome", "Welcome / account created", "Welcome to Velora"],
  ["otp", "OTP verification", "Your Velora verification code"],
  ["order-confirmation", "Order confirmation with invoice", "Order {{order_number}} confirmed"],
  ["status-update", "Order status update", "Your order {{order_number}} is {{status}}"],
  ["shipped", "Shipped with tracking", "Your Velora order is on its way"],
  ["out-for-delivery", "Out for delivery", "Arriving today"],
  ["delivered", "Delivered", "Your parcel has been delivered"],
  ["cancelled", "Cancelled", "Order {{order_number}} cancelled"],
  ["refunded", "Refunded", "Your refund is on its way"],
  ["password-reset", "Password reset", "Reset your Velora password"],
  ["password-changed", "Password changed", "Your password was changed"],
  ["abandoned-cart", "Abandoned cart", "You left something behind"],
  ["back-in-stock", "Back in stock", "{{product_name}} is back"],
  ["review-request", "Review request", "How did we do?"],
  ["newsletter-welcome", "Newsletter welcome", "You're on the list"],
  ["contact-receipt", "Contact receipt", "We received your message"],
  ["admin-new-order", "Admin new-order alert", "New order {{order_number}}"],
  ["admin-low-stock", "Admin low-stock alert", "Low stock: {{product_name}}"],
  ["staff-invite", "Staff invitation", "You've been invited to Velora admin"],
];

const settings: Settings = {
  store: {
    legalName: "Velora Atelier Ltd",
    displayName: "Velora",
    supportEmail: "care@velora.example",
    phone: "+44 20 7946 0812",
    whatsapp: "+44 7700 900812",
    hours: "Mon–Fri, 09:00–18:00 GMT",
    address: {
      name: "Velora Atelier Ltd",
      line1: "14 Ludgate Mews",
      city: "London",
      postcode: "EC4M 7LS",
      country: "United Kingdom",
      phone: "+44 20 7946 0812",
    },
    vatNumber: "GB 421 8830 12",
    registrationNumber: "09231884",
    social: [
      { platform: "Instagram", url: "https://instagram.com/velora" },
      { platform: "Pinterest", url: "https://pinterest.com/velora" },
    ],
  },
  currency: {
    base: "USD",
    symbol: "$",
    decimals: 2,
    position: "before",
    thousands: ",",
    decimalSep: ".",
    active: [
      { code: "USD", symbol: "$", rate: 1, manual: false },
      { code: "GBP", symbol: "£", rate: 0.79, manual: false },
      { code: "EUR", symbol: "€", rate: 0.92, manual: false },
      { code: "AED", symbol: "د.إ", rate: 3.67, manual: true },
    ],
    rounding: "nearest",
  },
  countries: [
    { code: "GB", name: "United Kingdom", shipping: true, billing: true, cities: ["London", "Manchester", "Edinburgh"], postcodePattern: "^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$", phonePattern: "^\\+44", dialCode: "+44" },
    { code: "US", name: "United States", shipping: true, billing: true, cities: ["New York", "Los Angeles", "Chicago"], postcodePattern: "^\\d{5}$", phonePattern: "^\\+1", dialCode: "+1" },
    { code: "FR", name: "France", shipping: true, billing: true, cities: ["Paris", "Lyon"], postcodePattern: "^\\d{5}$", phonePattern: "^\\+33", dialCode: "+33" },
    { code: "DE", name: "Germany", shipping: true, billing: true, cities: ["Berlin", "Munich"], postcodePattern: "^\\d{5}$", phonePattern: "^\\+49", dialCode: "+49" },
    { code: "JP", name: "Japan", shipping: true, billing: true, cities: ["Tokyo", "Osaka"], postcodePattern: "^\\d{3}-\\d{4}$", phonePattern: "^\\+81", dialCode: "+81" },
    { code: "AU", name: "Australia", shipping: true, billing: true, cities: ["Sydney", "Melbourne"], postcodePattern: "^\\d{4}$", phonePattern: "^\\+61", dialCode: "+61" },
    { code: "AE", name: "United Arab Emirates", shipping: true, billing: true, cities: ["Dubai", "Abu Dhabi"], postcodePattern: ".*", phonePattern: "^\\+971", dialCode: "+971" },
    { code: "BD", name: "Bangladesh", shipping: true, billing: true, cities: ["Dhaka", "Chattogram"], postcodePattern: "^\\d{4}$", phonePattern: "^\\+880", dialCode: "+880" },
  ],
  shipping: {
    freeOverMinor: 7500,
    handlingMinor: 0,
    cutoff: "14:00",
    zones: [
      {
        id: "z-uk",
        name: "United Kingdom",
        countries: ["United Kingdom"],
        priority: 1,
        rates: [
          { id: "r-1", label: "Standard", calc: "Flat", amountMinor: 495, etaMin: 2, etaMax: 4, cod: false },
          { id: "r-2", label: "Express", calc: "Flat", amountMinor: 995, etaMin: 1, etaMax: 1, cod: false },
          { id: "r-3", label: "Free over threshold", calc: "Free over", amountMinor: 0, etaMin: 2, etaMax: 4, cod: false },
        ],
      },
      {
        id: "z-eu",
        name: "Europe",
        countries: ["France", "Germany"],
        priority: 2,
        rates: [{ id: "r-4", label: "Standard", calc: "Flat", amountMinor: 995, etaMin: 3, etaMax: 6, cod: false }],
      },
      {
        id: "z-row",
        name: "Rest of world",
        countries: ["United States", "Japan", "Australia", "United Arab Emirates", "Bangladesh"],
        priority: 3,
        rates: [
          { id: "r-5", label: "International", calc: "Flat", amountMinor: 1995, etaMin: 5, etaMax: 10, cod: false },
          { id: "r-6", label: "Cash on delivery", calc: "Flat", amountMinor: 2495, etaMin: 5, etaMax: 10, cod: true },
        ],
      },
    ],
  },
  tax: {
    classes: ["Standard", "Reduced", "Zero"],
    pricesIncludeTax: false,
    rules: [
      { id: "t-1", country: "United Kingdom", region: "*", rateBps: 2000, inclusive: true, taxClass: "Standard" },
      { id: "t-2", country: "France", region: "*", rateBps: 2000, inclusive: true, taxClass: "Standard" },
      { id: "t-3", country: "United States", region: "NY", rateBps: 887, inclusive: false, taxClass: "Standard" },
    ],
  },
  payments: [
    {
      id: "pay-stripe",
      name: "Stripe",
      enabled: true,
      mode: "test",
      displayName: "Card",
      credentials: { publishableKey: "pk_test_••••4242", secretKey: "sk_test_••••8891", webhookSecret: "whsec_••••2210" },
      countries: ["United Kingdom", "United States", "France", "Germany"],
      currencies: ["USD", "GBP", "EUR"],
      minMinor: 100,
      maxMinor: null,
      surchargeBps: 0,
      sort: 0,
      webhookUrl: "https://velora.example/api/public/webhooks/stripe",
      lastEventAt: iso(daysAgo(0, 9)),
    },
    {
      id: "pay-paypal",
      name: "PayPal",
      enabled: true,
      mode: "live",
      displayName: "PayPal",
      credentials: { clientId: "AZ••••9931", secret: "EL••••4420" },
      countries: ["United Kingdom", "United States"],
      currencies: ["USD", "GBP"],
      minMinor: 100,
      maxMinor: null,
      surchargeBps: 0,
      sort: 1,
      webhookUrl: "https://velora.example/api/public/webhooks/paypal",
      lastEventAt: iso(daysAgo(1, 15)),
    },
    {
      id: "pay-cod",
      name: "Cash on delivery",
      enabled: true,
      mode: "live",
      displayName: "Cash on delivery",
      credentials: {},
      countries: ["United Arab Emirates", "Bangladesh"],
      currencies: ["USD", "AED"],
      minMinor: 1000,
      maxMinor: 50000,
      surchargeBps: 200,
      sort: 2,
      webhookUrl: "",
      lastEventAt: null,
    },
  ],
  orderRules: {
    prefix: "VEL-",
    start: 10240,
    padding: 5,
    yearlyReset: false,
    invoicePrefix: "INV-",
    autoCancelHours: 48,
    autoCompleteDays: 14,
    returnsDays: 30,
    minOrderMinor: 0,
    guestCheckout: true,
    requireTerms: true,
  },
  couriers: [
    { id: "cr-dhl", name: "DHL Express", enabled: true, credentials: { apiKey: "dhl_••••7712" }, countries: ["United States", "Japan", "Australia"], autoCreateShipment: true, autoPickup: false, failoverOrder: 1, lastVerifiedAt: iso(daysAgo(2)) },
    { id: "cr-rm", name: "Royal Mail", enabled: true, credentials: { apiKey: "rm_••••3390" }, countries: ["United Kingdom"], autoCreateShipment: true, autoPickup: true, failoverOrder: 2, lastVerifiedAt: iso(daysAgo(1)) },
  ],
  smtp: {
    host: "smtp.postmarkapp.com",
    port: 587,
    security: "TLS",
    username: "velora",
    password: "••••••••",
    fromName: "Velora",
    fromEmail: "care@velora.example",
    replyTo: "care@velora.example",
    bccAll: "",
    configured: true,
    lastTestAt: iso(daysAgo(3)),
    lastTestResult: "250 OK — message accepted",
  },
  emails: emailTemplateSpecs.map(([id, name, subject]) => ({
    id,
    name,
    enabled: true,
    subject,
    preheader: "",
    body: `<p>Hi {{customer_first_name}},</p><p>${name} email body. Edit this template in Communications → Email templates.</p>`,
    plain: `Hi {{customer_first_name}}, ${name}.`,
  })),
  emailLog: Array.from({ length: 24 }, (_, i) => ({
    id: `el-${i}`,
    to: pick(customers).email,
    template: pick(emailTemplateSpecs)[1],
    at: iso(daysAgo(between(0, 14))),
    status: i % 11 === 0 ? "Failed" : "Sent",
    providerId: `pm-${between(100000, 999999)}`,
    error: i % 11 === 0 ? "550 mailbox unavailable" : null,
  })),
  sms: {
    provider: "Twilio",
    credentials: { accountSid: "AC••••7781", authToken: "••••9920", from: "+15005550006" },
    mode: "test",
    countries: ["United Arab Emirates", "Bangladesh"],
    triggers: { guestCheckout: true, cod: true, aboveValue: false, signup: false, phoneLogin: true, phoneChange: true },
    codeLength: 6,
    expiryMinutes: 10,
    resendCooldown: 60,
    attemptLimit: 5,
    spendCapMinor: 20000,
    template: "Your Velora code is {{code}}. It expires in {{minutes}} minutes.",
  },
  invoice: {
    logoId: "m-logo",
    legalDetails: "Velora Atelier Ltd · 14 Ludgate Mews, London EC4M 7LS · Company 09231884",
    vatNumbers: "VAT GB 421 8830 12",
    footerTerms: "Goods remain the property of Velora Atelier Ltd until paid in full.",
    thankYou: "Thank you for shopping with Velora.",
    accent: "#a5794e",
    paper: "A4",
  },
  notifications: [
    { event: "New order", recipients: ["care@velora.example"], email: true, inApp: true },
    { event: "Low stock", recipients: ["ops@velora.example"], email: true, inApp: true },
    { event: "Failed payment", recipients: ["care@velora.example"], email: true, inApp: false },
    { event: "New review", recipients: ["care@velora.example"], email: false, inApp: true },
  ],
  security: {
    minPasswordLength: 12,
    requireSymbol: true,
    requireNumber: true,
    twoFactorRoles: ["Owner", "Developer"],
    sessionHours: 12,
    idleMinutes: 30,
    adminPath: "/",
    ipAllowlist: [],
  },
  maintenance: { on: false, message: "We're making a few changes and will be back shortly.", returnsAt: "", adminBypass: true },
  environment: "development",
  settingsVersion: 41,
};

/* ── System + everything else ────────────────────────────────────────────── */
export function seedState(): AdminState {
  const reviews = Array.from({ length: 26 }, (_, i) => {
    const product = pick(products);
    return {
      id: `rv-${i}`,
      productId: product.id,
      orderNumber: pick(orders).number,
      author: pick(customers).name,
      email: pick(customers).email,
      rating: between(3, 5),
      title: pick(["Beautifully made", "Exactly as described", "Worth it", "Lovely fabric"]),
      body: "The finish is excellent and the fit is true to the size guide. Delivery was quick.",
      at: iso(daysAgo(between(0, 90))),
      state: (i % 5 === 0 ? "Pending" : i % 11 === 0 ? "Rejected" : "Published") as never,
      reply: null,
      featured: i % 8 === 0,
      verified: i % 3 !== 0,
    };
  });

  const messages = Array.from({ length: 14 }, (_, i) => {
    const c = pick(customers);
    return {
      id: `ms-${i}`,
      name: c.name,
      email: c.email,
      subject: pick(["Sizing question", "Where is my order?", "Return request", "Wholesale enquiry"]),
      body: "Hello — could you help me with this before I place my order? Thank you.",
      at: iso(daysAgo(between(0, 30))),
      state: (i % 3 === 0 ? "Pending" : "Handled") as never,
      assignee: i % 3 === 0 ? null : "Aisha Rahman",
      replies: [],
    };
  });

  const ledger = products.flatMap((p) =>
    p.variants.slice(0, 2).map((v, i) => ({
      id: `il-${p.id}-${i}`,
      at: iso(daysAgo(between(1, 60))),
      productId: p.id,
      variantId: v.id,
      delta: between(10, 60),
      reason: "Stock received",
      actor: "Aisha Rahman",
      balance: v.stock,
    })),
  );

  return {
    media,
    products,
    categories: ["Women", "Men", "Kids", "Accessories"].map((name, i) => ({
      id: `cat-${name.toLowerCase()}`,
      name,
      slug: name.toLowerCase(),
      parentId: null,
      imageId: ["m-cat-women", "m-cat-men", "m-cat-kids", "m-cat-acc"][i]!,
      alt: `${name} category tile`,
      ctaLabel: `Shop ${name.toLowerCase()}`,
      description: `Everything in ${name.toLowerCase()}.`,
      sort: i,
      visible: true,
      seo: { title: `${name} — Velora`, description: `Shop ${name} at Velora.`, ogImageId: null, canonical: `/category/${name.toLowerCase()}`, index: true },
    })),
    collections: ["New Collection", "Summer Edit", "Atelier", "Essentials"].map((name, i) => ({
      id: `col-${i}`,
      name,
      slug: name.toLowerCase().replace(/\s/g, "-"),
      description: `The ${name} edit.`,
      imageId: "m-promo",
      sort: i,
      visible: true,
    })),
    inventoryLedger: ledger,
    orders,
    draftOrders: [
      { id: "do-1", number: "DRAFT-0012", customerName: "Press — Vogue UK", email: "press@example.com", items: [], createdAt: iso(daysAgo(2)), status: "Open" },
    ],
    abandonedCarts: Array.from({ length: 12 }, (_, i) => {
      const c = pick(customers);
      return {
        id: `ac-${i}`,
        email: c.email,
        name: c.name,
        valueMinor: between(8000, 60000),
        items: between(1, 4),
        lastActiveAt: iso(daysAgo(between(0, 12))),
        recovered: i % 6 === 0,
        emailsSent: i % 3,
      };
    }),
    shipments: orders
      .filter((o) => o.tracking)
      .slice(0, 40)
      .map((o, i) => ({
        id: `sh-${i}`,
        orderNumber: o.number,
        courier: o.courier!,
        tracking: o.tracking!,
        status: i % 13 === 0 ? "Error" : o.status === "Delivered" ? "Delivered" : "In transit",
        error: i % 13 === 0 ? "Courier rejected the address: missing postcode" : null,
        createdAt: o.placedAt,
      })),
    returns: Array.from({ length: 7 }, (_, i) => {
      const o = pick(orders);
      return {
        id: `rt-${i}`,
        orderNumber: o.number,
        customerName: o.customerName,
        reason: pick(["Too small", "Too large", "Not as pictured", "Changed my mind"]),
        amountMinor: o.items[0]!.unitPrice,
        status: (i % 4 === 0 ? "Requested" : i % 3 === 0 ? "Approved" : "Refunded") as never,
        createdAt: iso(daysAgo(between(0, 30))),
      };
    }),
    customers,
    subscribers: customers.slice(0, 30).map((c, i) => ({
      id: `sub-${i}`,
      email: c.email,
      source: pick(["Footer form", "Checkout opt-in", "Popup"]),
      consentAt: c.joined,
      status: i % 9 === 0 ? "Unsubscribed" : "Subscribed",
    })),
    backInStock: Array.from({ length: 9 }, (_, i) => {
      const p = pick(products);
      return {
        id: `bis-${i}`,
        email: pick(customers).email,
        productId: p.id,
        variantLabel: `${pick(p.variants).options['Size']} · ${pick(p.variants).options['Colour']}`,
        at: iso(daysAgo(between(0, 20))),
        notified: i % 4 === 0,
      };
    }),
    discounts: [
      { id: "d-1", code: "WELCOME10", type: "Percent", value: 10, appliesTo: { products: [], categories: [], collections: [] }, excludes: { products: [], categories: [] }, minSpendMinor: 0, maxDiscountMinor: 5000, startsAt: iso(daysAgo(300)), endsAt: null, totalLimit: null, perCustomerLimit: 1, firstOrderOnly: true, combinable: false, autoApply: false, uses: 412, revenueMinor: 8_942_000, discountGivenMinor: 894_200, active: true },
      { id: "d-2", code: "SUMMER10", type: "Percent", value: 10, appliesTo: { products: [], categories: [], collections: ["Summer Edit"] }, excludes: { products: [], categories: [] }, minSpendMinor: 5000, maxDiscountMinor: null, startsAt: iso(daysAgo(60)), endsAt: iso(daysAgo(-30)), totalLimit: 1000, perCustomerLimit: 2, firstOrderOnly: false, combinable: false, autoApply: false, uses: 138, revenueMinor: 3_120_000, discountGivenMinor: 312_000, active: true },
      { id: "d-3", code: "SHIPFREE", type: "Free shipping", value: 0, appliesTo: { products: [], categories: [], collections: [] }, excludes: { products: [], categories: [] }, minSpendMinor: 3000, maxDiscountMinor: null, startsAt: iso(daysAgo(120)), endsAt: null, totalLimit: null, perCustomerLimit: null, firstOrderOnly: false, combinable: true, autoApply: true, uses: 220, revenueMinor: 1_980_000, discountGivenMinor: 174_900, active: false },
    ],
    offers: [
      { id: "of-1", name: "48-hour flash sale", kind: "Flash sale", detail: "20% off the Summer Edit", startsAt: iso(daysAgo(1)), endsAt: iso(daysAgo(-1)), priority: 1, stacking: "Exclusive", active: true },
      { id: "of-2", name: "Free scarf over $300", kind: "Free gift", detail: "Adds the printed silk scarf", startsAt: iso(daysAgo(20)), endsAt: null, priority: 2, stacking: "Stackable", active: true },
    ],
    giftCards: Array.from({ length: 6 }, (_, i) => ({
      id: `gc-${i}`,
      code: `VEL-GIFT-${1000 + i}`,
      initialMinor: [5000, 10000, 25000][i % 3]!,
      balanceMinor: i % 4 === 0 ? 0 : [5000, 10000, 25000][i % 3]! - 1500,
      recipient: pick(customers).email,
      issuedAt: iso(daysAgo(between(5, 200))),
      status: i % 4 === 0 ? "Redeemed" : "Active",
      transactions: [{ at: iso(daysAgo(between(1, 30))), amountMinor: -1500, note: "Redeemed at checkout" }],
    })),
    reviews,
    messages,
    content,
    settings,
    staff: [
      { id: "u-owner", name: "Aisha Rahman", email: "owner@velora.example", role: "Owner", status: "Active", lastLogin: iso(daysAgo(0, 8)), twoFactor: true, mustChangePassword: false, overrides: {}, password: "velora-owner-2026", failedAttempts: 0, lockedUntil: null },
      { id: "u-manager", name: "Daniel Okafor", email: "manager@velora.example", role: "Manager", status: "Active", lastLogin: iso(daysAgo(1, 10)), twoFactor: false, mustChangePassword: false, overrides: {}, password: "velora-manager-2026", failedAttempts: 0, lockedUntil: null },
      { id: "u-fulfil", name: "Mira Novak", email: "fulfilment@velora.example", role: "Fulfilment", status: "Active", lastLogin: iso(daysAgo(2, 9)), twoFactor: false, mustChangePassword: false, overrides: {}, password: "velora-fulfil-2026", failedAttempts: 0, lockedUntil: null },
      { id: "u-support", name: "Hugo Berger", email: "support@velora.example", role: "Support", status: "Suspended", lastLogin: iso(daysAgo(30, 11)), twoFactor: false, mustChangePassword: true, overrides: {}, password: "velora-support-2026", failedAttempts: 0, lockedUntil: null },
    ],
    sessions: [
      { id: "s-1", userId: "u-owner", device: "Chrome · macOS", ip: "82.14.221.9", startedAt: iso(daysAgo(0, 8)), current: true },
      { id: "s-2", userId: "u-owner", device: "Safari · iPhone", ip: "82.14.221.9", startedAt: iso(daysAgo(3, 20)), current: false },
    ],
    audit: Array.from({ length: 30 }, (_, i) => ({
      id: `au-${i}`,
      at: iso(daysAgo(between(0, 20), between(8, 19))),
      actor: pick(["Aisha Rahman", "Daniel Okafor", "Mira Novak"]),
      action: pick(["order.status.update", "product.update", "settings.write", "content.write", "inventory.update"]),
      entity: pick(["Order VEL-10412", "Product Bias-Cut Silk Slip Dress", "Settings shipping", "Content hero"]),
      ip: "82.14.221.9",
      before: { value: "previous" },
      after: { value: "updated" },
    })),
    backups: [
      { id: "bk-1", at: iso(daysAgo(0, 3)), bytes: 48_200_000, integrity: "Verified", destination: "S3 · velora-backups" },
      { id: "bk-2", at: iso(daysAgo(1, 3)), bytes: 47_900_000, integrity: "Verified", destination: "S3 · velora-backups" },
      { id: "bk-3", at: iso(daysAgo(2, 3)), bytes: 47_100_000, integrity: "Unverified", destination: "S3 · velora-backups" },
    ],
    webhooks: Array.from({ length: 12 }, (_, i) => ({
      id: `wh-${i}`,
      source: pick(["Stripe", "PayPal", "DHL Express"]),
      event: pick(["payment_intent.succeeded", "charge.refunded", "shipment.status"]),
      at: iso(daysAgo(between(0, 6), between(1, 23))),
      signature: i % 9 === 0 ? "Invalid" : "Valid",
      result: i % 9 === 0 ? "Failed" : "Processed",
      payload: '{"id":"evt_1PxA","type":"payment_intent.succeeded"}',
    })),
    jobs: [
      { id: "j-1", name: "Rebuild storefront read model", state: "Done", attempts: 1, at: iso(daysAgo(0, 7)), error: null },
      { id: "j-2", name: "Send abandoned-cart emails", state: "Pending", attempts: 0, at: iso(daysAgo(0, 6)), error: null },
      { id: "j-3", name: "Generate image derivatives", state: "Running", attempts: 1, at: iso(daysAgo(0, 5)), error: null },
      { id: "j-4", name: "Sync FX rates", state: "Failed", attempts: 3, at: iso(daysAgo(1, 4)), error: "FX provider timeout" },
      { id: "j-5", name: "Courier label retry", state: "Dead letter", attempts: 6, at: iso(daysAgo(2, 4)), error: "Address rejected" },
    ],
    savedViews: [
      { id: "sv-1", scope: "orders", name: "Needs fulfilment", query: "status=Confirmed,Packed" },
      { id: "sv-2", scope: "orders", name: "Awaiting payment", query: "payment=Pending" },
      { id: "sv-3", scope: "products", name: "Low stock", query: "stock=low" },
    ],
    setupSteps: {
      "store-profile": true,
      branding: true,
      currency: true,
      tax: true,
      shipping: true,
      payments: true,
      smtp: true,
      couriers: true,
      "order-numbering": true,
      invoice: false,
      security: false,
      staff: true,
      "go-live": false,
    },
    auth: { userId: null, startedAt: null },
  };
}
