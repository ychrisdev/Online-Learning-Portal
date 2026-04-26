import React from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}) => {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Build page numbers with ellipsis: always show first, last, current ±1
  const getPages = (): (number | "…")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="pg-wrap">
      <span className="pg-info">
        {start}–{end} / {total}
      </span>
      <div className="pg-controls">
        <button
          className="pg-btn pg-btn--nav"
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
        >
          ‹
        </button>

        {getPages().map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="pg-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`pg-btn${page === p ? " pg-btn--active" : ""}`}
              onClick={() => onPage(p as number)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="pg-btn pg-btn--nav"
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default Pagination;