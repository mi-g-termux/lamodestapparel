# Velora — how to run this theme

Velora is a fully dynamic storefront theme built with TanStack Start (React 19 +
Vite 7), TypeScript and Tailwind CSS v4.

## Requirements

- Node.js 20 or newer (or Bun 1.1+)
- npm (ships with Node)

## Install and run

```sh
npm install
npm run dev        # http://localhost:8080
```

Production build and preview:

```sh
npm run build
npm run start
```

## Project structure

```
src/
  content/site.ts        every visible string, price, image and link (single source)
  lib/store.tsx          bag, wishlist, account session and orders (localStorage)
  lib/emails.ts          branded email templates -> { subject, html }
  components/            Header, Footer, Hero, ProductCard, kit, layouts
  routes/                one file per URL (file-based routing)
  styles.css             design tokens: colours, fonts, shadows, utilities
docs/                    assumptions, content map, design notes
```

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Home: hero slider, categories, new arrivals, promo, testimonials |
| `/shop` | Full catalogue with category filter and sorting |
| `/product/:slug` | Product detail: gallery, colour, size, quantity, add to bag |
| `/cart` | Shopping bag with free-shipping progress and totals |
| `/wishlist` | Saved pieces, move to bag |
| `/checkout` | Contact, address, payment method, order review |
| `/order/:id` | Order confirmation, status tracker and printable invoice |
| `/track-order` | Look up an order number and follow the delivery timeline |
| `/account` | Session, order history, quick links |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Authentication flows |
| `/about`, `/lookbook`, `/contact`, `/faq`, `/shipping-returns`, `/size-guide`, `/privacy`, `/terms` | Content pages |
| `/emails` | Preview gallery of every email template |

## Customising

1. **Content** — edit `src/content/site.ts`. Add a product by appending to the
   `catalog` array; the shop grid, product page, related rail and search all pick
   it up automatically.
2. **Colours and type** — edit the tokens in `src/styles.css` (`--cream`,
   `--sand`, `--clay`, `--gold`, `--ink`, fonts in `@theme inline`). Components
   never hardcode colours, so one change re-skins the whole theme.
3. **Images** — drop files into `src/assets/` and import them in
   `src/content/site.ts`.
4. **Emails** — edit `src/lib/emails.ts`. Each template returns
   `{ subject, html, preheader }`, ready to hand to any provider.

## Going live with real data

The bag, wishlist, account session and orders are stored in `localStorage` so
the theme is fully usable with no backend. To move to a database, replace the
read/write helpers in `src/lib/store.tsx` and swap `src/content/site.ts` for a
loader that returns the same shape — no component changes required.

Printing an invoice uses the browser print dialog on `/order/:id`.
