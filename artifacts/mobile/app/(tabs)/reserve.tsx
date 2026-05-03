import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useBalance } from "@/context/BalanceContext";
import { useOrders } from "@/context/OrderContext";
import { useReferral } from "@/hooks/useReferral";
import { authApi, nftApi } from "@/lib/authApi";

const { width, height } = Dimensions.get("window");
const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

// ─── Level & Amount configs ────────────────────────────────────────────────────
const LEVELS = [
  {
    lv: 1, label: "Lv1", rate: "1.8-1.95%",
    minPrice: 50,    maxPrice: 500,
    rateMin: 1.80, rateMax: 1.95, systemCut: 0.30,
    minDeposit: 0,
    teamReq: { total: 0, A: 0, B: 0, C: 0 },
  },
  {
    lv: 2, label: "Lv2", rate: "2.1-2.5%",
    minPrice: 500,   maxPrice: 2000,
    rateMin: 2.10, rateMax: 2.50, systemCut: 0.28,
    minDeposit: 500,
    teamReq: { total: 8, A: 5, B: 2, C: 1 },
  },
  {
    lv: 3, label: "Lv3", rate: "2.6-2.9%",
    minPrice: 2000,  maxPrice: 5000,
    rateMin: 2.60, rateMax: 2.90, systemCut: 0.28,
    minDeposit: 2000,
    teamReq: { total: 26, A: 12, B: 8, C: 6 },
  },
  {
    lv: 4, label: "Lv4", rate: "3.1-3.5%",
    minPrice: 5000,  maxPrice: 8000,
    rateMin: 3.10, rateMax: 3.50, systemCut: 0.28,
    minDeposit: 5000,
    teamReq: { total: 45, A: 20, B: 15, C: 10 },
  },
  {
    lv: 5, label: "Lv5", rate: "3.7-4.3%",
    minPrice: 8000,  maxPrice: 15000,
    rateMin: 3.70, rateMax: 4.30, systemCut: 0.25,
    minDeposit: 8000,
    teamReq: { total: 100, A: 50, B: 40, C: 20 },
  },
  {
    lv: 6, label: "Lv6", rate: "4.35-4.65%",
    minPrice: 15000, maxPrice: 50000,
    rateMin: 4.35, rateMax: 4.65, systemCut: 0.20,
    minDeposit: 15000,
    teamReq: { total: 250, A: 100, B: 90, C: 60 },
  },
];

const AMOUNTS = [
  { label: "100-500",   token: "100-500"   },
  { label: "500-2K",    token: "500-2K"    },
  { label: "1K-5K",     token: "1K-5K"    },
  { label: "2K-10K",    token: "2K-10K"   },
  { label: "5K-20K",    token: "5K-20K"   },
];

const ROYALTY = 0.002;

// ─── Countdown helpers (12-hour UTC windows) ──────────────────────────────────
/** Seconds until the next 12-hour boundary (noon or midnight UTC). */
function secsToNext12HrUTC(): number {
  const now = new Date();
  const h = now.getUTCHours();
  const next = h < 12
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))      // noon
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));  // midnight
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
}
function fmtCountdown(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── Profit calc ───────────────────────────────────────────────────────────────
function calcProfit(price: number, lvl: typeof LEVELS[0]): number {
  const rate  = lvl.rateMin + Math.random() * (lvl.rateMax - lvl.rateMin);
  const gross = price * (rate / 100);
  return parseFloat((gross * (1 - lvl.systemCut) * (1 - ROYALTY)).toFixed(4));
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CollectedNFT {
  id: string;
  order_id: string;
  name: string;
  imageSource: any;
  price: number;
  profit: number;
  level: number;
  sold: boolean;
}

type ReservePhase = "idle" | "fetching" | "opening" | "nft_reveal" | "insufficient";
type SellPhase   = "idle" | "sell_sheet" | "listed" | "matchmaking" | "profit";

// ─── Spinner ───────────────────────────────────────────────────────────────────
function SpinnerRing() {
  const rotate = useSharedValue(0);
  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 900 }), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));
  return (
    <Animated.View style={[style, { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: "#E0F4FF", borderTopColor: "#5CBFFE" }]} />
  );
}

// ─── Dots loader ───────────────────────────────────────────────────────────────
function DotsLoader() {
  const d1 = useSharedValue(0.3);
  const d2 = useSharedValue(0.3);
  const d3 = useSharedValue(0.3);
  useEffect(() => {
    d1.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false);
    setTimeout(() => { d2.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false); }, 150);
    setTimeout(() => { d3.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false); }, 300);
  }, []);
  const s1 = useAnimatedStyle(() => ({ opacity: d1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value }));
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 60 }}>
      <Animated.View style={[s1, { width: 8, height: 8, borderRadius: 4, backgroundColor: "#5CBFFE" }]} />
      <Animated.View style={[s2, { width: 8, height: 8, borderRadius: 4, backgroundColor: "#5CBFFE" }]} />
      <Animated.View style={[s3, { width: 8, height: 8, borderRadius: 4, backgroundColor: "#5CBFFE" }]} />
    </View>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <View style={styles.emptyBox}>
      <Feather name={icon} size={34} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtAmt(n: number): string {
  if (n >= 1000) return `${n / 1000}k`;
  return String(n);
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ReserveScreen() {
  const { width: W } = useWindowDimensions();
  const { balance, totalDeposited, spendBalance, earnReserveProfit, todayReserveProfit, reserveProfit } = useBalance();
  const { token } = useAuth();
  const { createOrder, updateOrder, orders } = useOrders();
  const { stats: teamStats } = useReferral();
  const currentOrderIdRef = useRef<string>("");
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [activeTab,      setActiveTab]      = useState<"todays" | "reserve" | "collected">("reserve");
  const [selectedLevel,  setSelectedLevel]  = useState(LEVELS[0]);
  const [selectedAmount, setSelectedAmount] = useState(AMOUNTS[0]);
  const [levelOpen,      setLevelOpen]      = useState(false);
  const [amountOpen,     setAmountOpen]     = useState(false);

  // Team rewards (fetched from API)
  const [teamTotalReward, setTeamTotalReward] = useState(0);
  const [teamTodayReward, setTeamTodayReward] = useState(0);

  useEffect(() => {
    if (!token) return;
    authApi.rewards.getTeamReward(token).then((d: any) => {
      setTeamTotalReward(d.totalReward ?? 0);
      setTeamTodayReward(d.todayReward ?? 0);
    }).catch(() => {});
  }, [token]);

  // ── Level lock check ─────────────────────────────────────────────────────────
  function isLevelLocked(lvl: typeof LEVELS[0]): boolean {
    if (lvl.lv === 1) return false;
    if (totalDeposited < lvl.minDeposit) return true;
    if (teamStats.A.total < lvl.teamReq.A) return true;
    if (teamStats.B.total < lvl.teamReq.B) return true;
    if (teamStats.C.total < lvl.teamReq.C) return true;
    return false;
  }

  // Daily reservation limit
  const [reservedToday,    setReservedToday]    = useState(false);
  const [secondsLeft,      setSecondsLeft]      = useState(0);
  const [checkingDaily,    setCheckingDaily]    = useState(true);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch daily status on mount
  useEffect(() => {
    if (!token) { setCheckingDaily(false); return; }
    authApi.reserve.checkToday(token)
      .then((d) => {
        setReservedToday(d.reserved_today);
        if (d.reserved_today) setSecondsLeft(secsToNext12HrUTC());
      })
      .catch(() => {})
      .finally(() => setCheckingDaily(false));
  }, [token]);

  // Countdown ticker
  useEffect(() => {
    if (!reservedToday) {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      return;
    }
    setSecondsLeft(secsToNext12HrUTC());
    countdownRef.current = setInterval(() => {
      const s = secsToNext12HrUTC();
      setSecondsLeft(s);
      if (s <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setReservedToday(false);
      }
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [reservedToday]);

  // Reserve flow
  const [reservePhase, setReservePhase] = useState<ReservePhase>("idle");
  const [pendingNFT,   setPendingNFT]   = useState<{ name: string; imageSource: any; price: number; profit: number; level: number } | null>(null);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [expectedIncome, setExpectedIncome] = useState<[number, number]>([18, 19.5]);

  // Collected — restored from OrderContext on login, updated live during session
  const [collectedNFTs,    setCollectedNFTs]    = useState<CollectedNFT[]>([]);
  const [collectedLoading, setCollectedLoading] = useState(false);
  const hydrated = React.useRef(false);

  // Hydrate collectedNFTs once when orders load from storage (login / app restart)
  useEffect(() => {
    if (hydrated.current || collectedNFTs.length > 0) return;
    const loaded = orders
      .filter((o) => o.status === "bought" || o.status === "sold")
      .map((o) => ({
        id: o.order_id,
        order_id: o.order_id,
        name: o.nft_name,
        imageSource: o.image_source,
        price: o.price,
        profit: o.profit,
        level: o.level,
        sold: o.status === "sold",
      }));
    if (loaded.length > 0) {
      hydrated.current = true;
      setCollectedNFTs(loaded);
      console.log("[Reserve] Restored", loaded.length, "collected NFTs from orders");
    }
  }, [orders.length]);

  // Sell flow
  const [sellPhase,     setSellPhase]     = useState<SellPhase>("idle");
  const [profitRevealed, setProfitRevealed] = useState(false);
  const [activeSellNFT, setActiveSellNFT] = useState<CollectedNFT | null>(null);

  // ── 6 stat boxes ─────────────────────────────────────────────────────────────
  const rangeLabel = `${fmtAmt(selectedLevel.minPrice)}~${fmtAmt(selectedLevel.maxPrice)}`;
  const STAT_BOXES = [
    { label: "Today\nEarnings",         value: todayReserveProfit.toFixed(2), borderColor: "#5CBFFE"  },
    { label: "Cumulative\nIncome",      value: reserveProfit.toFixed(2),      borderColor: "#00AC4F"  },
    { label: "Team\nBenefits",          value: teamTotalReward.toFixed(2),    borderColor: "#BBBBBB"  },
    { label: "Reservation\nRange",      value: rangeLabel,                    borderColor: "#FF8C00"  },
    { label: "Wallet\nBalance",         value: balance.toFixed(1),            borderColor: "#5CBFFE"  },
    { label: "Balance for\nReservation",value: balance.toFixed(1),            borderColor: "#333333"  },
  ];

  // ── STEP 1: Tap "Reserve" ─────────────────────────────────────────────────
  const handleReserve = async () => {
    setFetchError(null);

    // Check daily limit
    if (reservedToday) {
      setFetchError(`You've already reserved this window. Next round opens in ${fmtCountdown(secondsLeft)}.`);
      return;
    }

    // Check level is unlocked
    if (isLevelLocked(selectedLevel)) {
      setFetchError(`Level ${selectedLevel.lv} is locked. Meet the deposit & team requirements first.`);
      return;
    }

    // Check sufficient balance for this level's minimum price
    if (balance < selectedLevel.minPrice) {
      setFetchError(`Need at least $${selectedLevel.minPrice} balance for ${selectedLevel.label}. Current: $${balance.toFixed(2)}`);
      return;
    }

    // Record today's reservation on backend (blocks double-tap)
    if (token) {
      try {
        await authApi.reserve.recordToday(token);
        setReservedToday(true);
      } catch (e: any) {
        if (e.message?.includes("already")) {
          setReservedToday(true);
          setSecondsLeft(secsToNext12HrUTC());
          setFetchError(`You've already reserved this window. Next round opens in ${fmtCountdown(secsToNext12HrUTC())}.`);
          return;
        }
        // non-fatal if column doesn't exist yet
      }
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // NFT price is capped at min(balance, levelMax)
    const nftMaxPrice = Math.min(balance, selectedLevel.maxPrice);
    const cappedPrice = parseFloat(
      (selectedLevel.minPrice + Math.random() * (nftMaxPrice - selectedLevel.minPrice)).toFixed(2)
    );

    const base = 10 + selectedLevel.lv * 3;
    setExpectedIncome([parseFloat(base.toFixed(1)), parseFloat((base + 1.5).toFixed(1))]);
    setReservePhase("fetching");

    try {
      const [nftData] = await Promise.all([
        nftApi.getRandom(selectedLevel.lv),
        new Promise<void>((res) => setTimeout(res, 1500 + Math.random() * 2000)),
      ]);

      setReservePhase("opening");

      // Use the balance-capped price, not the raw API price
      const finalPrice = cappedPrice;

      const orderId = createOrder({
        nft_name:     nftData.title,
        image_source: { uri: nftData.image_url },
        status:       "processing",
        profit:       0,
        price:        finalPrice,
        level:        selectedLevel.lv,
      });
      currentOrderIdRef.current = orderId;

      const profit = calcProfit(finalPrice, selectedLevel);

      await new Promise<void>((res) => setTimeout(res, 3500 + Math.random() * 3000));

      setPendingNFT({
        name:        nftData.title,
        imageSource: { uri: nftData.image_url },
        price:       finalPrice,
        profit,
        level:       selectedLevel.lv,
      });
      setReservePhase("nft_reveal");

    } catch (err: any) {
      setFetchError(err.message ?? "Failed to fetch NFT. Please try again.");
      setReservePhase("idle");
    }
  };

  // ── STEP 2: Confirm NFT reveal ────────────────────────────────────────────
  const handleNFTConfirm = () => {
    if (!pendingNFT) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const spent = spendBalance(pendingNFT.price, `NFT Purchase: ${pendingNFT.name}`);
    if (!spent) {
      setReservePhase("insufficient");
      return;
    }

    const newCollected: CollectedNFT = {
      id:          Date.now().toString(),
      order_id:    currentOrderIdRef.current,
      name:        pendingNFT.name,
      imageSource: pendingNFT.imageSource,
      price:       pendingNFT.price,
      profit:      pendingNFT.profit,
      level:       pendingNFT.level,
      sold:        false,
    };

    updateOrder(currentOrderIdRef.current, {
      status:       "bought",
      nft_name:     pendingNFT.name,
      image_source: pendingNFT.imageSource,
      profit:       pendingNFT.profit,
      price:        pendingNFT.price,
      level:        pendingNFT.level,
    });

    setReservePhase("idle");
    setPendingNFT(null);
    setCollectedLoading(true);
    setActiveTab("collected");

    setTimeout(() => {
      setCollectedNFTs((prev) => [newCollected, ...prev]);
      setCollectedLoading(false);
    }, 2000);
  };

  // ── STEP 3: Tap Sell ──────────────────────────────────────────────────────
  const handleSell = (nft: CollectedNFT) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSellNFT(nft);
    setSellPhase("sell_sheet");
  };

  // ── STEP 4: Confirm sale ──────────────────────────────────────────────────
  const handleCompleted = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSellPhase("listed");
    setTimeout(() => {
      setSellPhase("matchmaking");
      setTimeout(() => { setSellPhase("profit"); setProfitRevealed(false); }, 5000 + Math.random() * 2000);
    }, 1500);
  };

  // ── Lazy profit reveal ───────────────────────────────────────────────────
  useEffect(() => {
    if (sellPhase === "profit") {
      const delay = 3000 + Math.random() * 1000;
      const t = setTimeout(() => setProfitRevealed(true), delay);
      return () => clearTimeout(t);
    }
  }, [sellPhase]);

  // ── STEP 5: Collect profit ────────────────────────────────────────────────
  const handleProfitConfirm = () => {
    if (!activeSellNFT) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    earnReserveProfit(activeSellNFT.profit, activeSellNFT.price, `NFT Sale: ${activeSellNFT.name}`);
    setCollectedNFTs((prev) =>
      prev.map((n) => n.id === activeSellNFT.id ? { ...n, sold: true } : n)
    );
    updateOrder(activeSellNFT.order_id, { status: "sold" });

    if (token && activeSellNFT.profit > 0) {
      authApi.rewards.recordProfit(token, activeSellNFT.profit).catch(() => {});
    }

    setSellPhase("idle");
    setActiveSellNFT(null);
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>

      {/* ─── RESERVE MODALS ──────────────────────────────────────────────── */}
      <Modal visible={reservePhase !== "idle"} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>

          {/* Fetching / Opening */}
          {(reservePhase === "fetching" || reservePhase === "opening") && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.modalCard}>
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <SpinnerRing />
              </View>
              <View style={styles.incomeBox}>
                <Text style={styles.incomeBoxLabel}>
                  {reservePhase === "fetching" ? "Finding your NFT…" : "Preparing your NFT…"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <Text style={styles.incomeRange}>{expectedIncome[0]}~{expectedIncome[1]}</Text>
                </View>
                <Text style={[styles.incomeBoxLabel, { marginTop: 4 }]}>
                  Profit: {selectedLevel.rateMin}% – {selectedLevel.rateMax}%
                </Text>
              </View>
              <Text style={styles.openingTitle}>
                {reservePhase === "fetching" ? "Searching…" : "Opening…"}
              </Text>
              <View style={[styles.gradBtn, { opacity: 0.4 }]}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={styles.gradBtnText}>Confirm</Text>
              </View>
            </Animated.View>
          )}

          {/* Insufficient balance */}
          {reservePhase === "insufficient" && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.modalCard}>
              <Feather name="alert-circle" size={48} color="#FF6B6B" />
              <Text style={styles.revealTitle}>Insufficient Balance</Text>
              <Text style={[styles.matchingSub, { textAlign: "center" }]}>
                You need ${pendingNFT?.price.toFixed(2)} to purchase this NFT.{"\n"}
                Current balance: ${balance.toFixed(2)}
              </Text>
              <Pressable onPress={() => { setReservePhase("idle"); setPendingNFT(null); }} style={styles.gradBtn}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={styles.gradBtnText}>Close</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* NFT Revealed */}
          {reservePhase === "nft_reveal" && pendingNFT && (
            <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.modalCard}>
              <Text style={styles.revealTitle}>NFT Matched!</Text>

              <Image source={pendingNFT.imageSource} style={styles.revealImage} contentFit="cover" />
              <Text style={styles.revealName} numberOfLines={1}>{pendingNFT.name}</Text>

              <View style={styles.incomeBox}>
                <Text style={styles.incomeBoxLabel}>NFT Price</Text>
                <Text style={[styles.incomeRange, { color: Colors.textPrimary, fontSize: 18 }]}>
                  ${pendingNFT.price.toFixed(2)}
                </Text>
              </View>

              <View style={styles.incomeBox}>
                <Text style={styles.incomeBoxLabel}>Estimated Profit</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Text style={[styles.incomeRange, { color: "#2BD9A8" }]}>
                    +${pendingNFT.profit.toFixed(4)} USDT
                  </Text>
                </View>
              </View>

              <Text style={styles.matchingSub}>
                ${pendingNFT.price.toFixed(2)} will be deducted from your balance
              </Text>

              <Pressable onPress={handleNFTConfirm} style={styles.gradBtn}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={styles.gradBtnText}>Confirm Purchase</Text>
              </Pressable>

              <Pressable onPress={() => { setReservePhase("idle"); setPendingNFT(null); }}>
                <Text style={[styles.matchingSub, { color: "#FF6B6B", marginTop: 4 }]}>Cancel</Text>
              </Pressable>
            </Animated.View>
          )}

        </View>
      </Modal>

      {/* ─── SELL MODALS ─────────────────────────────────────────────────── */}
      <Modal visible={sellPhase !== "idle"} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>

          {/* Sell Sheet */}
          {sellPhase === "sell_sheet" && activeSellNFT && (
            <Animated.View entering={FadeInDown.duration(350).springify()} style={styles.sellCard}>
              <Pressable onPress={() => { setSellPhase("idle"); setActiveSellNFT(null); }} style={styles.closeBtn}>
                <Feather name="x" size={20} color={Colors.textPrimary} />
              </Pressable>

              <Image source={activeSellNFT.imageSource} style={styles.sellImage} contentFit="cover" />
              <Text style={styles.sellNFTName} numberOfLines={1}>{activeSellNFT.name}</Text>

              <Text style={styles.sellHeading}>Sell NFT</Text>

              <View style={styles.sellInfoRow}>
                <Text style={styles.feesLabel}>NFT Level</Text>
                <View style={styles.lvBadge}>
                  <Text style={styles.lvBadgeText}>Lv {activeSellNFT.level}</Text>
                </View>
              </View>

              <View style={styles.sellInfoRow}>
                <Text style={styles.feesLabel}>Royalty Fee</Text>
                <Text style={styles.royaltyValue}>0.2%</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.profitPreviewRow}>
                <Text style={styles.feesLabel}>Your Profit</Text>
                <Text style={styles.profitPreviewVal}>+${activeSellNFT.profit.toFixed(4)}</Text>
              </View>

              <Text style={[styles.matchingSub, { marginBottom: 4 }]}>
                Original price returned silently to your balance
              </Text>

              <Pressable onPress={handleCompleted} style={styles.gradBtn}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={styles.gradBtnText}>Confirm Sale</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Listed */}
          {sellPhase === "listed" && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.successCard}>
              <View style={styles.successCircle}>
                <Feather name="check" size={36} color="#fff" />
              </View>
              <Text style={styles.successText}>Listed Successfully</Text>
            </Animated.View>
          )}

          {/* Matchmaking */}
          {sellPhase === "matchmaking" && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.modalCard}>
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <SpinnerRing />
              </View>
              <Text style={styles.openingTitle}>Matching Buyer…</Text>
              <Text style={styles.matchingSub}>Finding the best offer for your NFT</Text>
            </Animated.View>
          )}

          {/* Profit popup */}
          {sellPhase === "profit" && activeSellNFT && (
            <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.modalCard}>
              <View style={styles.successCircle}>
                <Feather name="trending-up" size={28} color="#fff" />
              </View>
              <Text style={styles.revealTitle}>Sale Complete!</Text>
              <Image source={activeSellNFT.imageSource} style={styles.revealImage} contentFit="cover" />
              <View style={[styles.incomeBox, { borderWidth: 2, borderColor: "#2BD9A8" }]}>
                <Text style={styles.incomeBoxLabel}>Profit Received</Text>
                {profitRevealed ? (
                  <Animated.Text entering={FadeIn.duration(700)} style={[styles.incomeRange, { color: "#2BD9A8", fontSize: 28, marginTop: 4 }]}>
                    +${activeSellNFT.profit.toFixed(4)}
                  </Animated.Text>
                ) : (
                  <View style={styles.profitLoadingRow}>
                    <ActivityIndicator size="small" color="#2BD9A8" />
                    <Text style={styles.profitLoadingText}>Calculating profit…</Text>
                  </View>
                )}
                <Text style={[styles.incomeBoxLabel, { marginTop: 2 }]}>USDT credited to balance</Text>
              </View>
              {profitRevealed ? (
                <Pressable onPress={handleProfitConfirm} style={styles.gradBtn}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                  <Text style={styles.gradBtnText}>Collect Profit</Text>
                </Pressable>
              ) : (
                <View style={[styles.gradBtn, { backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }]}>
                  <Text style={[styles.gradBtnText, { color: "#9CA3AF" }]}>Please wait…</Text>
                </View>
              )}
            </Animated.View>
          )}

        </View>
      </Modal>

      {/* ─── MAIN SCROLL ─────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        onScrollBeginDrag={() => { setLevelOpen(false); setAmountOpen(false); }}
      >
        <StickyGlassHeader />
        <View style={{ height: 20 }} />

        {/* ── 6 Stat Boxes ─────────────────────────────────────────────── */}
        <View style={styles.boxGrid}>
          {STAT_BOXES.map((box, i) => (
            <View key={i} style={[styles.statBox, { borderLeftColor: box.borderColor, width: (W - 48) / 3 }]}>
              <Text style={styles.boxLabel} numberOfLines={2}>{box.label}</Text>
              <Text style={styles.boxValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{box.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Tabs Card ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.tabsRow}>
            {(["todays", "reserve", "collected"] as const).map((tab) => {
              const label = tab === "todays" ? "Today's" : tab === "reserve" ? "Reserve" : "Collected";
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => { setActiveTab(tab); setLevelOpen(false); setAmountOpen(false); }}
                  style={styles.tabBtn}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
                  {isActive && <View style={styles.tabUnderline} />}
                </Pressable>
              );
            })}
          </View>

          {/* ── RESERVE TAB ── */}
          {activeTab === "reserve" && (
            <View style={styles.reserveBody}>

              {/* Error banner */}
              {fetchError && (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={16} color="#FF6B6B" />
                  <Text style={styles.errorText}>{fetchError}</Text>
                </View>
              )}

              {/* Two selector buttons side by side */}
              <View style={styles.selectorsRow}>
                {/* Level selector */}
                <Pressable
                  style={[styles.selectorBtn, { flex: 1 }]}
                  onPress={() => { setLevelOpen((o) => !o); setAmountOpen(false); }}
                >
                  <Text style={styles.selectorLvLabel}>{selectedLevel.label}</Text>
                  <Text style={styles.selectorRate}>{selectedLevel.rate}</Text>
                  <Feather name={levelOpen ? "chevron-up" : "chevron-down"} size={16} color={Colors.textSecondary} />
                </Pressable>

                {/* Amount selector */}
                <Pressable
                  style={[styles.selectorBtn, { flex: 1 }]}
                  onPress={() => { setAmountOpen((o) => !o); setLevelOpen(false); }}
                >
                  <View style={styles.tokenBadge}><Text style={styles.tokenBadgeText}>T</Text></View>
                  <Text style={styles.selectorAmountText}>{selectedAmount.token}</Text>
                  <Feather name={amountOpen ? "chevron-up" : "chevron-down"} size={16} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {/* Level dropdown */}
              {levelOpen && (
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.inlineDropdown}>
                  <View style={styles.dropdownHeader}>
                    <Text style={styles.dropdownHdrLv}>LV</Text>
                    <Text style={[styles.dropdownHdrInc, { flex: 1 }]}>Income (%)  |  Range</Text>
                    <Text style={styles.dropdownHdrInc}>Status</Text>
                  </View>
                  {LEVELS.map((lvl) => {
                    const isSel    = lvl.lv === selectedLevel.lv;
                    const locked   = isLevelLocked(lvl);
                    const req      = lvl.teamReq;
                    return (
                      <Pressable
                        key={lvl.lv}
                        style={[styles.dropdownRow, isSel && styles.dropdownRowActive, locked && { opacity: 0.6 }]}
                        onPress={() => {
                          if (locked) {
                            setFetchError(`Lv${lvl.lv} requires $${lvl.minDeposit} deposit + ${req.A}A/${req.B}B/${req.C}C members`);
                            setLevelOpen(false);
                            return;
                          }
                          setSelectedLevel(lvl);
                          setLevelOpen(false);
                          setFetchError(null);
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                          {locked
                            ? <Feather name="lock" size={13} color="#FF6B6B" />
                            : <Feather name="unlock" size={13} color="#2BD9A8" />
                          }
                          <Text style={[styles.dropdownLv, isSel && styles.dropdownLvActive, locked && { color: "#FF6B6B" }]}>{lvl.label}</Text>
                        </View>
                        <Text style={[styles.dropdownRate, isSel && styles.dropdownRateActive, { flex: 2 }]}>
                          {lvl.rate}  {fmtAmt(lvl.minPrice)}~{fmtAmt(lvl.maxPrice)}
                        </Text>
                        <Text style={{ fontSize: 11, color: locked ? "#FF6B6B" : "#2BD9A8", fontFamily: "Inter_600SemiBold" }}>
                          {locked ? "Locked" : "Open"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Animated.View>
              )}

              {/* Amount dropdown */}
              {amountOpen && (
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.inlineDropdown}>
                  {AMOUNTS.map((amt) => {
                    const isSel = amt.token === selectedAmount.token;
                    return (
                      <Pressable
                        key={amt.token}
                        style={[styles.dropdownRow, isSel && styles.dropdownRowActive]}
                        onPress={() => { setSelectedAmount(amt); setAmountOpen(false); }}
                      >
                        <View style={styles.tokenBadgeSm}><Text style={styles.tokenBadgeSmText}>T</Text></View>
                        <Text style={[styles.dropdownAmtText, isSel && styles.dropdownRateActive]}>{amt.token}</Text>
                      </Pressable>
                    );
                  })}
                </Animated.View>
              )}

              {/* Reserve button — shows countdown after daily reservation */}
              <Pressable
                onPress={handleReserve}
                style={[styles.gradBtn, (reservedToday || checkingDaily) && { opacity: 0.65 }]}
                disabled={reservedToday || checkingDaily}
              >
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                {reservedToday
                  ? (
                    <View style={{ alignItems: "center", gap: 2 }}>
                      <Text style={[styles.gradBtnText, { fontSize: 13 }]}>Next Round In</Text>
                      <Text style={[styles.gradBtnText, { fontSize: 17, letterSpacing: 1 }]}>{fmtCountdown(secondsLeft)}</Text>
                    </View>
                  )
                  : <Text style={styles.gradBtnText}>Reserve NFT</Text>
                }
              </Pressable>

            </View>
          )}

          {/* ── TODAY'S TAB ── */}
          {activeTab === "todays" && (
            <View style={styles.listBody}>
              <EmptyState icon="clock" title="No earnings today" sub="Complete a reservation to start earning" />
            </View>
          )}

          {/* ── COLLECTED TAB ── */}
          {activeTab === "collected" && (
            <View style={styles.listBody}>
              {collectedLoading ? (
                <DotsLoader />
              ) : collectedNFTs.length === 0 ? (
                <EmptyState icon="package" title="No collected NFTs" sub="Complete a reservation to collect NFTs" />
              ) : (
                <View style={styles.collectedGrid}>
                  {collectedNFTs.map((nft) => (
                    <Animated.View key={nft.id} entering={FadeInDown.duration(400).springify()} style={[styles.collectedCard, { width: (W - 44) / 2 }]}>
                      <Image source={nft.imageSource} style={styles.collectedImage} contentFit="cover" />
                      <Text style={styles.collectedName} numberOfLines={1}>{nft.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <View style={styles.tBadgeSm}><Text style={styles.tBadgeSmText}>T</Text></View>
                        <Text style={styles.collectedPrice}>{nft.price.toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Feather name="trending-up" size={12} color="#2BD9A8" />
                        <Text style={styles.collectedProfit}>+{nft.profit.toFixed(4)}</Text>
                      </View>
                      {!nft.sold ? (
                        <Pressable onPress={() => handleSell(nft)} style={[styles.gradBtn, { marginTop: 10, paddingVertical: 10 }]}>
                          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={12} />
                          <Text style={[styles.gradBtnText, { fontSize: 14 }]}>Sell</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.soldBadge}>
                          <Text style={styles.soldText}>Sold ✓</Text>
                        </View>
                      )}
                    </Animated.View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 16,
  },

  sellCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    paddingTop: 50,
    alignItems: "center",
    gap: 12,
    position: "relative",
  },

  successCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 48,
    alignItems: "center",
    gap: 16,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#00C853",
    alignItems: "center",
    justifyContent: "center",
  },
  successText: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },

  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.offWhite,
    borderRadius: 16,
  },

  incomeBox: {
    width: "100%",
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  incomeBoxLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  incomeRange: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#5CBFFE" },
  openingTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  matchingSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },

  revealTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  revealImage: { width: 160, height: 160, borderRadius: 16 },
  revealName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, maxWidth: "90%", textAlign: "center" },

  sellImage: { width: 160, height: 160, borderRadius: 16 },
  sellNFTName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, textAlign: "center" },
  sellHeading: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary, alignSelf: "flex-start" },
  sellInfoRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  divider: { width: "100%", height: 1, backgroundColor: Colors.border },
  feesLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  royaltyValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  profitPreviewRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  profitPreviewVal: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#2BD9A8" },
  lvBadge: { backgroundColor: "#E0F4FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  lvBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#5CBFFE" },

  gradBtn: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gradBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", zIndex: 1 },

  // ── 6 Stat boxes ──────────────────────────────────────────────────────────
  boxGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14, gap: 10, marginBottom: 16 },
  statBox: {
    minHeight: 74,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    justifyContent: "space-between",
  },
  boxLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 13 },
  boxValue: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginTop: 4 },

  // ── Tabs card ──────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: 14,
    paddingBottom: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    minHeight: height * 0.55,
  },
  tabsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 14, position: "relative" },
  tabText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  tabTextActive: { fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  tabUnderline: { position: "absolute", bottom: 0, left: "15%", right: "15%", height: 3, borderRadius: 2, backgroundColor: "#5CBFFE" },

  reserveBody: { padding: 16, gap: 14 },
  listBody:    { padding: 16 },

  // ── Two selectors ──────────────────────────────────────────────────────────
  selectorsRow: { flexDirection: "row", gap: 10 },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorLvLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textPrimary, flex: 1 },
  selectorRate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#5CBFFE" },
  tokenBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tokenBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  selectorAmountText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, flex: 1 },

  // ── Inline dropdowns ───────────────────────────────────────────────────────
  inlineDropdown: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    overflow: "hidden",
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownHdrLv: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  dropdownHdrInc: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  dropdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  dropdownRowActive: { backgroundColor: "#F0F9FF" },
  dropdownLv: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  dropdownLvActive: { color: "#5CBFFE", fontFamily: "Inter_700Bold" },
  dropdownRate: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  dropdownRateActive: { color: "#5CBFFE", fontFamily: "Inter_600SemiBold" },
  dropdownAmtText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, flex: 1, marginLeft: 8 },

  tokenBadgeSm: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tokenBadgeSmText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },

  // ── Banners ────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF0F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#FF6B6B", flex: 1 },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyBox: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },

  // ── Collected grid ─────────────────────────────────────────────────────────
  collectedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  collectedCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  collectedImage: { width: "100%", height: 130, borderRadius: 12, marginBottom: 8 },
  collectedName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  collectedPrice: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  collectedProfit: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#2BD9A8" },
  soldBadge: { marginTop: 10, backgroundColor: "#F0FFF4", borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  soldText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#00C853" },

  tBadgeSm: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tBadgeSmText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },

  profitLoadingRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginTop: 6, marginBottom: 2,
  },
  profitLoadingText: {
    fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#2BD9A8",
  },
});
