import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
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
import {
  CollectionGridSkeleton,
  MyStakeListSkeleton,
  StakeNFTSkeletonGrid,
  ZoneListSkeleton,
} from "@/components/NFTSkeletonCard";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useBalance } from "@/context/BalanceContext";
import { OwnedNFT, StakedNFT, useStake } from "@/context/StakeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useReferral } from "@/hooks/useReferral";
import { useStakeApi } from "@/hooks/useStakeApi";
import { fetchZoneNFTsByLevel } from "@/lib/supabase";

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
  minSubLevel: number;
  nftLevel: number; // NFT level to load for this zone
}

const FREE_ZONES: ZoneConfig[] = [
  { id: 1, title: "Free Zone 1", levelRange: "LV1", image: require("@/assets/stake/fz1.png"), status: "Open", priceRange: "199 ~ 499",    priceMin: 199,  priceMax: 499,  income: "1%",   apr: 1,   type: "free", stakableDays: "3~30", active: true, minSubLevel: 1, nftLevel: 1 },
  { id: 2, title: "Free Zone 2", levelRange: "LV2", image: require("@/assets/stake/fz2.png"), status: "Open", priceRange: "499 ~ 799",    priceMin: 499,  priceMax: 799,  income: "1.1%", apr: 1.1, type: "free", stakableDays: "3~30", active: true, minSubLevel: 2, nftLevel: 2 },
  { id: 3, title: "Free Zone 3", levelRange: "LV3", image: require("@/assets/stake/fz3.png"), status: "Open", priceRange: "799 ~ 1,299",  priceMin: 799,  priceMax: 1299, income: "1.2%", apr: 1.2, type: "free", stakableDays: "3~30", active: true, minSubLevel: 3, nftLevel: 3 },
  { id: 4, title: "Free Zone 4", levelRange: "LV4", image: require("@/assets/stake/fz4.png"), status: "Open", priceRange: "1,299 ~ 2,099",priceMin: 1299, priceMax: 2099, income: "1.3%", apr: 1.3, type: "free", stakableDays: "3~30", active: true, minSubLevel: 4, nftLevel: 4 },
  { id: 5, title: "Free Zone 5", levelRange: "LV5", image: require("@/assets/stake/fz5.png"), status: "Open", priceRange: "2,099 ~ 2,599",priceMin: 2099, priceMax: 2599, income: "1.4%", apr: 1.4, type: "free", stakableDays: "3~30", active: true, minSubLevel: 5, nftLevel: 5 },
  { id: 6, title: "Free Zone 6", levelRange: "LV6", image: require("@/assets/stake/fz6.png"), status: "Open", priceRange: "2,599 ~ 3,500",priceMin: 2599, priceMax: 3500, income: "1.5%", apr: 1.5, type: "free", stakableDays: "3~30", active: true, minSubLevel: 6, nftLevel: 6 },
];

const EXCLUSIVE_ZONES: ZoneConfig[] = [
  { id: 1, title: "Exclusive Stake 1", levelRange: "LV2-LV3", image: require("@/assets/stake/ex1.png"), status: "Open", priceRange: "499 ~ 999",     priceMin: 499,   priceMax: 999,   income: "1.5%", apr: 1.5, type: "exclusive", handlingFee: "1%", stakableDays: "3~30", active: true, minSubLevel: 2, nftLevel: 2 },
  { id: 2, title: "Exclusive Stake 2", levelRange: "LV2-LV3", image: require("@/assets/stake/ex2.png"), status: "Open", priceRange: "999 ~ 1,999",   priceMin: 999,   priceMax: 1999,  income: "1.8%", apr: 1.8, type: "exclusive", handlingFee: "1%", stakableDays: "3~30", active: true, minSubLevel: 2, nftLevel: 3 },
  { id: 3, title: "Exclusive Stake 3", levelRange: "LV3-LV4", image: require("@/assets/stake/ex3.png"), status: "Open", priceRange: "1,999 ~ 4,999", priceMin: 1999,  priceMax: 4999,  income: "2.0%", apr: 2.0, type: "exclusive", handlingFee: "1%", stakableDays: "3~30", active: true, minSubLevel: 3, nftLevel: 4 },
  { id: 4, title: "Exclusive Stake 4", levelRange: "LV3-LV4", image: require("@/assets/stake/ex4.png"), status: "Open", priceRange: "4,999 ~ 7,999", priceMin: 4999,  priceMax: 7999,  income: "2.5%", apr: 2.5, type: "exclusive", handlingFee: "1%", stakableDays: "3~30", active: true, minSubLevel: 3, nftLevel: 5 },
  { id: 5, title: "Exclusive Stake 5", levelRange: "LV4-LV5", image: require("@/assets/stake/ex5.png"), status: "Open", priceRange: "7,999 ~ 12,999",priceMin: 7999,  priceMax: 12999, income: "3.0%", apr: 3.0, type: "exclusive", handlingFee: "1%", stakableDays: "3~30", active: true, minSubLevel: 4, nftLevel: 6 },
  { id: 6, title: "Exclusive Stake 6", levelRange: "LV5-LV6", image: require("@/assets/stake/ex6.png"), status: "Open", priceRange: "12,999 ~ 19,999",priceMin: 12999, priceMax: 19999, income: "3.5%", apr: 3.5, type: "exclusive", handlingFee: "1%", stakableDays: "3~30", active: true, minSubLevel: 5, nftLevel: 6 },
];

const CATEGORY_TABS = ["Stake", "Polygon NFT", "Art", "Collection", "Game"];
const QUICK_DAYS = [3, 7, 14, 30];
const MIN_DAYS = 3;
const MAX_DAYS = 30;

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
  const { width: W } = useWindowDimensions();
  const { ownedNFTs, stakedNFTs, buyNFT, sellNFT, stakeNFT, redeemStake } = useStake();
  const { user, token } = useAuth();
  const { userLevel, stakeBoost, activePlan } = useSubscription();
  const { totalDeposited } = useBalance();
  const { stats: teamStats } = useReferral();
  const stakeApi = useStakeApi(token);
  const router = useRouter();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  // Exclusive zone unlock: need 500+ deposit AND 18+ total members
  const exclusiveUnlocked = totalDeposited >= 500 && teamStats.totalMembers >= 18;

  // Navigation state
  const [categoryTab, setCategoryTab] = useState(0);
  const [mainTab, setMainTab] = useState<"stake" | "collection" | "mystake">("stake");
  const [zoneTab, setZoneTab] = useState<"free" | "exclusive">("free");
  const [zoneLoading, setZoneLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);

  // Zone NFT grid state
  const [activeZone, setActiveZone] = useState<ZoneConfig | null>(null);
  const [zoneNFTs, setZoneNFTs] = useState<NFTRecord[]>([]);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [zoneHasMore, setZoneHasMore] = useState(false);
  const [zonePage, setZonePage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Buy flow
  const [buySuccessNFT, setBuySuccessNFT] = useState<OwnedNFT | null>(null);

  // Stake modal flow
  const [stakeModalNFT, setStakeModalNFT] = useState<OwnedNFT | null>(null);
  const [stakeDays, setStakeDays] = useState<number>(3);
  const [stakeDaysInput, setStakeDaysInput] = useState<string>("3");
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

  // Load NFTs when a zone is opened (initial 10)
  useEffect(() => {
    if (!activeZone) return;
    setNftsLoading(true);
    setZoneNFTs([]);
    setZonePage(1);
    setZoneHasMore(false);
    fetchZoneNFTsByLevel(activeZone.nftLevel, 1, 10).then(({ items, hasMore }) => {
      setZoneNFTs(items);
      setZoneHasMore(hasMore);
      setNftsLoading(false);
    });
  }, [activeZone]);

  const handleLoadMore = async () => {
    if (!activeZone || loadingMore || !zoneHasMore) return;
    setLoadingMore(true);
    const nextPage = zonePage + 1;
    const { items, hasMore } = await fetchZoneNFTsByLevel(activeZone.nftLevel, nextPage, 5);
    setZoneNFTs((prev) => [...prev, ...items]);
    setZoneHasMore(hasMore);
    setZonePage(nextPage);
    setLoadingMore(false);
  };

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
    stakeNFT(real.id, stakeDays * 30);
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
            <Pressable key={key} onPress={() => {
              if (key === mainTab) return;
              setMainTab(key);
              setActiveZone(null);
              if (key !== "stake") {
                setTabLoading(true);
                setTimeout(() => setTabLoading(false), 450);
              }
            }} style={[styles.mainTabBtn, mainTab === key && styles.mainTabBtnActive]}>
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
                <Pressable key={key} onPress={() => {
                  if (key === zoneTab) return;
                  setZoneTab(key);
                  setZoneLoading(true);
                  setTimeout(() => setZoneLoading(false), 350);
                }} style={styles.zoneTabBtn}>
                  <Text style={[styles.zoneTabText, zoneTab === key && styles.zoneTabTextActive]}>{label}</Text>
                  {zoneTab === key && <View style={styles.zoneUnderline} />}
                </Pressable>
              ))}
            </View>

            {zoneLoading ? (
              <ZoneListSkeleton count={3} />
            ) : null}
            <View style={[styles.zoneList, zoneLoading && { display: "none" }]}>
              {(zoneTab === "free" ? FREE_ZONES : EXCLUSIVE_ZONES).map((zone, i) => {
                // Free zones are always open; exclusive zones need 500 deposit + 18 members
                const isLocked = zone.type === "exclusive" ? !exclusiveUnlocked : false;
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
                          <Text style={styles.lockTitle}>Exclusive Zone Locked</Text>
                          <Text style={styles.lockSub}>Requires: 18 team members + $500 deposit</Text>
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                            <View style={[styles.lockSubBtn, { backgroundColor: "rgba(255,255,255,0.15)", flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 10 }]}>
                              <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                                👥 {teamStats.totalMembers}/18
                              </Text>
                            </View>
                            <View style={[styles.lockSubBtn, { backgroundColor: "rgba(255,255,255,0.15)", flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 10 }]}>
                              <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                                💵 ${totalDeposited}/500
                              </Text>
                            </View>
                          </View>
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
                      {zone.stakableDays && <View style={styles.zoneInfoRow}><Text style={styles.zoneInfoLabel}>Stakable Days:</Text><Text style={styles.zoneInfoValue}>{zone.stakableDays}</Text></View>}
                      {zone.type === "exclusive" && (
                        <View style={styles.zoneInfoRow}>
                          <Text style={styles.zoneInfoLabel}>Handling fee:</Text>
                          <Text style={[styles.zoneInfoValue, { color: "#FF8C00" }]}>{zone.handlingFee}</Text>
                        </View>
                      )}
                    </View>
                    <Pressable
                      style={styles.stakeBtn}
                      onPress={() => {
                        if (isLocked) {
                          Alert.alert(
                            "Exclusive Zone Locked",
                            `You need 18 team members and $500 total deposit to unlock exclusive zones.\n\nCurrent: ${teamStats.totalMembers} members, $${totalDeposited} deposited.`
                          );
                          return;
                        }
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
                        {isLocked ? "Unlock: 18 Members + $500" : "Go to stake"}
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
                <StakeNFTSkeletonGrid count={6} />
              </View>
            ) : (
              <>
                <View style={styles.nftGrid}>
                  {zoneNFTs.map((nft, idx) => (
                    <Animated.View key={`${nft.name}-${idx}`} entering={FadeInDown.duration(300).delay((idx % 10) * 30)} style={[styles.nftCard, { width: (W - 40) / 2 }]}>
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
                {zoneHasMore && (
                  <Pressable style={styles.loadMoreBtn} onPress={handleLoadMore} disabled={loadingMore}>
                    <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                    {loadingMore
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.loadMoreText}>Load More</Text>}
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* ── COLLECTION TAB ───────────────────────────────────────────────── */}
        {mainTab === "collection" && (
          <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
            {tabLoading ? (
              <CollectionGridSkeleton count={4} />
            ) : ownedNFTs.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Feather name="layers" size={38} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No NFTs in collection</Text>
                <Text style={styles.emptySub}>Buy an NFT from the Stake zones</Text>
              </View>
            ) : (
              <View style={styles.collectionGrid}>
                {ownedNFTs.map((nft) => (
                  <Animated.View key={nft.id} entering={FadeIn.duration(300)} style={[styles.collectionCard, { width: (W - 40) / 2 }]}>
                    <Image source={nft.imageSource} style={styles.collectionImg} contentFit="cover" />
                    <Text style={styles.nftName} numberOfLines={1}>{nft.name}</Text>
                    <View style={styles.nftPriceRow}>
                      <View style={styles.tIcon}><Text style={styles.tIconText}>T</Text></View>
                      <Text style={styles.nftPrice}>{nft.price.toLocaleString()}</Text>
                    </View>
                    <Text style={styles.collectionZone}>{nft.zoneTitle} · APR {nft.apr}%</Text>
                    <View style={styles.collectionBtns}>
                      <Pressable style={styles.collStakeBtn} onPress={() => { setStakeDays(3); setStakeDaysInput("3"); setStakeModalNFT(nft); }}>
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
            {tabLoading ? (
              <MyStakeListSkeleton count={2} />
            ) : (
            <>
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
                        <View style={styles.myStakeRow}><Text style={styles.myStakeLabel}>Duration</Text><Text style={styles.myStakeBold}>{Math.round(stake.durationMinutes / 30)} days</Text></View>
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
            </>
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
              <Pressable style={styles.successBtnOutline} onPress={() => { setStakeDays(3); setStakeDaysInput("3"); setStakeModalNFT(buySuccessNFT); setBuySuccessNFT(null); }}>
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

                {/* ── Days selector card ── */}
                <View style={styles.daysCard}>
                  <View style={styles.daysCardHeader}>
                    <Feather name="calendar" size={15} color="#5CBFFE" />
                    <Text style={styles.daysCardTitle}>Staking Duration</Text>
                    <Text style={styles.daysCardRange}>(3 – 30 days)</Text>
                  </View>

                  {/* Quick preset buttons */}
                  <View style={styles.daysPresetRow}>
                    {QUICK_DAYS.map((d) => (
                      <Pressable
                        key={d}
                        style={[styles.daysPresetBtn, stakeDays === d && styles.daysPresetBtnActive]}
                        onPress={() => { setStakeDays(d); setStakeDaysInput(String(d)); }}
                      >
                        {stakeDays === d && (
                          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={10} />
                        )}
                        <Text style={[styles.daysPresetText, stakeDays === d && styles.daysPresetTextActive]}>
                          {d}d
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Manual input */}
                  <View style={styles.daysInputRow}>
                    <Text style={styles.daysInputLabel}>Custom days:</Text>
                    <TextInput
                      style={styles.daysInput}
                      keyboardType="number-pad"
                      value={stakeDaysInput}
                      maxLength={2}
                      onChangeText={(v) => {
                        setStakeDaysInput(v);
                        const n = parseInt(v, 10);
                        if (!isNaN(n) && n >= MIN_DAYS && n <= MAX_DAYS) setStakeDays(n);
                      }}
                      onBlur={() => {
                        const n = parseInt(stakeDaysInput, 10);
                        const clamped = isNaN(n) ? MIN_DAYS : Math.min(MAX_DAYS, Math.max(MIN_DAYS, n));
                        setStakeDays(clamped);
                        setStakeDaysInput(String(clamped));
                      }}
                      placeholder="3-30"
                      placeholderTextColor="#9CA3AF"
                      selectTextOnFocus
                    />
                    <Text style={styles.daysInputSuffix}>days</Text>
                  </View>
                </View>

                <View style={styles.stakeModalRow}><Text style={styles.stakeModalLabel}>APR:</Text><Text style={styles.stakeModalValue}>{stakeModalNFT.apr}%</Text></View>
                <View style={styles.stakeModalRow}><Text style={styles.stakeModalLabel}>Duration:</Text><Text style={styles.stakeModalValue}>{stakeDays} days</Text></View>
                <View style={styles.stakeModalRow}>
                  <Text style={styles.stakeModalLabel}>Est. Income:</Text>
                  <Text style={[styles.stakeModalValue, { color: "#2BD9A8" }]}>
                    {((stakeModalNFT.price * stakeModalNFT.apr / 100) * stakeDays).toFixed(4)} TFT
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
  nftCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", padding: 10, gap: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  nftImage: { width: "100%", aspectRatio: 1, borderRadius: 10 },
  nftName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  nftPriceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nftPrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  buyBtn: { height: 34, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  buyBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },

  // Collection
  collectionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  collectionCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", padding: 10, gap: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
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
  daysCard: {
    backgroundColor: Colors.offWhite, borderRadius: 14,
    padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border,
  },
  daysCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  daysCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, flex: 1 },
  daysCardRange: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  daysPresetRow: { flexDirection: "row", gap: 8 },
  daysPresetBtn: {
    flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
    position: "relative",
  },
  daysPresetBtnActive: { borderColor: "transparent" },
  daysPresetText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  daysPresetTextActive: { color: "#fff" },
  daysInputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  daysInputLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  daysInput: {
    flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: "#fff", paddingHorizontal: 12, textAlign: "center",
    fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary,
  },
  daysInputSuffix: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
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

  // Load more
  loadMoreBtn: { marginHorizontal: 14, marginTop: 14, marginBottom: 4, height: 44, borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  loadMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
