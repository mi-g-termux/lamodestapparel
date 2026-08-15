/**
 * Data table (§5) — sort, select, column visibility, density, sticky header,
 * pagination, URL state, CSV export, bulk bar and CARD COLLAPSE under 700px.
 */
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Columns3, Download, Rows3, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, EmptyState, IconButton, Pagination, TableSkeleton } from "./kit";
import { downloadCsv } from "@/lib/velora/csv";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Sort/CSV value. */
  value?: (row: T) => string | number | undefined;
  align?: "left" | "right" | undefined;
  hideBelow?: "sm" | "md" | "lg" | undefined;
  optional?: boolean | undefined;
  width?: string | undefined;
};

export type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  caption: string;
  loading?: boolean | undefined;
  emptyTitle?: string | undefined;
  emptyBody?: string | undefined;
  emptyAction?: ReactNode | undefined;
  onRowHref?: (row: T) => { to: string; params?: Record<string, string> };
  onRowClick?: (row: T) => unknown;
  search?: { value: string; onChange: (v: string) => void; placeholder: string };
  filters?: ReactNode | undefined;
  chips?: { label: string; onClear: () => void }[];
  bulkActions?: ((selected: T[], clear: () => void) => ReactNode) | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  onPage?: (p: number) => void | undefined;
  sort?: { key: string; dir: "asc" | "desc" };
  onSort?: (s: { key: string; dir: "asc" | "desc" }) => void;
  csvName?: string | undefined;
  toolbarExtra?: ReactNode | undefined;
  /** Card-collapse title for narrow screens. */
  cardTitle?: (row: T) => ReactNode | undefined;
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  loading,
  emptyTitle = "Nothing here yet",
  emptyBody,
  emptyAction,
  onRowClick,
  search,
  filters,
  chips,
  bulkActions,
  page = 1,
  pageSize = 20,
  onPage,
  sort,
  onSort,
  csvName,
  toolbarExtra,
  cardTitle,
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dense, setDense] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showColumns, setShowColumns] = useState(false);

  const visible = columns.filter((c) => !hidden.has(c.key));

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.value!(a);
      const bv = col.value!(b);
      if (typeof av === "number" && typeof bv === "number") return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = onPage ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;
  const selectedRows = sorted.filter((r) => selected.has(rowKey(r)));
  const allOnPage = current.length > 0 && current.every((r) => selected.has(rowKey(r)));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allOnPage) current.forEach((r) => next.delete(rowKey(r)));
    else current.forEach((r) => next.add(rowKey(r)));
    setSelected(next);
  };

  const exportCsv = () => {
    const data = (selectedRows.length ? selectedRows : sorted).map((row) => {
      const out: Record<string, unknown> = {};
      for (const c of columns) out[c.header] = c.value ? c.value(row) : "";
      return out;
    });
    downloadCsv(`${csvName ?? "export"}-${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  return (
    <div className="space-y-3">
      {(search || filters || csvName || toolbarExtra) && (
        <div className="flex flex-wrap items-center gap-2">
          {search ? (
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                className="field pl-9"
                value={search.value}
                placeholder={search.placeholder}
                aria-label={search.placeholder}
                onChange={(e) => search.onChange(e.target.value)}
              />
            </div>
          ) : null}
          {filters}
          <div className="ml-auto flex items-center gap-2">
            {toolbarExtra}
            <IconButton
              label={dense ? "Comfortable rows" : "Dense rows"}
              icon={<Rows3 className="size-4" />}
              onClick={() => setDense((d) => !d)}
            />
            <div className="relative">
              <IconButton
                label="Column visibility"
                icon={<Columns3 className="size-4" />}
                onClick={() => setShowColumns((s) => !s)}
                aria-expanded={showColumns}
              />
              {showColumns ? (
                <div className="card absolute right-0 z-30 mt-2 w-56 p-2 shadow-lg">
                  {columns.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px] hover:bg-cream">
                      <input
                        type="checkbox"
                        checked={!hidden.has(c.key)}
                        onChange={() => {
                          const next = new Set(hidden);
                          if (next.has(c.key)) next.delete(c.key);
                          else next.add(c.key);
                          setHidden(next);
                        }}
                      />
                      {c.header}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            {csvName ? (
              <Button size="sm" icon={<Download className="size-3.5" />} onClick={exportCsv}>
                CSV
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {chips && chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              onClick={chip.onClear}
              className="pill bg-cream text-ink hover:bg-sand"
              aria-label={`Clear filter ${chip.label}`}
            >
              {chip.label} ✕
            </button>
          ))}
        </div>
      ) : null}

      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : sorted.length === 0 ? (
          <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />
        ) : (
          <>
            {/* Table view — 700px and up */}
            <div className="hidden overflow-x-auto min-[700px]:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">{caption}</caption>
                <thead className="sticky top-0 z-10 bg-bg-subtle">
                  <tr className="border-b border-line">
                    {bulkActions ? (
                      <th scope="col" className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={allOnPage}
                          onChange={toggleAll}
                          aria-label="Select all rows on this page"
                        />
                      </th>
                    ) : null}
                    {visible.map((c) => {
                      const active = sort?.key === c.key;
                      return (
                        <th
                          key={c.key}
                          scope="col"
                          style={c.width ? { width: c.width } : undefined}
                          className={cn(
                            "px-4 py-2.5 text-[11px] font-medium tracking-[0.14em] text-muted uppercase",
                            c.align === "right" && "text-right",
                            c.hideBelow === "sm" && "hidden sm:table-cell",
                            c.hideBelow === "md" && "hidden md:table-cell",
                            c.hideBelow === "lg" && "hidden lg:table-cell",
                          )}
                        >
                          {c.value && onSort ? (
                            <button
                              className="inline-flex items-center gap-1 hover:text-ink"
                              onClick={() =>
                                onSort({ key: c.key, dir: active && sort?.dir === "asc" ? "desc" : "asc" })
                              }
                            >
                              {c.header}
                              {active ? (
                                sort?.dir === "asc" ? (
                                  <ArrowUp className="size-3" aria-hidden />
                                ) : (
                                  <ArrowDown className="size-3" aria-hidden />
                                )
                              ) : null}
                            </button>
                          ) : (
                            c.header
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {current.map((row) => {
                    const key = rowKey(row);
                    return (
                      <tr
                        key={key}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={cn(
                          "border-b border-line/70 last:border-0 even:bg-bg-subtle/40",
                          onRowClick && "cursor-pointer hover:bg-cream/60",
                        )}
                      >
                        {bulkActions ? (
                          <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(key)}
                              aria-label={`Select row ${key}`}
                              onChange={() => {
                                const next = new Set(selected);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                setSelected(next);
                              }}
                            />
                          </td>
                        ) : null}
                        {visible.map((c) => (
                          <td
                            key={c.key}
                            className={cn(
                              "px-4 align-middle text-[13px]",
                              dense ? "py-2" : "py-3",
                              "min-h-[44px]",
                              c.align === "right" && "tnum text-right",
                              c.hideBelow === "sm" && "hidden sm:table-cell",
                              c.hideBelow === "md" && "hidden md:table-cell",
                              c.hideBelow === "lg" && "hidden lg:table-cell",
                            )}
                          >
                            {c.render(row)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Card view — below 700px, no horizontal scroll */}
            <ul className="divide-y divide-line min-[700px]:hidden">
              {current.map((row) => {
                const key = rowKey(row);
                return (
                  <li key={key} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {cardTitle ? (
                          <div className="text-[14px] font-medium">{cardTitle(row)}</div>
                        ) : (
                          <div className="text-[14px] font-medium">{visible[0]?.render(row)}</div>
                        )}
                      </div>
                      {bulkActions ? (
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.has(key)}
                          aria-label={`Select ${key}`}
                          onChange={() => {
                            const next = new Set(selected);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            setSelected(next);
                          }}
                        />
                      ) : null}
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-2">
                      {visible.slice(cardTitle ? 0 : 1).map((c) => (
                        <div key={c.key} className="min-w-0">
                          <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{c.header}</dt>
                          <dd className="truncate text-[13px]">{c.render(row)}</dd>
                        </div>
                      ))}
                    </dl>
                    {onRowClick ? (
                      <Button size="sm" className="mt-3 w-full" onClick={() => onRowClick(row)}>
                        Open
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {onPage && sorted.length > 0 ? (
        <Pagination page={page} pageCount={pageCount} total={sorted.length} onPage={onPage} />
      ) : null}

      {bulkActions && selectedRows.length > 0 ? (
        <div className="sticky bottom-3 z-30 flex flex-wrap items-center gap-2 rounded-[14px] border border-line bg-ink px-4 py-3 text-surface shadow-lg">
          <p className="text-[13px]">{selectedRows.length} selected</p>
          <div className="ml-auto flex flex-wrap gap-2">
            {bulkActions(selectedRows, () => setSelected(new Set()))}
            <Button size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
