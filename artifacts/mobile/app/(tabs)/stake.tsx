import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import { NFTSkeletonGrid } from "@/components/NFTSkeletonCard";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { OwnedNFT, StakedNFT, useStake } from "@/context/StakeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useStakeApi } from "@/hooks/useStakeApi";
import { fetchAllNFTs } from "@/lib/supabase";

const { width, height } = Dimensions.get("window");
const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

// ─── Zone Configuration ──────────────────────────────────────────────────────
interface ZoneConfig {
  id: number;
  title: string;
  levelRange: string;
  image: any;
  status: string;
  priceRange: string;
  priceMin: number;
  priceMax: number;
  income: string;
  apr: number;
  type: "free" | "exclusive";
  stakableDays?: string;
  handlingFee?: string;
  active: boolean;
  minSubLevel: number; // minimum subscription level required (1 = free, 2 = Basic+, …)
}

const FREE_ZONES: ZoneConfig[] = [
  { id: 1, title: "Free Zone 1", levelRange: "LV1", image: require("@/assets/stake/fz1.png"), status: "Open", priceRange: "50 ~ 2,000", priceMin: 50, priceMax: 2000, income: "1%", apr: 1, type: "free", stakableDays: "3~30", active: true, minSubLevel: 1 },
  { id: 2, title: "Free Zone 2", levelRange: "LV2", image: require("@/assets/stake/fz2.png"), status: "Open", priceRange: "50 ~ 3,000", priceMin: 50, priceMax: 3000, income: "1.1%", apr: 1.1, type: "free", stakableDays: "3~30", active: true, minSubLevel: 2 },
  { id: 3, title: "Free Zone 3", levelRange: "LV3", image: require("@/assets/stake/fz3.png"), status: "Open", priceRange: "50 ~ 4,000", priceMin: 50, priceMax: 4000, income: "1.2%", apr: 1.2, type: "free", stakableDays: "3~30", active: true, minSubLevel: 3 },
  { id: 4, title: "Free Zone 4", levelRange: "LV4", image: require("@/assets/stake/fz4.png"), status: "Open", priceRange: "50 ~ 5,000", priceMin: 50, priceMax: 5000, income: "1.3%", apr: 1.3, type: "free", stakableDays: "3~30", active: true, minSubLevel: 4 },
  { id: 5, title: "Free Zone 5", levelRange: "LV5", image: require("@/assets/stake/fz5.png"), status: "Open", priceRange: "50 ~ 6,000", priceMin: 50, priceMax: 6000, income: "1.4%", apr: 1.4, type: "free", stakableDays: "3~30", active: true, minSubLevel: 5 },
  { id: 6, title: "Free Zone 6", levelRange: "LV6", image: require("@/assets/stake/fz6.png"), status: "Open", priceRange: "50 ~ 8,000", priceMin: 50, priceMax: 8000, income: "1.5%", apr: 1.5, type: "free", stakableDays: "3~30", active: true, minSubLevel: 6 },
];

const EXCLUSIVE_ZONES: ZoneConfig[] = [
  { id: 1, title: "Exclusive Stake 1", levelRange: "LV2-LV3", image: require("@/assets/stake/ex1.png"), status: "Open", priceRange: "499 ~ 1,500", priceMin: 499, priceMax: 1500, income: "1.5%", apr: 1.5, type: "exclusive", handlingFee: "1%", active: true, minSubLevel: 2 },
  { id: 2, title: "Exclusive Stake 2", levelRange: "LV2-LV3", image: require("@/assets/stake/ex2.png"), status: "Open", priceRange: "499 ~ 2,000", priceMin: 499, priceMax: 2000, income: "1.8%", apr: 1.8, type: "exclusive", handlingFee: "1%", active: true, minSubLevel: 2 },
  { id: 3, title: "Exclusive Stake 3", levelRange: "LV3-LV4", image: require("@/assets/stake/ex3.png"), status: "Open", priceRange: "999 ~ 3,000", priceMin: 999, priceMax: 3000, income: "2.0%", apr: 2.0, type: "exclusive", handlingFee: "1%", active: true, minSubLevel: 3 },
  { id: 4, title: "Exclusive Stake 4", levelRange: "LV3-LV4", image: require("@/assets/stake/ex4.png"), status: "Open", priceRange: "999 ~ 4,000", priceMin: 999, priceMax: 4000, income: "2.5%", apr: 2.5, type: "exclusive", handlingFee: "1%", active: true, minSubLevel: 3 },
  { id: 5, title: "Exclusive Stake 5", levelRange: "LV4-LV5", image: require("@/assets/stake/ex5.png"), status: "Open", priceRange: "1,499 ~ 5,000", priceMin: 1499, priceMax: 5000, income: "3.0%", apr: 3.0, type: "exclusive", handlingFee: "1%", active: true, minSubLevel: 4 },
  { id: 6, title: "Exclusive Stake 6", levelRange: "LV5-LV6", image: require("@/assets/stake/ex6.png"), status: "Open", priceRange: "1,999 ~ 6,000", priceMin: 1999, priceMax: 6000, income: "3.5%", apr: 3.5, type: "exclusive", handlingFee: "1%", active: true, minSubLevel: 5 },
];

const CATEGORY_TABS = ["Stake", "Polygon NFT", "Art", "Collection", "Game"];
const TIME_OPTIONS: (10 | 20 | 30)[] = [10, 20, 30];

interface NFTRecord { name: string; image_url: string; level: number }

// Deterministic price within zone range
function nftZonePrice(name: string, zone: ZoneConfig): number {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const range = zone.priceMax - zone.priceMin;
  return Math.floor(zone.priceMin + (hash % Math.max(range, 1)));
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Done";
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function calcIncome(stake: StakedNFT, now: number): number {
  const elapsed = Math.min(now - stake.startTime, stake.endTime - stake.startTime);
  const total = stake.endTime - stake.startTime;
  const fullIncome = (stake.price * stake.apr) / 100 * (stake.durationMinutes / 30);
  return parseFloat((fullIncome * (elapsed / total)).toFixed(4));
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function StakeScreen() {
  const { ownedNFTs, stakedNFTs, buyNFT, sellNFT, stakeNFT, redeemStake } = useStake();
  const { user } = useAuth();
  const { userLevel, stakeBoost, activePlan } = useSubscription();
  const stakeApi = useStakeApi(user?.id);
  const router = useRouter();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  // Navigation state
  const [categoryTab, setCategoryTab] = useState(0);
  const [mainTab, setMainTab] = useState<"stake" | "collection" | "mystake">("stake");
  const [zoneTab, setZoneTab] = useState<"free" | "exclusive">("free");

  // Zone NFT grid state
  const [activeZone, setActiveZone] = useState<ZoneConfig | null>(null);
  const [zoneNFTs, setZoneNFTs] = useState<NFTRecord[]>([]);
  const [nftsLoading, setNftsLoading] = useState(false);

  // Buy flow
  const [buySuccessNFT, setBuySuccessNFT] = useState<OwnedNFT | null>(null);

  // Stake modal flow
  const [stakeModalNFT, setStakeModalNFT] = useState<OwnedNFT | null>(null);
  const [stakeTimeOption, setStakeTimeOption] = useState<10 | 20 | 30>(10);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [stakeSuccess, setStakeSuccess] = useState(false);

  // Sell flow
  const [sellTarget, setSellTarget] = useState<OwnedNFT | null>(null);
  const [sellPhase, setSellPhase] = useState<"idle" | "animating" | "done">("idle");

  // My Stake detail / redemption
  const [detailsStake, setDetailsStake] = useState<StakedNFT | null>(null);
  const [redemptionStake, setRedemptionStake] = useState<StakedNFT | null>(null);
  const [redemptionIncome, setRedemptionIncome] = useState(0);
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);

  // Real-time countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Sell animation rotation
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1200 }), -1);
  }, []);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  // Load NFTs when a zone is opened
  useEffect(() => {
    if (!activeZone) return;
    setNftsLoading(true);
    fetchAllNFTs().then((nfts) => {
      setZoneNFTs(nfts);
      setNftsLoading(false);
    });
  }, [activeZone]);

  // ─── Buy handler ───────────────────────────────────────────────────────────
  const handleBuy = (nftRecord: NFTRecord, zone: ZoneConfig) => {
    const price = nftZonePrice(nftRecord.name, zone);
    const bought = buyNFT({
      name: nftRecord.name,
      imageSource: { uri: nftRecord.image_url },
      price,
      level: nftRecord.level,
      apr: zone.apr,
      zoneTitle: zone.title,
    });
    if (!bought) {
      Alert.alert("Insufficient balance", `You need ${price} TFT to buy this NFT.`);
      return;
    }
    // Find the just-added NFT (it'll be first in ownedNFTs on next render via context)
    // We build a local reference for the modal
    const justBought: OwnedNFT = {
      id: "", // will be set in context
      name: nftRecord.name,
      imageSource: { uri: nftRecord.image_url },
      price,
      level: nftRecord.level,
      apr: zone.apr,
      zoneTitle: zone.title,
    };
    setBuySuccessNFT(justBought);
  };

  // ─── Stake handler ─────────────────────────────────────────────────────────
  const handleConfirmStake = async () => {
    if (!stakeModalNFT) return;
    const real = ownedNFTs.find(
      (n) => n.name === stakeModalNFT.name && n.price === stakeModalNFT.price
    );
    if (!real) return;
    // 1. Update local context (instant UI feedback)
    stakeNFT(real.id, stakeTimeOption);
    setStakeModalNFT(null);
    setStakeSuccess(true);
    // 2. Persist to backend (non-blocking)
    if (user?.id) {
      stakeApi.startStake({
        user_id: user.id,
        amount: real.price,
      }).catch(console.error);
    }
  };

  // ─── Sell handler ──────────────────────────────────────────────────────────
  const handleSell = (nft: OwnedNFT) => {
    setSellTarget(nft);
    setSellPhase("animating");
    const delay = 3000 + Math.random() * 3000;
    setTimeout(() => setSellPhase("done"), delay);
  };

  const handleSellConfirm = () => {
    if (!sellTarget) return;
    sellNFT(sellTarget.id);
    setSellTarget(null);
    setSellPhase("idle");
  };

  // ─── Redemption handler ────────────────────────────────────────────────────
  const handleRedeem = (stake: StakedNFT) => {
    const income = calcIncome(stake, Date.now());
    setRedemptionIncome(income);
    setRedemptionStake(stake);
  };

  const handleConfirmRedeem = () => {
    if (!redemptionStake) return;
    redeemStake(redemptionStake.stakeId);
    setRedemptionStake(null);
    setRedemptionSuccess(true);
  };

  const totalStakeValue = stakedNFTs.reduce((s, n) => s + n.price, 0);
  const totalStakeIncome = stakedNFTs.reduce((s, n) => s + calcIncome(n, now), 0);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <StickyGlassHeader showBalance={false} showMenu={false} />

        {/* Category tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catContent} style={styles.catRow}>
          {CATEGORY_TABS.map((tab, idx) => (
            <Pressable key={tab} onPress={() => setCategoryTab(idx)} style={styles.catBtn}>
              <Text style={[styles.catText, idx === categoryTab && styles.catTextActive]}>{tab}</Text>
              {idx === categoryTab && <View style={styles.catUnderline} />}
            </Pressable>
          ))}
        </ScrollView>

        {/* Main tabs */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.mainTabsCard}>
          {([["stake", "Stake"], ["collection", "Collection"], ["mystake", "My Stake"]] as const).map(([key, label]) => (
            <Pressable key={key} onPress={() => { setMainTab(key); setActiveZone(null); }} style={[styles.mainTabBtn, mainTab === key && styles.mainTabBtnActive]}>
              {mainTab === key && <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />}
              <Text style={[styles.mainTabText, mainTab === key && styles.mainTabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* ── STAKE TAB ────────────────────────────────────────────────────── */}
        {mainTab === "stake" && !activeZone && (
          <>
            <View style={styles.zoneTabs}>
              {([["exclusive", "Exclusive Zone"], ["free", "Free Zone"]] as const).map(([key, label]) => (
                <Pressable key={key} onPress={() => setZoneTab(key)} style={styles.zoneTabBtn}>
                  <Text style={[styles.zoneTabText, zoneTab === key && styles.zoneTabTextActive]}>{label}</Text>
                  {zoneTab === key && <View style={styles.zoneUnderline} />}
                </Pressable>
              ))}
            </View>

            <View style={styles.zoneList}>
              {(zoneTab === "free" ? FREE_ZONES : EXCLUSIVE_ZONES).map((zone, i) => {
                const isLocked = userLevel < zone.minSubLevel;
                const boostedApr = (zone.apr + stakeBoost).toFixed(1);
                const showBoost = stakeBoost > 0 && !isLocked;
                return (
                  <Animated.View key={zone.id} entering={FadeInDown.duration(350).delay(i * 60)} style={[styles.zoneCard, isLocked && { opacity: 0.92 }]}>
                    <View style={styles.zoneCardHeader}>
                      <Text style={styles.zoneCardTitle}>{zone.title}</Text>
                      <Feather name="info" size={16} color={Colors.textMuted} />
                      <View style={{ flex: 1 }} />
                      <Text style={[styles.zoneLevelBadge, isLocked && { backgroundColor: "#FFECEC", color: "#E53935" }]}>{zone.levelRange}</Text>
                    </View>
                    <View style={styles.zoneBanner}>
                      <Image source={zone.image} style={styles.zoneBannerImg} contentFit="cover" />
                      {isLocked && (
                        <View style={styles.lockOverlay}>
                          <View style={styles.lockIconWrap}>
                            <Feather name="lock" size={28} color="#fff" />
                          </View>
                          <Text style={styles.lockTitle}>Level {zone.minSubLevel} Required</Text>
                          <Text style={styles.lockSub}>Activate a subscription plan to unlock this zone</Text>
                          <Pressable style={styles.lockSubBtn} onPress={() => router.push("/subscriptions")}>
                            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={12} />
                            <Feather name="star" size={13} color="#fff" />
                            <Text style={styles.lockSubBtnText}>Subscribe</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                    <View style={styles.zoneInfoRows}>
                      <View style={styles.zoneInfoRow}><Text style={styles.zoneInfoLabel}>Status</Text><View style={styles.statusBadge}><Text style={styles.statusText}>{isLocked ? "Locked" : zone.status}</Text></View></View>
                      <View style={styles.zoneInfoRow}><Text style={styles.zoneInfoLabel}>Price Range:</Text><View style={styles.tRow}><View style={styles.tIcon}><Text style={styles.tIconText}>T</Text></View><Text style={styles.zoneInfoValue}>{zone.priceRange}</Text></View></View>
                      <View style={styles.zoneInfoRow}>
                        <Text style={styles.zoneInfoLabel}>Income:</Text>
                        {showBoost ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={[styles.zoneInfoValue, { textDecorationLine: "line-through", color: Colors.textMuted, fontSize: 12 }]}>{zone.income}</Text>
                            <Text style={[styles.zoneInfoValue, { color: "#2BD9A8", fontFamily: "Inter_700Bold" }]}>{boostedApr}% ✦</Text>
                          </View>
                        ) : (
                          <Text style={styles.zoneInfoValue}>{zone.income}</Text>
                        )}
                      </View>
                      {zone.type === "free" && <View style={styles.zoneInfoRow}><Text style={styles.zoneInfoLabel}>Stakable Days:</Text><Text style={styles.zoneInfoValue}>{zone.stakableDays}</Text></View>}
                      {zone.type === "exclusive" && <View style={styles.zoneInfoRow}><Text style={styles.zoneInfoLabel}>Handling fee:</Text><Text style={styles.zoneInfoValue}>{zone.handlingFee}</Text></View>}
                    </View>
                    <Pressable
                      style={styles.stakeBtn}
                      onPress={() => {
                        if (isLocked) { router.push("/subscriptions"); return; }
                        if (zone.active) setActiveZone(zone);
                      }}
                    >
                      {isLocked
                        ? <LinearGradient colors={["#f0f0f0", "#e0e0e0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                        : zone.active
                          ? <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                          : <LinearGradient colors={["#e0e0e0", "#d0d0d0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                      }
                      <Feather name={isLocked ? "lock" : "zap"} size={14} color={isLocked ? "#aaa" : "#fff"} />
                      <Text style={[styles.stakeBtnText, (isLocked || !zone.active) && { color: "#aaa" }]}>
                        {isLocked ? "Subscribe to Unlock" : "Go to stake"}
                      </Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </>
        )}

        {/* ── ZONE NFT GRID ─────────────────────────────────────────────────── */}
        {mainTab === "stake" && activeZone && (
          <View style={{ paddingHorizontal: 14 }}>
            <View style={styles.gridTopRow}>
              <Pressable onPress={() => setActiveZone(null)} style={styles.backBtn}>
                <Feather name="chevron-left" size={20} color={Colors.textPrimary} />
              </Pressable>
              <View style={styles.searchBar}>
                <Feather name="search" size={16} color={Colors.textMuted} />
                <Text style={styles.searchPlaceholder}>Enter name to search</Text>
              </View>
              <View style={styles.filterBtn}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={20} />
                <Text style={styles.filterText}>{activeZone.id}</Text>
              </View>
            </View>

            {nftsLoading ? (
              <View style={{ marginTop: 8 }}>
                <NFTSkeletonGrid count={6} />
              </View>
            ) : (
              <View style={styles.nftGrid}>
                {zoneNFTs.map((nft, idx) => (
                  <Animated.View key={idx} entering={FadeInDown.duration(300).delay(idx * 30)} style={styles.nftCard}>
                    <Image source={{ uri: nft.image_url }} style={styles.nftImage} contentFit="cover" />
                    <Text style={styles.nftName} numberOfLines={1}>{nft.name}</Text>
                    <View style={styles.nftPriceRow}>
                      <View style={styles.tIcon}><Text style={styles.tIconText}>T</Text></View>
                      <Text style={styles.nftPrice}>{nftZonePrice(nft.name, activeZone).toLocaleString()}</Text>
                    </View>
                    <Pressable style={styles.buyBtn} onPress={() => handleBuy(nft, activeZone)}>
                      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={10} />
                      <Text style={styles.buyBtnText}>Buy</Text>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── COLLECTION TAB ───────────────────────────────────────────────── */}
        {mainTab === "collection" && (
          <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
            {ownedNFTs.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Feather name="layers" size={38} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No NFTs in collection</Text>
                <Text style={styles.emptySub}>Buy an NFT from the Stake zones</Text>
              </View>
            ) : (
              <View style={styles.collectionGrid}>
                {ownedNFTs.map((nft) => (
                  <Animated.View key={nft.id} entering={FadeIn.duration(300)} style={styles.collectionCard}>
                    <Image source={nft.imageSource} style={styles.collectionImg} contentFit="cover" />
                    <Text style={styles.nftName} numberOfLines={1}>{nft.name}</Text>
                    <View style={styles.nftPriceRow}>
                      <View style={styles.tIcon}><Text style={styles.tIconText}>T</Text></View>
                      <Text style={styles.nftPrice}>{nft.price.toLocaleString()}</Text>
                    </View>
                    <Text style={styles.collectionZone}>{nft.zoneTitle} · APR {nft.apr}%</Text>
                    <View style={styles.collectionBtns}>
                      <Pressable style={styles.collStakeBtn} onPress={() => setStakeModalNFT(nft)}>
                        <Text style={styles.collStakeBtnText}>Stake</Text>
                      </Pressable>
                      <Pressable style={styles.collSellBtn} onPress={() => handleSell(nft)}>
                        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={10} />
                        <Text style={styles.collSellBtnText}>Sell</Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── MY STAKE TAB ─────────────────────────────────────────────────── */}
        {mainTab === "mystake" && (
          <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
            {/* API Summary Banner */}
            {stakeApi.summary && (stakeApi.summary.active.length > 0 || stakeApi.summary.completed.length > 0) && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.apiSummaryCard}>
                <LinearGradient colors={["#E8FFF8", "#EBF8FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={16} />
                <View style={styles.apiSummaryRow}>
                  <View style={styles.apiSumItem}>
                    <Text style={styles.apiSumLabel}>Active Stakes</Text>
                    <Text style={styles.apiSumValue}>{stakeApi.summary.active.length}</Text>
                  </View>
                  <View style={styles.apiSumDivider} />
                  <View style={styles.apiSumItem}>
                    <Text style={styles.apiSumLabel}>Total Staked</Text>
                    <Text style={styles.apiSumValue}>{stakeApi.summary.totalStaked.toLocaleString()} TFT</Text>
                  </View>
                  <View style={styles.apiSumDivider} />
                  <View style={styles.apiSumItem}>
                    <Text style={styles.apiSumLabel}>Total Profit</Text>
                    <Text style={[styles.apiSumValue, { color: "#2BD9A8" }]}>{stakeApi.summary.totalProfit.toFixed(4)}</Text>
                  </View>
                </View>
                {/* Completed API stakes history */}
                {stakeApi.summary.completed.length > 0 && (
                  <View style={styles.apiCompletedSection}>
                    <Text style={styles.apiCompletedTitle}>Completed ({stakeApi.summary.completed.length})</Text>
                    {stakeApi.summary.completed.slice(0, 3).map((s) => (
                      <View key={s.id} style={styles.apiCompletedRow}>
                        <View style={styles.apiCompletedLeft}>
                          <Text style={styles.apiCompletedZone} numberOfLines={1}>Stake</Text>
                          <Text style={styles.apiCompletedDate}>{new Date(s.start_time).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.apiCompletedRight}>
                          <Text style={styles.apiCompletedAmount}>{Number(s.amount).toLocaleString()} TFT</Text>
                          <Text style={styles.apiCompletedProfit}>+{Number(s.profit).toFixed(4)} TFT</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Animated.View>
            )}

            {/* Local Summary */}
            <View style={styles.stakeSummaryRow}>
              <View style={styles.stakeSummaryCard}>
                <Text style={styles.summaryLabel}>Total Stake Value</Text>
                <Text style={styles.summaryValue}>{totalStakeValue.toLocaleString()} TFT</Text>
              </View>
              <View style={[styles.stakeSummaryCard, { borderLeftColor: "#2BD9A8", borderLeftWidth: 3 }]}>
                <Text style={styles.summaryLabel}>Total Stake Income</Text>
                <Text style={[styles.summaryValue, { color: "#2BD9A8" }]}>{totalStakeIncome.toFixed(4)} TFT</Text>
              </View>
            </View>

            {stakedNFTs.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Feather name="bar-chart-2" size={38} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No active stakes</Text>
                <Text style={styles.emptySub}>Stake an NFT from your Collection</Text>
              </View>
            ) : (
              stakedNFTs.map((stake) => {
                const remaining = stake.endTime - now;
                const isDone = remaining <= 0;
                const income = calcIncome(stake, now);
                return (
                  <Animated.View key={stake.stakeId} entering={FadeInDown.duration(300)} style={styles.myStakeCard}>
                    <View style={styles.myStakeTop}>
                      <Image source={stake.imageSource} style={styles.myStakeImg} contentFit="cover" />
                      <View style={styles.myStakeInfo}>
                        <Text style={styles.myStakeName} numberOfLines={1}>{stake.name}</Text>
                        <View style={styles.myStakeRow}><Text style={styles.myStakeLabel}>Stake Value</Text><Text style={styles.myStakeValueGreen}>{stake.price.toLocaleString()} TFT</Text></View>
                        <View style={styles.myStakeRow}><Text style={styles.myStakeLabel}>APR</Text><Text style={styles.myStakeBold}>{stake.apr}%</Text></View>
                        <View style={styles.myStakeRow}><Text style={styles.myStakeLabel}>Duration</Text><Text style={styles.myStakeBold}>{stake.durationMinutes} min</Text></View>
                      </View>
                    </View>
                    <View style={styles.myStakeRow}>
                      <Text style={styles.myStakeLabel}>Countdown:</Text>
                      <Text style={[styles.myStakeBold, isDone && { color: "#2BD9A8" }]}>{isDone ? "Complete" : formatCountdown(remaining)}</Text>
                    </View>
                    <View style={styles.myStakeRow}>
                      <Text style={styles.myStakeLabel}>Income:</Text>
                      <Text style={[styles.myStakeBold, { color: "#2BD9A8" }]}>{income.toFixed(4)} TFT</Text>
                    </View>
                    {isDone ? (
                      <View style={styles.myStakeBtnsRow}>
                        <Pressable style={styles.redemptionBtn} onPress={() => handleRedeem(stake)}>
                          <Text style={styles.redemptionBtnText}>Redemption</Text>
                        </Pressable>
                        <Pressable style={styles.detailsBtn} onPress={() => setDetailsStake(stake)}>
                          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={10} />
                          <Text style={styles.detailsBtnText}>Details</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable style={styles.detailsBtn} onPress={() => setDetailsStake(stake)}>
                        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={10} />
                        <Text style={styles.detailsBtnText}>Details</Text>
                      </Pressable>
                    )}
                  </Animated.View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── BUY SUCCESS MODAL ──────────────────────────────────────────────── */}
      <Modal visible={!!buySuccessNFT} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successCheck}>
              <Feather name="check" size={32} color="#fff" />
            </View>
            <Text style={styles.successTitle}>BuySuccess!</Text>
            <View style={styles.successBtnRow}>
              <Pressable style={styles.successBtnOutline} onPress={() => { setStakeModalNFT(buySuccessNFT); setBuySuccessNFT(null); }}>
                <Text style={styles.successBtnOutlineText}>Stake</Text>
              </Pressable>
              <Pressable style={styles.successBtnGrad} onPress={() => { setBuySuccessNFT(null); setMainTab("collection"); }}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={12} />
                <Text style={styles.successBtnGradText}>Check Orders</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── STAKE MODAL ────────────────────────────────────────────────────── */}
      <Modal visible={!!stakeModalNFT} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.stakeModal}>
            <View style={styles.stakeModalHeader}>
              <Text style={styles.stakeModalTitle}>NFT Stake</Text>
              <Pressable onPress={() => setStakeModalNFT(null)}>
                <Feather name="x" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>
            {stakeModalNFT && (
              <>
                <Image source={stakeModalNFT.imageSource} style={styles.stakeModalImg} contentFit="cover" />
                <Text style={styles.stakeModalName}>{stakeModalNFT.name}</Text>
                <View style={styles.stakeModalPriceRow}>
                  <Text style={styles.stakeModalPriceLabel}>Price:</Text>
                  <Text style={styles.stakeModalPrice}>{stakeModalNFT.price.toLocaleString()}</Text>
                  <View style={styles.tIcon}><Text style={styles.tIconText}>T</Text></View>
                </View>
                <View style={styles.stakeModalDivider} />
                {/* Time selector */}
                <View style={styles.stakeModalRow}>
                  <Text style={styles.stakeModalLabel}>Stakable Time:</Text>
                  <Pressable style={styles.dropdownBtn} onPress={() => setShowTimeDropdown(!showTimeDropdown)}>
                    <Text style={styles.dropdownText}>{stakeTimeOption} min</Text>
                    <Feather name="chevron-down" size={14} color={Colors.textSecondary} />
                  </Pressable>
                </View>
                {showTimeDropdown && (
                  <View style={styles.dropdown}>
                    {TIME_OPTIONS.map((t) => (
                      <Pressable key={t} style={styles.dropdownItem} onPress={() => { setStakeTimeOption(t); setShowTimeDropdown(false); }}>
                        <Text style={[styles.dropdownItemText, stakeTimeOption === t && { color: "#5CBFFE", fontFamily: "Inter_700Bold" }]}>{t} min</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <View style={styles.stakeModalRow}><Text style={styles.stakeModalLabel}>APR:</Text><Text style={styles.stakeModalValue}>{stakeModalNFT.apr}%</Text></View>
                <View style={styles.stakeModalRow}><Text style={styles.stakeModalLabel}>Duration:</Text><Text style={styles.stakeModalValue}>{stakeTimeOption} min</Text></View>
                <View style={styles.stakeModalRow}>
                  <Text style={styles.stakeModalLabel}>Est. Income:</Text>
                  <Text style={[styles.stakeModalValue, { color: "#2BD9A8" }]}>
                    {((stakeModalNFT.price * stakeModalNFT.apr / 100) * (stakeTimeOption / 30)).toFixed(4)} TFT
                  </Text>
                </View>
                <Pressable style={styles.stakeBtn} onPress={handleConfirmStake}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                  <Text style={styles.stakeBtnText}>Stake</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── STAKE SUCCESS MODAL ────────────────────────────────────────────── */}
      <Modal visible={stakeSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successCheck}>
              <Feather name="check" size={32} color="#fff" />
            </View>
            <Text style={styles.successTitle}>StakeSuccess!</Text>
            <Pressable style={styles.confirmBtn} onPress={() => { setStakeSuccess(false); setMainTab("mystake"); }}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={12} />
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── SELL ANIMATION MODAL ───────────────────────────────────────────── */}
      <Modal visible={sellPhase === "animating"} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.sellAnimModal}>
            <Animated.View style={[styles.sellSpinner, spinStyle]}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={40} />
              <Feather name="refresh-cw" size={28} color="#fff" />
            </Animated.View>
            <Text style={styles.sellAnimTitle}>Finding buyer...</Text>
            <Text style={styles.sellAnimSub}>Matching your NFT</Text>
          </View>
        </View>
      </Modal>

      {/* ── SELL SUCCESS MODAL ─────────────────────────────────────────────── */}
      <Modal visible={sellPhase === "done"} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successCheck}><Feather name="check" size={32} color="#fff" /></View>
            <Text style={styles.successTitle}>Sell Success!</Text>
            {sellTarget && <Text style={styles.sellIncomeText}>+{sellTarget.price.toLocaleString()} TFT credited</Text>}
            <Pressable style={styles.confirmBtn} onPress={handleSellConfirm}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={12} />
              <Text style={styles.confirmBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── STAKE DETAILS MODAL ────────────────────────────────────────────── */}
      <Modal visible={!!detailsStake} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.stakeModal}>
            <View style={styles.stakeModalHeader}>
              <Text style={styles.stakeModalTitle}>NFT Stake</Text>
              <Pressable onPress={() => setDetailsStake(null)}>
                <Feather name="x" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>
            {detailsStake && (
              <>
                <Image source={detailsStake.imageSource} style={styles.stakeModalImg} contentFit="cover" />
                <Text style={styles.stakeModalName}>{detailsStake.name}</Text>
                <View style={styles.stakeModalPriceRow}>
                  <Text style={styles.stakeModalPriceLabel}>Value:</Text>
                  <Text style={styles.stakeModalPrice}>{detailsStake.price.toLocaleString()}</Text>
                  <View style={styles.tIcon}><Text style={styles.tIconText}>T</Text></View>
                </View>
                <View style={styles.stakeModalDivider} />
                <Text style={styles.detailsSectionTitle}>StakeDetails</Text>
                <View style={styles.stakeModalRow}><Text style={styles.stakeModalLabel}>APR:</Text><Text style={styles.stakeModalValue}>{detailsStake.apr}%</Text></View>
                <View style={styles.stakeModalRow}><Text style={styles.stakeModalLabel}>Total Stake Value:</Text><Text style={[styles.stakeModalValue, { color: "#2BD9A8" }]}>{detailsStake.price.toLocaleString()} TFT</Text></View>
                <View style={styles.stakeModalRow}><Text style={styles.stakeModalLabel}>End Time:</Text><Text style={styles.stakeModalValue}>{new Date(detailsStake.endTime).toLocaleString()}</Text></View>
                <View style={styles.stakeModalRow}><Text style={styles.stakeModalLabel}>Rewards available</Text><Text style={[styles.stakeModalValue, { color: "#2BD9A8" }]}>{calcIncome(detailsStake, now).toFixed(4)} TFT</Text></View>
                <Pressable style={styles.stakeBtn} onPress={() => setDetailsStake(null)}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                  <Text style={styles.stakeBtnText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── REDEMPTION CONFIRM MODAL ───────────────────────────────────────── */}
      <Modal visible={!!redemptionStake && !redemptionSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Text style={styles.stakeModalTitle}>NFT Stake</Text>
            <View style={styles.successCheck}><Feather name="check" size={32} color="#fff" /></View>
            <View style={styles.redemptionIncomeRow}>
              <Text style={styles.redemptionLabel}>Income: </Text>
              <Text style={styles.redemptionValue}>{redemptionIncome.toFixed(4)}</Text>
              <View style={styles.tIcon}><Text style={styles.tIconText}>T</Text></View>
            </View>
            <Text style={styles.successTitle}>RedemptionSuccess!</Text>
            <Pressable style={styles.confirmBtn} onPress={handleConfirmRedeem}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={12} />
              <Text style={styles.confirmBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── REDEMPTION SUCCESS ─────────────────────────────────────────────── */}
      <Modal visible={redemptionSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successCheck}><Feather name="check" size={32} color="#fff" /></View>
            <Text style={styles.successTitle}>Income Credited!</Text>
            <Text style={styles.sellIncomeText}>NFT returned to Collection</Text>
            <Pressable style={styles.confirmBtn} onPress={() => { setRedemptionSuccess(false); setMainTab("collection"); }}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={12} />
              <Text style={styles.confirmBtnText}>Go to Collection</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  catRow: { marginTop: 4 },
  catContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 4 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 8, alignItems: "center", position: "relative" },
  catText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  catTextActive: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  catUnderline: { position: "absolute", bottom: 2, left: 14, right: 14, height: 2.5, backgroundColor: "#5CBFFE", borderRadius: 2 },

  mainTabsCard: { flexDirection: "row", marginHorizontal: 14, marginTop: 6, backgroundColor: "#fff", borderRadius: 16, padding: 5, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 4 },
  mainTabBtn: { flex: 1, paddingVertical: 11, alignItems: "center", justifyContent: "center", borderRadius: 14, overflow: "hidden" },
  mainTabBtnActive: {},
  mainTabText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  mainTabTextActive: { fontFamily: "Inter_700Bold", color: "#fff" },

  zoneTabs: { flexDirection: "row", marginHorizontal: 14, marginTop: 18, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 24 },
  zoneTabBtn: { paddingBottom: 12, alignItems: "center", position: "relative" },
  zoneTabText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  zoneTabTextActive: { fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  zoneUnderline: { position: "absolute", bottom: -1, left: 0, right: 0, height: 2.5, backgroundColor: Colors.textPrimary, borderRadius: 2 },

  zoneList: { marginTop: 14, paddingHorizontal: 14, gap: 16, paddingBottom: 8 },
  zoneCard: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2, padding: 16, gap: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  zoneCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  zoneCardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  zoneLevelBadge: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#2BD9A8" },
  zoneBanner: { width: "100%", height: 130, borderRadius: 12, overflow: "hidden", backgroundColor: "#f0f0f0" },
  zoneBannerImg: { width: "100%", height: "100%" },
  zoneInfoRows: { gap: 10 },
  zoneInfoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  zoneInfoLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  zoneInfoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  tRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  tIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tIconText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  statusBadge: { backgroundColor: "#00C853", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  stakeBtn: { height: 46, borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  stakeBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },

  // Lock overlay (shown on zones requiring subscription)
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,20,0.68)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  lockIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  lockTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  lockSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  lockSubBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  lockSubBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  // NFT Grid
  gridTopRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  searchPlaceholder: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  filterBtn: { width: 40, height: 40, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  filterText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  loadingWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  nftGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  nftCard: { width: (width - 28 - 12) / 2, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", padding: 10, gap: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  nftImage: { width: "100%", aspectRatio: 1, borderRadius: 10 },
  nftName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  nftPriceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nftPrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  buyBtn: { height: 34, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  buyBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },

  // Collection
  collectionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  collectionCard: { width: (width - 28 - 12) / 2, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", padding: 10, gap: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  collectionImg: { width: "100%", aspectRatio: 1, borderRadius: 10 },
  collectionZone: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  collectionBtns: { flexDirection: "row", gap: 8 },
  collStakeBtn: { flex: 1, height: 34, borderRadius: 10, borderWidth: 1.5, borderColor: "#5CBFFE", alignItems: "center", justifyContent: "center" },
  collStakeBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#5CBFFE" },
  collSellBtn: { flex: 1, height: 34, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  collSellBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },

  // My Stake
  stakeSummaryRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  stakeSummaryCard: { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 6, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  summaryValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  myStakeCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 14, gap: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  myStakeTop: { flexDirection: "row", gap: 14 },
  myStakeImg: { width: 80, height: 80, borderRadius: 12 },
  myStakeInfo: { flex: 1, gap: 4 },
  myStakeName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  myStakeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  myStakeLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  myStakeBold: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  myStakeValueGreen: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#2BD9A8" },
  myStakeBtnsRow: { flexDirection: "row", gap: 10 },
  redemptionBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: "#5CBFFE", alignItems: "center", justifyContent: "center" },
  redemptionBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#5CBFFE" },
  detailsBtn: { flex: 1, height: 40, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  detailsBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },

  // Empty states
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  successModal: { backgroundColor: "#fff", borderRadius: 24, padding: 28, alignItems: "center", width: "100%", gap: 16 },
  successCheck: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  successBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
  successBtnOutline: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: "#5CBFFE", alignItems: "center", justifyContent: "center" },
  successBtnOutlineText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#5CBFFE" },
  successBtnGrad: { flex: 1, height: 46, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  successBtnGradText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  confirmBtn: { height: 46, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center", width: "100%" },
  confirmBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  sellAnimModal: { backgroundColor: "#fff", borderRadius: 24, padding: 40, alignItems: "center", width: "85%", gap: 16 },
  sellSpinner: { width: 80, height: 80, borderRadius: 40, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  sellAnimTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  sellAnimSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  sellIncomeText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#2BD9A8" },

  stakeModal: { backgroundColor: "#fff", borderRadius: 24, padding: 24, width: "100%", gap: 14 },
  stakeModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stakeModalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  stakeModalImg: { width: 120, height: 120, borderRadius: 16, alignSelf: "center" },
  stakeModalName: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.textPrimary, textAlign: "center" },
  stakeModalPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  stakeModalPriceLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  stakeModalPrice: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  stakeModalDivider: { height: 1, backgroundColor: Colors.border },
  stakeModalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stakeModalLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  stakeModalValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  dropdownBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.offWhite, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  dropdownText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  dropdown: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  detailsSectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  redemptionIncomeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  redemptionLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  redemptionValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#2BD9A8" },

  // API stake summary
  apiSummaryCard: { borderRadius: 16, overflow: "hidden", padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  apiSummaryRow: { flexDirection: "row", alignItems: "center" },
  apiSumItem: { flex: 1, alignItems: "center", gap: 4 },
  apiSumDivider: { width: 1, height: 36, backgroundColor: "#C8F0E4" },
  apiSumLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },
  apiSumValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textPrimary, textAlign: "center" },
  apiCompletedSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#DFF5EE", gap: 8 },
  apiCompletedTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 4 },
  apiCompletedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#EEF9F5" },
  apiCompletedLeft: { flex: 1, gap: 2 },
  apiCompletedRight: { alignItems: "flex-end", gap: 2 },
  apiCompletedZone: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  apiCompletedDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  apiCompletedAmount: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  apiCompletedProfit: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#2BD9A8" },
});
