/**
 * On-the-fly image resizing with a disk cache.
 *
 * `sharp` is an optional dependency: if it is installed you get resized AVIF /
 * WebP / JPEG variants and LQIP placeholders. If it is not (some shared hosts
 * cannot build it), the original file is served unchanged instead of the whole
 * feature crashing. Nothing here needs an API key.
 */
import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { Router, type Request, type Response } from "express"
import { env } from "./env.js"

export const ALLOWED_WIDTHS = [
	320, 480, 640, 768, 1024, 1280, 1600, 1920,
] as const

const FORMATS = { avif: "image/avif", webp: "image/webp", jpeg: "image/jpeg" } as const
type Format = keyof typeof FORMATS

/** Loaded once, lazily, so a missing sharp does not stop the server booting. */
let sharpModule: any | null | undefined
async function loadSharp(): Promise<any | null> {
	if (sharpModule !== undefined) return sharpModule
	try {
		// The specifier is held in a variable on purpose: sharp is an OPTIONAL
		// dependency, so TypeScript must not try to resolve its types at build
		// time on a machine where it was never installed.
		const specifier: string = "sharp"
		const mod: any = await import(specifier)
		sharpModule = mod.default ?? mod
		sharpModule.cache({ memory: 64 })
		sharpModule.concurrency(1)
	} catch {
		console.warn(
			"[images] sharp is not installed — originals will be served as-is. " +
				"Install it for resizing: npm --prefix server install sharp",
		)
		sharpModule = null
	}
	return sharpModule
}

export const imagesAvailable = async () => (await loadSharp()) !== null

const uploadDir = () => path.resolve(env.UPLOAD_DIR ?? "./uploads")
const cacheDir = () => path.join(uploadDir(), ".cache")

/** Refuse anything that tries to climb out of the uploads folder. */
function safeSource(name: string): string | null {
	const clean = path.basename(name.replace(/\\/g, "/"))
	if (!clean || clean.startsWith(".")) return null
	if (!/\.(jpe?g|png|webp|avif|gif|tiff?)$/i.test(clean)) return null
	const full = path.join(uploadDir(), clean)
	if (!full.startsWith(uploadDir())) return null
	return full
}

function pickFormat(accept: string | undefined, requested?: string): Format {
	if (requested && requested in FORMATS) return requested as Format
	const a = accept ?? ""
	if (a.includes("image/avif")) return "avif"
	if (a.includes("image/webp")) return "webp"
	return "jpeg"
}

async function transcode(
	source: string,
	width: number,
	format: Format,
	quality: number,
): Promise<Buffer> {
	const sharp = await loadSharp()
	if (!sharp) return fs.readFile(source)

	let pipeline = sharp(source, { failOn: "none" }).rotate().resize({
		width,
		withoutEnlargement: true,
		fit: "inside",
	})

	if (format === "avif") pipeline = pipeline.avif({ quality, effort: 3 })
	else if (format === "webp") pipeline = pipeline.webp({ quality })
	else pipeline = pipeline.jpeg({ quality, mozjpeg: true, progressive: true })

	return pipeline.toBuffer()
}

/**
 * A 20px blurred placeholder as a data URI, stored alongside the media row so
 * the storefront can render it instantly and avoid layout shift.
 */
export async function makeLqip(source: string): Promise<string | null> {
	const sharp = await loadSharp()
	if (!sharp) return null
	try {
		const buf = await sharp(source, { failOn: "none" })
			.rotate()
			.resize({ width: 20 })
			.blur(1)
			.webp({ quality: 40 })
			.toBuffer()
		return `data:image/webp;base64,${buf.toString("base64")}`
	} catch {
		return null
	}
}

/** Intrinsic size, so the front end can set width/height and avoid reflow. */
export async function imageMeta(
	source: string,
): Promise<{ width?: number; height?: number; format?: string }> {
	const sharp = await loadSharp()
	if (!sharp) return {}
	try {
		const m = await sharp(source, { failOn: "none" }).metadata()
		return { width: m.width, height: m.height, format: m.format }
	} catch {
		return {}
	}
}

/**
 * Strip EXIF (which can carry the photographer's GPS location) and cap the
 * stored original at a sane size. Called by the upload route.
 */
export async function normaliseUpload(
	source: string,
	maxWidth = 2560,
): Promise<void> {
	const sharp = await loadSharp()
	if (!sharp) return
	try {
		const tmp = `${source}.tmp`
		await sharp(source, { failOn: "none" })
			.rotate()
			.resize({ width: maxWidth, withoutEnlargement: true })
			.toFile(tmp)
		await fs.rename(tmp, source)
	} catch (err: any) {
		console.warn("[images] could not normalise upload:", err?.message)
	}
}

export const imagesRouter = Router()

/**
 * GET /api/img/:file?w=768&q=75&f=webp
 *
 * Cached to disk on first request, then served straight from cache. Immutable
 * cache headers, because the URL changes whenever the file does.
 */
imagesRouter.get("/:file", async (req: Request, res: Response) => {
	const source = safeSource(String(req.params.file ?? ""))
	if (!source) return res.status(400).json({ error: "Bad image request." })

	try {
		await fs.access(source)
	} catch {
		return res.status(404).json({ error: "Image not found." })
	}

	// Only a fixed set of widths, so nobody can spam us into rendering 10,000
	// variants of the same photo.
	const requestedWidth = Number(req.query.w ?? 1024)
	// The final `?? 1024` can never be reached in practice (ALLOWED_WIDTHS is a
	// non-empty literal), but indexing an array is not provably safe to the
	// compiler, so we give it a concrete default rather than a non-null assertion.
	const width: number =
		ALLOWED_WIDTHS.find((w) => w >= requestedWidth) ??
		ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1] ??
		1024
	const quality = Math.min(
		95,
		Math.max(40, Number(req.query.q ?? 75) || 75),
	)
	const format = pickFormat(req.header("accept"), String(req.query.f ?? ""))

	const stat = await fs.stat(source)
	const key = crypto
		.createHash("sha1")
		.update(`${source}:${stat.mtimeMs}:${width}:${quality}:${format}`)
		.digest("hex")
	const etag = `"${key}"`

	if (req.header("if-none-match") === etag) return res.status(304).end()

	res.setHeader("Content-Type", FORMATS[format])
	res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
	res.setHeader("ETag", etag)
	res.setHeader("X-Content-Type-Options", "nosniff")

	const cached = path.join(cacheDir(), `${key}.${format}`)
	try {
		res.setHeader("X-Image-Cache", "hit")
		return res.send(await fs.readFile(cached))
	} catch {
		/* not cached yet */
	}

	try {
		const buf = await transcode(source, width, format, quality)
		res.setHeader("X-Image-Cache", "miss")
		res.send(buf)
		// Write the cache after responding so the shopper never waits for disk.
		void (async () => {
			try {
				await fs.mkdir(cacheDir(), { recursive: true })
				await fs.writeFile(cached, buf)
			} catch {
				/* read-only disk (Vercel) — fine, we just re-render each time */
			}
		})()
	} catch (err: any) {
		console.error("[images] transcode failed", err?.message)
		if (!res.headersSent) res.status(500).json({ error: "Could not process image." })
	}
})

/** Build a srcset for the storefront. */
export function srcset(file: string, formats: Format = "webp"): string {
	return ALLOWED_WIDTHS.map(
		(w) => `/api/img/${encodeURIComponent(file)}?w=${w}&f=${formats} ${w}w`,
	).join(", ")
}

/** Drop cached variants when a file is replaced or deleted. */
export async function clearImageCache(): Promise<number> {
	try {
		const files = await fs.readdir(cacheDir())
		await Promise.all(
			files.map((f) => fs.unlink(path.join(cacheDir(), f)).catch(() => {})),
		)
		return files.length
	} catch {
		return 0
	}
}
