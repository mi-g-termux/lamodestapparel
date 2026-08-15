import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "@/components/icons";

export function SectionHead({
  title,
  viewAll,
  viewAllHref,
}: {
  title: string;
  viewAll: string;
  viewAllHref: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="section-title">{title}</h2>
      <Link
        to={viewAllHref}
        className="link-quiet inline-flex items-center gap-1.5 whitespace-nowrap"
      >
        {viewAll}
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </div>
  );
}
