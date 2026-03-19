import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
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
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { NFTS } from "@/data/nfts";

const { width } = Dimensions.get("window");
const CARD = (width - 52) / 3;

interface ActiveReservation {
  id: string;
  nft: (typeof NFTS)[0];
  startTime: number;
  incomeRate: number; // TFT per second
  claimed: number;
  lastClaim: number;
}

function calcAccumulated(r: ActiveReservation): number {
  const elapsed = (Date.now() - r.lastClaim) / 1000;
  return parseFloat((elapsed * r.incomeRate + r.claimed).toFixed(4));
}

export default function ReserveScreen() {
  const insets = useSafeAreaInsets();
  const { balance, earnReward } = useBalance();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [activeTab, setActiveTab] = useState<"browse" | "active">("browse");
  const [selectedNFT, setSelectedNFT] = useState<(typeof NFTS)[0] | null>(null);
  const [pendingIncome, setPendingIncome] = useState(0);
  const [activeReservations, setActiveReservations] = useState<ActiveReservation[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [todayIncome, setTodayIncome] = useState(0);
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reservedIds = activeReservations.map((r) => r.nft.id);

  // Tick every second to update accumulated income display
  useEffect(() => {
    timerRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const liveTotal = activeReservations.reduce((sum, r) => sum + calcAccumulated(r), 0);

  const handleSelectNFT = (nft: (typeof NFTS)[0]) => {
    if (reservedIds.includes(nft.id)) return;
    const income = parseFloat((nft.priceToken * 0.0185 + Math.random() * 0.3).toFixed(2));
    setPendingIncome(income);
    setSelectedNFT(nft);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleConfirm = () => {
    if (!selectedNFT) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const ratePerSec = parseFloat((pendingIncome / 86400).toFixed(8)); // spread over 24h
    const newReservation: ActiveReservation = {
      id: Date.now().toString(),
      nft: selectedNFT,
      startTime: Date.now(),
      incomeRate: ratePerSec,
      claimed: 0,
      lastClaim: Date.now(),
    };
    setActiveReservations((prev) => [newReservation, ...prev]);
    setTodayIncome((p) => parseFloat((p + pendingIncome).toFixed(2)));
    setTotalIncome((p) => parseFloat((p + pendingIncome).toFixed(2)));
    earnReward(pendingIncome, `Reservation income: ${selectedNFT.name}`);
    setSelectedNFT(null);
    setActiveTab("active");
  };

  const handleClaim = (reservationId: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveReservations((prev) =>
      prev.map((r) => {
        if (r.id !== reservationId) return r;
        const accumulated = calcAccumulated(r);
        earnReward(accumulated, `Claimed reservation income`);
        setTodayIncome((t) => parseFloat((t + accumulated).toFixed(4)));
        setTotalIncome((t) => parseFloat((t + accumulated).toFixed(4)));
        return { ...r, claimed: 0, lastClaim: Date.now() };
      })
    );
  };

  const handleCancel = (reservationId: string) => {
    setActiveReservations((prev) => prev.filter((r) => r.id !== reservationId));
  };

  const balanceForReservation = parseFloat((balance * 0.001 + 0.01).toFixed(2));

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn}>
            <Feather name="bell" size={20} color={Colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.iconBtn}>
            <Feather name="menu" size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Top 3 stat cards */}
        <View style={styles.statsRow}>
          <StatCard label="Total Income" value={(totalIncome + liveTotal).toFixed(2)} color={Colors.accent} />
          <StatCard label="Today" value={todayIncome.toFixed(2)} color={Colors.primary} />
          <StatCard label="Reserved" value={String(activeReservations.length)} color={Colors.pink} />
        </View>

        {/* Wallet info row */}
        <View style={styles.infoRow}>
          <InfoChip icon="layers" label="Range" value="1–1000" color={Colors.accent} />
          <InfoChip icon="credit-card" label="Wallet" value={balance.toFixed(2)} color={Colors.primary} />
          <InfoChip icon="lock" label="For Reserve" value={balanceForReservation.toFixed(2)} color={Colors.pink} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setActiveTab("browse")}
            style={[styles.tabPill, activeTab === "browse" && styles.tabPillActive]}
          >
            <Feather name="grid" size={14} color={activeTab === "browse" ? "#fff" : Colors.textSecondary} />
            <Text style={[styles.tabPillText, activeTab === "browse" && styles.tabPillTextActive]}>
              Browse NFTs
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("active")}
            style={[styles.tabPill, activeTab === "active" && styles.tabPillActive]}
          >
            <Feather name="activity" size={14} color={activeTab === "active" ? "#fff" : Colors.textSecondary} />
            <Text style={[styles.tabPillText, activeTab === "active" && styles.tabPillTextActive]}>
              My Reservations ({activeReservations.length})
            </Text>
          </Pressable>
        </View>

        {activeTab === "browse" ? (
          <>
            <Text style={styles.sectionLabel}>Tap an NFT to start earning income</Text>
            <View style={styles.grid}>
              {NFTS.map((nft) => {
                const reserved = reservedIds.includes(nft.id);
                return (
                  <Pressable
                    key={nft.id}
                    onPress={() => handleSelectNFT(nft)}
                    disabled={reserved}
                    style={[styles.nftCard, reserved && styles.nftCardDone]}
                  >
                    <Image source={nft.image} style={styles.nftImg} contentFit="cover" />
                    {reserved && (
                      <View style={styles.doneOverlay}>
                        <Feather name="check-circle" size={22} color="#fff" />
                      </View>
                    )}
                    <View style={styles.nftFooter}>
                      <View style={styles.tIconXs}><Text style={styles.tIconXsText}>T</Text></View>
                      <Text style={styles.nftPriceText}>{nft.priceToken}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.activeList}>
            {activeReservations.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="bookmark" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No active reservations</Text>
                <Text style={styles.emptySub}>Browse NFTs and reserve to start earning</Text>
                <Pressable onPress={() => setActiveTab("browse")} style={styles.browseNowBtn}>
                  <Text style={styles.browseNowText}>Browse NFTs</Text>
                </Pressable>
              </View>
            ) : (
              activeReservations.map((r) => {
                const accumulated = calcAccumulated(r);
                return (
                  <Animated.View key={r.id} entering={FadeIn.duration(300)} style={styles.activeCard}>
                    <Image source={r.nft.image} style={styles.activeImg} contentFit="cover" />
                    <View style={styles.activeInfo}>
                      <Text style={styles.activeName} numberOfLines={1}>{r.nft.name}</Text>
                      <Text style={styles.activeCollection}>{r.nft.collection}</Text>
                      <View style={styles.incomeRow}>
                        <View style={styles.tIconSm}><Text style={styles.tIconSmText}>T</Text></View>
                        <Text style={styles.accumulatedText}>{accumulated.toFixed(4)}</Text>
                        <Text style={styles.incomeLabel}> income</Text>
                      </View>
                      <View style={styles.cardActions}>
                        <Pressable
                          onPress={() => handleClaim(r.id)}
                          style={styles.claimBtn}
                        >
                          <LinearGradient
                            colors={[Colors.primaryLight, Colors.primary]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.claimBtnGrad}
                          >
                            <Text style={styles.claimBtnText}>Claim</Text>
                          </LinearGradient>
                        </Pressable>
                        <Pressable onPress={() => handleCancel(r.id)} style={styles.cancelBtn}>
                          <Feather name="x" size={14} color={Colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={!!selectedNFT}
        transparent
        animationType="none"
        onRequestClose={() => setSelectedNFT(null)}
        statusBarTranslucent
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.overlay}
        >
          <Pressable style={styles.overlayBg} onPress={() => setSelectedNFT(null)} />
          <Animated.View
            entering={SlideInDown.springify().damping(18).stiffness(200)}
            exiting={SlideOutDown.duration(220)}
            style={styles.modal}
          >
            {selectedNFT && (
              <>
                {/* NFT Image */}
                <View style={styles.modalImgWrap}>
                  <Image source={selectedNFT.image} style={styles.modalImg} contentFit="cover" />
                </View>

                {/* NFT Name */}
                <Text style={styles.modalNftName} numberOfLines={1}>{selectedNFT.name}</Text>

                {/* Income Section */}
                <View style={styles.modalIncomeBox}>
                  <Text style={styles.modalIncomeLabel}>Income</Text>
                  <View style={styles.modalAmountRow}>
                    <View style={styles.tIconMd}><Text style={styles.tIconMdText}>T</Text></View>
                    <Text style={styles.modalAmount}>{pendingIncome}</Text>
                  </View>
                </View>

                {/* Confirm */}
                <Pressable onPress={handleConfirm} style={styles.confirmWrap}>
                  <LinearGradient
                    colors={[Colors.accent, "#2D9FE0"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.confirmGrad}
                  >
                    <Text style={styles.confirmText}>Confirm</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => setSelectedNFT(null)} style={styles.cancelLink}>
                  <Text style={styles.cancelLinkText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValRow}>
        <View style={[styles.tIconXs, { backgroundColor: color }]}><Text style={styles.tIconXsText}>T</Text></View>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

function InfoChip({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={styles.infoChip}>
      <View style={[styles.infoIconBox, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={13} color={color} />
      </View>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  logo: { width: 130, height: 34 },
  headerRight: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },

  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14,
    padding: 12, borderTopWidth: 3, gap: 6,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  statValRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },

  infoRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  infoChip: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 10, gap: 4,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  infoIconBox: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  infoValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  infoLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.textMuted },

  tabsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  tabPill: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 9, borderRadius: 12,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
  },
  tabPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  tabPillTextActive: { color: "#fff" },

  sectionLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, paddingHorizontal: 16, marginBottom: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10 },
  nftCard: {
    width: CARD, backgroundColor: Colors.white, borderRadius: 14,
    overflow: "hidden", borderWidth: 1, borderColor: Colors.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  nftCardDone: { opacity: 0.55 },
  nftImg: { width: "100%", height: CARD },
  doneOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,172,79,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  nftFooter: { flexDirection: "row", alignItems: "center", gap: 4, padding: 7 },
  tIconXs: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  tIconXsText: { fontSize: 6, fontFamily: "Inter_700Bold", color: "#fff" },
  nftPriceText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textPrimary },

  activeList: { paddingHorizontal: 16, gap: 10 },
  emptyBox: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  browseNowBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, marginTop: 6 },
  browseNowText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },

  activeCard: {
    flexDirection: "row", backgroundColor: Colors.white, borderRadius: 16,
    overflow: "hidden", borderWidth: 1, borderColor: Colors.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    marginBottom: 2,
  },
  activeImg: { width: 90, height: 110 },
  activeInfo: { flex: 1, padding: 12, gap: 5 },
  activeName: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  activeCollection: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.accent },
  incomeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  tIconSm: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  tIconSmText: { fontSize: 7, fontFamily: "Inter_700Bold", color: "#fff" },
  accumulatedText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.primary },
  incomeLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  claimBtn: { flex: 1, borderRadius: 10, overflow: "hidden", height: 34 },
  claimBtnGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  claimBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  cancelBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.danger + "12", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.danger + "30",
  },

  overlay: { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modal: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 24, paddingHorizontal: 28, paddingBottom: 44,
    alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  modalImgWrap: {
    width: 150, height: 150, borderRadius: 20, overflow: "hidden",
    borderWidth: 2, borderColor: Colors.border,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
    marginBottom: 4,
  },
  modalImg: { width: "100%", height: "100%" },
  modalNftName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, maxWidth: 260 },
  modalIncomeBox: { alignItems: "center", gap: 2, marginVertical: 4 },
  modalIncomeLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  modalAmountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tIconMd: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  tIconMdText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  modalAmount: { fontSize: 40, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  confirmWrap: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 10 },
  confirmGrad: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  confirmText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.3 },
  cancelLink: { paddingVertical: 8 },
  cancelLinkText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textMuted },
});
