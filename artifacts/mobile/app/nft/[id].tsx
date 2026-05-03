import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Image } from "expo-image";
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { NFTS, RARITY_COLORS } from "@/data/nfts";

const { width } = Dimensions.get("window");

export default function NFTDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { availableBalance: balance, addReservation } = useBalance();
  const { isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [showBuyModal, setShowBuyModal] = useState(false);

  const nft = NFTS.find((n) => n.id === id);
  if (!nft) return null;

  const watched = isWatched(nft.id);
  const rarityColor = RARITY_COLORS[nft.rarity];
  const reservePrice = Math.round(nft.price * 100 * 10) / 10;

  const handleWatchlist = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    watched
      ? removeFromWatchlist(nft.id)
      : addToWatchlist({ id: nft.id, name: nft.name, collection: nft.collection, price: nft.price, image: nft.image });
  };

  const handleReserve = () => {
    if (reservePrice > balance) {
      Alert.alert("Insufficient Balance", `You need ${reservePrice} TFT to reserve this NFT.`);
      return;
    }
    Alert.alert(
      "Reserve This NFT",
      `Lock "${nft.name}" for ${reservePrice} TFT for 7 days?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reserve",
          onPress: () => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const ok = addReservation({
              nftId: nft.id,
              nftName: nft.name,
              nftImage: nft.image,
              collection: nft.collection,
              reservePrice,
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
              status: "confirmed",
            });
            if (ok) Alert.alert("Reserved!", "NFT reserved for 7 days! View in Reserve tab.");
          },
        },
      ]
    );
  };

  const handleBuy = () => {
    Alert.alert(
      "Buy NFT",
      `Purchase "${nft.name}" for ${nft.priceToken} TFT (${nft.price} ETH)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy Now",
          onPress: () => {
            if (balance >= nft.priceToken) {
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Purchased!", `You now own "${nft.name}"! 🎉`);
            } else {
              Alert.alert("Insufficient Balance", `You need ${nft.priceToken} TFT.`);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image source={nft.image} style={styles.nftImage} contentFit="cover" />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.2)"]}
            style={styles.imageGradient}
          />
          {/* Top Bar */}
          <View style={[styles.topBar, { top: insets.top + 4 }]}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
            </Pressable>
            <Pressable onPress={handleWatchlist} style={styles.heartBtn}>
              <Feather name="heart" size={20} color={watched ? Colors.pink : Colors.textMuted} />
            </Pressable>
          </View>
          {/* Rarity Badge */}
          <View style={[styles.rarityOverlay, { backgroundColor: rarityColor + "E0" }]}>
            <Text style={styles.rarityOverlayText}>{nft.rarity}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <Text style={styles.collectionText}>{nft.collection}</Text>
              <Text style={styles.nftTitle}>{nft.name}</Text>
              <View style={styles.ownerRow}>
                <View style={styles.ownerAvatar}><Text style={styles.ownerAvatarText}>{nft.owner[0]}</Text></View>
                <Text style={styles.ownerText}>by {nft.owner}</Text>
                <View style={styles.verifyIcon}><Feather name="check" size={10} color="#fff" /></View>
              </View>
            </View>
            <View style={styles.likesBox}>
              <Feather name="heart" size={18} color={Colors.pink} />
              <Text style={styles.likesCount}>{(nft.likes / 1000).toFixed(1)}K</Text>
            </View>
          </View>

          {/* Price Cards */}
          <View style={styles.priceGrid}>
            <View style={[styles.priceCard, { borderTopColor: Colors.primary }]}>
              <Text style={styles.priceCardLabel}>Current Price</Text>
              <View style={styles.priceRow}>
                <View style={styles.tokenIcon}><Text style={styles.tokenIconText}>T</Text></View>
                <Text style={styles.priceMain}>{nft.priceToken}</Text>
              </View>
              <Text style={styles.priceEth}>{nft.price} ETH</Text>
            </View>
            <View style={[styles.priceCard, { borderTopColor: Colors.pink }]}>
              <Text style={styles.priceCardLabel}>Reserve Fee</Text>
              <View style={styles.priceRow}>
                <View style={styles.tokenIcon}><Text style={styles.tokenIconText}>T</Text></View>
                <Text style={[styles.priceMain, { color: Colors.pink }]}>{reservePrice}</Text>
              </View>
              <Text style={styles.priceEth}>Hold 7 days</Text>
            </View>
          </View>

          {/* Properties */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Properties</Text>
            <View style={styles.propertiesGrid}>
              <PropertyChip label="Category" value={nft.category} color={Colors.accent} />
              <PropertyChip label="Rarity" value={nft.rarity} color={rarityColor} />
              <PropertyChip label="Royalty" value={`${nft.royalty}%`} color={Colors.primary} />
              <PropertyChip label="Mint Date" value={nft.mintDate} color={Colors.purple} />
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{nft.description}</Text>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsCard}>
              {[
                { label: "Token Standard", value: "ERC-721" },
                { label: "Blockchain", value: "Ethereum" },
                { label: "Collection", value: nft.collection },
                { label: "Royalty", value: `${nft.royalty}%` },
              ].map((d) => (
                <View key={d.label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{d.label}</Text>
                  <Text style={styles.detailValue}>{d.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={handleReserve} style={styles.reserveBtn}>
          <Feather name="bookmark" size={18} color={Colors.pink} />
          <Text style={styles.reserveBtnText}>Reserve</Text>
        </Pressable>
        <Pressable onPress={handleBuy} style={styles.buyBtn}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyBtnGrad}
          >
            <Feather name="shopping-bag" size={18} color="#fff" />
            <Text style={styles.buyBtnText}>Buy for {nft.priceToken} TFT</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function PropertyChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.propChip, { backgroundColor: color + "10", borderColor: color + "40" }]}>
      <Text style={[styles.propLabel, { color }]}>{label}</Text>
      <Text style={styles.propValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  imageContainer: { width, height: 360, position: "relative" },
  nftImage: { width: "100%", height: "100%" },
  imageGradient: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  heartBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  rarityOverlay: {
    position: "absolute", bottom: 16, right: 16,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  rarityOverlayText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 20 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  titleLeft: { flex: 1, gap: 4 },
  collectionText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.accent, letterSpacing: 0.5 },
  nftTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary, lineHeight: 27 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  ownerAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center",
  },
  ownerAvatarText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  ownerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  verifyIcon: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  likesBox: { alignItems: "center", gap: 4, padding: 10, backgroundColor: Colors.pink + "12", borderRadius: 14, borderWidth: 1, borderColor: Colors.pink + "30" },
  likesCount: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.pink },
  priceGrid: { flexDirection: "row", gap: 12 },
  priceCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 14,
    borderTopWidth: 3, borderTopColor: Colors.primary,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    gap: 6,
  },
  priceCardLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tokenIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  tokenIconText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  priceMain: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  priceEth: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  propertiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  propChip: { borderRadius: 10, padding: 10, borderWidth: 1, minWidth: "45%", flex: 1 },
  propLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 2 },
  propValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  descriptionText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 22 },
  detailsCard: {
    backgroundColor: Colors.white, borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
  },
  detailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  detailValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  reserveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.pink + "12", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.pink + "40",
  },
  reserveBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.pink },
  buyBtn: { flex: 1, borderRadius: 14, overflow: "hidden", height: 52 },
  buyBtnGrad: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buyBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
