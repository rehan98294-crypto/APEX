import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Image } from "expo-image";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { NFT, NFTS, TOP_COLLECTIONS, RARITY_COLORS } from "@/data/nfts";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 52) / 2;

const CATEGORIES = ["All", "Character", "Ape", "Robot", "Alien", "Animal"];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCat, setSelectedCat] = useState("All");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const filtered = selectedCat === "All" ? NFTS : NFTS.filter((n) => n.category === selectedCat);

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <StickyGlassHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={["#E8FFF3", "#EBF8FF", "#FFF0F8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroLeft}>
              <Text style={styles.heroTitle}>
                {"EXPLORE,\nDISCOVER\n& EARN BIG"}
              </Text>
              <Text style={styles.heroSub}>
                Web3 NFT Marketplace with AI-powered rewards
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/earn")}
                style={styles.heroBtn}
              >
                <Text style={styles.heroBtnText}>Start Earning</Text>
              </Pressable>
            </View>
            <View style={styles.heroRight}>
              <View style={styles.heroBadge}>
                <Feather name="trending-up" size={18} color={Colors.primary} />
                <Text style={styles.heroBadgeText}>Multi-Reward</Text>
              </View>
              <Image
                source={require("../../assets/images/nft1.avif")}
                style={styles.heroNFT}
                contentFit="cover"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Feature cards row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featureRow}>
          <FeatureCard icon="zap" color={Colors.accent} title="Multi-Reward" sub="AI-powered trading rewards" />
          <FeatureCard icon="trending-up" color={Colors.primary} title="Earn Future Value" sub="Dual earnings model" />
          <FeatureCard icon="bookmark" color={Colors.pink} title="Reserve NFTs" sub="Lock in your price now" />
        </ScrollView>

        {/* Top Collections */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Top Collections</Text>
            <Text style={styles.sectionSub}>Last 24 Hours</Text>
          </View>
          {TOP_COLLECTIONS.slice(0, 3).map((col, idx) => (
            <View key={col.id} style={styles.collectionRow}>
              <Text style={styles.collectionRank}>{idx + 1}</Text>
              <Image source={col.image} style={styles.collectionImg} contentFit="cover" />
              <View style={styles.collectionInfo}>
                <Text style={styles.collectionName}>{col.name}</Text>
                <View style={styles.collectionVolRow}>
                  <View style={styles.tokenIcon}>
                    <Text style={styles.tokenIconText}>T</Text>
                  </View>
                  <Text style={styles.collectionVol}>{col.volume.toFixed(2)}M</Text>
                </View>
              </View>
              <Text style={[styles.collectionChange, { color: col.change >= 0 ? Colors.primary : Colors.danger }]}>
                {col.change >= 0 ? "+" : ""}{col.change}%
              </Text>
            </View>
          ))}
        </View>

        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCat(cat);
              }}
              style={[styles.catPill, selectedCat === cat && styles.catPillActive]}
            >
              <Text style={[styles.catText, selectedCat === cat && styles.catTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* NFT Grid */}
        <View style={styles.grid}>
          {filtered.map((nft) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureCard({ icon, color, title, sub }: { icon: any; color: string; title: string; sub: string }) {
  return (
    <View style={[styles.featureCard, { borderLeftColor: color }]}>
      <View style={[styles.featureIconBox, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSub}>{sub}</Text>
    </View>
  );
}

function NFTCard({ nft }: { nft: NFT }) {
  const { isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const watched = isWatched(nft.id);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const rarityColor = RARITY_COLORS[nft.rarity];

  return (
    <Animated.View style={[animStyle, { width: CARD_WIDTH }]}>
      <Pressable
        onPress={() => router.push({ pathname: "/nft/[id]", params: { id: nft.id } })}
        onPressIn={() => { scale.value = withSpring(0.95, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        style={styles.nftCard}
      >
        <View style={styles.nftImageWrap}>
          <Image source={nft.image} style={styles.nftImage} contentFit="cover" />
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              watched
                ? removeFromWatchlist(nft.id)
                : addToWatchlist({ id: nft.id, name: nft.name, collection: nft.collection, price: nft.price, image: nft.image });
            }}
            style={styles.nftHeart}
          >
            <Feather name="heart" size={14} color={watched ? Colors.pink : Colors.textMuted} />
          </Pressable>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColor + "22", borderColor: rarityColor + "60" }]}>
            <Text style={[styles.rarityText, { color: rarityColor }]}>{nft.rarity}</Text>
          </View>
        </View>
        <View style={styles.nftInfo}>
          <Text style={styles.nftCollection}>{nft.collection}</Text>
          <Text style={styles.nftName} numberOfLines={1}>{nft.name}</Text>
          <View style={styles.nftPriceRow}>
            <View style={styles.tokenIconSm}>
              <Text style={styles.tokenIconSmText}>T</Text>
            </View>
            <Text style={styles.nftPrice}>{nft.priceToken}</Text>
            <Text style={styles.nftEth}>· {nft.price} ETH</Text>
          </View>
          <View style={styles.nftFooter}>
            <View style={styles.likesRow}>
              <Feather name="heart" size={11} color={Colors.textMuted} />
              <Text style={styles.likesText}>{(nft.likes / 1000).toFixed(1)}K</Text>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: "/nft/[id]", params: { id: nft.id } })}
              style={styles.buyNowBtn}
            >
              <Text style={styles.buyNowText}>Buy</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const HEADER_HEIGHT = Platform.OS === "web" ? 80 : 100;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  scrollContent: { paddingTop: HEADER_HEIGHT },
  tokenIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenIconText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  heroBanner: { marginHorizontal: 16, borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  heroGradient: { padding: 20, flexDirection: "row", alignItems: "center" },
  heroLeft: { flex: 1 },
  heroTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, lineHeight: 24, marginBottom: 8 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 17, marginBottom: 14 },
  heroBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignSelf: "flex-start",
  },
  heroBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  heroRight: { alignItems: "center", gap: 10, marginLeft: 12 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary + "15",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  heroNFT: { width: 90, height: 90, borderRadius: 16 },
  featureRow: { paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  featureCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    width: 160,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 6,
  },
  featureIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  featureSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 15 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  collectionRank: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textMuted, width: 18, textAlign: "center" },
  collectionImg: { width: 44, height: 44, borderRadius: 12 },
  collectionInfo: { flex: 1 },
  collectionName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  collectionVolRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  collectionVol: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  collectionChange: { fontSize: 14, fontFamily: "Inter_700Bold" },
  catRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  catTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: "space-between",
  },
  nftCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  nftImageWrap: { position: "relative" },
  nftImage: { width: "100%", height: CARD_WIDTH * 0.95, resizeMode: "cover" },
  nftHeart: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  rarityBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  rarityText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  nftInfo: { padding: 10, gap: 3 },
  nftCollection: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: Colors.accent, letterSpacing: 0.5 },
  nftName: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  nftPriceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  nftPrice: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  nftEth: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  nftFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  likesRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  likesText: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  buyNowBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buyNowText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
});
