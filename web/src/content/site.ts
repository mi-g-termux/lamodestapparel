// SINGLE SOURCE OF CONTENT
// Every user-visible string, image, price and link on the storefront lives here.
// Components contain zero literal content — swap this file (or feed it from a CMS
// / database later) and the whole theme re-skins without touching components.

import heroImg from "@/assets/hero-1.jpg";
import catWomen from "@/assets/cat-women.jpg";
import catMen from "@/assets/cat-men.jpg";
import catKids from "@/assets/cat-kids.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import pDress from "@/assets/p-dress.jpg";
import pShirt from "@/assets/p-shirt.jpg";
import pBag from "@/assets/p-bag.jpg";
import pCoord from "@/assets/p-coord.jpg";
import pWatch from "@/assets/p-watch.jpg";
import saleBanner from "@/assets/sale-banner.jpg";

export type Announcement = { icon: "truck" | "refresh" | "shield" | "cash"; label: string };
export type NavItem = { label: string; href: string };
export type Slide = {
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  body: string;
  cta: string;
  href: string;
  image: string;
  imageAlt: string;
};
export type Feature = { icon: "truck" | "refresh" | "shield" | "headset"; title: string; body: string };
export type Category = { name: string; cta: string; href: string; image: string };
export type Testimonial = { quote: string; author: string; stars: number; avatar: string };
export type FooterColumn = { title: string; links: NavItem[] };

export type Swatch = { name: string; hex: string };
export type Detail = { title: string; body: string };
export type CatalogProduct = {
  slug: string;
  name: string;
  price: number;
  compareAt?: number;
  category: "Women" | "Men" | "Kids" | "Accessories";
  collection: string;
  badge?: string;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  colors: Swatch[];
  sizes: string[];
  description: string;
  details: Detail[];
};

/** Card shape used by rails and grids. */
export type Product = {
  slug: string;
  name: string;
  /** Base-currency (USD) price; display formatting happens in the UI. */
  price: number;
  rating: number;
  reviews: number;
  badge?: string;
  image: string;
};

export const currency = { code: "USD", symbol: "$" };
export const formatPrice = (value: number) =>
  `${currency.symbol}${value.toFixed(2).replace(/\.00$/, ".00")}`;

const sharedDetails: Detail[] = [
  {
    title: "Fit Details",
    body: "True to size with a relaxed drape through the body. Model is 5'9\" and wears a size S.",
  },
  {
    title: "Fabrication & Care",
    body: "Woven from long-staple natural fibres. Cold gentle wash, dry flat in shade, warm iron on reverse.",
  },
  {
    title: "Shipping & Returns",
    body: "Complimentary shipping on orders over $75. Free returns within 14 days of delivery.",
  },
];

const catalog: CatalogProduct[] = [
  {
    slug: "floral-wrap-dress",
    name: "Floral Wrap Dress",
    price: 49.99,
    compareAt: 69.99,
    category: "Women",
    collection: "New Collection",
    badge: "New",
    rating: 4.5,
    reviews: 120,
    image: pDress,
    gallery: [pDress, catWomen, heroImg],
    colors: [
      { name: "Sand", hex: "#EDE3D6" },
      { name: "Ink", hex: "#1C1A18" },
      { name: "Clay", hex: "#C9A88A" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    description:
      "A softly gathered wrap dress cut from airy viscose, finished with a self-tie waist that shapes the silhouette without restricting it.",
    details: sharedDetails,
  },
  {
    slug: "linen-casual-shirt",
    name: "Linen Casual Shirt",
    price: 39.99,
    category: "Men",
    collection: "Summer Edit",
    rating: 4.5,
    reviews: 98,
    image: pShirt,
    gallery: [pShirt, catMen, saleBanner],
    colors: [
      { name: "Cream", hex: "#F7F2EA" },
      { name: "Olive", hex: "#7C7A5E" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    description:
      "Breathable washed linen with a soft collar and a straight hem — the shirt that carries a warm day from morning to evening.",
    details: sharedDetails,
  },
  {
    slug: "quilted-chain-bag",
    name: "Quilted Chain Bag",
    price: 59.99,
    category: "Accessories",
    collection: "Everyday Icons",
    badge: "Bestseller",
    rating: 4.5,
    reviews: 86,
    image: pBag,
    gallery: [pBag, catAccessories, saleBanner],
    colors: [
      { name: "Camel", hex: "#B98C5A" },
      { name: "Ink", hex: "#1C1A18" },
    ],
    sizes: ["One size"],
    description:
      "Diamond-quilted shell with a slim antique chain strap and a suede-lined interior sized for the essentials.",
    details: sharedDetails,
  },
  {
    slug: "cotton-co-ord-set",
    name: "Culton Co-ord Set",
    price: 54.99,
    category: "Women",
    collection: "New Collection",
    rating: 4.5,
    reviews: 72,
    image: pCoord,
    gallery: [pCoord, catWomen, heroImg],
    colors: [
      { name: "Sand", hex: "#EDE3D6" },
      { name: "Stone", hex: "#CFC6B8" },
    ],
    sizes: ["XS", "S", "M", "L"],
    description:
      "A matched shirt and trouser in structured cotton, tailored loose enough to wear apart and refined enough to wear together.",
    details: sharedDetails,
  },
  {
    slug: "minimal-watch",
    name: "Minimal Watch",
    price: 29.99,
    category: "Accessories",
    collection: "Everyday Icons",
    badge: "New",
    rating: 4.5,
    reviews: 64,
    image: pWatch,
    gallery: [pWatch, catAccessories, saleBanner],
    colors: [
      { name: "Gold", hex: "#A5794E" },
      { name: "Steel", hex: "#9EA1A3" },
    ],
    sizes: ["One size"],
    description:
      "A pared-back dial on a supple leather strap, scaled to sit quietly under a cuff.",
    details: sharedDetails,
  },
  {
    slug: "embroidered-kaftan",
    name: "Embroidered Kaftan",
    price: 78.0,
    category: "Women",
    collection: "New Collection",
    badge: "Editor's pick",
    rating: 5,
    reviews: 41,
    image: heroImg,
    gallery: [heroImg, catWomen, pDress],
    colors: [
      { name: "Beige", hex: "#E4D4BE" },
      { name: "Ivory", hex: "#F6F1E7" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    description:
      "Hand-guided tonal embroidery across a floor-skimming kaftan, cut wide at the sleeve for movement and shade.",
    details: sharedDetails,
  },
  {
    slug: "kids-summer-set",
    name: "Kids Summer Set",
    price: 34.5,
    category: "Kids",
    collection: "Summer Edit",
    rating: 4.5,
    reviews: 29,
    image: catKids,
    gallery: [catKids, catWomen, saleBanner],
    colors: [
      { name: "Sand", hex: "#EDE3D6" },
      { name: "Sky", hex: "#A9C4D3" },
    ],
    sizes: ["2Y", "4Y", "6Y", "8Y"],
    description:
      "Soft-washed cotton separates built for play, with flat seams and an easy elasticated waist.",
    details: sharedDetails,
  },
  {
    slug: "leather-belt",
    name: "Slim Leather Belt",
    price: 24.0,
    category: "Accessories",
    collection: "Everyday Icons",
    rating: 4.5,
    reviews: 18,
    image: catAccessories,
    gallery: [catAccessories, pWatch, pBag],
    colors: [
      { name: "Tan", hex: "#B98C5A" },
      { name: "Black", hex: "#1C1A18" },
    ],
    sizes: ["S", "M", "L"],
    description:
      "Full-grain leather with a brushed brass keeper, cut narrow to sit neatly at the waist.",
    details: sharedDetails,
  },
];

const toCard = (p: CatalogProduct): Product => ({
  slug: p.slug,
  name: p.name,
  price: p.price,
  rating: p.rating,
  reviews: p.reviews,
  image: p.image,
  ...(p.badge ? { badge: p.badge } : {}),
});

export const site = {
  brand: {
    name: "VELORA",
    tagline: "Timeless Fashion",
    href: "/",
  },

  announcements: [
    { icon: "truck", label: "Free Shipping $75+" },
    { icon: "refresh", label: "14-Day Returns" },
    { icon: "shield", label: "Secure Payments" },
    { icon: "cash", label: "Cash on Delivery" },
  ] as Announcement[],

  nav: [
    { label: "New In", href: "/shop" },
    { label: "Women", href: "/shop" },
    { label: "Men", href: "/shop" },
    { label: "Kids", href: "/shop" },
    { label: "Accessories", href: "/shop" },
    { label: "Sale", href: "/shop" },
  ] as NavItem[],

  slides: [
    {
      eyebrow: "New Collection",
      titleTop: "Effortless Style.",
      titleBottom: "Every Day.",
      body: "Elevated essentials for the modern wardrobe. Timeless, versatile & you.",
      cta: "Shop Now",
      href: "/shop",
      image: heroImg,
      imageAlt: "Model wearing an embroidered beige kaftan against a sunlit wall",
    },
    {
      eyebrow: "Summer Edit",
      titleTop: "Light Layers.",
      titleBottom: "Warm Tones.",
      body: "Breathable linens and soft neutrals made for long, bright days.",
      cta: "Shop Now",
      href: "/shop",
      image: saleBanner,
      imageAlt: "Model in a cream linen shirt leaning on a warm beige wall",
    },
  ] as Slide[],

  features: [
    { icon: "truck", title: "Free Shipping", body: "On Orders Over $75" },
    { icon: "refresh", title: "Easy Returns", body: "14 Days Return Policy" },
    { icon: "shield", title: "Secure Payments", body: "100% Protected" },
    { icon: "headset", title: "24/7 Support", body: "We're Here to Help" },
  ] as Feature[],

  categorySection: { title: "Shop by Category", viewAll: "View All", viewAllHref: "/shop" },
  categories: [
    { name: "Women", cta: "Explore Now", href: "/shop", image: catWomen },
    { name: "Men", cta: "Explore Now", href: "/shop", image: catMen },
    { name: "Kids", cta: "Explore Now", href: "/shop", image: catKids },
    { name: "Accessories", cta: "Explore Now", href: "/shop", image: catAccessories },
  ] as Category[],

  arrivalsSection: { title: "New Arrivals", viewAll: "View All", viewAllHref: "/shop" },

  catalog,
  products: catalog.slice(0, 5).map(toCard),

  productPage: {
    addToBag: "Add to Bag",
    addToWishlist: "Add to Wishlist",
    inWishlist: "Saved to Wishlist",
    colorLabel: "Color",
    sizeLabel: "Product Size",
    sizeChart: "Size Chart",
    sizeChartHref: "/size-guide",
    quantityLabel: "Quantity",
    added: "Added to your bag",
    relatedTitle: "You May Also Like",
    breadcrumbRoot: "Shop",
  },

  cartPage: {
    title: "Shopping Bag",
    empty: "Your bag is empty.",
    emptyCta: "Continue shopping",
    subtotal: "Subtotal",
    shipping: "Shipping",
    shippingFree: "Free",
    tax: "Estimated tax",
    total: "Total",
    checkout: "Proceed to Checkout",
    remove: "Remove",
    freeShippingThreshold: 75,
    taxRate: 0.05,
    flatShipping: 6.5,
    note: "Taxes and shipping are estimated at checkout.",
  },

  wishlistPage: {
    title: "Wishlist",
    empty: "Nothing saved yet.",
    emptyCta: "Browse new arrivals",
    move: "Move to Bag",
    remove: "Remove",
  },

  promo: {
    eyebrow: "Summer Sale",
    titleTop: "Up to 50% Off",
    titleBottom: "On Selected Styles",
    cta: "Shop Sale",
    href: "/shop",
    image: saleBanner,
    imageAlt: "Woman in linen shirt and sunglasses in warm summer light",
  },

  social: {
    title: "Loved by 10,000+ Customers",
    ratingLabel: "4.8/5 Average Rating",
    stars: 5,
    avatars: [pDress, pShirt, pCoord, catWomen, catMen, catKids],
  },
  testimonials: [
    {
      quote: "The quality is incredible and the fit is perfect. Velora is my new favorite brand!",
      author: "Sarah J.",
      stars: 5,
      avatar: catWomen,
    },
    {
      quote: "Stylish, comfortable, and exactly as shown in the pictures. Highly recommend!",
      author: "Amelia R.",
      stars: 5,
      avatar: pDress,
    },
    {
      quote: "Customer service is amazing and the delivery was super fast!",
      author: "Daniel K.",
      stars: 5,
      avatar: catMen,
    },
  ] as Testimonial[],

  newsletter: {
    title: "Join the Velora List",
    body: "Early access to new collections, private sales and styling notes.",
    placeholder: "Enter your email address",
    cta: "Subscribe",
    note: "No spam. Unsubscribe any time.",
  },

  footerColumns: [
    {
      title: "Shop",
      links: [
        { label: "New In", href: "/shop" },
        { label: "Wishlist", href: "/wishlist" },
        { label: "Shopping Bag", href: "/cart" },
        { label: "Size Guide", href: "/size-guide" },
      ],
    },
    {
      title: "Help",
      links: [
        { label: "Shipping & Delivery", href: "/shipping-returns" },
        { label: "Returns & Exchanges", href: "/shipping-returns" },
        { label: "Track Order", href: "/track-order" },
        { label: "FAQ", href: "/faq" },
        { label: "Contact Us", href: "/contact" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "My Account", href: "/account" },
        { label: "Sign In", href: "/login" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
      ],
    },
  ] as FooterColumn[],

  footerAbout: {
    body: "Velora makes timeless, well-made essentials in warm neutral tones — designed to be worn season after season.",
    socialLabel: "Follow us",
    socials: [
      { label: "Instagram", href: "/contact" },
      { label: "Facebook", href: "/contact" },
      { label: "Pinterest", href: "/contact" },
    ] as NavItem[],
  },

  legal: {
    copyright: "© 2026 Velora. All rights reserved.",
    payments: "Cash on delivery available in supported regions",
  },

  company: {
    legalName: "Velora Studio Ltd.",
    address: "24 Linden Row, Suite 3, London EC1V 9BX",
    email: "care@velora.example",
    phone: "+44 20 7946 0123",
    hours: "Mon–Sat, 09:00–19:00 GMT",
    vat: "GB 384 220 119",
    site: "https://velora.example",
  },

  seo: {
    title: "Velora — Timeless Fashion Essentials for Every Day",
    description:
      "Shop Velora's elevated wardrobe essentials in warm neutral tones. Free shipping over $75, easy 14-day returns and secure payments.",
  },
};

export type Site = typeof site;

export const getProduct = (slug: string) => catalog.find((p) => p.slug === slug);
export const relatedProducts = (slug: string, count = 4) =>
  catalog.filter((p) => p.slug !== slug).slice(0, count).map(toCard);
export const productCards = () => catalog.map(toCard);

/**
 * Variant imagery: each colour swatch owns its own view of the gallery, so
 * picking a colour swaps the hero image (and reorders the thumbnails) instead
 * of leaving the shopper on an unrelated shot.
 */
export const galleryForColor = (product: CatalogProduct, colorName: string) => {
  const gallery = product.gallery.length ? product.gallery : [product.image];
  const index = Math.max(
    0,
    product.colors.findIndex((c) => c.name === colorName),
  );
  const offset = index % gallery.length;
  return [...gallery.slice(offset), ...gallery.slice(0, offset)];
};
