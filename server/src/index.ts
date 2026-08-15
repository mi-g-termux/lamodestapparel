import express, { type Request, type Response, type NextFunction } from "express";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env, isProd, isServerless } from "./env.js";
import { healthcheck } from "./db.js";
import { securityHeaders, issueCsrfCookie, clientIp } from "./security.js";
import { ensureDefaults, isMaintenanceMode, getPublicSettings } from "./settings.js";
import { refreshRates } from "./fx.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";
import { uploadRouter } from "./routes/upload.js";
import { cronRouter } from "./routes/cron.js";
import { stateRouter } from "./routes/state.js";
import { paymentsRouter } from "./routes/payments.js";
import { imagesRouter } from "./images.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Where the front end ends up depends on the toolchain. A plain Vite SPA build
// writes web/dist; TanStack Start's nitro build writes web/dist/client or
// web/.output/public. Serve whichever one actually contains an index.html so a
// working build is never invisible to Express.
function resolveWebDist(): string {
  const fallback = path.resolve(here, "../../web/dist");
  const candidates = [
    fallback,
    path.resolve(here, "../../web/dist/client"),
    path.resolve(here, "../../web/.output/public"),
  ];
  for (const dir of candidates) {
    if (existsSync(path.join(dir, "index.html"))) return dir;
  }
  return fallback;
}

const webDist = resolveWebDist();

export const app = express();

/* ---------------- hardening ---------------- */

app.disable("x-powered-by");
if (env.TRUST_PROXY) app.set("trust proxy", 1);
app.use(securityHeaders);
// Gateway webhooks are signed over the exact bytes they sent, so we keep the
// raw body for those paths only. Re-serialising JSON would break the signature.
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      if (req.url?.includes("/payments/webhook/")) {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      }
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

/** Strict same-origin CORS. Only origins the operator listed are allowed. */
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    // ALLOWED_ORIGINS is a comma separated string in the environment.
    const extra = String(env.ALLOWED_ORIGINS ?? "")
      .split(/[,\s]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    const allowed = [env.SITE_URL, ...extra].filter(Boolean);
    if (allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-csrf-token, x-currency");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
      res.setHeader("Vary", "Origin");
    } else if (isProd) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

/** Every visitor gets a CSRF token cookie; writes must echo it back. */
app.use((req: Request, res: Response, next: NextFunction) => {
  issueCsrfCookie(req, res);
  next();
});

/* ---------------- API ---------------- */

app.get("/api/health", async (_req: Request, res: Response) => {
  const dbOk = await healthcheck();
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    database: dbOk ? "connected" : "unreachable",
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    deployTarget: env.DEPLOY_TARGET,
  });
});

/** Maintenance mode: storefront is closed, the admin panel stays reachable. */
app.use("/api/public", async (req: Request, res: Response, next: NextFunction) => {
  if (await isMaintenanceMode()) {
    const settings = (await getPublicSettings()) as Record<string, Record<string, unknown> | undefined>;
    res.status(503).json({
      maintenance: true,
      message:
        settings.features?.maintenance_message ??
        "We are making some changes. Please check back soon.",
      branding: settings.branding,
    });
    return;
  }
  next();
});

// Payments sit outside the maintenance gate above on purpose: if maintenance is
// switched on mid-checkout, a shopper who has already paid must still be able
// to complete, and gateways must still be able to deliver their webhooks.
app.use("/api/public/payments", paymentsRouter);
app.use("/api/img", imagesRouter);
app.use("/api/public", publicRouter);
app.use("/api/admin/state", stateRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin/media/upload", uploadRouter);
app.use("/api/cron", cronRouter);

/* ---------------- uploaded files ---------------- */

if (!isServerless) {
  app.use(
    "/uploads",
    express.static(env.UPLOAD_DIR, {
      maxAge: "30d",
      immutable: true,
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Disposition", "inline");
      },
    }),
  );
}

/* ---------------- the single-page app ---------------- */

app.use(
  express.static(webDist, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

app.get("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Unknown endpoint" });
});

app.get("*", async (_req: Request, res: Response) => {
  try {
    const html = await fs.readFile(path.join(webDist, "index.html"), "utf8");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch {
    res.status(500).send(
      "<h1>Front end not built</h1><p>Run <code>npm run build</code> in the <code>web</code> folder.</p>",
    );
  }
});

/* ---------------- error handling ---------------- */

app.use((err: Error & { code?: string }, req: Request, res: Response, _next: NextFunction) => {
  const id = Math.random().toString(36).slice(2, 10);
  console.error(`[${id}] ${req.method} ${req.path} from ${clientIp(req)}:`, err.message);
  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "That file is too large (6 MB maximum)." });
    return;
  }
  // Never leak stack traces to the browser in production.
  res.status(500).json({
    error: isProd ? `Something went wrong. Reference ${id}.` : err.message,
    reference: id,
  });
});

/* ---------------- boot ---------------- */

let booted: Promise<void> | null = null;
export function boot(): Promise<void> {
  if (!booted) {
    booted = (async () => {
      await ensureDefaults();
      void refreshRates().catch(() => {});
    })();
  }
  return booted;
}

app.use((_req: Request, _res: Response, next: NextFunction) => {
  void boot();
  next();
});

if (!isServerless) {
  void boot().then(() => {
    app.listen(env.PORT, () => {
      console.log(`\u2713 Server ready on port ${env.PORT} (${env.DEPLOY_TARGET})`);
    });
  });
}

export default app;
