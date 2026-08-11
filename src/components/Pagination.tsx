import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  /** Build href for a 1-based page number */
  hrefForPage: (page: number) => string;
  label?: string;
};

export function Pagination({ page, totalPages, hrefForPage, label }: Props) {
  if (totalPages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  // Window of page numbers around current
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="pagination">
      {label ? <span className="pagination-label muted">{label}</span> : null}
      <div className="pagination-nav">
        {prev ? (
          <Link href={hrefForPage(prev)} className="btn btn-secondary pagination-btn" scroll={false}>
            ←
          </Link>
        ) : (
          <span className="btn btn-secondary pagination-btn" aria-disabled="true">
            ←
          </span>
        )}
        {start > 1 ? (
          <>
            <Link href={hrefForPage(1)} className="btn btn-secondary pagination-btn" scroll={false}>
              1
            </Link>
            {start > 2 ? <span className="muted pagination-ellipsis">…</span> : null}
          </>
        ) : null}
        {pages.map((p) => (
          <Link
            key={p}
            href={hrefForPage(p)}
            scroll={false}
            className={`btn pagination-btn ${p === page ? "" : "btn-secondary"}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Link>
        ))}
        {end < totalPages ? (
          <>
            {end < totalPages - 1 ? (
              <span className="muted pagination-ellipsis">…</span>
            ) : null}
            <Link
              href={hrefForPage(totalPages)}
              className="btn btn-secondary pagination-btn"
              scroll={false}
            >
              {totalPages}
            </Link>
          </>
        ) : null}
        {next ? (
          <Link href={hrefForPage(next)} className="btn btn-secondary pagination-btn" scroll={false}>
            →
          </Link>
        ) : (
          <span className="btn btn-secondary pagination-btn" aria-disabled="true">
            →
          </span>
        )}
      </div>
    </div>
  );
}
