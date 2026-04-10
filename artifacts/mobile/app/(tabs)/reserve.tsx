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
import { useBalance } from "@/context/BalanceContext";
import { useOrders } from "@/context/OrderContext";
import { fetchRandomNFT } from "@/lib/supabase";

const { width, height } = Dimensions.get("window");

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

const LEVELS = [
  { lv: 1, label: "Lv1", rate: "1.8-1.95%" },
  { lv: 2, label: "Lv2", rate: "2.1-2.5%" },
  { lv: 3, label: "Lv3", rate: "2.6-2.9%" },
  { lv: 4, label: "Lv4", rate: "3.1-3.5%" },
  { lv: 5, label: "Lv5", rate: "3.7-4.3%" },
  { lv: 6, label: "Lv6", rate: "4.35-4.65%" },
];

const AMOUNTS = [
  { label: "100-500", token: "100-500" },
  { label: "500-2K", token: "500-2K" },
  { label: "1K-5K", token: "1K-5K" },
  { label: "2K-10K", token: "2K-10K" },
  { label: "5K-20K", token: "5K-20K" },
];

const LOCAL_FALLBACKS = [
  require("../../assets/images/nft1.png"),
  require("../../assets/images/nft2.png"),
  require("../../assets/images/nft3.png"),
  require("../../assets/images/nft4.avif"),
  require("../../assets/images/nft5.avif"),
  require("../../assets/images/nft6.png"),
];

interface ActiveReservation {
  id: string;
  level: (typeof LEVELS)[0];
  amount: string;
  startTime: number;
  incomeRate: number;
  claimed: number;
  lastClaim: number;
}

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

type ReservePhase = "idle" | "opening" | "nft_reveal";
type SellPhase = "idle" | "sell_sheet" | "listed" | "matchmaking" | "profit";

function calcAccumulated(r: ActiveReservation): number {
  const elapsed = (Date.now() - r.lastClaim) / 1000;
  return parseFloat((elapsed * r.incomeRate + r.claimed).toFixed(4));
}

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

function DotsLoader() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);
  useEffect(() => {
    dot1.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false);
    setTimeout(() => { dot2.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false); }, 150);
    setTimeout(() => { dot3.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false); }, 300);
  }, []);
  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 60 }}>
      <Animated.View style={[s1, { width: 8, height: 8, borderRadius: 4, backgroundColor: "#5CBFFE" }]} />
      <Animated.View style={[s2, { width: 8, height: 8, borderRadius: 4, backgroundColor: "#5CBFFE" }]} />
      <Animated.View style={[s3, { width: 8, height: 8, borderRadius: 4, backgroundColor: "#5CBFFE" }]} />
    </View>
  );
}

export default function ReserveScreen() {
  const insets = useSafeAreaInsets();
  const { balance, earnReward } = useBalance();
  const { createOrder, updateOrder } = useOrders();
  const currentOrderIdRef = useRef<string>("");
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [activeTab, setActiveTab] = useState<"todays" | "reserve" | "collected">("reserve");
  const [selectedLevel, setSelectedLevel] = useState(LEVELS[1]);
  const [selectedAmount, setSelectedAmount] = useState(AMOUNTS[1]);
  const [levelOpen, setLevelOpen] = useState(false);
  const [amountOpen, setAmountOpen] = useState(false);
  const [activeReservations, setActiveReservations] = useState<ActiveReservation[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [todayIncome, setTodayIncome] = useState(0);
  const [teamBenefits] = useState(0.1);
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reserve modal state
  const [reservePhase, setReservePhase] = useState<ReservePhase>("idle");
  const [pendingNFT, setPendingNFT] = useState<{ name: string; imageSource: any; price: number; profit: number; level: number } | null>(null);
  const [expectedIncome, setExpectedIncome] = useState<[number, number]>([18, 19.5]);

  // Collected tab state
  const [collectedNFTs, setCollectedNFTs] = useState<CollectedNFT[]>([]);
  const [collectedLoading, setCollectedLoading] = useState(false);

  // Sell flow state
  const [sellPhase, setSellPhase] = useState<SellPhase>("idle");
  const [activeSellNFT, setActiveSellNFT] = useState<CollectedNFT | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const liveTotal = activeReservations.reduce((sum, r) => sum + calcAccumulated(r), 0);
  const cumulativeIncome = parseFloat((totalIncome + liveTotal).toFixed(2));

  // ─── STEP 1: Tap Confirm on Reserve tab ──────────────────────────────────
  const handleReserve = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const orderId = createOrder({
      nft_name: "",
      image_source: null,
      status: "processing",
      profit: 0,
      price: 0,
      level: selectedLevel.lv,
    });
    currentOrderIdRef.current = orderId;

    // Show expected income based on level
    const base = 10 + selectedLevel.lv * 3;
    setExpectedIncome([parseFloat((base).toFixed(1)), parseFloat((base + 1.5).toFixed(1))]);
    setReservePhase("opening");

    const openingDelay = 5000 + Math.random() * 5000; // 5–10s
    const [nftData] = await Promise.all([
      fetchRandomNFT(),
      new Promise((res) => setTimeout(res, openingDelay)),
    ]);

    const profit = parseFloat((Math.random() * 50 + 5).toFixed(2));
    const fallback = LOCAL_FALLBACKS[Math.floor(Math.random() * LOCAL_FALLBACKS.length)];
    const price = parseFloat((Math.random() * 200 + 80).toFixed(2));

    setPendingNFT(
      nftData
        ? { name: nftData.name, imageSource: { uri: nftData.image_url }, price, profit, level: nftData.level }
        : { name: `Apex_${Math.floor(Math.random() * 900000 + 100000)}`, imageSource: fallback, price, profit, level: selectedLevel.lv }
    );
    setReservePhase("nft_reveal");
  };

  // ─── STEP 2: Confirm after NFT reveal ────────────────────────────────────
  const handleNFTConfirm = () => {
    if (!pendingNFT) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newCollected: CollectedNFT = {
      id: Date.now().toString(),
      order_id: currentOrderIdRef.current,
      name: pendingNFT.name,
      imageSource: pendingNFT.imageSource,
      price: pendingNFT.price,
      profit: pendingNFT.profit,
      level: pendingNFT.level,
      sold: false,
    };

    updateOrder(currentOrderIdRef.current, {
      status: "bought",
      nft_name: pendingNFT.name,
      image_source: pendingNFT.imageSource,
      profit: pendingNFT.profit,
      price: pendingNFT.price,
      level: pendingNFT.level,
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

  // ─── STEP 3: Tap Sell on collected card ──────────────────────────────────
  const handleSell = (nft: CollectedNFT) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSellNFT(nft);
    setSellPhase("sell_sheet");
  };

  // ─── STEP 4: Tap Completed on sell sheet ─────────────────────────────────
  const handleCompleted = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSellPhase("listed");

    // Auto-dismiss listed success after 1.5s → start matchmaking
    setTimeout(() => {
      setSellPhase("matchmaking");
      const matchDelay = 5000 + Math.random() * 2000; // 5–7s
      setTimeout(() => {
        setSellPhase("profit");
      }, matchDelay);
    }, 1500);
  };

  // ─── STEP 5: Confirm profit ───────────────────────────────────────────────
  const handleProfitConfirm = () => {
    if (!activeSellNFT) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    earnReward(activeSellNFT.profit, `NFT Sale: ${activeSellNFT.name}`);
    setTodayIncome((p) => parseFloat((p + activeSellNFT.profit).toFixed(4)));
    setTotalIncome((p) => parseFloat((p + activeSellNFT.profit).toFixed(4)));
    setCollectedNFTs((prev) => prev.map((n) => n.id === activeSellNFT.id ? { ...n, sold: true } : n));
    updateOrder(activeSellNFT.order_id, { status: "sold" });

    setSellPhase("idle");
    setActiveSellNFT(null);
  };

  const STAT_BOXES = [
    { label: "Today\nEarnings", value: todayIncome.toFixed(2), borderColor: "#5CBFFE" },
    { label: "Cumulative\nIncome", value: cumulativeIncome.toFixed(2), borderColor: "#00AC4F" },
    { label: "Team Benefits", value: teamBenefits.toFixed(1), borderColor: "#BBBBBB" },
    { label: "Reservation\nrange", value: "1~2000", borderColor: "#FF8C00" },
    { label: "Wallet Balance", value: balance.toFixed(1), borderColor: "#5CBFFE" },
    { label: "Balance for\nReservation", value: balance.toFixed(1), borderColor: "#333333" },
  ];

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>

      {/* ─── RESERVE MODALS ─────────────────────────────────────────── */}
      <Modal visible={reservePhase !== "idle"} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>

          {/* Phase 1: Opening */}
          {reservePhase === "opening" && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.modalCard}>
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <SpinnerRing />
              </View>

              <View style={styles.incomeBox}>
                <Text style={styles.incomeBoxLabel}>Expected income</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={styles.tBadge}><Text style={styles.tBadgeText}>T</Text></View>
                  <Text style={styles.incomeRange}>{expectedIncome[0]}~{expectedIncome[1]}</Text>
                </View>
              </View>

              <Text style={styles.openingTitle}>Opening...</Text>

              <View style={[styles.gradBtn, { opacity: 0.5 }]}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={styles.gradBtnText}>Confirm</Text>
              </View>
            </Animated.View>
          )}

          {/* Phase 2: NFT Revealed */}
          {reservePhase === "nft_reveal" && pendingNFT && (
            <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.modalCard}>
              <Text style={styles.revealTitle}>NFT Matched!</Text>

              <Image source={pendingNFT.imageSource} style={styles.revealImage} contentFit="cover" />

              <Text style={styles.revealName} numberOfLines={1}>{pendingNFT.name}</Text>

              <View style={styles.incomeBox}>
                <Text style={styles.incomeBoxLabel}>Estimated Profit</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={styles.tBadge}><Text style={styles.tBadgeText}>T</Text></View>
                  <Text style={styles.incomeRange}>+{pendingNFT.profit.toFixed(2)} TFT</Text>
                </View>
              </View>

              <Pressable onPress={handleNFTConfirm} style={styles.gradBtn}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={styles.gradBtnText}>Confirm</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </Modal>

      {/* ─── SELL MODALS ────────────────────────────────────────────── */}
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
              <Text style={styles.sellHeading}>Sell</Text>

              <View style={styles.sellPriceRow}>
                <Text style={styles.sellFieldLabel}>Price</Text>
              </View>
              <View style={styles.sellInputRow}>
                <View style={styles.sellCurrencyPill}>
                  <View style={styles.tBadgeSm}><Text style={styles.tBadgeSmText}>T</Text></View>
                  <Text style={styles.sellCurrencyText}>USDT</Text>
                  <Feather name="chevron-down" size={14} color={Colors.textSecondary} />
                </View>
                <View style={styles.sellAmountBox}>
                  <Text style={styles.sellAmountText}>{activeSellNFT.price.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.feesRow}>
                <Text style={styles.feesLabel}>Fees</Text>
              </View>
              <View style={styles.royaltyRow}>
                <Text style={styles.royaltyLabel}>Royalty</Text>
                <Text style={styles.royaltyValue}>0.2 %</Text>
              </View>

              <Pressable onPress={handleCompleted} style={styles.gradBtn}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={styles.gradBtnText}>Completed</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Listed Successfully */}
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
              <Text style={styles.openingTitle}>Matching buyer...</Text>
              <Text style={styles.matchingSub}>Finding the best offer for your NFT</Text>
            </Animated.View>
          )}

          {/* Profit Popup */}
          {sellPhase === "profit" && activeSellNFT && (
            <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.modalCard}>
              <Text style={styles.revealTitle}>Sale Complete!</Text>

              <Image source={activeSellNFT.imageSource} style={styles.revealImage} contentFit="cover" />

              <View style={styles.incomeBox}>
                <Text style={styles.incomeBoxLabel}>Profit Received</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={styles.tBadge}><Text style={styles.tBadgeText}>T</Text></View>
                  <Text style={[styles.incomeRange, { color: "#2BD9A8" }]}>+{activeSellNFT.profit.toFixed(2)} TFT</Text>
                </View>
              </View>

              <Pressable onPress={handleProfitConfirm} style={styles.gradBtn}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={styles.gradBtnText}>Confirm</Text>
              </Pressable>
            </Animated.View>
          )}

        </View>
      </Modal>

      {/* ─── MAIN SCROLL ────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        onScrollBeginDrag={() => { setLevelOpen(false); setAmountOpen(false); }}
      >
        <StickyGlassHeader />
        <View style={{ height: 20 }} />

        {/* Stat Boxes */}
        <View style={styles.boxGrid}>
          {STAT_BOXES.map((box, i) => (
            <View key={i} style={[styles.statBox, { borderLeftColor: box.borderColor }]}>
              <Text style={styles.boxLabel} numberOfLines={2}>{box.label}</Text>
              <Text style={styles.boxValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{box.value}</Text>
            </View>
          ))}
        </View>

        {/* Tabs Card */}
        <View style={styles.card}>
          <View style={styles.tabsRow}>
            {(["todays", "reserve", "collected"] as const).map((tab) => {
              const label = tab === "todays" ? "Today's" : tab === "reserve" ? "Reserve" : "Collected";
              const isActive = activeTab === tab;
              return (
                <Pressable key={tab} onPress={() => { setActiveTab(tab); setLevelOpen(false); setAmountOpen(false); }} style={styles.tabBtn}>
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
                  {isActive && <View style={styles.tabUnderline} />}
                </Pressable>
              );
            })}
          </View>

          {/* ── RESERVE TAB ── */}
          {activeTab === "reserve" && (
            <View style={styles.reserveBody}>
              {/* Selectors row */}
              <View style={styles.selectorsRow}>
                <Pressable style={[styles.selectorBtn, { flex: 1 }]} onPress={() => { setLevelOpen((o) => !o); setAmountOpen(false); }}>
                  <Text style={styles.selectorLvLabel}>{selectedLevel.label}</Text>
                  <Text style={styles.selectorRate}>{selectedLevel.rate}</Text>
                  <Feather name={levelOpen ? "chevron-up" : "chevron-down"} size={16} color={Colors.textSecondary} />
                </Pressable>

                <Pressable style={[styles.selectorBtn, { flex: 1 }]} onPress={() => { setAmountOpen((o) => !o); setLevelOpen(false); }}>
                  <View style={styles.tokenBadge}><Text style={styles.tokenBadgeText}>T</Text></View>
                  <Text style={styles.selectorAmountText}>{selectedAmount.token}</Text>
                  <Feather name={amountOpen ? "chevron-up" : "chevron-down"} size={16} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {/* Inline level dropdown */}
              {levelOpen && (
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.inlineDropdown}>
                  <View style={styles.dropdownHeader}>
                    <Text style={styles.dropdownHdrLv}>LV</Text>
                    <Text style={styles.dropdownHdrInc}>Income (%)</Text>
                  </View>
                  {LEVELS.map((lvl) => {
                    const isSel = lvl.lv === selectedLevel.lv;
                    return (
                      <Pressable key={lvl.lv} style={[styles.dropdownRow, isSel && styles.dropdownRowActive]} onPress={() => { setSelectedLevel(lvl); setLevelOpen(false); }}>
                        <Text style={[styles.dropdownLv, isSel && styles.dropdownLvActive]}>{lvl.label}</Text>
                        <Text style={[styles.dropdownRate, isSel && styles.dropdownRateActive]}>{lvl.rate}</Text>
                      </Pressable>
                    );
                  })}
                </Animated.View>
              )}

              {/* Inline amount dropdown */}
              {amountOpen && (
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.inlineDropdown}>
                  {AMOUNTS.map((amt) => {
                    const isSel = amt.token === selectedAmount.token;
                    return (
                      <Pressable key={amt.token} style={[styles.dropdownRow, isSel && styles.dropdownRowActive]} onPress={() => { setSelectedAmount(amt); setAmountOpen(false); }}>
                        <View style={styles.tokenBadgeSm}><Text style={styles.tokenBadgeSmText}>T</Text></View>
                        <Text style={[styles.dropdownAmtText, isSel && styles.dropdownRateActive]}>{amt.token}</Text>
                      </Pressable>
                    );
                  })}
                </Animated.View>
              )}

              <Pressable onPress={handleReserve} style={styles.gradBtn}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={styles.gradBtnText}>Confirm</Text>
              </Pressable>
            </View>
          )}

          {/* ── TODAY'S TAB ── */}
          {activeTab === "todays" && (
            <View style={styles.listBody}>
              {activeReservations.length === 0 ? (
                <EmptyState icon="clock" title="No earnings today" sub="Make a reservation to start earning" />
              ) : (
                activeReservations.map((r) => {
                  const accumulated = calcAccumulated(r);
                  return (
                    <View key={r.id} style={styles.resCard}>
                      <View style={styles.resCardLeft}>
                        <Text style={styles.resLvBadge}>{r.level.label}</Text>
                        <Text style={styles.resAmount}>{r.amount}</Text>
                      </View>
                      <View style={styles.resCardRight}>
                        <Text style={styles.resIncomeVal}>+{accumulated.toFixed(4)}</Text>
                        <Text style={styles.resIncomeLabel}>income</Text>
                      </View>
                    </View>
                  );
                })
              )}
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
                    <Animated.View key={nft.id} entering={FadeInDown.duration(400).springify()} style={styles.collectedCard}>
                      <Image source={nft.imageSource} style={styles.collectedImage} contentFit="cover" />
                      <Text style={styles.collectedName} numberOfLines={1}>{nft.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <View style={styles.tBadgeSm}><Text style={styles.tBadgeSmText}>T</Text></View>
                        <Text style={styles.collectedPrice}>{nft.price.toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Feather name="trending-up" size={12} color="#2BD9A8" />
                        <Text style={styles.collectedProfit}>+{nft.profit.toFixed(2)}</Text>
                      </View>
                      {!nft.sold ? (
                        <Pressable onPress={() => handleSell(nft)} style={[styles.gradBtn, { marginTop: 10, paddingVertical: 10 }]}>
                          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={12} />
                          <Text style={[styles.gradBtnText, { fontSize: 14 }]}>Sell</Text>
                        </Pressable>
                      ) : (
                        <View style={[styles.soldBadge]}>
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

function EmptyState({ icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <View style={styles.emptyBox}>
      <Feather name={icon} size={34} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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
    paddingTop: 48,
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
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.offWhite,
    borderRadius: 16,
  },

  // Opening modal
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
  matchingSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },

  // NFT Reveal
  revealTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 4 },
  revealImage: { width: 180, height: 180, borderRadius: 16 },
  revealName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, maxWidth: "90%", textAlign: "center" },

  // Sell sheet
  sellImage: { width: 180, height: 180, borderRadius: 16 },
  sellNFTName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, textAlign: "center" },
  sellHeading: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary, alignSelf: "flex-start" },
  sellPriceRow: { width: "100%", marginBottom: 4 },
  sellFieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  sellInputRow: { width: "100%", flexDirection: "row", gap: 10 },
  sellCurrencyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
  },
  sellCurrencyText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, flex: 1 },
  sellAmountBox: {
    flex: 1.4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sellAmountText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  divider: { width: "100%", height: 1, backgroundColor: Colors.border },
  feesRow: { width: "100%", marginBottom: 4 },
  feesLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  royaltyRow: { width: "100%", flexDirection: "row", justifyContent: "space-between" },
  royaltyLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  royaltyValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },

  // Badges
  tBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  tBadgeSm: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tBadgeSmText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },

  // Gradient button
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

  // Stat boxes
  boxGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14, gap: 10, marginBottom: 16 },
  statBox: {
    width: (width - 48) / 3,
    minHeight: 74,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 10,
    paddingLeft: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    justifyContent: "space-between",
  },
  boxLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 13 },
  boxValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginTop: 4 },

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
    minHeight: height * 0.62,
  },

  tabsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 14, position: "relative" },
  tabText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  tabTextActive: { fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  tabUnderline: { position: "absolute", bottom: 0, left: "15%", right: "15%", height: 3, borderRadius: 2, backgroundColor: "#5CBFFE" },

  reserveBody: { padding: 16, gap: 14 },
  selectorsRow: { flexDirection: "row", gap: 10 },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorLvLabel: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  selectorRate: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#5CBFFE", flex: 1 },
  selectorAmountText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, flex: 1 },
  tokenBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#5CBFFE", alignItems: "center", justifyContent: "center" },
  tokenBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  tokenBadgeSm: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#5CBFFE", alignItems: "center", justifyContent: "center" },
  tokenBadgeSmText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },

  inlineDropdown: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    overflow: "hidden",
  },
  dropdownHeader: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 20 },
  dropdownHdrLv: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, width: 40 },
  dropdownHdrInc: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  dropdownRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 16 },
  dropdownRowActive: { backgroundColor: "#F0F9FF" },
  dropdownLv: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, width: 40 },
  dropdownLvActive: { color: "#5CBFFE" },
  dropdownRate: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  dropdownRateActive: { color: "#5CBFFE", fontFamily: "Inter_600SemiBold" },
  dropdownAmtText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },

  listBody: { padding: 16 },
  emptyBox: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },

  resCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  resCardLeft: { flex: 1, gap: 4 },
  resCardRight: { alignItems: "flex-end", gap: 4 },
  resLvBadge: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#5CBFFE" },
  resAmount: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  resIncomeVal: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#2BD9A8" },
  resIncomeLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },

  // Collected grid
  collectedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  collectedCard: {
    width: (width - 56) / 2,
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
  collectedName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  collectedPrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  collectedProfit: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#2BD9A8" },
  soldBadge: { marginTop: 10, backgroundColor: "#F0FFF4", borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  soldText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#00C853" },
});
