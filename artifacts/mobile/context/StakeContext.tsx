import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBalance } from "@/context/BalanceContext";

export interface OwnedNFT {
  id: string;
  name: string;
  imageSource: { uri: string };
  price: number;
  level: number;
  apr: number;
  zoneTitle: string;
}

export interface StakedNFT {
  stakeId: string;
  nftId: string;
  name: string;
  imageSource: { uri: string };
  price: number;
  level: number;
  apr: number;
  zoneTitle: string;
  durationMinutes: number;
  startTime: number;
  endTime: number;
}

interface StakeContextType {
  ownedNFTs: OwnedNFT[];
  stakedNFTs: StakedNFT[];
  stakeDataLoaded: boolean;
  buyNFT: (nft: Omit<OwnedNFT, "id">) => boolean;
  sellNFT: (nftId: string) => void;
  stakeNFT: (nftId: string, durationMinutes: number) => void;
  redeemStake: (stakeId: string) => void;
}

const StakeContext = createContext<StakeContextType>({
  ownedNFTs: [],
  stakedNFTs: [],
  stakeDataLoaded: false,
  buyNFT: () => false,
  sellNFT: () => {},
  stakeNFT: () => {},
  redeemStake: () => {},
});

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

const stakeKey = (userId: string) => `apex_stake_v1_${userId}`;

export function StakeProvider({ children }: { children: React.ReactNode }) {
  const { spendBalance, creditBalance, earnStakeReward } = useBalance();
  const { user } = useAuth();
  const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFT[]>([]);
  const [stakedNFTs, setStakedNFTs] = useState<StakedNFT[]>([]);
  const [stakeDataLoaded, setStakeDataLoaded] = useState(false);
  // Track which user ID we've already loaded for so a transient null user
  // during auth initialisation never wipes the in-memory state.
  const loadedForUser = React.useRef<string | null>(null);

  // Load from AsyncStorage when user changes (login / logout / switch)
  useEffect(() => {
    if (!user?.id) {
      // Only clear if we had previously loaded a different user (real logout),
      // not during the brief moment before AuthContext has finished reading storage.
      if (loadedForUser.current !== null) {
        setOwnedNFTs([]);
        setStakedNFTs([]);
        loadedForUser.current = null;
      }
      setStakeDataLoaded(true);
      return;
    }
    // Already loaded for this user — nothing to do.
    if (loadedForUser.current === user.id) return;
    loadedForUser.current = user.id;
    setStakeDataLoaded(false);
    AsyncStorage.getItem(stakeKey(user.id)).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setOwnedNFTs(parsed.ownedNFTs ?? []);
          setStakedNFTs(parsed.stakedNFTs ?? []);
          console.log("[StakeContext] Restored:", parsed.ownedNFTs?.length, "owned,", parsed.stakedNFTs?.length, "staked");
        } catch {}
      }
      setStakeDataLoaded(true);
    });
  }, [user?.id]);

  const save = (owned: OwnedNFT[], staked: StakedNFT[]) => {
    if (!user?.id) return;
    AsyncStorage.setItem(stakeKey(user.id), JSON.stringify({ ownedNFTs: owned, stakedNFTs: staked }));
  };

  const buyNFT = (nft: Omit<OwnedNFT, "id">): boolean => {
    const ok = spendBalance(nft.price, `Buy NFT: ${nft.name}`);
    if (!ok) return false;
    const owned: OwnedNFT = { ...nft, id: genId() };
    const newOwned = [owned, ...ownedNFTs];
    setOwnedNFTs(newOwned);
    save(newOwned, stakedNFTs);
    return true;
  };

  const sellNFT = (nftId: string): void => {
    const nft = ownedNFTs.find((n) => n.id === nftId);
    if (!nft) return;
    const newOwned = ownedNFTs.filter((n) => n.id !== nftId);
    setOwnedNFTs(newOwned);
    save(newOwned, stakedNFTs);
    creditBalance(nft.price, `Sell NFT: ${nft.name}`);
  };

  const stakeNFT = (nftId: string, durationMinutes: number): void => {
    const nft = ownedNFTs.find((n) => n.id === nftId);
    if (!nft) return;
    const now = Date.now();
    const staked: StakedNFT = {
      stakeId: genId(),
      nftId: nft.id,
      name: nft.name,
      imageSource: nft.imageSource,
      price: nft.price,
      level: nft.level,
      apr: nft.apr,
      zoneTitle: nft.zoneTitle,
      durationMinutes,
      startTime: now,
      endTime: now + durationMinutes * 60 * 1000,
    };
    const newOwned = ownedNFTs.filter((n) => n.id !== nftId);
    const newStaked = [staked, ...stakedNFTs];
    setOwnedNFTs(newOwned);
    setStakedNFTs(newStaked);
    save(newOwned, newStaked);
  };

  const redeemStake = (stakeId: string): void => {
    const stake = stakedNFTs.find((s) => s.stakeId === stakeId);
    if (!stake) return;
    const income = parseFloat(
      ((stake.price * stake.apr) / 100 * (stake.durationMinutes / 1440)).toFixed(4)
    );
    earnStakeReward(income, `Stake Reward: ${stake.name}`);
    const returned: OwnedNFT = {
      id: genId(),
      name: stake.name,
      imageSource: stake.imageSource,
      price: stake.price,
      level: stake.level,
      apr: stake.apr,
      zoneTitle: stake.zoneTitle,
    };
    const newStaked = stakedNFTs.filter((s) => s.stakeId !== stakeId);
    const newOwned = [returned, ...ownedNFTs];
    setStakedNFTs(newStaked);
    setOwnedNFTs(newOwned);
    save(newOwned, newStaked);
  };

  return (
    <StakeContext.Provider value={{ ownedNFTs, stakedNFTs, stakeDataLoaded, buyNFT, sellNFT, stakeNFT, redeemStake }}>
      {children}
    </StakeContext.Provider>
  );
}

export function useStake() {
  return useContext(StakeContext);
}
