import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// This project used to build with TanStack Start + nitro, which produces a
// Cloudflare Worker in .output/ and NO index.html: the HTML was rendered at
// request time by a server we do not deploy. The Express server in ../server
// serves static files, so there was nothing for it to serve and every page
// returned "Front end not built".
//
// This is a plain client-rendered Vite build instead. It emits web/dist with a
// real index.html, which Express serves on the same port as /api. Every screen
// in this app already fetches its data from /api at runtime, so nothing
// depended on server-side rendering.
export default defineConfig({
  plugins: [
    // Must run before react(): it generates src/routeTree.gen.ts from the files
    // in src/routes. Without it the router has no routes and nothing renders.
    tanstackRouter({
      target: "react",
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Keeps the vendor chunk from tripping the default 500 kB warning on the
    // admin panel, which pulls in recharts and the whole Radix surface.
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
  },
});
