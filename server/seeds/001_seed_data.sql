-- Phase 1: Seed Data for Velora Platform (Modest Apparel)
-- Run this after migration 001

-- ========================================
-- SEED DEFAULT SETTINGS
-- ========================================

-- Branding Settings
INSERT INTO settings (namespace, data) VALUES
('branding', '{
  "store_name": "Modest Apparel",
  "tagline": "Modest fashion for the modern world",
  "logo_url": null,
  "favicon_url": null,
  "primary_color": "#1a1a1a",
  "secondary_color": "#f5f5f5",
  "accent_color": "#d97706",
  "footer_text": "Modest Apparel - All rights reserved"
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

-- SEO Settings
INSERT INTO settings (namespace, data) VALUES
('seo', '{
  "site_title": "Modest Apparel",
  "site_description": "Discover elegant modest fashion for the modern woman. Free shipping on orders over $50.",
  "og_image": null,
  "twitter_handle": "@modestapparel",
  "robots": "index, follow"
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

-- Currency Settings
INSERT INTO settings (namespace, data) VALUES
('currency', '{
  "base_currency": "USD",
  "supported_currencies": ["USD", "EUR", "GBP", "AUD", "CAD", "JPY"],
  "price_display": "inclusive"
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

-- Order Settings
INSERT INTO settings (namespace, data) VALUES
('orders', '{
  "prefix": "MA-",
  "order_number_length": 8,
  "auto_cancel_unpaid_hours": 30,
  "low_stock_threshold": 5
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

-- Email Settings
INSERT INTO settings (namespace, data) VALUES
('email', '{
  "from_name": "Modest Apparel",
  "from_email": "orders@modestapparel.com",
  "reply_to": "support@modestapparel.com"
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

-- Legal Settings
INSERT INTO settings (namespace, data) VALUES
('legal', '{
  "privacy_policy": null,
  "terms_of_service": null,
  "return_policy": "We accept returns within 30 days of delivery.",
  "shipping_policy": "Free shipping on orders over $50."
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

-- Features Toggle
INSERT INTO settings (namespace, data) VALUES
('features', '{
  "maintenance_mode": false,
  "maintenance_message": "We are making some updates. Please check back soon.",
  "guest_checkout": true,
  "newsletter_signup": true,
  "reviews_enabled": true,
  "related_products": true
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

-- ========================================
-- SEED DESIGN TOKENS
-- ========================================

INSERT INTO design_tokens (namespace, tokens) VALUES
('colors', '{
  "primary": "#1a1a1a",
  "primary_hover": "#333333",
  "secondary": "#f5f5f5",
  "accent": "#d97706",
  "accent_hover": "#b45309",
  "success": "#10b981",
  "error": "#ef4444",
  "warning": "#f59e0b",
  "info": "#3b82f6",
  "muted": "#6b7280",
  "border": "#e5e7eb",
  "background": "#ffffff",
  "foreground": "#1f2937"
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

INSERT INTO design_tokens (namespace, tokens) VALUES
('typography', '{
  "font_family_sans": "Inter, system-ui, -apple-system, sans-serif",
  "font_family_serif": "Georgia, Cambria, serif",
  "font_size_xs": "0.75rem",
  "font_size_sm": "0.875rem",
  "font_size_base": "1rem",
  "font_size_lg": "1.125rem",
  "font_size_xl": "1.25rem",
  "font_size_2xl": "1.5rem",
  "font_size_3xl": "1.875rem",
  "font_size_4xl": "2.25rem",
  "line_height_tight": "1.25",
  "line_height_normal": "1.5",
  "line_height_relaxed": "1.75",
  "font_weight_normal": "400",
  "font_weight_medium": "500",
  "font_weight_semibold": "600",
  "font_weight_bold": "700"
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

INSERT INTO design_tokens (namespace, tokens) VALUES
('spacing', '{
  "spacing_0": "0",
  "spacing_1": "0.25rem",
  "spacing_2": "0.5rem",
  "spacing_3": "0.75rem",
  "spacing_4": "1rem",
  "spacing_6": "1.5rem",
  "spacing_8": "2rem",
  "spacing_12": "3rem",
  "spacing_16": "4rem",
  "spacing_24": "6rem"
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

INSERT INTO design_tokens (namespace, tokens) VALUES
('borders', '{
  "radius_sm": "0.125rem",
  "radius_md": "0.375rem",
  "radius_lg": "0.5rem",
  "radius_xl": "0.75rem",
  "radius_2xl": "1rem",
  "radius_full": "9999px",
  "border_width_1": "1px",
  "border_width_2": "2px"
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

INSERT INTO design_tokens (namespace, tokens) VALUES
('shadows', '{
  "shadow_sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "shadow_md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  "shadow_lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  "shadow_xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "shadow_2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)"
}'::jsonb)
ON CONFLICT (namespace) DO NOTHING;

-- ========================================
-- SEED CONTENT BLOCK TYPES
-- ========================================

INSERT INTO content_block_types (type, label, schema) VALUES
('hero', 'Hero Section', '{
  "type": "object",
  "properties": {
    "heading": { "type": "string" },
    "subheading": { "type": "string" },
    "cta_text": { "type": "string" },
    "cta_link": { "type": "string" },
    "image_url": { "type": "string" },
    "image_alt": { "type": "string" },
    "background_color": { "type": "string" },
    "text_color": { "type": "string" },
    "alignment": { "type": "string", "enum": ["left", "center", "right"] }
  },
  "required": ["heading"]
}'::jsonb)
ON CONFLICT (type) DO NOTHING;

INSERT INTO content_block_types (type, label, schema) VALUES
('banner', 'Banner / Promo Strip', '{
  "type": "object",
  "properties": {
    "text": { "type": "string" },
    "link": { "type": "string" },
    "background_color": { "type": "string" },
    "text_color": { "type": "string" },
    "dismissible": { "type": "boolean" }
  },
  "required": ["text"]
}'::jsonb)
ON CONFLICT (type) DO NOTHING;

INSERT INTO content_block_types (type, label, schema) VALUES
('product_grid', 'Product Grid', '{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "collection_id": { "type": "string" },
    "limit": { "type": "number" },
    "columns": { "type": "number", "minimum": 2, "maximum": 6 },
    "sort_by": { "type": "string", "enum": ["newest", "price_asc", "price_desc", "popular"] }
  }
}'::jsonb)
ON CONFLICT (type) DO NOTHING;

INSERT INTO content_block_types (type, label, schema) VALUES
('testimonials', 'Testimonials', '{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "limit": { "type": "number" }
  }
}'::jsonb)
ON CONFLICT (type) DO NOTHING;

INSERT INTO content_block_types (type, label, schema) VALUES
('newsletter', 'Newsletter Signup', '{
  "type": "object",
  "properties": {
    "heading": { "type": "string" },
    "subheading": { "type": "string" },
    "button_text": { "type": "string" },
    "placeholder": { "type": "string" }
  }
}'::jsonb)
ON CONFLICT (type) DO NOTHING;

INSERT INTO content_block_types (type, label, schema) VALUES
('rich_text', 'Rich Text / HTML', '{
  "type": "object",
  "properties": {
    "content": { "type": "string" }
  },
  "required": ["content"]
}'::jsonb)
ON CONFLICT (type) DO NOTHING;

-- ========================================
-- SEED CURRENCIES (ISO 4217 - Complete list with proper decimals)
-- ========================================

INSERT INTO currencies (code, name, symbol, decimals) VALUES
('USD', 'US Dollar', '$', 2),
('EUR', 'Euro', '€', 2),
('GBP', 'British Pound', '£', 2),
('JPY', 'Japanese Yen', '¥', 0),
('AUD', 'Australian Dollar', 'A$', 2),
('CAD', 'Canadian Dollar', 'C$', 2),
('CHF', 'Swiss Franc', 'CHF', 2),
('CNY', 'Chinese Yuan', '¥', 2),
('SEK', 'Swedish Krona', 'kr', 2),
('NZD', 'New Zealand Dollar', 'NZ$', 2),
('MXN', 'Mexican Peso', '$', 2),
('SGD', 'Singapore Dollar', 'S$', 2),
('HKD', 'Hong Kong Dollar', 'HK$', 2),
('NOK', 'Norwegian Krone', 'kr', 2),
('KRW', 'South Korean Won', '₩', 0),
('TRY', 'Turkish Lira', '₺', 2),
('RUB', 'Russian Ruble', '₽', 2),
('INR', 'Indian Rupee', '₹', 2),
('BRL', 'Brazilian Real', 'R$', 2),
('ZAR', 'South African Rand', 'R', 2),
('DKK', 'Danish Krone', 'kr', 2),
('PLN', 'Polish Zloty', 'zł', 2),
('TWD', 'New Taiwan Dollar', 'NT$', 2),
('THB', 'Thai Baht', '฿', 2),
('MYR', 'Malaysian Ringgit', 'RM', 2),
('IDR', 'Indonesian Rupiah', 'Rp', 0),
('PHP', 'Philippine Peso', '₱', 2),
('VND', 'Vietnamese Dong', '₫', 0),
('AED', 'UAE Dirham', 'د.إ', 2),
('SAR', 'Saudi Riyal', '﷼', 2),
('ILS', 'Israeli Shekel', '₪', 2),
('EGP', 'Egyptian Pound', 'E£', 2),
('NGN', 'Nigerian Naira', '₦', 2),
('PKR', 'Pakistani Rupee', '₨', 0),
('BDT', 'Bangladeshi Taka', '৳', 2),
('CLP', 'Chilean Peso', '$', 0),
('COP', 'Colombian Peso', '$', 0),
('PEN', 'Peruvian Sol', 'S/', 2),
('ARS', 'Argentine Peso', '$', 2),
('HUF', 'Hungarian Forint', 'Ft', 0),
('CZK', 'Czech Koruna', 'Kč', 2),
('RON', 'Romanian Leu', 'lei', 2),
('BGN', 'Bulgarian Lev', 'лв', 2),
('HRK', 'Croatian Kuna', 'kn', 2),
('UAH', 'Ukrainian Hryvnia', '₴', 2),
('KZT', 'Kazakhstani Tenge', '₸', 2),
('QAR', 'Qatari Riyal', '﷼', 2),
('KWD', 'Kuwaiti Dinar', 'د.ك', 3),
('BHD', 'Bahraini Dinar', '.د.ب', 3),
('OMR', 'Omani Rial', '﷼', 3),
('JOD', 'Jordanian Dinar', 'د.ا', 3),
('TND', 'Tunisian Dinar', 'د.ت', 3)
ON CONFLICT (code) DO NOTHING;

-- Mark primary currencies as active
UPDATE currencies SET active = TRUE WHERE code IN ('USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY');

-- ========================================
-- SEED COUNTRIES (ISO 3166-1 - Major ones for e-commerce)
-- ========================================

INSERT INTO countries (code, name, dial_code, active_for_shipping) VALUES
('US', 'United States', '+1', TRUE),
('GB', 'United Kingdom', '+44', TRUE),
('CA', 'Canada', '+1', TRUE),
('AU', 'Australia', '+61', TRUE),
('DE', 'Germany', '+49', TRUE),
('FR', 'France', '+33', TRUE),
('IT', 'Italy', '+39', TRUE),
('ES', 'Spain', '+34', TRUE),
('NL', 'Netherlands', '+31', TRUE),
('BE', 'Belgium', '+32', TRUE),
('AT', 'Austria', '+43', TRUE),
('CH', 'Switzerland', '+41', TRUE),
('SE', 'Sweden', '+46', TRUE),
('NO', 'Norway', '+47', TRUE),
('DK', 'Denmark', '+45', TRUE),
('FI', 'Finland', '+358', TRUE),
('IE', 'Ireland', '+353', TRUE),
('PT', 'Portugal', '+351', TRUE),
('PL', 'Poland', '+48', TRUE),
('CZ', 'Czech Republic', '+420', TRUE),
('HU', 'Hungary', '+36', TRUE),
('GR', 'Greece', '+30', TRUE),
('TR', 'Turkey', '+90', TRUE),
('RU', 'Russia', '+7', TRUE),
('UA', 'Ukraine', '+380', TRUE),
('CN', 'China', '+86', TRUE),
('JP', 'Japan', '+81', TRUE),
('KR', 'South Korea', '+82', TRUE),
('IN', 'India', '+91', TRUE),
('SG', 'Singapore', '+65', TRUE),
('MY', 'Malaysia', '+60', TRUE),
('TH', 'Thailand', '+66', TRUE),
('PH', 'Philippines', '+63', TRUE),
('ID', 'Indonesia', '+62', TRUE),
('VN', 'Vietnam', '+84', TRUE),
('AE', 'United Arab Emirates', '+971', TRUE),
('SA', 'Saudi Arabia', '+966', TRUE),
('IL', 'Israel', '+972', TRUE),
('EG', 'Egypt', '+20', TRUE),
('ZA', 'South Africa', '+27', TRUE),
('NG', 'Nigeria', '+234', TRUE),
('BR', 'Brazil', '+55', TRUE),
('MX', 'Mexico', '+52', TRUE),
('AR', 'Argentina', '+54', TRUE),
('CL', 'Chile', '+56', TRUE),
('CO', 'Colombia', '+57', TRUE),
('PE', 'Peru', '+51', TRUE),
('NZ', 'New Zealand', '+64', TRUE),
('HK', 'Hong Kong', '+852', TRUE),
('TW', 'Taiwan', '+886', TRUE)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- SEED DEFAULT PAGES
-- ========================================

INSERT INTO pages (slug, title, meta_description, published) VALUES
('home', 'Home', 'Welcome to Modest Apparel - Elegant modest fashion for the modern woman', TRUE),
('shop', 'Shop', 'Browse our collection of modest fashion', TRUE),
('about', 'About Us', 'Learn about Modest Apparel and our mission', FALSE),
('contact', 'Contact Us', 'Get in touch with our team', FALSE),
('faq', 'FAQ', 'Frequently asked questions', FALSE),
('shipping-returns', 'Shipping & Returns', 'Shipping and returns policy', FALSE),
('privacy-policy', 'Privacy Policy', 'Our privacy policy', FALSE),
('terms-of-service', 'Terms of Service', 'Terms and conditions', FALSE)
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- SEED DEFAULT NAVIGATION
-- ========================================

-- Header Navigation
INSERT INTO navigation_items (menu, label, url, position, active) VALUES
('header', 'Home', '/', 1, TRUE),
('header', 'Shop', '/shop', 2, TRUE),
('header', 'About', '/about', 3, TRUE),
('header', 'Contact', '/contact', 4, TRUE)
ON CONFLICT DO NOTHING;

-- Footer Navigation - Column 1
INSERT INTO navigation_items (menu, label, url, position, active) VALUES
('footer', 'Shop All', '/shop', 1, TRUE),
('footer', 'New Arrivals', '/shop?sort=newest', 2, TRUE),
('footer', 'Best Sellers', '/shop?sort=popular', 3, TRUE),
('footer', 'Sale', '/shop?sale=true', 4, TRUE)
ON CONFLICT DO NOTHING;

-- Footer Navigation - Column 2
INSERT INTO navigation_items (menu, label, url, position, active) VALUES
('footer', 'About Us', '/about', 5, TRUE),
('footer', 'Contact', '/contact', 6, TRUE),
('footer', 'FAQ', '/faq', 7, TRUE),
('footer', 'Size Guide', '/size-guide', 8, TRUE)
ON CONFLICT DO NOTHING;

-- Footer Navigation - Column 3
INSERT INTO navigation_items (menu, label, url, position, active) VALUES
('footer', 'Shipping & Returns', '/shipping-returns', 9, TRUE),
('footer', 'Privacy Policy', '/privacy-policy', 10, TRUE),
('footer', 'Terms of Service', '/terms-of-service', 11, TRUE)
ON CONFLICT DO NOTHING;

-- ========================================
-- SEED DEFAULT TRANSLATIONS (English)
-- ========================================

INSERT INTO translations (key, locale, value, context) VALUES
-- Buttons
('button.add_to_cart', 'en', 'Add to Cart', 'button'),
('button.buy_now', 'en', 'Buy Now', 'button'),
('button.checkout', 'en', 'Checkout', 'button'),
('button.continue_shopping', 'en', 'Continue Shopping', 'button'),
('button.sign_in', 'en', 'Sign In', 'button'),
('button.sign_up', 'en', 'Create Account', 'button'),
('button.sign_out', 'en', 'Sign Out', 'button'),
('button.save', 'en', 'Save', 'button'),
('button.cancel', 'en', 'Cancel', 'button'),
('button.delete', 'en', 'Delete', 'button'),
('button.edit', 'en', 'Edit', 'button'),
('button.view_all', 'en', 'View All', 'button'),
('button.search', 'en', 'Search', 'button'),
('button.subscribe', 'en', 'Subscribe', 'button'),

-- Form Labels
('label.email', 'en', 'Email Address', 'label'),
('label.password', 'en', 'Password', 'label'),
('label.first_name', 'en', 'First Name', 'label'),
('label.last_name', 'en', 'Last Name', 'label'),
('label.phone', 'en', 'Phone Number', 'label'),
('label.address', 'en', 'Address', 'label'),
('label.city', 'en', 'City', 'label'),
('label.country', 'en', 'Country', 'label'),
('label.postal_code', 'en', 'Postal Code', 'label'),
('label.quantity', 'en', 'Quantity', 'label'),
('label.size', 'en', 'Size', 'label'),
('label.color', 'en', 'Color', 'label'),

-- Messages
('message.cart_empty', 'en', 'Your cart is empty', 'message'),
('message.wishlist_empty', 'en', 'Your wishlist is empty', 'message'),
('message.no_products', 'en', 'No products found', 'message'),
('message.loading', 'en', 'Loading...', 'message'),
('message.error', 'en', 'Something went wrong', 'message'),
('message.success', 'en', 'Success!', 'message'),
('message.added_to_cart', 'en', 'Added to cart', 'message'),
('message.removed_from_cart', 'en', 'Removed from cart', 'message'),
('message.order_placed', 'en', 'Order placed successfully!', 'message'),
('message.thank_you', 'en', 'Thank you for your order!', 'message'),

-- Page Titles
('title.shop', 'en', 'Shop', 'title'),
('title.cart', 'en', 'Shopping Cart', 'title'),
('title.checkout', 'en', 'Checkout', 'title'),
('title.my_account', 'en', 'My Account', 'title'),
('title.order_history', 'en', 'Order History', 'title'),
('title.wishlist', 'en', 'Wishlist', 'title'),

-- Newsletter
('newsletter.heading', 'en', 'Join Our Newsletter', 'message'),
('newsletter.subheading', 'en', 'Subscribe to get special offers and updates', 'message'),
('newsletter.placeholder', 'en', 'Enter your email', 'message'),
('newsletter.success', 'en', 'Thank you for subscribing!', 'message'),

-- Empty States
('empty.search_results', 'en', 'No products match your search', 'message'),
('empty.order_history', 'en', 'You haven''t placed any orders yet', 'message')
ON CONFLICT (key, locale) DO NOTHING;

-- ========================================
-- SEED DEFAULT TAX RATES
-- ========================================

INSERT INTO tax_rates (country_code, rate, inclusive) VALUES
('US', 8.875, FALSE),
('GB', 20.0, TRUE),
('DE', 19.0, TRUE),
('FR', 20.0, TRUE),
('CA', 13.0, FALSE),
('AU', 10.0, TRUE),
('NL', 21.0, TRUE),
('IT', 22.0, TRUE),
('ES', 21.0, TRUE)
ON CONFLICT DO NOTHING;

-- ========================================
-- SEED PAYMENT PROVIDERS
-- ========================================

INSERT INTO payment_providers (type, label, enabled, test_mode, credentials, config) VALUES
('stripe', 'Stripe', FALSE, TRUE, '{}'::jsonb, '{
  "supported_methods": ["card"],
  "webhook_events": ["payment_intent.succeeded", "payment_intent.payment_failed"]
}'::jsonb),
('paypal', 'PayPal', FALSE, TRUE, '{}'::jsonb, '{
  "supported_methods": ["paypal"]
}'::jsonb),
('cod', 'Cash on Delivery', TRUE, FALSE, '{}'::jsonb, '{
  "min_order": 0,
  "max_order": 500
}'::jsonb),
('bank_transfer', 'Bank Transfer', FALSE, TRUE, '{}'::jsonb, '{
  "bank_name": null,
  "account_number": null,
  "routing_number": null,
  "instructions": "We will provide bank details after order confirmation."
}'::jsonb)
ON CONFLICT (type) DO NOTHING;

-- ========================================
-- SEED COURIERS
-- ========================================

INSERT INTO couriers (type, label, enabled, credentials, config) VALUES
('manual', 'Manual Shipping', TRUE, '{}'::jsonb, '{
  "default_price": 9.99,
  "free_shipping_threshold": 50
}'::jsonb),
('shippo', 'Shippo', FALSE, '{}'::jsonb, '{
  "default_service": "usps_priority_mail"
}'::jsonb),
('fedex', 'FedEx', FALSE, '{}'::jsonb, '{}'::jsonb),
('dhl', 'DHL Express', FALSE, '{}'::jsonb, '{}'::jsonb)
ON CONFLICT (type) DO NOTHING;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- SELECT 'Settings: ' || COUNT(*) FROM settings;
-- SELECT 'Design Tokens: ' || COUNT(*) FROM design_tokens;
-- SELECT 'Block Types: ' || COUNT(*) FROM content_block_types;
-- SELECT 'Currencies: ' || COUNT(*) FROM currencies;
-- SELECT 'Countries: ' || COUNT(*) FROM countries;
-- SELECT 'Pages: ' || COUNT(*) FROM pages;
-- SELECT 'Nav Items: ' || COUNT(*) FROM navigation_items;
-- SELECT 'Translations: ' || COUNT(*) FROM translations;
-- SELECT 'Tax Rates: ' || COUNT(*) FROM tax_rates;
-- SELECT 'Payment Providers: ' || COUNT(*) FROM payment_providers;
-- SELECT 'Couriers: ' || COUNT(*) FROM couriers;