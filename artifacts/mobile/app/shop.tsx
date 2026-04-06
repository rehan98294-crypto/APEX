import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal as RNModal,
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
import { useAuth } from "@/context/AuthContext";
import { useBalance } from "@/context/BalanceContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { TickItem, useTick } from "@/context/TickContext";
import { useShopItems, useUserItems } from "@/hooks/useShopItems";

const { width: SCREEN_W } = Dimensions.get("window");
const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

const PLAN_LEVEL_MAP: Record<string, number> = {
  basic: 1, advance: 2, pro: 3, elite: 4, ultimate: 5,
};

const PAGE_SIZE = 3;

// ─── Gold Tick Renderer ───────────────────────────────────────────────────────
function GoldTickRender({ size = 80, zone }: { size?: number; zone: "badge" | "circle" }) {
  if (zone === "circle") {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#FFD700", alignItems: "center", justifyContent: "center", shadowColor: "#FFD700", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 }}>
        <Feather name="check" size={size * 0.5} color="#fff" />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size * 0.12, backgroundColor: "#FFD700", shadowColor: "#FFD700", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 }} />
      <View style={{ position: "absolute", width: size * 0.96, height: size * 0.96, borderRadius: size * 0.12, backgroundColor: "#FFD700", transform: [{ rotate: "22.5deg" }] }} />
      <View style={{ position: "absolute", width: size * 0.92, height: size * 0.92, borderRadius: size * 0.12, backgroundColor: "#FFCA28", transform: [{ rotate: "45deg" }] }} />
      <Feather name="check" size={size * 0.42} color="#fff" style={{ zIndex: 10 }} />
    </View>
  );
}

// ─── Tick Card ────────────────────────────────────────────────────────────────
function TickCard({
  tick,
  userPlanLevel,
  delay,
  isOwned,
  isActive,
  onBuy,
  onActivate,
  onDeactivate,
}: {
  tick: TickItem;
  userPlanLevel: number;
  delay: number;
  isOwned: boolean;
  isActive: boolean;
  onBuy: (tick: TickItem) => void;
  onActivate: (tick: TickItem) => void;
  onDeactivate: (tick: TickItem) => void;
}) {
  const { balance } = useBalance();
  const isFree = tick.freeMinPlan !== undefined && userPlanLevel >= tick.freeMinPlan;

  const handlePress = useCallback(() => {
    if (isActive) { onDeactivate(tick); return; }
    if (isOwned || isFree) { onActivate(tick); return; }
    if (balance < tick.price) {
      Alert.alert("Insufficient Balance", `You need ${tick.price} TFT to buy this tick. Top up your balance first.`);
      return;
    }
    onBuy(tick);
  }, [isActive, isOwned, isFree, balance, tick]);

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(delay)}>
      <Pressable style={[sh.tickCard, isActive && { borderColor: tick.color, borderWidth: 2 }]} onPress={handlePress}>
        {isActive && (
          <View style={[sh.activeBadge, { backgroundColor: tick.color }]}>
            <Text style={sh.activeBadgeText}>Active</Text>
          </View>
        )}

        <View style={sh.tickImageWrap}>
          {tick.imageSource ? (
            <Image source={tick.imageSource} style={{ width: 72, height: 72 }} contentFit="contain" transition={300} recyclingKey={tick.id} />
          ) : (
            <GoldTickRender size={72} zone={tick.zone} />
          )}
        </View>

        <Text style={sh.tickName} numberOfLines={1}>{tick.name}</Text>

        {isFree || isOwned ? (
          <View style={[sh.freeTag, { backgroundColor: isOwned && !isFree ? "#E8F5E9" : "#EDE7F6" }]}>
            <Text style={[sh.freeTagText, { color: isOwned && !isFree ? "#388E3C" : "#6A1B9A" }]}>
              {isActive ? "✓ Active" : isOwned ? "Owned" : "Free w/ Plan"}
            </Text>
          </View>
        ) : (
          <View style={sh.priceTag}>
            <Text style={sh.priceText}>{tick.price} TFT</Text>
          </View>
        )}

        <Pressable style={[sh.actionBtn, isActive && sh.actionBtnDeactivate]} onPress={handlePress}>
          <LinearGradient
            colors={isActive ? ["#EF5350", "#B71C1C"] : isFree || isOwned ? [tick.color, tick.color + "CC"] : GRAD}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill} borderRadius={20}
          />
          <Text style={sh.actionBtnText}>
            {isActive ? "Deactivate" : isOwned || isFree ? "Activate" : "Buy"}
          </Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

// ─── Zone Page ────────────────────────────────────────────────────────────────
function ZonePage({
  ticks,
  userPlanLevel,
  ownedItemIds,
  activeBadgeId,
  activeCircleId,
  onBuy,
  onActivate,
  onDeactivate,
}: {
  ticks: TickItem[];
  userPlanLevel: number;
  ownedItemIds: string[];
  activeBadgeId: string | null;
  activeCircleId: string | null;
  onBuy: (tick: TickItem) => void;
  onActivate: (tick: TickItem) => void;
  onDeactivate: (tick: TickItem) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = ticks.slice(0, visibleCount);
  const hasMore = visibleCount < ticks.length;

  return (
    <View style={{ width: SCREEN_W }}>
      <ScrollView contentContainerStyle={sh.zoneGrid} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {visible.map((tick, i) => (
          <TickCard
            key={tick.id}
            tick={tick}
            userPlanLevel={userPlanLevel}
            delay={i * 60}
            isOwned={ownedItemIds.includes(tick.id)}
            isActive={tick.zone === "badge" ? activeBadgeId === tick.id : activeCircleId === tick.id}
            onBuy={onBuy}
            onActivate={onActivate}
            onDeactivate={onDeactivate}
          />
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 12 : insets.top;

  const { user } = useAuth();
  const { plan } = useSubscription();
  const { spendBalance } = useBalance();
  const { activateTick, deactivateTick, syncFromDB } = useTick();

  // ── DB hooks ─────────────────────────────────────────────────────────────
  const { badgeTicks, circleTicks, loading: itemsLoading } = useShopItems();
  const {
    ownedItemIds,
    activeBadgeItem,
    activeCircleItem,
    buyItem,
    activateItem,
    deactivateType,
    refetch: refetchUserItems,
  } = useUserItems(user?.id);

  const pagerRef = useRef<ScrollView>(null);
  const [zoneIndex, setZoneIndex] = useState(0);
  const [pendingTick, setPendingTick] = useState<TickItem | null>(null);
  const [successTick, setSuccessTick] = useState<TickItem | null>(null);

  const planId = plan?.id ?? null;
  const userPlanLevel = planId ? (PLAN_LEVEL_MAP[planId] ?? 0) : 0;

  // ── Sync DB state → TickContext on load ──────────────────────────────────
  useEffect(() => {
    if (!activeBadgeItem && !activeCircleItem && ownedItemIds.length === 0) return;

    // Build a lookup map: item_id → TickItem (merged with static image)
    const allItems = [...badgeTicks, ...circleTicks];
    const tickLookup = new Map<string, TickItem>(allItems.map((t) => [t.id, t]));

    syncFromDB(
      ownedItemIds,
      activeBadgeItem?.item_id ?? null,
      activeCircleItem?.item_id ?? null,
      tickLookup,
    );
  }, [activeBadgeItem, activeCircleItem, ownedItemIds.length, badgeTicks.length, circleTicks.length]);

  const goToZone = (idx: number) => {
    setZoneIndex(idx);
    pagerRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
  };

  const onScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_W);
    if (idx !== zoneIndex) setZoneIndex(idx);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleBuy = useCallback((tick: TickItem) => {
    setPendingTick(tick);
  }, []);

  const handleDoPurchase = useCallback(async () => {
    if (!pendingTick || !user?.id) return;
    spendBalance(pendingTick.price, `Purchased ${pendingTick.name}`);
    setPendingTick(null);
    setSuccessTick(pendingTick);

    // Update TickContext locally
    activateTick(pendingTick);

    // Persist to DB (non-blocking)
    buyItem(pendingTick.id).catch((e) => console.warn("[Shop] buyItem error:", e));
  }, [pendingTick, user?.id, spendBalance, activateTick, buyItem]);

  const handleActivate = useCallback(async (tick: TickItem) => {
    // Update TickContext immediately
    activateTick(tick);

    // Persist to DB
    if (user?.id) {
      activateItem(tick.id).catch((e) => console.warn("[Shop] activateItem error:", e));
    }
  }, [activateTick, user?.id, activateItem]);

  const handleDeactivate = useCallback(async (tick: TickItem) => {
    // Update TickContext immediately
    deactivateTick(tick.zone);

    // Persist to DB
    if (user?.id) {
      deactivateType(tick.zone).catch((e) => console.warn("[Shop] deactivateType error:", e));
    }
  }, [deactivateTick, user?.id, deactivateType]);

  // ── Derived active ticks for banner ──────────────────────────────────────
  const activeBadgeTick = badgeTicks.find((t) => t.id === activeBadgeItem?.item_id) ?? null;
  const activeCircleTick = circleTicks.find((t) => t.id === activeCircleItem?.item_id) ?? null;
  const hasAnyActive = activeBadgeTick || activeCircleTick;

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
          <Text style={sh.planBadgeText}>{plan?.name} Plan — some ticks are free for you!</Text>
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

      {/* Loading State */}
      {itemsLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#5CBFFE" />
          <Text style={{ marginTop: 10, color: Colors.textSecondary, fontFamily: "Inter_400Regular" }}>
            Loading shop items…
          </Text>
        </View>
      ) : (
        <ScrollView ref={pagerRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1 }}>
          <ZonePage
            ticks={badgeTicks}
            userPlanLevel={userPlanLevel}
            ownedItemIds={ownedItemIds}
            activeBadgeId={activeBadgeItem?.item_id ?? null}
            activeCircleId={activeCircleItem?.item_id ?? null}
            onBuy={handleBuy}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
          />
          <ZonePage
            ticks={circleTicks}
            userPlanLevel={userPlanLevel}
            ownedItemIds={ownedItemIds}
            activeBadgeId={activeBadgeItem?.item_id ?? null}
            activeCircleId={activeCircleItem?.item_id ?? null}
            onBuy={handleBuy}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
          />
        </ScrollView>
      )}

      {/* ── Confirm Purchase Modal ── */}
      <RNModal visible={!!pendingTick} transparent animationType="fade" onRequestClose={() => setPendingTick(null)}>
        <View style={sh.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(280)} style={sh.modalCard}>
            <View style={sh.modalIconWrap}>
              {pendingTick?.imageSource ? (
                <Image source={pendingTick.imageSource} style={{ width: 72, height: 72 }} contentFit="contain" />
              ) : pendingTick ? (
                <GoldTickRender size={72} zone={pendingTick.zone} />
              ) : null}
            </View>
            <Text style={sh.modalTitle}>Confirm Purchase</Text>
            <Text style={sh.modalTickName}>{pendingTick?.name}</Text>
            <View style={sh.modalPriceRow}>
              <Text style={sh.modalPriceLabel}>Price</Text>
              <Text style={sh.modalPriceValue}>{pendingTick?.price} TFT</Text>
            </View>
            <Text style={sh.modalNote}>
              This tick will be activated immediately and displayed next to your profile name.
            </Text>
            <View style={sh.modalBtnRow}>
              <Pressable style={sh.modalCancelBtn} onPress={() => setPendingTick(null)}>
                <Text style={sh.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={sh.modalConfirmBtn} onPress={handleDoPurchase}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={sh.modalConfirmText}>Purchase & Activate</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </RNModal>

      {/* ── Success Modal ── */}
      <RNModal visible={!!successTick} transparent animationType="fade" onRequestClose={() => setSuccessTick(null)}>
        <View style={sh.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(320)} style={sh.modalCard}>
            <View style={[sh.successCircle, { backgroundColor: (successTick?.color ?? "#5CBFFE") + "22" }]}>
              <View style={[sh.successInner, { backgroundColor: successTick?.color ?? "#5CBFFE" }]}>
                <Feather name="check" size={28} color="#fff" />
              </View>
            </View>
            <Text style={sh.successTitle}>Purchase Successful!</Text>
            <Text style={sh.successName}>{successTick?.name}</Text>
            <Text style={sh.successDesc}>Your tick is now active and visible next to your name on your profile. Enjoy your premium look!</Text>
            {successTick?.imageSource && (
              <Image source={successTick.imageSource} style={{ width: 56, height: 56, marginVertical: 8 }} contentFit="contain" />
            )}
            <Pressable style={sh.successBtn} onPress={() => setSuccessTick(null)}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={20} />
              <Text style={sh.successBtnText}>Awesome!</Text>
            </Pressable>
          </Animated.View>
        </View>
      </RNModal>

      {/* ── Active Ticks Banner (shows badge + circle) ── */}
      {hasAnyActive && (
        <View style={sh.activeBanner}>
          <View style={sh.activeBannerItems}>
            {activeBadgeTick && (
              <View style={sh.activeBannerItem}>
                {activeBadgeTick.imageSource ? (
                  <Image source={activeBadgeTick.imageSource} style={{ width: 28, height: 28 }} contentFit="contain" />
                ) : (
                  <GoldTickRender size={28} zone="badge" />
                )}
                <View style={{ marginLeft: 8 }}>
                  <Text style={sh.activeBannerLabel}>Badge</Text>
                  <Text style={sh.activeBannerName}>{activeBadgeTick.name}</Text>
                </View>
                <Pressable style={sh.removeBannerBtn} onPress={() => handleDeactivate(activeBadgeTick)}>
                  <Text style={sh.removeBannerText}>Remove</Text>
                </Pressable>
              </View>
            )}
            {activeCircleTick && (
              <View style={[sh.activeBannerItem, activeBadgeTick && { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 8 }]}>
                {activeCircleTick.imageSource ? (
                  <Image source={activeCircleTick.imageSource} style={{ width: 28, height: 28 }} contentFit="contain" />
                ) : (
                  <GoldTickRender size={28} zone="circle" />
                )}
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={sh.activeBannerLabel}>Circle</Text>
                  <Text style={sh.activeBannerName}>{activeCircleTick.name}</Text>
                </View>
                <Pressable style={sh.removeBannerBtn} onPress={() => handleDeactivate(activeCircleTick)}>
                  <Text style={sh.removeBannerText}>Remove</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FB" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.offWhite, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  heroBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 14, marginBottom: 4, borderRadius: 16, padding: 16 },
  heroTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 2 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 16 },
  planBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFDE7", borderRadius: 12, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#FFE082" },
  planBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#F57F17" },
  zoneTabs: { flexDirection: "row", marginHorizontal: 16, marginVertical: 14, backgroundColor: "#EDF0F5", borderRadius: 24, padding: 4, gap: 4 },
  zoneTab: { flex: 1, height: 38, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  zoneTabActive: {},
  zoneTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  zoneTabTextActive: { color: "#fff" },
  zoneGrid: { paddingHorizontal: 16, paddingBottom: 24, flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  tickCard: { width: (SCREEN_W - 44) / 2, backgroundColor: "#fff", borderRadius: 18, padding: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#E8ECF2", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  activeBadge: { position: "absolute", top: 8, right: 8, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  activeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  tickImageWrap: { width: 80, height: 80, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  tickName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, textAlign: "center", marginBottom: 6 },
  priceTag: { backgroundColor: "#EEF2FF", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  priceText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#3730A3" },
  freeTag: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  freeTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actionBtn: { width: "100%", height: 34, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  actionBtnDeactivate: {},
  actionBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  loadMoreBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  loadMoreText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  activeBanner: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 6 },
  activeBannerItems: { gap: 0 },
  activeBannerItem: { flexDirection: "row", alignItems: "center" },
  activeBannerLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  activeBannerName: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  removeBannerBtn: { marginLeft: "auto", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: "#FEE2E2" },
  removeBannerText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#DC2626" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.52)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 },
  modalIconWrap: { width: 90, height: 90, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 4 },
  modalTickName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 16 },
  modalPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", backgroundColor: "#F0F4FF", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, marginBottom: 14 },
  modalPriceLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  modalPriceValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#3730A3" },
  modalNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 18, marginBottom: 20 },
  modalBtnRow: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  modalConfirmBtn: { flex: 2, height: 46, borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  modalConfirmText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  successCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  successInner: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 4 },
  successName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 10 },
  successDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 19, marginBottom: 6 },
  successBtn: { width: "100%", height: 48, borderRadius: 24, overflow: "hidden", alignItems: "center", justifyContent: "center", marginTop: 14 },
  successBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
