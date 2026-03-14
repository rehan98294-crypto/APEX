import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
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
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { NFTS } from "@/data/nfts";

const { width } = Dimensions.get("window");
const CARD = (width - 52) / 3;

const RESERVATION_RANGE = { min: 1, max: 1000 };

function getIncomeForNFT(priceToken: number) {
  return parseFloat((priceToken * 0.017 + Math.random() * 0.5).toFixed(2));
}

export default function ReserveScreen() {
  const insets = useSafeAreaInsets();
  const { balance, earnReward, stakedTotal } = useBalance();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [totalIncome, setTotalIncome] = useState(18.36);
  const [totalReserved, setTotalReserved] = useState(0);
  const [selectedNFT, setSelectedNFT] = useState<(typeof NFTS)[0] | null>(null);
  const [pendingIncome, setPendingIncome] = useState(0);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);

  const balanceForReservation = parseFloat((balance * 0.001).toFixed(2));

  const handleSelectNFT = (nft: (typeof NFTS)[0]) => {
    if (confirmedIds.includes(nft.id)) return;
    const income = getIncomeForNFT(nft.priceToken);
    setPendingIncome(income);
    setSelectedNFT(nft);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleConfirm = () => {
    if (!selectedNFT) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    earnReward(pendingIncome, `Reservation income: ${selectedNFT.name}`);
    setTotalIncome((prev) => parseFloat((prev + pendingIncome).toFixed(2)));
    setTotalReserved((prev) => prev + 1);
    setConfirmedIds((prev) => [...prev, selectedNFT.id]);
    setSelectedNFT(null);
  };

  const handleClose = () => setSelectedNFT(null);

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <View style={styles.headerRow}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <View style={styles.headerIcons}>
              <Pressable style={styles.iconBtn}>
                <Feather name="bell" size={20} color={Colors.textPrimary} />
              </Pressable>
              <Pressable style={styles.iconBtn}>
                <Feather name="menu" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Top Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            label="Income"
            value={totalIncome.toFixed(2)}
            color={Colors.accent}
            accent
          />
          <StatCard
            label="Income"
            value={totalIncome.toFixed(2)}
            color={Colors.primary}
          />
          <StatCard
            label="Reserved"
            value={String(totalReserved)}
            color={Colors.pink}
          />
        </View>

        {/* Range & Balance Row */}
        <View style={styles.infoRow}>
          <InfoCard
            label="Reservation range"
            value={`${RESERVATION_RANGE.min}-${RESERVATION_RANGE.max}`}
            icon="layers"
            color={Colors.accent}
          />
          <InfoCard
            label="Wallet Balance"
            value={balance.toFixed(2)}
            icon="credit-card"
            color={Colors.primary}
          />
          <InfoCard
            label="Balance for Reservation"
            value={balanceForReservation.toFixed(2)}
            icon="lock"
            color={Colors.pink}
          />
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select NFT to Reserve</Text>
          <Text style={styles.sectionSub}>Tap an NFT to earn income</Text>
        </View>

        {/* NFT Grid */}
        <View style={styles.grid}>
          {NFTS.map((nft) => {
            const confirmed = confirmedIds.includes(nft.id);
            return (
              <Pressable
                key={nft.id}
                onPress={() => handleSelectNFT(nft)}
                style={[styles.nftCard, confirmed && styles.nftCardConfirmed]}
                disabled={confirmed}
              >
                <Image
                  source={nft.image}
                  style={styles.nftImage}
                  contentFit="cover"
                />
                {confirmed && (
                  <View style={styles.confirmedOverlay}>
                    <View style={styles.confirmedBadge}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  </View>
                )}
                <View style={styles.nftCardFooter}>
                  <View style={styles.tokenIconTiny}>
                    <Text style={styles.tokenIconTinyText}>T</Text>
                  </View>
                  <Text style={styles.nftPrice} numberOfLines={1}>
                    {nft.priceToken}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Info Note */}
        <View style={styles.noteCard}>
          <Feather name="info" size={15} color={Colors.accent} />
          <Text style={styles.noteText}>
            Tap any NFT to open a reservation slot and earn TFT income instantly upon confirmation.
          </Text>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={!!selectedNFT}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.overlay}>
          <Pressable style={styles.overlayBg} onPress={handleClose} />
          <Animated.View
            entering={SlideInDown.springify().damping(18).stiffness(200)}
            exiting={SlideOutDown.duration(200)}
            style={styles.modalCard}
          >
            {/* NFT Image */}
            {selectedNFT && (
              <>
                <View style={styles.modalImageWrap}>
                  <Image
                    source={selectedNFT.image}
                    style={styles.modalImage}
                    contentFit="cover"
                  />
                </View>

                {/* Income Label */}
                <Text style={styles.modalIncomeLabel}>Income</Text>

                {/* Income Amount */}
                <View style={styles.modalAmountRow}>
                  <View style={styles.tokenIconMd}>
                    <Text style={styles.tokenIconMdText}>T</Text>
                  </View>
                  <Text style={styles.modalAmount}>{pendingIncome}</Text>
                </View>

                {/* Confirm Button */}
                <Pressable onPress={handleConfirm} style={styles.confirmBtnWrap}>
                  <LinearGradient
                    colors={[Colors.accent, "#3AAEE8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.confirmBtn}
                  >
                    <Text style={styles.confirmBtnText}>Confirm</Text>
                  </LinearGradient>
                </Pressable>

                {/* Cancel */}
                <Pressable onPress={handleClose} style={styles.cancelLink}>
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

function StatCard({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: string;
  color: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: Colors.accent }]}>{value}</Text>
    </View>
  );
}

function InfoCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={[styles.infoIconBox, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  header: { paddingHorizontal: 20, marginBottom: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 130, height: 34 },
  headerIcons: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },

  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 3,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    gap: 4,
  },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },

  infoRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 18 },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 10,
    alignItems: "flex-start",
    gap: 5,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  infoIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  infoValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  infoLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 13 },

  sectionHeader: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  nftCard: {
    width: CARD,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  nftCardConfirmed: { opacity: 0.6, borderColor: Colors.primary + "60" },
  nftImage: { width: "100%", height: CARD },
  confirmedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,172,79,0.15)", alignItems: "center", justifyContent: "center" },
  confirmedBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  nftCardFooter: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  tokenIconTiny: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  tokenIconTinyText: { fontSize: 6, fontFamily: "Inter_700Bold", color: "#fff" },
  nftPrice: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textPrimary, flex: 1 },

  noteCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: Colors.accent + "10",
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.accent + "30",
  },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 17 },

  overlay: { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 40,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  modalImageWrap: {
    width: 140, height: 140,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 6,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  modalImage: { width: "100%", height: "100%" },
  modalIncomeLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  modalAmountRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  tokenIconMd: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  tokenIconMdText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  modalAmount: { fontSize: 36, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  confirmBtnWrap: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 8 },
  confirmBtn: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  confirmBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.3 },
  cancelLink: { marginTop: 4, paddingVertical: 6 },
  cancelLinkText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textMuted },
});
