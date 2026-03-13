import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { NFTS, RARITY_COLORS } from "@/data/nfts";

export default function ReserveScreen() {
  const insets = useSafeAreaInsets();
  const { balance, reservations, addReservation, cancelReservation } = useBalance();
  const [activeTab, setActiveTab] = useState<"browse" | "mine">("browse");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleReserve = (nftId: string, nftName: string, nftImage: any, collection: string, price: number) => {
    const reservePrice = Math.round(price * 100 * 10) / 10;
    if (reservePrice > balance) {
      Alert.alert(
        "Insufficient Balance",
        `You need ${reservePrice} TFT to reserve this NFT. Your balance: ${balance.toFixed(2)} TFT`
      );
      return;
    }
    Alert.alert(
      "Reserve NFT",
      `Reserve "${nftName}" for ${reservePrice} TFT?\n\nThis holds your spot for 7 days. Funds are refundable if you cancel.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reserve",
          onPress: () => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const ok = addReservation({
              nftId,
              nftName,
              nftImage,
              collection,
              reservePrice,
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
              status: "confirmed",
            });
            if (ok) {
              Alert.alert("Reserved!", `${nftName} has been reserved for 7 days.`);
              setActiveTab("mine");
            }
          },
        },
      ]
    );
  };

  const handleCancel = (id: string, name: string) => {
    Alert.alert(
      "Cancel Reservation",
      `Cancel reservation for "${name}"? Your TFT will be refunded.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Reservation",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            cancelReservation(id);
          },
        },
      ]
    );
  };

  const activeReservations = reservations.filter((r) => r.status === "confirmed");

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <LinearGradient
          colors={["#FFF0F8", "#EBF8FF"]}
          style={[styles.headerGradient, { paddingTop: topPad + 12 }]}
        >
          <Text style={styles.headerTitle}>Reserve NFTs</Text>
          <Text style={styles.headerSub}>Lock in your price before it's gone</Text>

          {/* How it works */}
          <View style={styles.howItWorks}>
            {[
              { icon: "bookmark", label: "Browse & Select" },
              { icon: "lock", label: "Pay Reserve Fee" },
              { icon: "clock", label: "Hold for 7 Days" },
              { icon: "check-circle", label: "Complete or Refund" },
            ].map((step, idx) => (
              <View key={step.label} style={styles.stepItem}>
                <View style={[styles.stepIcon, { backgroundColor: Colors.pink + "20" }]}>
                  <Feather name={step.icon as any} size={16} color={Colors.pink} />
                </View>
                <Text style={styles.stepLabel}>{step.label}</Text>
                {idx < 3 && <Feather name="chevron-right" size={14} color={Colors.textMuted} style={styles.stepArrow} />}
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab("browse")}
            style={[styles.tabBtn, activeTab === "browse" && styles.tabBtnActive]}
          >
            <Feather name="grid" size={15} color={activeTab === "browse" ? "#fff" : Colors.textSecondary} />
            <Text style={[styles.tabBtnText, activeTab === "browse" && styles.tabBtnTextActive]}>Browse NFTs</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("mine")}
            style={[styles.tabBtn, activeTab === "mine" && styles.tabBtnActive]}
          >
            <Feather name="bookmark" size={15} color={activeTab === "mine" ? "#fff" : Colors.textSecondary} />
            <Text style={[styles.tabBtnText, activeTab === "mine" && styles.tabBtnTextActive]}>
              My Reservations ({activeReservations.length})
            </Text>
          </Pressable>
        </View>

        {activeTab === "browse" ? (
          <View style={styles.section}>
            {NFTS.map((nft, idx) => {
              const reserved = reservations.find((r) => r.nftId === nft.id && r.status === "confirmed");
              const reservePrice = Math.round(nft.price * 100 * 10) / 10;
              const rarityColor = RARITY_COLORS[nft.rarity];
              return (
                <Animated.View key={nft.id} entering={FadeInDown.delay(idx * 60).springify()}>
                  <Pressable
                    onPress={() => router.push({ pathname: "/nft/[id]", params: { id: nft.id } })}
                    style={styles.browseCard}
                  >
                    <Image source={nft.image} style={styles.browseImg} />
                    <View style={styles.browseInfo}>
                      <Text style={styles.browseCollection}>{nft.collection}</Text>
                      <Text style={styles.browseName} numberOfLines={1}>{nft.name}</Text>
                      <View style={[styles.rarityBadge, { backgroundColor: rarityColor + "15", borderColor: rarityColor + "50" }]}>
                        <Text style={[styles.rarityText, { color: rarityColor }]}>{nft.rarity}</Text>
                      </View>
                      <View style={styles.browsePriceRow}>
                        <View>
                          <Text style={styles.browsePriceLabel}>NFT Price</Text>
                          <Text style={styles.browsePrice}>{nft.price} ETH</Text>
                        </View>
                        <View>
                          <Text style={styles.browsePriceLabel}>Reserve Fee</Text>
                          <View style={styles.reserveFeeRow}>
                            <View style={styles.tokenIconSm}><Text style={styles.tokenIconSmText}>T</Text></View>
                            <Text style={styles.reserveFee}>{reservePrice} TFT</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {reserved ? (
                      <View style={styles.reservedStamp}>
                        <Feather name="check" size={12} color={Colors.primary} />
                        <Text style={styles.reservedStampText}>Reserved</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleReserve(nft.id, nft.name, nft.image, nft.collection, nft.price)}
                        style={styles.reserveBtn}
                      >
                        <Text style={styles.reserveBtnText}>Reserve</Text>
                      </Pressable>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <View style={styles.section}>
            {activeReservations.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Feather name="bookmark" size={32} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No reservations yet</Text>
                <Text style={styles.emptySub}>Browse NFTs and reserve the ones you want</Text>
                <Pressable onPress={() => setActiveTab("browse")} style={styles.browseBtn}>
                  <Text style={styles.browseBtnText}>Browse NFTs</Text>
                </Pressable>
              </View>
            ) : (
              activeReservations.map((r, idx) => {
                const daysLeft = Math.max(0, Math.ceil((r.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
                const progress = 1 - daysLeft / 7;
                return (
                  <Animated.View key={r.id} entering={FadeInDown.delay(idx * 60).springify()}>
                    <View style={styles.reservationCard}>
                      <Image source={r.nftImage} style={styles.reservationImg} />
                      <View style={styles.reservationInfo}>
                        <Text style={styles.reservationCollection}>{r.collection}</Text>
                        <Text style={styles.reservationName} numberOfLines={2}>{r.nftName}</Text>
                        <View style={styles.reservationFeeRow}>
                          <View style={styles.tokenIconSm}><Text style={styles.tokenIconSmText}>T</Text></View>
                          <Text style={styles.reservationFee}>{r.reservePrice} TFT held</Text>
                        </View>
                        <View style={styles.reservationProgress}>
                          <View style={styles.progressBarLight}>
                            <View style={[styles.progressFillLight, { width: `${progress * 100}%` as any }]} />
                          </View>
                          <Text style={styles.daysLeft}>{daysLeft}d left</Text>
                        </View>
                        <View style={styles.reservationActions}>
                          <Pressable
                            onPress={() => router.push({ pathname: "/nft/[id]", params: { id: r.nftId } })}
                            style={styles.buyNowReserveBtn}
                          >
                            <Text style={styles.buyNowReserveBtnText}>Buy Now</Text>
                          </Pressable>
                          <Pressable onPress={() => handleCancel(r.id, r.nftName)} style={styles.cancelBtn}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 4 },
  headerSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 16 },
  howItWorks: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 14, padding: 12 },
  stepItem: { flex: 1, alignItems: "center", gap: 5, position: "relative" },
  stepIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepLabel: { fontSize: 9, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "center" },
  stepArrow: { position: "absolute", right: -4, top: 8 },
  tabRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginVertical: 16 },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnActive: { backgroundColor: Colors.pink, borderColor: Colors.pink },
  tabBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  tabBtnTextActive: { color: "#fff" },
  section: { paddingHorizontal: 16 },
  browseCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  browseImg: { width: 100, height: 140, resizeMode: "cover" },
  browseInfo: { flex: 1, padding: 12, gap: 5 },
  browseCollection: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: Colors.accent, letterSpacing: 0.5 },
  browseName: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  rarityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, alignSelf: "flex-start" },
  rarityText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  browsePriceRow: { flexDirection: "row", gap: 16, marginTop: 4 },
  browsePriceLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  browsePrice: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  reserveFeeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  tokenIconSm: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  tokenIconSmText: { fontSize: 7, fontFamily: "Inter_700Bold", color: "#fff" },
  reserveFee: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.primary },
  reserveBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: Colors.pink,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  reserveBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  reservedStamp: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary + "15",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  reservedStampText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  emptyState: { alignItems: "center", paddingVertical: 50, gap: 12 },
  emptyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  browseBtn: { backgroundColor: Colors.pink, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  browseBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  reservationCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reservationImg: { width: 90, resizeMode: "cover" },
  reservationInfo: { flex: 1, padding: 12, gap: 5 },
  reservationCollection: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: Colors.accent, letterSpacing: 0.5 },
  reservationName: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary, lineHeight: 17 },
  reservationFeeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  reservationFee: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  reservationProgress: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBarLight: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" },
  progressFillLight: { height: "100%", backgroundColor: Colors.pink, borderRadius: 2 },
  daysLeft: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.pink },
  reservationActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  buyNowReserveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  buyNowReserveBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  cancelBtn: { flex: 1, backgroundColor: Colors.danger + "12", borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: Colors.danger + "30" },
  cancelBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.danger },
});
