import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface WatchlistItem {
  id: string;
  title: string;
  price: number;
  image: string;
  category: string;
  timeLeft?: string;
  bids?: number;
  isAuction: boolean;
}

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (id: string) => void;
  isWatched: (id: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType>({
  watchlist: [],
  addToWatchlist: () => {},
  removeFromWatchlist: () => {},
  isWatched: () => false,
});

const STORAGE_KEY = "treasurefun_watchlist";

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setWatchlist(JSON.parse(data));
        } catch {}
      }
    });
  }, []);

  const save = (items: WatchlistItem[]) => {
    setWatchlist(items);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const addToWatchlist = (item: WatchlistItem) => {
    save([...watchlist.filter((w) => w.id !== item.id), item]);
  };

  const removeFromWatchlist = (id: string) => {
    save(watchlist.filter((w) => w.id !== id));
  };

  const isWatched = (id: string) => watchlist.some((w) => w.id === id);

  return (
    <WatchlistContext.Provider
      value={{ watchlist, addToWatchlist, removeFromWatchlist, isWatched }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
