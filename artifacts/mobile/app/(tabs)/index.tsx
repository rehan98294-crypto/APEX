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

const VERIFIED_BADGE = require("@/assets/verified-badge.png");

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 52) / 2;

const CATEGORIES = ["Stake", "Polygon NFT", "Art", "Collectible"];

const FEATURED_COLLECTIONS = [
  {
    id: "fc1",
    name: "Apex Penguins",
    creator: "APEX_STUDIO",
    totalItems: 10,
    mainImage: require("../../assets/images/nft1.avif"),
    previews: [
      require("../../assets/images/nft2.avif"),
      require("../../assets/images/nft3.avif"),
      require("../../assets/images/nft4.avif"),
    ],
    creatorAvatar: require("../../assets/images/nft5.avif"),
    gradColors: ["#C2EEFF", "#D4F7EC", "#FFE8D6"] as [string, string, string],
    verified: true,
  },
  {
    id: "fc2",
    name: "Ice Peng Club",
    creator: "WILLOUGHBY",
    totalItems: 6,
    mainImage: require("../../assets/images/nft6.avif"),
    previews: [
      require("../../assets/images/nft7.avif"),
      require("../../assets/images/nft8.avif"),
      require("../../assets/images/nft9.avif"),
    ],
    creatorAvatar: require("../../assets/images/nft10.avif"),
    gradColors: ["#E0D4FF", "#C2EEFF", "#FFD6EF"] as [string, string, string],
    verified: true,
  },
];

const HOT_HERO = {
  id: "h1",
  name: "CoolAPE_0069292",
  price: "1.03K USDT",
  image: require("../../assets/images/nft6.avif"),
  creatorAvatar: require("../../assets/images/nft4.avif"),
};

const HOT_PICKS = [
  {
    id: "hp1",
    name: "CoolAPE_0087392",
    price: "1.04K",
    image: require("../../assets/images/nft7.avif"),
    creatorAvatar: require("../../assets/images/nft5.avif"),
  },
  {
    id: "hp2",
    name: "CoolAPE_0084755",
    price: "1.04K",
    image: require("../../assets/images/nft8.avif"),
    creatorAvatar: require("../../assets/images/nft3.avif"),
  },
  {
    id: "hp3",
    name: "CoolAPE_0091038",
    price: "1.05K",
    image: require("../../assets/images/nft9.avif"),
    creatorAvatar: require("../../assets/images/nft2.avif"),
  },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCat, setSelectedCat] = useState("All");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const filtered = selectedCat === "All" ? NFTS : NFTS.filter((n) => n.category === selectedCat);

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <StickyGlassHeader />
        <View style={{ height: 20 }} />

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
                <LinearGradient colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={20} />
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
        <View style={styles.topColSection}>
          <Text style={styles.topColTitle}>TOP COLLECTIONS OVER</Text>
          <View style={styles.topColSubRow}>
            <Text style={styles.topColSub}>Last 24 Hours</Text>
            <Pressable style={styles.topColMoreBtn}>
              <Text style={styles.topColMoreText}>More</Text>
              <Feather name="chevron-right" size={14} color={Colors.textPrimary} />
            </Pressable>
          </View>
          {TOP_COLLECTIONS.map((col, idx) => {
            const volStr = col.volume >= 1000
              ? `${(col.volume / 1000).toFixed(2)}B`
              : `${col.volume.toFixed(2)}M`;
            const isLast = idx === TOP_COLLECTIONS.length - 1;
            return (
              <View key={col.id} style={[styles.topColRow, !isLast && styles.topColRowDivider]}>
                <Text style={styles.topColRank}>{idx + 1}</Text>
                <Image source={col.image} style={styles.topColAvatar} contentFit="cover" />
                <View style={styles.topColInfo}>
                  <View style={styles.topColNameRow}>
                    <Text style={styles.topColName}>{col.name}</Text>
                    {col.name === "Penguin Pals" && (
                      <Image source={VERIFIED_BADGE} style={styles.verifiedBadgeSm} contentFit="contain" />
                    )}
                  </View>
                  <View style={styles.topColVolRow}>
                    <View style={styles.topColTIcon}>
                      <Text style={styles.topColTText}>T</Text>
                    </View>
                    <Text style={styles.topColVol}>{volStr}</Text>
                  </View>
                </View>
                <Text style={[styles.topColChange, { color: col.change >= 0 ? "#2BD9A8" : Colors.danger }]}>
                  {col.change >= 0 ? "+" : ""}{col.change}%
                </Text>
              </View>
            );
          })}
        </View>

        {/* Reserve & Sell Promo */}
        <View style={styles.promoSection}>
          <Text style={styles.promoHeadline}>RESERVE AND SELL{"\n"}YOUR NFT EASILY</Text>
          <Text style={styles.promoSub}>
            Earning income in treasureFun is simple: just{"\n"}RESERVE and then TRADE to EARN
          </Text>
          <Pressable style={styles.promoBtn}>
            <LinearGradient
              colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              borderRadius={30}
            />
            <Text style={styles.promoBtnText}>SIGN UP NOW</Text>
          </Pressable>
          <View style={styles.promoFanContainer}>
            <Image source={require("../../assets/images/nft2.avif")} style={styles.promoFanLeft} contentFit="cover" />
            <Image source={require("../../assets/images/nft1.avif")} style={styles.promoFanCenter} contentFit="cover" />
            <Image source={require("../../assets/images/nft3.avif")} style={styles.promoFanRight} contentFit="cover" />
          </View>
        </View>

        {/* Discover More NFTs */}
        <View style={styles.discoverSection}>
          <Text style={styles.discoverTitle}>Discover more NFTs</Text>
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
                {selectedCat === cat && (
                  <LinearGradient colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={20} />
                )}
                <Text style={[styles.catText, selectedCat === cat && styles.catTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.discoverGrid}>
            {NFTS.slice(0, 6).map((nft, idx) => (
              <NFTCard key={nft.id} nft={nft} idx={idx} />
            ))}
          </View>
        </View>

        {/* Featured Collections Section */}
        <View style={styles.featSection}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Featured Collections</Text>
          </View>
          {FEATURED_COLLECTIONS.map((col) => (
            <FeaturedCollectionCard key={col.id} col={col} />
          ))}
        </View>

        {/* Hot Picks Section */}
        <View style={styles.hotSection}>
          <Text style={styles.sectionTitle}>Hot Picks</Text>
          <View style={{ height: 12 }} />

          {/* Hero NFT */}
          <Image
            source={HOT_HERO.image}
            style={styles.hotHeroImg}
            contentFit="cover"
          />
          <View style={styles.hotHeroInfo}>
            <View style={styles.hotHeroLeft}>
              <Image source={HOT_HERO.creatorAvatar} style={styles.hotHeroAvatar} contentFit="cover" />
              <Text style={styles.hotHeroName}>{HOT_HERO.name}</Text>
              <Image source={VERIFIED_BADGE} style={styles.verifiedBadgeSm} contentFit="contain" />
            </View>
            <View style={styles.hotHeroRight}>
              <Text style={styles.hotHeroBidLabel}>Highest Bid</Text>
              <View style={styles.hotHeroPriceRow}>
                <View style={styles.hotTIcon}><Text style={styles.hotTText}>T</Text></View>
                <Text style={styles.hotHeroPrice}>{HOT_HERO.price}</Text>
              </View>
            </View>
          </View>

          {/* Small cards row */}
          <View style={styles.hotSmallRow}>
            {HOT_PICKS.map((item) => (
              <View key={item.id} style={styles.hotSmallCard}>
                <Image source={item.image} style={styles.hotSmallImg} contentFit="cover" />
                <Text style={styles.hotSmallName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.hotSmallBottom}>
                  <Image source={item.creatorAvatar} style={styles.hotSmallAvatar} contentFit="cover" />
                  <View style={styles.hotTIcon}><Text style={styles.hotTText}>T</Text></View>
                  <Text style={styles.hotSmallPrice}>{item.price}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FeaturedCollectionCard({ col }: { col: typeof FEATURED_COLLECTIONS[0] }) {
  const imgH = 180;
  const smH = (imgH - 8) / 3;
  const smW = (width - 32 - 16 - 12) * 0.38;
  const mainW = (width - 32 - 16 - 12) * 0.6;

  return (
    <View style={styles.featCard}>
      <LinearGradient
        colors={col.gradColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Image row */}
      <View style={styles.featImgRow}>
        {/* Main large image */}
        <Image
          source={col.mainImage}
          style={[styles.featMainImg, { width: mainW, height: imgH }]}
          contentFit="cover"
        />
        {/* Three small previews */}
        <View style={styles.featSmallCol}>
          {col.previews.map((src, i) => (
            <Image
              key={i}
              source={src}
              style={[styles.featSmallImg, { width: smW, height: smH }]}
              contentFit="cover"
            />
          ))}
        </View>
      </View>

      {/* Info row */}
      <View style={styles.featColNameRow}>
        <Text style={styles.featColName}>{col.name}</Text>
        {col.verified && (
          <Image source={VERIFIED_BADGE} style={styles.verifiedBadgeMd} contentFit="contain" />
        )}
      </View>
      <View style={styles.featInfoRow}>
        <View style={styles.featCreatorRow}>
          <Image source={col.creatorAvatar} style={styles.featAvatar} contentFit="cover" />
          <Text style={styles.featCreatorLabel}>by </Text>
          <Text style={styles.featCreatorName}>{col.creator}</Text>
        </View>
        <View style={styles.featTotalChip}>
          <LinearGradient
            colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.featTotalText}>TOTAL {col.totalItems} ITEM</Text>
        </View>
      </View>
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

const STAKE_NAMES = [
  "Stake_2000029", "Stake_2000602", "Stake_2000519",
  "Stake_2000875", "Stake_2000131", "Stake_2000831",
];
const STAKE_PRICES = ["497 USDT", "492 USDT", "496 USDT", "587 USDT", "501 USDT", "534 USDT"];

function NFTCard({ nft, idx = 0 }: { nft: NFT; idx?: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[animStyle, styles.discoverCard]}>
      <Pressable
        onPress={() => router.push({ pathname: "/nft/[id]", params: { id: nft.id } })}
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      >
        <Image source={nft.image} style={styles.discoverCardImg} contentFit="cover" />
        <View style={styles.discoverCardInfo}>
          <Text style={styles.discoverCardName} numberOfLines={1}>{STAKE_NAMES[idx] ?? nft.name}</Text>
          <View style={styles.discoverCardPriceRow}>
            <View style={styles.discoverTIcon}><Text style={styles.discoverTText}>T</Text></View>
            <Text style={styles.discoverCardPrice}>{STAKE_PRICES[idx] ?? nft.priceToken}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  tokenIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenIconText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },

  discoverSection: { paddingHorizontal: 16, marginBottom: 16 },
  discoverTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 14, letterSpacing: -0.3, textAlign: "center" },
  discoverGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  discoverCard: {
    width: (width - 44) / 2,
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  discoverCardImg: { width: "100%", height: 150, borderRadius: 14 },
  discoverCardInfo: { padding: 10, gap: 6 },
  discoverCardName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  discoverCardPriceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  discoverTIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#2BD9A8", alignItems: "center", justifyContent: "center" },
  discoverTText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  discoverCardPrice: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#2BD9A8" },
  heroBanner: { marginHorizontal: 16, borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  heroGradient: { padding: 20, flexDirection: "row", alignItems: "center" },
  heroLeft: { flex: 1 },
  heroTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, lineHeight: 24, marginBottom: 8 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 17, marginBottom: 14 },
  heroBtn: {
    backgroundColor: "transparent",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignSelf: "flex-start",
    overflow: "hidden",
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

  topColSection: { paddingHorizontal: 16, marginBottom: 16 },
  topColTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary, letterSpacing: -0.5 },
  topColSubRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2, marginBottom: 12 },
  topColSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  topColMoreBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  topColMoreText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  topColRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  topColRowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  topColRank: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary, width: 22, textAlign: "center" },
  topColAvatar: { width: 52, height: 52, borderRadius: 26 },
  topColInfo: { flex: 1 },
  topColNameRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  topColName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  verifiedBadgeSm: { width: 15, height: 15 },
  verifiedBadgeMd: { width: 20, height: 20 },
  topColVolRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  topColTIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#2BD9A8", alignItems: "center", justifyContent: "center" },
  topColTText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  topColVol: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  topColChange: { fontSize: 15, fontFamily: "Inter_700Bold", minWidth: 52, textAlign: "right" },
  catRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catPillActive: { backgroundColor: "transparent", borderColor: "transparent", overflow: "hidden" },
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
    backgroundColor: "transparent",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: "hidden",
  },
  buyNowText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },

  featSection: { paddingHorizontal: 16, marginTop: 24, gap: 14 },
  featCard: {
    borderRadius: 20,
    overflow: "hidden",
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  featImgRow: { flexDirection: "row", gap: 6 },
  featMainImg: { borderRadius: 14 },
  featSmallCol: { flex: 1, gap: 4 },
  featSmallImg: { borderRadius: 10 },
  featColNameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  featColName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  featInfoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  featCreatorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  featAvatar: { width: 28, height: 28, borderRadius: 14 },
  featCreatorLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  featCreatorName: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  featTotalChip: {
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  featTotalText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.3 },

  hotSection: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  hotHeroImg: {
    width: "100%",
    height: 280,
    borderRadius: 18,
  },
  hotHeroInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 16,
  },
  hotHeroLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  hotHeroAvatar: { width: 32, height: 32, borderRadius: 16 },
  hotHeroName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textPrimary, flex: 1 },
  hotHeroRight: { alignItems: "flex-end", gap: 4 },
  hotHeroBidLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  hotHeroPriceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  hotTIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#2BD9A8", alignItems: "center", justifyContent: "center" },
  hotTText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  hotHeroPrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  hotSmallRow: { flexDirection: "row", gap: 10 },
  hotSmallCard: { flex: 1, gap: 6 },
  hotSmallImg: { width: "100%", aspectRatio: 1, borderRadius: 14 },
  hotSmallName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, lineHeight: 16 },
  hotSmallBottom: { flexDirection: "row", alignItems: "center", gap: 5 },
  hotSmallAvatar: { width: 18, height: 18, borderRadius: 9 },
  hotSmallPrice: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.textPrimary },

  promoSection: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "flex-start",
    backgroundColor: "#F5F8FF",
    marginHorizontal: 0,
    marginBottom: 8,
  },
  promoHeadline: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  promoSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 24,
  },
  promoBtn: {
    overflow: "hidden",
    borderRadius: 30,
    paddingHorizontal: 36,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  promoBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  promoFanContainer: {
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  promoFanLeft: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 18,
    left: "5%",
    top: 30,
    transform: [{ rotate: "-12deg" }],
    zIndex: 1,
  },
  promoFanCenter: {
    position: "absolute",
    width: 185,
    height: 185,
    borderRadius: 18,
    alignSelf: "center",
    top: 10,
    zIndex: 3,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  promoFanRight: {
    position: "absolute",
    width: 155,
    height: 155,
    borderRadius: 18,
    right: "5%",
    top: 40,
    transform: [{ rotate: "10deg" }],
    zIndex: 2,
  },
});
