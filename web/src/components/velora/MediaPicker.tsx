/**
 * Image picker / uploader (§5 Forms): drag-drop, reorder, set-primary,
 * required alt text, focal point. Uploads become media-library assets.
 */
import { useRef, useState } from "react";
import { GripVertical, ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { mutate, useAdminState } from "@/lib/velora/store";
import type { MediaAsset } from "@/lib/velora/types";
import { Button, IconButton, Labelled, Sheet, TextField } from "./kit";
import { cn } from "@/lib/utils";

export function useMedia() {
  return useAdminState().media;
}

export function addUpload(file: File, alt: string, folder = "Uploads"): Promise<MediaAsset> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const asset: MediaAsset = {
        id: `m-up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: String(reader.result),
        filename: file.name,
        folder,
        alt,
        width: 1200,
        height: 1600,
        bytes: file.size,
        mime: file.type,
        focal: { x: 0.5, y: 0.5 },
        createdAt: new Date().toISOString(),
        derivatives: [320, 480, 768, 1024, 1440, 1920],
      };
      mutate(
        (draft) => {
          draft.media = [asset, ...draft.media];
        },
        { action: "media.create", entity: file.name, after: { filename: file.name, bytes: file.size } },
      );
      resolve(asset);
    };
    reader.readAsDataURL(file);
  });
}

/** Validate by magic bytes before accepting an upload (§4.8). */
export async function validateImage(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = [...head].map((b) => b.toString(16).padStart(2, "0")).join("");
  const isJpeg = hex.startsWith("ffd8ff");
  const isPng = hex.startsWith("89504e47");
  const isWebp = hex.slice(0, 8) === "52494646" && hex.slice(16, 24) === "57454250";
  const isGif = hex.startsWith("474946");
  const isSvg = file.type === "image/svg+xml";
  return isJpeg || isPng || isWebp || isGif || isSvg;
}

export function MediaThumb({ id, className }: { id: string | null | undefined; className?: string }) {
  const media = useMedia();
  const asset = media.find((m) => m.id === id);
  if (!asset) {
    return (
      <div className={cn("grid place-items-center rounded-[8px] bg-bg-subtle text-muted", className)} aria-hidden>
        <ImagePlus className="size-4" />
      </div>
    );
  }
  return (
    <img
      src={asset.url}
      alt={asset.alt}
      loading="lazy"
      className={cn("rounded-[8px] object-cover", className)}
    />
  );
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  multiple,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (ids: string[]) => void;
  multiple?: boolean;
}) {
  const media = useMedia();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = media.filter(
    (m) =>
      m.filename.toLowerCase().includes(query.toLowerCase()) ||
      m.alt.toLowerCase().includes(query.toLowerCase()) ||
      m.folder.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Media library"
      description="Pick an existing asset or upload a new one. Alt text is required."
      wide
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={chosen.length === 0}
            onClick={() => {
              onSelect(chosen);
              setChosen([]);
              onOpenChange(false);
            }}
          >
            Use {chosen.length || ""} asset{chosen.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="field sm:max-w-xs"
          placeholder="Search filename, alt text or folder"
          aria-label="Search media"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          className="ml-auto"
          icon={<Upload className="size-3.5" />}
          onClick={() => fileRef.current?.click()}
        >
          Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            for (const file of files) {
              if (!(await validateImage(file))) {
                toast.error(`${file.name} is not a valid image`);
                continue;
              }
              const asset = await addUpload(file, file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]/g, " "));
              setChosen((c) => (multiple ? [...c, asset.id] : [asset.id]));
            }
            toast.success("Uploaded — remember to set alt text");
          }}
        />
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {filtered.map((m) => {
          const active = chosen.includes(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setChosen(multiple ? (active ? chosen.filter((c) => c !== m.id) : [...chosen, m.id]) : [m.id])}
                className={cn(
                  "block w-full overflow-hidden rounded-[10px] border text-left transition-colors",
                  active ? "border-gold" : "border-line hover:border-clay",
                )}
              >
                <img src={m.url} alt={m.alt} loading="lazy" className="aspect-square w-full object-cover" />
                <span className="block truncate px-2 py-1.5 text-[11px]">{m.filename}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

export function SingleImageField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  helper?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Labelled label={label} helper={helper}>
      {() => (
        <div className="flex items-center gap-3">
          <MediaThumb id={value} className="size-16 shrink-0" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setOpen(true)}>
              {value ? "Replace" : "Choose"}
            </Button>
            {value ? (
              <Button size="sm" variant="quiet" onClick={() => onChange(null)}>
                Remove
              </Button>
            ) : null}
          </div>
          <MediaPickerDialog open={open} onOpenChange={setOpen} onSelect={(ids) => onChange(ids[0] ?? null)} />
        </div>
      )}
    </Labelled>
  );
}

export function GalleryField({
  label,
  ids,
  onChange,
  primaryId,
  onPrimary,
}: {
  label: string;
  ids: string[];
  onChange: (ids: string[]) => void;
  primaryId?: string | null;
  onPrimary?: (id: string) => void;
}) {
  const media = useMedia();
  const [open, setOpen] = useState(false);
  const [altFor, setAltFor] = useState<string | null>(null);
  const altAsset = media.find((m) => m.id === altFor);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...ids];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <Button size="sm" icon={<ImagePlus className="size-3.5" />} onClick={() => setOpen(true)}>
          Add images
        </Button>
      </div>
      {ids.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">
          No images yet. Add at least one — the storefront needs a primary image.
        </p>
      ) : (
        <ul className="space-y-2">
          {ids.map((id, i) => {
            const asset = media.find((m) => m.id === id);
            return (
              <li key={id} className="flex items-center gap-3 rounded-[10px] border border-line p-2">
                <GripVertical className="size-4 shrink-0 text-muted" aria-hidden />
                <MediaThumb id={id} className="size-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]">{asset?.filename ?? id}</p>
                  <p className={cn("truncate text-[12px]", asset?.alt ? "text-muted" : "text-bad")}>
                    {asset?.alt || "Alt text required"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <IconButton label="Move up" icon={<span aria-hidden>↑</span>} onClick={() => move(i, -1)} />
                  <IconButton label="Move down" icon={<span aria-hidden>↓</span>} onClick={() => move(i, 1)} />
                  {onPrimary ? (
                    <IconButton
                      label="Set as primary image"
                      icon={<Star className={cn("size-4", primaryId === id && "text-gold")} />}
                      onClick={() => onPrimary(id)}
                    />
                  ) : null}
                  <IconButton label="Edit alt text" icon={<span aria-hidden>Aa</span>} onClick={() => setAltFor(id)} />
                  <IconButton
                    label="Remove image"
                    icon={<Trash2 className="size-4" />}
                    onClick={() => onChange(ids.filter((x) => x !== id))}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        multiple
        onSelect={(picked) => onChange([...ids, ...picked.filter((p) => !ids.includes(p))])}
      />

      <Sheet
        open={Boolean(altFor)}
        onOpenChange={(v) => !v && setAltFor(null)}
        title="Alt text and focal point"
        description="Alt text is required for accessibility and SEO."
        footer={<Button variant="primary" onClick={() => setAltFor(null)}>Done</Button>}
      >
        {altAsset ? (
          <div className="space-y-4">
            <img src={altAsset.url} alt={altAsset.alt} className="max-h-56 w-full rounded-[10px] object-cover" />
            <TextField
              label="Alt text"
              required
              value={altAsset.alt}
              onChange={(e) =>
                mutate(
                  (draft) => {
                    const m = draft.media.find((x) => x.id === altAsset.id)!;
                    m.alt = e.target.value;
                  },
                  { action: "media.update", entity: altAsset.filename },
                )
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Labelled label="Focal X">
                {({ id }) => (
                  <input
                    id={id}
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={altAsset.focal.x}
                    onChange={(e) =>
                      mutate((draft) => {
                        draft.media.find((x) => x.id === altAsset.id)!.focal.x = Number(e.target.value);
                      })
                    }
                  />
                )}
              </Labelled>
              <Labelled label="Focal Y">
                {({ id }) => (
                  <input
                    id={id}
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={altAsset.focal.y}
                    onChange={(e) =>
                      mutate((draft) => {
                        draft.media.find((x) => x.id === altAsset.id)!.focal.y = Number(e.target.value);
                      })
                    }
                  />
                )}
              </Labelled>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
