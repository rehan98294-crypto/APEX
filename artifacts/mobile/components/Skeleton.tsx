/**
 * Skeleton / Shimmer UI System
 *
 * Architecture:
 *  - One module-level Animated.Value loop shared by ALL ShimmerBox instances
 *    → zero overhead, single rAF for the entire skeleton layer
 *  - useNativeDriver: true (translateX transform only)
 *  - Each box just interpolates the shared value independently
 */

import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const { width: SW } = Dimensions.get("window");

// ─── Shared shimmer animation (singleton) ────────────────────────────────────
let _shimmer: Animated.Value | null = null;

function getShimmer(): Animated.Value {
  if (!_shimmer) {
    _shimmer = new Animated.Value(0);
    Animated.loop(
      Animated.timing(_shimmer, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }
  return _shimmer;
}

// ─── Base shimmer box ─────────────────────────────────────────────────────────
interface ShimmerBoxProps {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
}

export function ShimmerBox({ width = "100%", height, borderRadius = 8, style }: ShimmerBoxProps) {
  const shimmer = getShimmer();
  const translateX = shimmer.interpolate({
    inputRange:  [0, 1],
    outputRange: [-SW, SW],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#E8EDF4",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.72)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: SW }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Circle shimmer ───────────────────────────────────────────────────────────
export function ShimmerCircle({ size, style }: { size: number; style?: object }) {
  return <ShimmerBox width={size} height={size} borderRadius={size / 2} style={style} />;
}

// ─── Section label ────────────────────────────────────────────────────────────
function SkRow({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>{children}</View>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION SKELETONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Hero banner ─────────────────────────────────────────────────────────────
export function SkeletonBanner() {
  return (
    <View style={sk.banner}>
      <View style={sk.bannerLeft}>
        <ShimmerBox height={18} width="75%" borderRadius={6} style={{ marginBottom: 8 }} />
        <ShimmerBox height={14} width="65%" borderRadius={5} style={{ marginBottom: 4 }} />
        <ShimmerBox height={14} width="55%" borderRadius={5} style={{ marginBottom: 18 }} />
        <ShimmerBox height={36} width={130} borderRadius={20} />
      </View>
      <View style={sk.bannerRight}>
        <ShimmerBox height={22} width={90} borderRadius={12} style={{ marginBottom: 10 }} />
        <ShimmerBox height={90} width={90} borderRadius={16} />
      </View>
    </View>
  );
}

// ─── Feature cards row ────────────────────────────────────────────────────────
export function SkeletonFeatureCards() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sk.featRow}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={sk.featCard}>
          <ShimmerBox height={36} width={36} borderRadius={10} style={{ marginBottom: 10 }} />
          <ShimmerBox height={12} width="80%" borderRadius={5} style={{ marginBottom: 6 }} />
          <ShimmerBox height={10} width="60%" borderRadius={4} />
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Top Collections ──────────────────────────────────────────────────────────
export function SkeletonTopCollections({ rows = 5 }: { rows?: number }) {
  return (
    <View style={sk.topColSection}>
      <ShimmerBox height={22} width="60%" borderRadius={6} style={{ marginBottom: 6 }} />
      <ShimmerBox height={13} width="35%" borderRadius={5} style={{ marginBottom: 16 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={[
            sk.topColRow,
            i < rows - 1 && { borderBottomWidth: 1, borderBottomColor: "#F0F2F7" },
          ]}
        >
          <ShimmerBox height={20} width={20} borderRadius={4} />
          <ShimmerCircle size={52} />
          <View style={{ flex: 1, gap: 6 }}>
            <ShimmerBox height={13} width="60%" borderRadius={5} />
            <ShimmerBox height={11} width="40%" borderRadius={4} />
          </View>
          <ShimmerBox height={16} width={52} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

// ─── Promo section ────────────────────────────────────────────────────────────
export function SkeletonPromo() {
  return (
    <View style={sk.promoSection}>
      <ShimmerBox height={32} width="70%" borderRadius={8} style={{ marginBottom: 8 }} />
      <ShimmerBox height={28} width="50%" borderRadius={8} style={{ marginBottom: 14 }} />
      <ShimmerBox height={14} width="80%" borderRadius={5} style={{ marginBottom: 4 }} />
      <ShimmerBox height={14} width="65%" borderRadius={5} style={{ marginBottom: 28 }} />
      <ShimmerBox height={50} width={180} borderRadius={30} style={{ marginBottom: 36 }} />
      <SkRow style={{ justifyContent: "center", width: "100%", height: 220 }}>
        <ShimmerBox width={160} height={160} borderRadius={18} style={{ position: "absolute", left: "5%", top: 30, transform: [{ rotate: "-12deg" }] }} />
        <ShimmerBox width={185} height={185} borderRadius={18} style={{ position: "absolute", alignSelf: "center", top: 10, zIndex: 2 }} />
        <ShimmerBox width={155} height={155} borderRadius={18} style={{ position: "absolute", right: "5%", top: 40, transform: [{ rotate: "10deg" }] }} />
      </SkRow>
    </View>
  );
}

// ─── Discover NFT grid ────────────────────────────────────────────────────────
export function SkeletonDiscoverSection() {
  const CARD_W = (SW - 44) / 2;
  return (
    <View style={sk.discoverSection}>
      {/* Title */}
      <View style={[sk.row, { justifyContent: "space-between", marginBottom: 16 }]}>
        <ShimmerBox height={24} width={180} borderRadius={7} />
        <ShimmerBox height={22} width={60} borderRadius={10} />
      </View>

      {/* Category pills */}
      <View style={[sk.row, { gap: 8, marginBottom: 16 }]}>
        {[60, 44, 90, 70, 56].map((w, i) => (
          <ShimmerBox key={i} height={34} width={w} borderRadius={20} />
        ))}
      </View>

      {/* Grid cards */}
      <View style={sk.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[sk.gridCard, { width: CARD_W }]}>
            <ShimmerBox height={150} width="100%" borderRadius={0} />
            <View style={{ padding: 10, gap: 8 }}>
              <ShimmerBox height={12} width="75%" borderRadius={5} />
              <ShimmerBox height={10} width="45%" borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Featured Collections ─────────────────────────────────────────────────────
export function SkeletonFeaturedCollections() {
  const mainW = (SW - 32 - 16 - 12) * 0.6;
  const smW   = (SW - 32 - 16 - 12) * 0.38;
  const mainH = 180;
  const smH   = (mainH - 8) / 3;

  return (
    <View style={sk.featColSection}>
      <ShimmerBox height={18} width={180} borderRadius={6} style={{ marginBottom: 14 }} />
      {[0, 1].map((i) => (
        <View key={i} style={[sk.featColCard, { marginBottom: 14 }]}>
          {/* Image row */}
          <View style={sk.row}>
            <ShimmerBox width={mainW} height={mainH} borderRadius={14} />
            <View style={{ flex: 1, gap: 4, marginLeft: 6 }}>
              {[0, 1, 2].map((j) => (
                <ShimmerBox key={j} width={smW} height={smH} borderRadius={10} />
              ))}
            </View>
          </View>
          {/* Info */}
          <ShimmerBox height={16} width="50%" borderRadius={6} style={{ marginTop: 10 }} />
          <View style={[sk.row, { justifyContent: "space-between", marginTop: 8 }]}>
            <SkRow style={{ gap: 8 }}>
              <ShimmerCircle size={28} />
              <ShimmerBox height={12} width={100} borderRadius={5} />
            </SkRow>
            <ShimmerBox height={32} width={90} borderRadius={20} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Hot Picks ────────────────────────────────────────────────────────────────
export function SkeletonHotPicks() {
  const cardW = (SW - 32 - 20) / 3;
  return (
    <View style={sk.hotSection}>
      <ShimmerBox height={18} width={120} borderRadius={6} style={{ marginBottom: 12 }} />

      {/* Hero image */}
      <ShimmerBox height={280} width="100%" borderRadius={18} style={{ marginBottom: 12 }} />

      {/* Hero info row */}
      <View style={[sk.row, { justifyContent: "space-between", marginBottom: 16 }]}>
        <SkRow style={{ gap: 8, flex: 1 }}>
          <ShimmerCircle size={32} />
          <ShimmerBox height={13} width="55%" borderRadius={5} />
        </SkRow>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <ShimmerBox height={11} width={60} borderRadius={4} />
          <ShimmerBox height={14} width={80} borderRadius={5} />
        </View>
      </View>

      {/* 3 small cards */}
      <View style={[sk.row, { gap: 10 }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, gap: 6 }}>
            <ShimmerBox height={cardW} width="100%" borderRadius={14} />
            <ShimmerBox height={12} width="80%" borderRadius={5} />
            <ShimmerBox height={10} width="55%" borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL DASHBOARD SKELETON
// ═══════════════════════════════════════════════════════════════════════════════

export function DashboardSkeleton({ topPad = 0 }: { topPad?: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        scrollEnabled={false}
      >
        {/* Header placeholder */}
        <View style={[sk.header, { paddingTop: topPad + 12 }]}>
          <ShimmerBox height={38} width={38} borderRadius={12} />
          <ShimmerBox height={22} width={120} borderRadius={8} style={{ flex: 0 }} />
          <SkRow style={{ gap: 8 }}>
            <ShimmerCircle size={36} />
            <ShimmerCircle size={36} />
          </SkRow>
        </View>

        <View style={{ height: 20 }} />

        {/* Hero banner */}
        <View style={{ marginHorizontal: 16, borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>
          <ShimmerBox height={148} width="100%" borderRadius={20} />
          <View style={StyleSheet.absoluteFill}>
            <SkeletonBanner />
          </View>
        </View>

        {/* Feature cards */}
        <SkeletonFeatureCards />

        {/* Top Collections */}
        <SkeletonTopCollections />

        {/* Promo */}
        <SkeletonPromo />

        {/* Discover NFTs */}
        <View style={{ backgroundColor: "#F3F5FF", borderRadius: 0 }}>
          <SkeletonDiscoverSection />
        </View>

        {/* Featured Collections */}
        <SkeletonFeaturedCollections />

        {/* Hot Picks */}
        <SkeletonHotPicks />
      </ScrollView>
    </View>
  );
}

// ─── NFT grid skeleton (used for load-more pagination) ────────────────────────
export function NFTSkeletonCard() {
  const CARD_W = (SW - 44) / 2;
  return (
    <View style={[sk.gridCard, { width: CARD_W }]}>
      <ShimmerBox height={150} width="100%" borderRadius={0} />
      <View style={{ padding: 10, gap: 8 }}>
        <ShimmerBox height={12} width="75%" borderRadius={5} />
        <ShimmerBox height={10} width="45%" borderRadius={4} />
      </View>
    </View>
  );
}

export function NFTSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <View style={sk.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <NFTSkeletonCard key={i} />
      ))}
    </View>
  );
}

// ─── Inline page-load fade animation ─────────────────────────────────────────
interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
}

export function FadeInView({ children, duration = 380, delay = 0 }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const sk = StyleSheet.create({
  row:    { flexDirection: "row", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#F8F9FB",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F7",
  },

  // Banner
  banner:      { flexDirection: "row", alignItems: "center", padding: 20 },
  bannerLeft:  { flex: 1 },
  bannerRight: { alignItems: "center", gap: 10, marginLeft: 12 },

  // Feature cards
  featRow:  { paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  featCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    width: 160,
    borderLeftWidth: 3,
    borderLeftColor: "#E8EDF4",
  },

  // Top Collections
  topColSection: { paddingHorizontal: 16, marginBottom: 16 },
  topColRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },

  // Promo
  promoSection: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 0,
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 8,
  },

  // Discover
  discoverSection: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  grid:            { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Featured collections
  featColSection: { paddingHorizontal: 16, marginTop: 24 },
  featColCard:    { borderRadius: 20, overflow: "hidden", padding: 12, backgroundColor: "#F3F5FF" },

  // Hot Picks
  hotSection: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
});
