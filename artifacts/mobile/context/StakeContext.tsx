import React, { createContext, useContext, useState } from "react";
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
  buyNFT: (nft: Omit<OwnedNFT, "id">) => boolean;
  sellNFT: (nftId: string) => void;
  stakeNFT: (nftId: string, durationMinutes: number) => void;
  redeemStake: (stakeId: string) => void;
}

const StakeContext = createContext<StakeContextType>({
  ownedNFTs: [],
  stakedNFTs: [],
  buyNFT: () => false,
  sellNFT: () => {},
  stakeNFT: () => {},
  redeemStake: () => {},
});

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function StakeProvider({ children }: { children: React.ReactNode }) {
  const { spendBalance, creditBalance, earnReward } = useBalance();
  const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFT[]>([]);
  const [stakedNFTs, setStakedNFTs] = useState<StakedNFT[]>([]);

  const buyNFT = (nft: Omit<OwnedNFT, "id">): boolean => {
    const ok = spendBalance(nft.price, `Buy NFT: ${nft.name}`);
    if (!ok) return false;
    const owned: OwnedNFT = { ...nft, id: genId() };
    setOwnedNFTs((prev) => [owned, ...prev]);
    return true;
  };

  const sellNFT = (nftId: string): void => {
    const nft = ownedNFTs.find((n) => n.id === nftId);
    if (!nft) return;
    setOwnedNFTs((prev) => prev.filter((n) => n.id !== nftId));
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
    setOwnedNFTs((prev) => prev.filter((n) => n.id !== nftId));
    setStakedNFTs((prev) => [staked, ...prev]);
  };

  const redeemStake = (stakeId: string): void => {
    const stake = stakedNFTs.find((s) => s.stakeId === stakeId);
    if (!stake) return;
    const income = parseFloat(
      ((stake.price * stake.apr) / 100 * (stake.durationMinutes / 30)).toFixed(4)
    );
    earnReward(income, `Stake Reward: ${stake.name}`);
    setStakedNFTs((prev) => prev.filter((s) => s.stakeId !== stakeId));
    const returned: OwnedNFT = {
      id: genId(),
      name: stake.name,
      imageSource: stake.imageSource,
      price: stake.price,
      level: stake.level,
      apr: stake.apr,
      zoneTitle: stake.zoneTitle,
    };
    setOwnedNFTs((prev) => [returned, ...prev]);
  };

  return (
    <StakeContext.Provider value={{ ownedNFTs, stakedNFTs, buyNFT, sellNFT, stakeNFT, redeemStake }}>
      {children}
    </StakeContext.Provider>
  );
}

export function useStake() {
  return useContext(StakeContext);
}
