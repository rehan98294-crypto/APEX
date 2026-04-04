import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/authApi";

export interface NFTItem {
  id: string;
  title: string;
  image_url: string;
  level: number;
  min_price: number;
  max_price: number;
  created_at: string;
}

export interface PaginatedResponse {
  data: NFTItem[];
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

export interface UsePaginatedNFTs {
  items: NFTItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  page: number;
  totalItems: number;
  loadMore: () => void;
  refresh: () => void;
}

const LIMIT = 6;

export function usePaginatedNFTs(category?: string): UsePaginatedNFTs {
  const [items, setItems] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const isMounted = useRef(true);
  const currentCategory = useRef(category);

  async function fetchPage(pageNum: number, replace: boolean) {
    const params = new URLSearchParams({
      page: String(pageNum),
      limit: String(LIMIT),
    });
    if (category && category !== "All") params.set("category", category);

    try {
      const res = await fetch(`${API_BASE}/nfts?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PaginatedResponse = await res.json();
      if (!isMounted.current) return;
      setTotalItems(json.totalItems);
      setHasMore(json.hasMore);
      setPage(json.page);
      if (replace) {
        setItems(json.data);
      } else {
        setItems((prev) => [...prev, ...json.data]);
      }
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : "Failed to load NFTs");
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    setItems([]);
    setPage(1);
    setHasMore(false);
    await fetchPage(1, true);
    setLoading(false);
  }, [category]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(page + 1, false);
    setLoadingMore(false);
  }, [page, loadingMore, hasMore, category]);

  // Re-fetch when category changes
  useEffect(() => {
    isMounted.current = true;
    if (currentCategory.current !== category) {
      currentCategory.current = category;
    }
    refresh();
    return () => { isMounted.current = false; };
  }, [category]);

  return { items, loading, loadingMore, hasMore, error, page, totalItems, loadMore, refresh };
}
