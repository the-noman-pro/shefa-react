import { useState } from 'react';

interface UsePaginationReturn {
  page: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
}

export function usePagination(initialPage = 1): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);
  return {
    page,
    setPage,
    nextPage: () => setPage((p) => p + 1),
    prevPage: () => setPage((p) => Math.max(1, p - 1)),
    resetPage: () => setPage(1),
  };
}