import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  ColourField,
  Grid,
  Labelled,
  PageHeader,
  Panel,
  SaveBar,
  SelectField,
  TextField,
  useDraft,
} from "@/components/velora/kit";
import { mutateContent, useAdminState, useCan } from "@/lib/velora/store";
import type { Content } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/content/theme")({
  head: () => ({
    meta: [
      { title: "Theme tokens — Velora Admin" },
      { name: "description", content: "Colours, type scale, spacing and motion tokens that style the whole storefront." },
      { property: "og:title", content: "Theme tokens — Velora Admin" },
      { property: "og:description", content: "Colours, type scale, spacing and motion tokens that style the whole storefront." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ThemeScreen,
});

const fontOptions = [
  "Cormorant Garamond",
  "Jost",
  "Playfair Display",
  "Inter",
  "Fraunces",
  "Manrope",
  "Source Serif Pro",
  "Work Sans",
].map((f) => ({ value: f, label: f }));

const shadowOptions = [
  { value: "0 18px 40px -28px rgba(28,26,24,0.35)", label: "Soft (default)" },
  { value: "0 8px 20px -14px rgba(28,26,24,0.4)", label: "Tight" },
  { value: "0 28px 60px -30px rgba(28,26,24,0.45)", label: "Deep" },
  { value: "none", label: "None" },
];

/** Relative luminance vs white — flags colours that will fail contrast on a white card. */
function contrastAgainstWhite(hex: string): number {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return 21;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
  return (1.05) / (lum + 0.05);
}

function labelise(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function ThemeScreen() {
  const state = useAdminState();
  const can = useCan();
  const canWrite = can("theme.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.content.theme);

  const save = () => {
    mutateContent(
      (d) => {
        d.content.theme = draft;
      },
      { action: "content.theme.update", entity: "Theme tokens", before: state.content.theme, after: draft },
    );
    commit();
    toast.success("Theme tokens saved");
  };

  const setField = <K extends keyof Content["theme"]>(key: K, value: Content["theme"][K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const setColour = (key: string, value: string) => {
    setDraft((d) => ({ ...d, colours: { ...d.colours, [key]: value } }));
  };

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/brand" }, { label: "Theme" }]}>
      <PageHeader
        eyebrow="Content studio"
        title="Theme tokens"
        sub="Colours, type and rhythm applied across every storefront page."
      />

      <Grid cols={2}>
        <Panel title="Palette" description="Contrast is checked against a white card background.">
          <div className="space-y-3">
            {Object.keys(draft.colours).map((key) => {
              const value = draft.colours[key] ?? "#000000";
              const ratio = contrastAgainstWhite(value);
              const weak = ratio < 3;
              return (
                <div key={key}>
                  <ColourField label={labelise(key)} value={value} onChange={(v) => setColour(key, v)} />
                  {weak ? (
                    <p className="mt-1 text-[11px] text-warn">
                      Low contrast on white ({ratio.toFixed(1)}:1) — hard to read as text.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Typography & card preview" description="Reacts live to the draft below.">
            <div
              className="space-y-4 rounded-[14px] border p-6"
              style={{
                borderRadius: draft.radius,
                boxShadow: draft.shadow === "none" ? undefined : draft.shadow,
                borderColor: draft.colours["border"] ?? "#e7dfd3",
                background: draft.colours["card"] ?? "#ffffff",
              }}
            >
              <p
                className="uppercase"
                style={{
                  fontFamily: draft.uiFont,
                  fontSize: draft.eyebrowSize,
                  letterSpacing: draft.eyebrowTracking + "em",
                  color: draft.colours["gold"] ?? draft.colours["muted"],
                }}
              >
                Eyebrow text
              </p>
              <p
                style={{
                  fontFamily: draft.displayFont,
                  fontSize: draft.sectionTitleSize,
                  letterSpacing: draft.sectionTitleTracking + "em",
                  color: draft.colours["ink"] ?? "#1c1a18",
                }}
              >
                A considered section heading
              </p>
              <p
                style={{
                  fontFamily: draft.uiFont,
                  fontSize: draft.baseFontSize,
                  lineHeight: draft.bodyLineHeight,
                  color: draft.colours["muted"] ?? "#6b6459",
                }}
              >
                Body copy set in the UI font shows how paragraphs will read across the storefront, from product
                descriptions to footer notes.
              </p>
              <div
                className="overflow-hidden border"
                style={{ borderRadius: draft.radius, borderColor: draft.colours["border"] ?? "#e7dfd3", maxWidth: 220 }}
              >
                <div
                  style={{
                    aspectRatio: draft.productAspect,
                    background: draft.colours["sand"] ?? "#efe6d8",
                    transition: `transform ${draft.hoverMs}ms ease`,
                  }}
                  className="hover:scale-[var(--zoom)]"
                />
                <div className="p-3" style={{ fontFamily: draft.uiFont }}>
                  <p style={{ fontSize: draft.baseFontSize }}>Sample product card</p>
                  <p className="text-[12px]" style={{ color: draft.colours["muted"] }}>
                    Aspect {draft.productAspect} · zoom ×{draft.imageZoom}
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </Grid>

      <Grid cols={2}>
        <Panel title="Fonts & scale">
          <div className="space-y-4">
            <SelectField
              label="Display font"
              value={draft.displayFont}
              onChange={(e) => setField("displayFont", e.target.value)}
              options={fontOptions}
            />
            <SelectField
              label="UI font"
              value={draft.uiFont}
              onChange={(e) => setField("uiFont", e.target.value)}
              options={fontOptions}
            />
            <Labelled label="Base font size (px)">
              {({ id }) => (
                <input id={id} type="number" className="field tnum" value={draft.baseFontSize} onChange={(e) => setField("baseFontSize", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Heading scale ratio">
              {({ id }) => (
                <input id={id} type="number" step={0.01} className="field tnum" value={draft.headingScale} onChange={(e) => setField("headingScale", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Section title size (px)">
              {({ id }) => (
                <input id={id} type="number" className="field tnum" value={draft.sectionTitleSize} onChange={(e) => setField("sectionTitleSize", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Section title tracking (em)">
              {({ id }) => (
                <input id={id} type="number" step={0.01} className="field tnum" value={draft.sectionTitleTracking} onChange={(e) => setField("sectionTitleTracking", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Eyebrow size (px)">
              {({ id }) => (
                <input id={id} type="number" className="field tnum" value={draft.eyebrowSize} onChange={(e) => setField("eyebrowSize", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Eyebrow tracking (em)">
              {({ id }) => (
                <input id={id} type="number" step={0.01} className="field tnum" value={draft.eyebrowTracking} onChange={(e) => setField("eyebrowTracking", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Body line height">
              {({ id }) => (
                <input id={id} type="number" step={0.05} className="field tnum" value={draft.bodyLineHeight} onChange={(e) => setField("bodyLineHeight", Number(e.target.value))} />
              )}
            </Labelled>
          </div>
        </Panel>

        <Panel title="Layout, shape & motion">
          <div className="space-y-4">
            <Labelled label="Corner radius (px)">
              {({ id }) => (
                <input id={id} type="number" className="field tnum" value={draft.radius} onChange={(e) => setField("radius", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Container max width (px)">
              {({ id }) => (
                <input id={id} type="number" className="field tnum" value={draft.containerMax} onChange={(e) => setField("containerMax", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Gutter (px)">
              {({ id }) => (
                <input id={id} type="number" className="field tnum" value={draft.gutter} onChange={(e) => setField("gutter", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Section rhythm (px)">
              {({ id }) => (
                <input id={id} type="number" className="field tnum" value={draft.sectionRhythm} onChange={(e) => setField("sectionRhythm", Number(e.target.value))} />
              )}
            </Labelled>
            <SelectField label="Shadow" value={draft.shadow} onChange={(e) => setField("shadow", e.target.value)} options={shadowOptions} />
            <TextField label="Product image aspect ratio" helper="CSS aspect-ratio, e.g. 3 / 4" value={draft.productAspect} onChange={(e) => setField("productAspect", e.target.value)} />
            <TextField label="Hero image aspect ratio" helper="CSS aspect-ratio, e.g. 16 / 9" value={draft.heroAspect} onChange={(e) => setField("heroAspect", e.target.value)} />
            <Labelled label="Hover transition (ms)">
              {({ id }) => (
                <input id={id} type="number" className="field tnum" value={draft.hoverMs} onChange={(e) => setField("hoverMs", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Image hover zoom (×)">
              {({ id }) => (
                <input id={id} type="number" step={0.01} className="field tnum" value={draft.imageZoom} onChange={(e) => setField("imageZoom", Number(e.target.value))} />
              )}
            </Labelled>
            <Labelled label="Slider interval (ms)">
              {({ id }) => (
                <input id={id} type="number" step={100} className="field tnum" value={draft.sliderInterval} onChange={(e) => setField("sliderInterval", Number(e.target.value))} />
              )}
            </Labelled>
          </div>
        </Panel>
      </Grid>

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} note="Unsaved theme changes." /> : null}
    </AdminShell>
  );
}
