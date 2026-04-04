import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { BADGE_TICKS, CIRCLE_TICKS, TickItem, useTick } from "@/context/TickContext";

const { width: SCREEN_W } = Dimensions.get("window");
const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

const PLAN_LEVEL_MAP: Record<string, number> = {
  basic: 1,
  advance: 2,
  pro: 3,
  elite: 4,
  ultimate: 5,
};

const PAGE_SIZE = 3;

function GoldTickRender({ size = 80, zone }: { size?: number; zone: "badge" | "circle" }) {
  const isCircle = zone === "circle";
  if (isCircle) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#FFD700", alignItems: "center", justifyContent: "center", shadowColor: "#FFD700", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 }}>
        <Feather name="check" size={size * 0.5} color="#fff" />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size * 0.12, backgroundColor: "#FFD700", transform: [{ rotate: "0deg" }], shadowColor: "#FFD700", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 }} />
      <View style={{ position: "absolute", width: size * 0.96, height: size * 0.96, borderRadius: size * 0.12, backgroundColor: "#FFD700", transform: [{ rotate: "22.5deg" }] }} />
      <View style={{ position: "absolute", width: size * 0.92, height: size * 0.92, borderRadius: size * 0.12, backgroundColor: "#FFCA28", transform: [{ rotate: "45deg" }] }} />
      <Feather name="check" size={size * 0.42} color="#fff" style={{ zIndex: 10 }} />
    </View>
  );
}

function TickCard({ tick, userPlanLevel, delay }: { tick: TickItem; userPlanLevel: number; delay: number }) {
  const { isOwned, activateTick, deactivateTick, purchaseTick, activeTickId } = useTick();
  const { spendBalance, balance } = useBalance();

  const owned = isOwned(tick.id);
  const isActive = activeTickId === tick.id;
  const isFree = tick.freeMinPlan !== undefined && userPlanLevel >= tick.freeMinPlan;

  const handlePress = useCallback(() => {
    if (isActive) {
      deactivateTick();
      return;
    }
    if (owned || isFree) {
      activateTick(tick);
      return;
    }
    const cost = tick.price;
    if (balance < cost) {
      Alert.alert("Insufficient Balance", `You need ${cost} TFT to buy this tick. Top up your balance first.`);
      return;
    }
    Alert.alert(
      `Buy ${tick.name}`,
      `Purchase for ${tick.price} TFT?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy & Activate",
          onPress: () => {
            spendBalance(cost, `Purchased ${tick.name}`);
            purchaseTick(tick);
            activateTick(tick);
          },
        },
      ]
    );
  }, [isActive, owned, isFree, balance, tick]);

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(delay)}>
      <Pressable
        style={[sh.tickCard, isActive && { borderColor: tick.color, borderWidth: 2 }]}
        onPress={handlePress}
      >
        {isActive && (
          <View style={[sh.activeBadge, { backgroundColor: tick.color }]}>
            <Text style={sh.activeBadgeText}>Active</Text>
          </View>
        )}

        <View style={sh.tickImageWrap}>
          {tick.imageSource ? (
            <Image
              source={tick.imageSource}
              style={{ width: 72, height: 72 }}
              contentFit="contain"
              transition={300}
              recyclingKey={tick.id}
            />
          ) : (
            <GoldTickRender size={72} zone={tick.zone} />
          )}
        </View>

        <Text style={sh.tickName} numberOfLines={1}>{tick.name}</Text>

        {isFree || owned ? (
          <View style={[sh.freeTag, { backgroundColor: owned && !isFree ? "#E8F5E9" : "#EDE7F6" }]}>
            <Text style={[sh.freeTagText, { color: owned && !isFree ? "#388E3C" : "#6A1B9A" }]}>
              {isActive ? "✓ Active" : owned ? "Owned" : "Free w/ Plan"}
            </Text>
          </View>
        ) : (
          <View style={sh.priceTag}>
            <Text style={sh.priceText}>{tick.price} TFT</Text>
          </View>
        )}

        <Pressable style={[sh.actionBtn, isActive && sh.actionBtnDeactivate]} onPress={handlePress}>
          <LinearGradient
            colors={isActive ? ["#EF5350", "#B71C1C"] : isFree || owned ? [tick.color, tick.color + "CC"] : GRAD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
            borderRadius={20}
          />
          <Text style={sh.actionBtnText}>
            {isActive ? "Deactivate" : owned || isFree ? "Activate" : "Buy"}
          </Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

function ZonePage({ ticks, userPlanLevel }: { ticks: TickItem[]; userPlanLevel: number }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = ticks.slice(0, visibleCount);
  const hasMore = visibleCount < ticks.length;

  return (
    <View style={{ width: SCREEN_W }}>
      <ScrollView
        contentContainerStyle={sh.zoneGrid}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {visible.map((tick, i) => (
          <TickCard key={tick.id} tick={tick} userPlanLevel={userPlanLevel} delay={i * 60} />
        ))}
        {hasMore && (
          <Pressable style={sh.loadMoreBtn} onPress={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, ticks.length))}>
            <Text style={sh.loadMoreText}>Load More ({ticks.length - visibleCount} remaining)</Text>
            <Feather name="chevron-down" size={14} color={Colors.textSecondary} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 12 : insets.top;
  const { activeTick, deactivateTick, activeTickId } = useTick();
  const { plan } = useSubscription();
  const pagerRef = useRef<ScrollView>(null);
  const [zoneIndex, setZoneIndex] = useState(0);

  const planId = plan?.id ?? null;
  const userPlanLevel = planId ? (PLAN_LEVEL_MAP[planId] ?? 0) : 0;

  const goToZone = (idx: number) => {
    setZoneIndex(idx);
    pagerRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
  };

  const onScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_W);
    if (idx !== zoneIndex) setZoneIndex(idx);
  };

  return (
    <View style={[sh.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={sh.header}>
        <Pressable style={sh.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={sh.headerTitle}>Verification Ticks</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero Banner */}
      <LinearGradient colors={["#E8F4FF", "#F0E8FF", "#FFF0E8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sh.heroBanner}>
        <MaterialCommunityIcons name="shield-check" size={32} color="#5CBFFE" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={sh.heroTitle}>Premium Verification</Text>
          <Text style={sh.heroSub}>Stand out with a colored tick next to your profile name</Text>
        </View>
      </LinearGradient>

      {/* Plan Info */}
      {userPlanLevel >= 3 && (
        <View style={sh.planBadge}>
          <MaterialCommunityIcons name="crown" size={14} color="#FFD700" />
          <Text style={sh.planBadgeText}>
            {plan?.name} Plan — some ticks are free for you!
          </Text>
        </View>
      )}

      {/* Zone Tabs */}
      <View style={sh.zoneTabs}>
        {["Badge Zone", "Circle Zone"].map((label, i) => (
          <Pressable key={i} style={[sh.zoneTab, zoneIndex === i && sh.zoneTabActive]} onPress={() => goToZone(i)}>
            {zoneIndex === i && (
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={20} />
            )}
            <Text style={[sh.zoneTabText, zoneIndex === i && sh.zoneTabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Zone Pager */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <ZonePage ticks={BADGE_TICKS} userPlanLevel={userPlanLevel} />
        <ZonePage ticks={CIRCLE_TICKS} userPlanLevel={userPlanLevel} />
      </ScrollView>

      {/* Active Tick Banner */}
      {activeTick && (
        <View style={sh.activeBanner}>
          <View style={sh.activeBannerLeft}>
            {activeTick.imageSource ? (
              <Image source={activeTick.imageSource} style={{ width: 32, height: 32 }} contentFit="contain" />
            ) : (
              <GoldTickRender size={32} zone={activeTick.zone} />
            )}
            <View style={{ marginLeft: 10 }}>
              <Text style={sh.activeBannerLabel}>Active Tick</Text>
              <Text style={sh.activeBannerName}>{activeTick.name}</Text>
            </View>
          </View>
          <Pressable style={sh.removeBannerBtn} onPress={deactivateTick}>
            <Text style={sh.removeBannerText}>Remove</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.offWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 16,
    padding: 16,
  },
  heroTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFDE7",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  planBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#F57F17",
  },
  zoneTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 14,
    backgroundColor: "#EDF0F5",
    borderRadius: 24,
    padding: 4,
    gap: 4,
  },
  zoneTab: {
    flex: 1,
    height: 38,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  zoneTabActive: {},
  zoneTabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  zoneTabTextActive: {
    color: "#fff",
  },
  zoneGrid: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  tickCard: {
    width: (SCREEN_W - 44) / 2,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8ECF2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  activeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  tickImageWrap: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tickName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  priceTag: {
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  priceText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#3730A3",
  },
  freeTag: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  freeTagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  actionBtn: {
    width: "100%",
    height: 34,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDeactivate: {},
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  loadMoreBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadMoreText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
  },
  activeBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeBannerLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  activeBannerName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  removeBannerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
  },
  removeBannerText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#DC2626",
  },
});
