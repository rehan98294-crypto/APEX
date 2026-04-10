import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay as reanimatedDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { useSubscription } from "@/context/SubscriptionContext";

const { width: SW } = Dimensions.get("window");
const CARD_W = SW - 48;

// ── Plan level mapping ────────────────────────────────────────────────────────
const PLAN_LEVEL: Record<string, number> = {
  basic: 2, advance: 3, pro: 4, elite: 5, ultimate: 6,
};

// ── Box definitions ───────────────────────────────────────────────────────────
interface BoxRewardTier { reward: number; weight: number; }

interface BoxConfig {
  level: number;
  name: string;
  subtitle: string;
  range: string;
  grad: [string, string, string];
  icon: string;
  tiers: BoxRewardTier[];
  requiredPlan: string | null;
}

const BOXES: BoxConfig[] = [
  {
    level: 1,
    name: "Mystery Box I",
    subtitle: "Starter Treasure",
    range: "5 – 20 TFT",
    grad: ["#7B61FF", "#5CBFFE", "#2BD9A8"],
    icon: "cube-outline",
    tiers: [
      { reward: 5,  weight: 82 },
      { reward: 10, weight: 10 },
      { reward: 15, weight: 5  },
      { reward: 20, weight: 3  },
    ],
    requiredPlan: null,
  },
  {
    level: 2,
    name: "Mystery Box II",
    subtitle: "Silver Stash",
    range: "20 – 50 TFT",
    grad: ["#5CBFFE", "#38BDF8", "#7DD3FC"],
    icon: "package-variant-closed",
    tiers: [
      { reward: 20, weight: 80 },
      { reward: 30, weight: 12 },
      { reward: 40, weight: 5  },
      { reward: 50, weight: 3  },
    ],
    requiredPlan: "basic",
  },
  {
    level: 3,
    name: "Mystery Box III",
    subtitle: "Golden Vault",
    range: "50 – 80 TFT",
    grad: ["#FFB08A", "#F59E0B", "#FCD34D"],
    icon: "treasure-chest",
    tiers: [
      { reward: 50, weight: 80 },
      { reward: 60, weight: 12 },
      { reward: 70, weight: 5  },
      { reward: 80, weight: 3  },
    ],
    requiredPlan: "advance",
  },
  {
    level: 4,
    name: "Mystery Box IV",
    subtitle: "Diamond Cache",
    range: "80 – 120 TFT",
    grad: ["#8B5CF6", "#6366F1", "#818CF8"],
    icon: "diamond-stone",
    tiers: [
      { reward: 80,  weight: 80 },
      { reward: 100, weight: 12 },
      { reward: 110, weight: 5  },
      { reward: 120, weight: 3  },
    ],
    requiredPlan: "pro",
  },
  {
    level: 5,
    name: "Mystery Box V",
    subtitle: "Platinum Reserve",
    range: "120 – 200 TFT",
    grad: ["#EC4899", "#A855F7", "#8B5CF6"],
    icon: "crown",
    tiers: [
      { reward: 120, weight: 75 },
      { reward: 150, weight: 15 },
      { reward: 180, weight: 7  },
      { reward: 200, weight: 3  },
    ],
    requiredPlan: "elite",
  },
  {
    level: 6,
    name: "Mystery Box VI",
    subtitle: "Legendary Trove",
    range: "200 – 280 TFT",
    grad: ["#F59E0B", "#EF4444", "#FFB08A"],
    icon: "star-shooting",
    tiers: [
      { reward: 200, weight: 75 },
      { reward: 230, weight: 15 },
      { reward: 260, weight: 7  },
      { reward: 280, weight: 3  },
    ],
    requiredPlan: "ultimate",
  },
];

// ── Weighted random ───────────────────────────────────────────────────────────
function pickReward(tiers: BoxRewardTier[]): number {
  const total = tiers.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const tier of tiers) {
    r -= tier.weight;
    if (r <= 0) return tier.reward;
  }
  return tiers[0].reward;
}

// ── Dot indicator ─────────────────────────────────────────────────────────────
function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 18 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: i === active ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === active ? "#5CBFFE" : "#D1D5DB" }} />
      ))}
    </View>
  );
}

// ── Floating particles ────────────────────────────────────────────────────────
const PARTICLE_COLORS = ["#5CBFFE", "#2BD9A8", "#FFB08A", "#F59E0B", "#A855F7", "#EC4899"];

function Particle({ x, delay, colorIdx }: { x: number; delay: number; colorIdx: number }) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);
  React.useEffect(() => {
    y.value = reanimatedDelay(delay, withTiming(-120, { duration: 1400 }));
    opacity.value = reanimatedDelay(delay, withTiming(0, { duration: 1400 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x }, { translateY: y.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[{ position: "absolute", bottom: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: PARTICLE_COLORS[colorIdx % PARTICLE_COLORS.length] }, style]}
    />
  );
}

// ── Box Card ──────────────────────────────────────────────────────────────────
function BoxCard({
  box,
  isUnlocked,
  onOpen,
}: {
  box: BoxConfig;
  isUnlocked: boolean;
  onOpen: (box: BoxConfig) => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      {/* Background gradient */}
      <LinearGradient
        colors={box.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Level badge */}
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>LV {box.level}</Text>
      </View>

      {/* Lock indicator */}
      {!isUnlocked && (
        <View style={styles.lockBadge}>
          <Feather name="lock" size={12} color="#fff" />
        </View>
      )}

      {/* Apex logo watermark */}
      <Image
        source={require("../assets/images/apex-logo.jpeg")}
        style={styles.watermark}
        contentFit="contain"
      />

      {/* Center box icon */}
      <View style={styles.boxIconWrap}>
        <View style={[styles.boxIconInner, !isUnlocked && styles.boxIconLocked]}>
          <MaterialCommunityIcons
            name={box.icon as any}
            size={54}
            color={isUnlocked ? "#fff" : "rgba(255,255,255,0.4)"}
          />
          {!isUnlocked && (
            <View style={styles.lockOverlay}>
              <Feather name="lock" size={22} color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </View>
      </View>

      {/* Box info */}
      <View style={styles.boxInfo}>
        <Text style={styles.boxName}>{box.name}</Text>
        <Text style={styles.boxSubtitle}>{box.subtitle}</Text>

        <View style={styles.rewardBadge}>
          <MaterialCommunityIcons name="gift" size={14} color="#fff" />
          <Text style={styles.rewardText}>{box.range}</Text>
        </View>

        {/* Tier odds */}
        <View style={styles.oddsRow}>
          {box.tiers.map((t) => (
            <View key={t.reward} style={styles.oddsPill}>
              <Text style={styles.oddsText}>{t.reward} TFT</Text>
              <Text style={styles.oddsChance}>{t.weight}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Open button */}
      <Pressable
        style={[styles.openBtn, !isUnlocked && styles.openBtnDisabled]}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => isUnlocked && onOpen(box)}
        disabled={!isUnlocked}
      >
        {isUnlocked ? (
          <LinearGradient
            colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.15)"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill} borderRadius={14}
          />
        ) : null}
        <Feather name={isUnlocked ? "package" : "lock"} size={16} color={isUnlocked ? "#fff" : "rgba(255,255,255,0.4)"} />
        <Text style={[styles.openBtnText, !isUnlocked && styles.openBtnTextDisabled]}>
          {isUnlocked ? "Open Box" : box.requiredPlan ? `Requires ${box.requiredPlan.charAt(0).toUpperCase() + box.requiredPlan.slice(1)} Plan` : "Locked"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Opening Animation Modal ───────────────────────────────────────────────────
function OpeningModal({
  box,
  reward,
  phase,
  onConfirm,
  onClose,
}: {
  box: BoxConfig;
  reward: number;
  phase: "opening" | "reveal";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const scale = useSharedValue(phase === "opening" ? 0.6 : 1);
  const rotate = useSharedValue(0);

  React.useEffect(() => {
    if (phase === "opening") {
      scale.value = withSpring(1.1, { damping: 8, stiffness: 120 });
      rotate.value = withRepeat(withSequence(withTiming(-8, { duration: 80 }), withTiming(8, { duration: 80 })), 6, true);
    } else {
      scale.value = withSpring(1, { damping: 12 });
      rotate.value = withTiming(0, { duration: 200 });
    }
  }, [phase]);

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const particles = Array.from({ length: 12 }).map((_, i) => ({
    x: (i - 6) * 24 + (Math.random() * 16 - 8),
    delay: Math.random() * 200,
  }));

  return (
    <View style={styles.modalOverlay}>
      <Animated.View entering={FadeIn.duration(250)} style={styles.modalCard}>
        <LinearGradient
          colors={box.grad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Close */}
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {phase === "opening" ? (
          <>
            <Text style={styles.modalOpeningTitle}>Opening…</Text>
            <Animated.View style={[styles.boxIconWrap, { marginBottom: 0 }, boxStyle]}>
              <View style={[styles.boxIconInner, { width: 100, height: 100, borderRadius: 24 }]}>
                <MaterialCommunityIcons name={box.icon as any} size={64} color="#fff" />
              </View>
            </Animated.View>
            <Text style={styles.modalBoxName}>{box.name}</Text>
          </>
        ) : (
          <>
            {/* Particles */}
            <View style={{ position: "absolute", width: "100%", bottom: "40%", alignItems: "center" }}>
              {particles.map((p, i) => (
                <Particle key={i} x={p.x} delay={p.delay} colorIdx={i} />
              ))}
            </View>

            <Animated.View entering={FadeInUp.duration(400)}>
              <Text style={styles.modalCongrats}>🎉 Congratulations!</Text>
              <Text style={styles.modalBoxName}>{box.name}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.rewardCircle}>
              <LinearGradient colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]} style={StyleSheet.absoluteFill} borderRadius={80} />
              <Text style={styles.rewardAmount}>{reward}</Text>
              <Text style={styles.rewardUnit}>TFT</Text>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.rewardNote}>
              <MaterialCommunityIcons name="gift" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.rewardNoteText}>Will be added to your balance</Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(400).delay(500)} style={{ width: "100%" }}>
              <Pressable style={styles.confirmBtn} onPress={onConfirm}>
                <LinearGradient colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.14)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                <Text style={styles.confirmBtnText}>Claim {reward} TFT</Text>
              </Pressable>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AirdropScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 12 : insets.top;

  const { plan } = useSubscription();
  const { creditBalance } = useBalance();

  const [activeIndex, setActiveIndex] = useState(0);
  const [openingBox, setOpeningBox] = useState<BoxConfig | null>(null);
  const [reward, setReward] = useState(0);
  const [phase, setPhase] = useState<"opening" | "reveal">("opening");
  const scrollRef = useRef<ScrollView>(null);

  // Determine unlocked level based on plan
  const planLevel = plan ? (PLAN_LEVEL[plan.id] ?? 1) : 1;
  const unlockedLevel = planLevel; // LV1 always free; others need plan

  const isUnlocked = useCallback((box: BoxConfig) => {
    if (box.level === 1) return true;
    return box.level <= unlockedLevel;
  }, [unlockedLevel]);

  const handleOpen = useCallback((box: BoxConfig) => {
    const r = pickReward(box.tiers);
    setReward(r);
    setOpeningBox(box);
    setPhase("opening");

    // After 1.6s switch to reveal
    setTimeout(() => setPhase("reveal"), 1600);
  }, []);

  const handleConfirm = useCallback(() => {
    if (reward > 0) {
      creditBalance(reward, `Mystery Box LV${openingBox?.level} reward`);
    }
    setOpeningBox(null);
  }, [reward, openingBox, creditBalance]);

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (CARD_W + 16));
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Header */}
      <LinearGradient colors={["#7B61FF", "#5CBFFE", "#2BD9A8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGrad}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Image source={require("../assets/images/apex-logo.jpeg")} style={styles.headerLogo} contentFit="contain" />
          <Text style={styles.headerTitle}>Airdrop Boxes</Text>
          <Text style={styles.headerSub}>Open mystery boxes to earn TFT rewards</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Plan level badge */}
      <View style={styles.planRow}>
        <MaterialCommunityIcons name="shield-check" size={14} color="#5CBFFE" />
        <Text style={styles.planText}>
          {plan ? `${plan.name} Plan · Up to LV${unlockedLevel} unlocked` : "No plan · LV1 only"}
        </Text>
        <Pressable onPress={() => router.push("/subscriptions")} style={styles.upgradeBtn}>
          <Text style={styles.upgradeText}>Upgrade ›</Text>
        </Pressable>
      </View>

      {/* Horizontal box slider */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={CARD_W + 16}
        snapToAlignment="center"
        contentContainerStyle={styles.slider}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {BOXES.map((box) => (
          <BoxCard
            key={box.level}
            box={box}
            isUnlocked={isUnlocked(box)}
            onOpen={handleOpen}
          />
        ))}
      </ScrollView>

      <Dots count={BOXES.length} active={activeIndex} />

      {/* Info strip */}
      <View style={styles.infoStrip}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="cube-outline" size={18} color="#5CBFFE" />
          <Text style={styles.infoLabel}>6 Boxes</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="gift" size={18} color="#2BD9A8" />
          <Text style={styles.infoLabel}>5–280 TFT</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="refresh" size={18} color="#FFB08A" />
          <Text style={styles.infoLabel}>Instant</Text>
        </View>
      </View>

      {/* Opening modal */}
      <Modal visible={!!openingBox} transparent animationType="fade" onRequestClose={() => setOpeningBox(null)}>
        {openingBox && (
          <OpeningModal
            box={openingBox}
            reward={reward}
            phase={phase}
            onConfirm={handleConfirm}
            onClose={() => setOpeningBox(null)}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F6FB" },

  // Header
  headerGrad: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12, flexDirection: "row", alignItems: "flex-start" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginTop: 4 },
  headerLogo: { width: 52, height: 52, borderRadius: 14, marginBottom: 6, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2, textAlign: "center" },

  // Plan badge
  planRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", marginHorizontal: 16, marginTop: 14, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#E5E8EE" },
  planText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  upgradeBtn: { backgroundColor: "#EEF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  upgradeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#5CBFFE" },

  // Slider
  slider: { paddingHorizontal: 24, paddingVertical: 18, gap: 16, flexDirection: "row", alignItems: "center" },

  // Box Card
  card: {
    width: CARD_W,
    borderRadius: 28,
    overflow: "hidden",
    padding: 24,
    paddingBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    minHeight: 460,
    justifyContent: "space-between",
  },
  levelBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  levelText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  lockBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    padding: 6,
  },
  watermark: {
    position: "absolute",
    right: -20,
    bottom: 80,
    width: 120,
    height: 120,
    opacity: 0.1,
    borderRadius: 20,
  },
  boxIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  boxIconInner: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  boxIconLocked: { opacity: 0.5 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 22,
  },
  boxInfo: { alignItems: "center", gap: 6, width: "100%" },
  boxName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", letterSpacing: -0.3 },
  boxSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  rewardBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  rewardText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  oddsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 4 },
  oddsPill: { backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: "center" },
  oddsText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  oddsChance: { fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },

  // Open button
  openBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    marginTop: 8,
  },
  openBtnDisabled: { backgroundColor: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.15)" },
  openBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  openBtnTextDisabled: { color: "rgba(255,255,255,0.4)", fontSize: 12 },

  // Info strip
  infoStrip: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", marginHorizontal: 16, marginTop: 14, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: "#E5E8EE" },
  infoItem: { flex: 1, alignItems: "center", gap: 4 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  infoDivider: { width: 1, height: 28, backgroundColor: "#E5E8EE" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    padding: 28,
    alignItems: "center",
    gap: 16,
    minHeight: 400,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  modalClose: { position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  modalOpeningTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.9)", letterSpacing: 0.5 },
  modalBoxName: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  modalCongrats: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  rewardCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    overflow: "hidden",
  },
  rewardAmount: { fontSize: 48, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 56 },
  rewardUnit: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },
  rewardNote: { flexDirection: "row", alignItems: "center", gap: 6 },
  rewardNoteText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  confirmBtn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    gap: 8,
  },
  confirmBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
