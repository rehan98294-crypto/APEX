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
import { fetchRandomNFT } from "@/lib/supabase";

const { width } = Dimensions.get("window");

const CONFIRM_GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

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

interface ActiveReservation {
  id: string;
  level: (typeof LEVELS)[0];
  amount: string;
  startTime: number;
  incomeRate: number;
  claimed: number;
  lastClaim: number;
}

function calcAccumulated(r: ActiveReservation): number {
  const elapsed = (Date.now() - r.lastClaim) / 1000;
  return parseFloat((elapsed * r.incomeRate + r.claimed).toFixed(4));
}

function LoadingPulse() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.15, { duration: 700 }), withTiming(1, { duration: 700 })), -1, false);
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1, false);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  return (
    <View style={{ alignItems: "center", marginBottom: 20 }}>
      <Animated.View style={[animStyle, { marginBottom: 16 }]}>
        <View style={loadingStyles.outerRing}>
          <View style={loadingStyles.innerRing}>
            <ActivityIndicator size="large" color="#5CBFFE" />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  outerRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E8F7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  innerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#C2EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function ReserveScreen() {
  const insets = useSafeAreaInsets();
  const { balance, earnReward } = useBalance();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [activeTab, setActiveTab] = useState<"todays" | "reserve" | "collected">("reserve");
  const [selectedLevel, setSelectedLevel] = useState(LEVELS[1]);
  const [selectedAmount, setSelectedAmount] = useState(AMOUNTS[1]);
  const [levelOpen, setLevelOpen] = useState(false);
  const [amountOpen, setAmountOpen] = useState(false);
  const [activeReservations, setActiveReservations] = useState<ActiveReservation[]>([]);
  const [collected, setCollected] = useState<ActiveReservation[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [todayIncome, setTodayIncome] = useState(0);
  const [teamBenefits] = useState(0.1);
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [modalPhase, setModalPhase] = useState<"hidden" | "loading" | "result">("hidden");
  const [resultNFT, setResultNFT] = useState<{ name: string; image: any } | null>(null);
  const [resultProfit, setResultProfit] = useState(0);

  const LOCAL_FALLBACKS = [
    require("../../assets/images/nft1.avif"),
    require("../../assets/images/nft2.avif"),
    require("../../assets/images/nft3.avif"),
    require("../../assets/images/nft4.avif"),
    require("../../assets/images/nft5.avif"),
    require("../../assets/images/nft6.avif"),
  ];

  useEffect(() => {
    timerRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const liveTotal = activeReservations.reduce((sum, r) => sum + calcAccumulated(r), 0);
  const cumulativeIncome = parseFloat((totalIncome + liveTotal).toFixed(2));
  const balanceForReservation = parseFloat((balance * 0.001 + 0.01).toFixed(2));

  const handleConfirm = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalPhase("loading");

    const delay = 3000 + Math.random() * 2000;
    const [nftData] = await Promise.all([
      fetchRandomNFT(),
      new Promise((res) => setTimeout(res, delay)),
    ]);

    const profit = parseFloat((Math.random() * 50 + 5).toFixed(2));
    const fallback = LOCAL_FALLBACKS[Math.floor(Math.random() * LOCAL_FALLBACKS.length)];
    setResultProfit(profit);
    setResultNFT(
      nftData
        ? { name: nftData.name, image: { uri: nftData.image_url } }
        : { name: `Stake_${Math.floor(Math.random() * 9000000 + 1000000)}`, image: fallback }
    );
    setModalPhase("result");
  };

  const handleResultConfirm = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const income = resultProfit;
    const ratePerSec = parseFloat((income / 86400).toFixed(10));
    const newR: ActiveReservation = {
      id: Date.now().toString(),
      level: selectedLevel,
      amount: selectedAmount.token,
      startTime: Date.now(),
      incomeRate: ratePerSec,
      claimed: 0,
      lastClaim: Date.now(),
    };
    setActiveReservations((prev) => [newR, ...prev]);
    setTodayIncome((p) => parseFloat((p + income).toFixed(4)));
    setTotalIncome((p) => parseFloat((p + income).toFixed(4)));
    earnReward(income, `Reservation Lv${selectedLevel.lv}`);
    setModalPhase("hidden");
    setResultNFT(null);
  };

  const handleClaim = (id: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveReservations((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const acc = calcAccumulated(r);
        earnReward(acc, "Claimed reservation income");
        setTodayIncome((t) => parseFloat((t + acc).toFixed(4)));
        setTotalIncome((t) => parseFloat((t + acc).toFixed(4)));
        return { ...r, claimed: 0, lastClaim: Date.now() };
      })
    );
  };

  const handleCancel = (id: string) => {
    const r = activeReservations.find((x) => x.id === id);
    if (r) setCollected((prev) => [{ ...r, claimed: calcAccumulated(r) }, ...prev]);
    setActiveReservations((prev) => prev.filter((x) => x.id !== id));
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

      {/* Reservation Result Modal */}
      <Modal
        visible={modalPhase !== "hidden"}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          {modalPhase === "loading" && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.modalCard}>
              <LoadingPulse />
              <Text style={styles.modalLoadingTitle}>Processing Reservation</Text>
              <Text style={styles.modalLoadingSub}>Fetching your NFT allocation…</Text>
            </Animated.View>
          )}

          {modalPhase === "result" && resultNFT && (
            <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.modalCard}>
              <View style={styles.modalTestBadge}>
                <Text style={styles.modalTestText}>TEST MODE</Text>
              </View>
              <Text style={styles.modalResultTitle}>Reservation Matched!</Text>
              <Image
                source={resultNFT.image}
                style={styles.modalNFTImage}
                contentFit="cover"
              />
              <Text style={styles.modalNFTName}>{resultNFT.name}</Text>
              <View style={styles.modalProfitBox}>
                <Text style={styles.modalProfitLabel}>Estimated Profit</Text>
                <View style={styles.modalProfitRow}>
                  <View style={styles.modalTIcon}><Text style={styles.modalTText}>T</Text></View>
                  <Text style={styles.modalProfitValue}>+{resultProfit.toFixed(2)} TFT</Text>
                </View>
              </View>
              <Pressable onPress={handleResultConfirm} style={styles.modalConfirmBtn}>
                <LinearGradient
                  colors={CONFIRM_GRAD}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                  borderRadius={14}
                />
                <Text style={styles.modalConfirmText}>Confirm & Collect</Text>
              </Pressable>
              <Pressable onPress={() => setModalPhase("hidden")} style={styles.modalCancelLink}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        onScrollBeginDrag={() => { setLevelOpen(false); setAmountOpen(false); }}
      >
        <StickyGlassHeader />

        {/* Gap between header and boxes */}
        <View style={{ height: 20 }} />

        {/* 6 stat boxes — 2 rows × 3 */}
        <View style={styles.boxGrid}>
          {STAT_BOXES.map((box, i) => (
            <View key={i} style={[styles.statBox, { borderLeftColor: box.borderColor }]}>
              <Text style={styles.boxLabel}>{box.label}</Text>
              <Text style={styles.boxValue}>{box.value}</Text>
            </View>
          ))}
        </View>

        {/* Section card */}
        <View style={styles.card}>
          {/* Tabs row */}
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

          {/* --- RESERVE TAB --- */}
          {activeTab === "reserve" && (
            <View style={styles.reserveBody}>
              {/* Selectors row */}
              <View style={styles.selectorsRow}>
                {/* Level dropdown */}
                <View style={{ flex: 1 }}>
                  <Pressable
                    style={styles.selectorBtn}
                    onPress={() => { setLevelOpen((o) => !o); setAmountOpen(false); }}
                  >
                    <Text style={styles.selectorLvLabel}>{selectedLevel.label}</Text>
                    <Text style={styles.selectorRate}>{selectedLevel.rate}</Text>
                    <Feather name={levelOpen ? "chevron-up" : "chevron-down"} size={16} color={Colors.textSecondary} />
                  </Pressable>

                  {levelOpen && (
                    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.dropdown}>
                      <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownHdrLv}>LV</Text>
                        <Text style={styles.dropdownHdrInc}>Income(%)</Text>
                      </View>
                      {LEVELS.map((lvl) => {
                        const isSel = lvl.lv === selectedLevel.lv;
                        return (
                          <Pressable
                            key={lvl.lv}
                            style={[styles.dropdownRow, isSel && styles.dropdownRowActive]}
                            onPress={() => { setSelectedLevel(lvl); setLevelOpen(false); }}
                          >
                            <Text style={[styles.dropdownLv, isSel && styles.dropdownLvActive]}>{lvl.label}</Text>
                            <Text style={[styles.dropdownRate, isSel && styles.dropdownRateActive]}>{lvl.rate}</Text>
                          </Pressable>
                        );
                      })}
                    </Animated.View>
                  )}
                </View>

                {/* Amount dropdown */}
                <View style={{ flex: 1 }}>
                  <Pressable
                    style={styles.selectorBtn}
                    onPress={() => { setAmountOpen((o) => !o); setLevelOpen(false); }}
                  >
                    <View style={styles.tokenBadge}>
                      <Text style={styles.tokenBadgeText}>T</Text>
                    </View>
                    <Text style={styles.selectorAmountText}>{selectedAmount.token}</Text>
                    <Feather name={amountOpen ? "chevron-up" : "chevron-down"} size={16} color={Colors.textSecondary} />
                    <Pressable style={styles.infoIcon} onPress={() => {}}>
                      <Feather name="info" size={14} color={Colors.textMuted} />
                    </Pressable>
                  </Pressable>

                  {amountOpen && (
                    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.dropdown}>
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
                </View>
              </View>

              {/* Confirm button */}
              <Pressable
                onPress={handleConfirm}
                style={styles.confirmWrap}
                onPressIn={() => {}}
              >
                <LinearGradient
                  colors={CONFIRM_GRAD}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmGrad}
                >
                  <Text style={styles.confirmText}>Confirm</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* --- TODAY'S TAB --- */}
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
                        <Pressable onPress={() => handleClaim(r.id)} style={styles.claimBtn}>
                          <LinearGradient colors={CONFIRM_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.claimBtnGrad}>
                            <Text style={styles.claimBtnText}>Claim</Text>
                          </LinearGradient>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => handleCancel(r.id)} style={styles.cancelBtn}>
                        <Feather name="x" size={14} color={Colors.danger} />
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* --- COLLECTED TAB --- */}
          {activeTab === "collected" && (
            <View style={styles.listBody}>
              {collected.length === 0 ? (
                <EmptyState icon="check-circle" title="Nothing collected yet" sub="Claim your reservation income to see it here" />
              ) : (
                collected.map((r) => (
                  <View key={r.id} style={[styles.resCard, { opacity: 0.75 }]}>
                    <View style={styles.resCardLeft}>
                      <Text style={styles.resLvBadge}>{r.level.label}</Text>
                      <Text style={styles.resAmount}>{r.amount}</Text>
                    </View>
                    <View style={styles.resCardRight}>
                      <Text style={styles.resIncomeVal}>+{r.claimed.toFixed(4)}</Text>
                      <Text style={styles.resIncomeLabel}>collected</Text>
                    </View>
                  </View>
                ))
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

  boxGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    width: (width - 48) / 3,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    paddingLeft: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 6,
  },
  boxLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 14 },
  boxValue: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },

  card: {
    marginHorizontal: 14,
    paddingBottom: 20,
  },

  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
  },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 14, position: "relative" },
  tabText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  tabTextActive: { fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "15%",
    right: "15%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "#5CBFFE",
  },

  reserveBody: { padding: 16, gap: 14 },

  selectorsRow: { flexDirection: "row", gap: 10, zIndex: 10 },
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
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  selectorLvLabel: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  selectorRate: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#5CBFFE", flex: 1 },
  selectorAmountText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, flex: 1 },

  tokenBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#5CBFFE", alignItems: "center", justifyContent: "center",
  },
  tokenBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  tokenBadgeSm: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#5CBFFE", alignItems: "center", justifyContent: "center",
  },
  tokenBadgeSmText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },

  infoIcon: { padding: 2 },

  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
    zIndex: 999,
    overflow: "hidden",
  },
  dropdownHeader: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 20,
  },
  dropdownHdrLv: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, width: 40 },
  dropdownHdrInc: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 20,
  },
  dropdownRowActive: { backgroundColor: "#EEF9FF" },
  dropdownLv: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, width: 40 },
  dropdownLvActive: { color: "#5CBFFE" },
  dropdownRate: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  dropdownRateActive: { color: "#5CBFFE", fontFamily: "Inter_700Bold" },
  dropdownAmtText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },

  confirmWrap: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  confirmGrad: { paddingVertical: 17, alignItems: "center", justifyContent: "center" },
  confirmText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },

  listBody: { padding: 16, gap: 10 },

  resCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resCardLeft: { flex: 1, gap: 4 },
  resLvBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF9FF",
    color: "#5CBFFE",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  resAmount: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  resCardRight: { alignItems: "flex-end", gap: 4 },
  resIncomeVal: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  resIncomeLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  claimBtn: { borderRadius: 10, overflow: "hidden", height: 30, minWidth: 64 },
  claimBtnGrad: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  claimBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  cancelBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.danger + "12",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.danger + "30",
  },

  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  emptySub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalTestBadge: {
    backgroundColor: "#FFF3E0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFB08A60",
  },
  modalTestText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#FF8C00", letterSpacing: 1 },
  modalLoadingTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, textAlign: "center", marginBottom: 8 },
  modalLoadingSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  modalResultTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 16, textAlign: "center" },
  modalNFTImage: { width: 200, height: 200, borderRadius: 20, marginBottom: 14 },
  modalNFTName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, marginBottom: 16 },
  modalProfitBox: {
    width: "100%",
    backgroundColor: "#F0FDF8",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2BD9A830",
  },
  modalProfitLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 8 },
  modalProfitRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#2BD9A8", alignItems: "center", justifyContent: "center" },
  modalTText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  modalProfitValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#2BD9A8" },
  modalConfirmBtn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalConfirmText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.3 },
  modalCancelLink: { paddingVertical: 6 },
  modalCancelText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
