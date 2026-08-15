import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";

export const Route = createFileRoute("/size-guide")({
  head: () => pageMeta("Size Guide", "Garment measurements and fit notes for every Velora size."),
  component: SizeGuidePage,
});

const rows = [
  { size: "XS", chest: "82", waist: "64", hip: "90", length: "96" },
  { size: "S", chest: "86", waist: "68", hip: "94", length: "97" },
  { size: "M", chest: "90", waist: "72", hip: "98", length: "98" },
  { size: "L", chest: "96", waist: "78", hip: "104", length: "99" },
  { size: "XL", chest: "102", waist: "84", hip: "110", length: "100" },
  { size: "XXL", chest: "108", waist: "90", hip: "116", length: "101" },
];

function SizeGuidePage() {
  return (
    <SiteShell>
      <PageHeading
        eyebrow="Fit"
        title="Size guide"
        body="All measurements are in centimetres and taken flat across the garment."
        crumbs={[{ label: "Size Guide" }]}
      />
      <div className="mx-auto max-w-[860px] px-6 py-10 md:py-14">
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead className="bg-cream">
              <tr className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                <th className="px-5 py-3 font-normal">Size</th>
                <th className="px-5 py-3 font-normal">Chest</th>
                <th className="px-5 py-3 font-normal">Waist</th>
                <th className="px-5 py-3 font-normal">Hip</th>
                <th className="px-5 py-3 font-normal">Length</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.size} className="border-t border-border text-[13px]">
                  <td className="px-5 py-3.5">{r.size}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{r.chest}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{r.waist}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{r.hip}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{r.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
          Between two sizes? Choose the smaller for a defined fit and the larger for a relaxed drape.
          Linen relaxes slightly with wear; cotton co-ords hold their shape after washing.
        </p>
      </div>
    </SiteShell>
  );
}
