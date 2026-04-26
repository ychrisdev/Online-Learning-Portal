import { useState, useEffect } from "react";

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset về trang 1 khi danh sách thay đổi (filter, search,…)
  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  return { page, totalPages, pageItems, goTo, total: items.length };
}