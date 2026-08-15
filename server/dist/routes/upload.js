import { Router } from "express";
import multer from "multer";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { one } from "../db.js";
import { userFromRequest, can, csrfGuard, clientIp } from "../security.js";
import { auditWrite } from "../settings.js";
import { env, isServerless } from "../env.js";
/**
 * Logo / banner / product image uploads.
 *
 * On a normal Node host (cPanel, VPS, Docker) files land in UPLOAD_DIR and are
 * served from /uploads. On Vercel the filesystem is read-only, so uploads are
 * refused with a clear message and the admin is pointed at "Add image by URL"
 * instead — no silent failures.
 */
export const uploadRouter = Router();
const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
};
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 10 },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED[file.mimetype]) {
            cb(new Error("Only JPG, PNG, WebP, AVIF, GIF or SVG images are allowed."));
            return;
        }
        cb(null, true);
    },
});
/** SVGs can carry scripts — strip anything executable before we store one. */
function sanitiseSvg(buf) {
    const text = buf.toString("utf8")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
        .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
        .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
        .replace(/javascript:/gi, "");
    return Buffer.from(text, "utf8");
}
uploadRouter.post("/", csrfGuard, upload.array("files", 10), async (req, res) => {
    const user = await userFromRequest(req);
    if (!user || !can(user, "media.manage")) {
        res.status(403).json({ error: "You do not have permission to upload files." });
        return;
    }
    if (isServerless) {
        res.status(400).json({
            error: "This deployment has a read-only filesystem (Vercel). Use \u201cAdd image by URL\u201d, " +
                "or set STORAGE to Supabase Storage / S3 in Settings \u2192 Media.",
        });
        return;
    }
    const files = req.files ?? [];
    if (!files.length) {
        res.status(400).json({ error: "No file was received." });
        return;
    }
    const folder = String(req.body?.folder ?? "misc")
        .replace(/[^a-z0-9_-]/gi, "") || "misc";
    const dir = path.join(env.UPLOAD_DIR, folder);
    await fs.mkdir(dir, { recursive: true });
    const saved = [];
    for (const f of files) {
        let data = f.buffer;
        if (f.mimetype === "image/svg+xml")
            data = sanitiseSvg(data);
        const hash = createHash("sha256").update(data).digest("hex").slice(0, 24);
        const ext = ALLOWED[f.mimetype] ?? ".bin";
        const filename = `${hash}${ext}`;
        await fs.writeFile(path.join(dir, filename), data);
        const url = `/uploads/${folder}/${filename}`;
        const existing = await one(`select id from media where url = $1`, [url]);
        const row = existing
            ? await one(`select * from media where id = $1`, [existing.id])
            : await one(`insert into media (url, filename, mime, bytes, alt, folder, hash)
           values ($1,$2,$3,$4,$5,$6,$7) returning *`, [url, f.originalname.slice(0, 200), f.mimetype, data.byteLength,
                String(req.body?.alt ?? ""), folder, hash]);
        saved.push(row);
    }
    await auditWrite(user.id, user.name, "media.upload", `${saved.length} file(s)`, clientIp(req));
    res.status(201).json({ media: saved });
});
//# sourceMappingURL=upload.js.map