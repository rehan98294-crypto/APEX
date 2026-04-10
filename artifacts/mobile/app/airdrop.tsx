import { Feather } from "@expo/vector-icons";
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
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { useSubscription } from "@/context/SubscriptionContext";

const { width: SW } = Dimensions.get("window");
const CARD_W = SW - 56;
const BOX_W = 180;
const BOX_BODY_H = 140;
const LID_H = 52;

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
  tierName: string;
  range: string;
  lidGrad: [string, string];
  bodyGrad: [string, string];
  glowColor: string;
  ribbonColor: string;
  tiers: BoxRewardTier[];
  requiredPlan: string | null;
}

const BOXES: BoxConfig[] = [
  {
    level: 1,
    name: "Mystery Box I",
    subtitle: "Starter Treasure",
    tierName: "BRONZE",
    range: "5 – 20 TFT",
    lidGrad: ["#E8A87C", "#CD7F32"],
    bodyGrad: ["#D4894A", "#A0522D"],
    glowColor: "#FFB870",
    ribbonColor: "#FFD700",
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
    tierName: "SILVER",
    range: "20 – 50 TFT",
    lidGrad: ["#E8E8E8", "#A8A8A8"],
    bodyGrad: ["#C8C8C8", "#888888"],
    glowColor: "#D0D8E8",
    ribbonColor: "#5CBFFE",
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
    tierName: "GOLD",
    range: "50 – 80 TFT",
    lidGrad: ["#FFE066", "#F59E0B"],
    bodyGrad: ["#F59E0B", "#B7791F"],
    glowColor: "#FFE08A",
    ribbonColor: "#fff",
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
    tierName: "DIAMOND",
    range: "80 – 120 TFT",
    lidGrad: ["#A8EDFF", "#38BDF8"],
    bodyGrad: ["#38BDF8", "#0369A1"],
    glowColor: "#7DD3FC",
    ribbonColor: "#fff",
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
    tierName: "PLATINUM",
    range: "120 – 200 TFT",
    lidGrad: ["#F0ABFC", "#A855F7"],
    bodyGrad: ["#A855F7", "#6B21A8"],
    glowColor: "#E879F9",
    ribbonColor: "#FFD700",
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
    subtitle: "Super Magic",
    tierName: "✦ SUPER MAGIC ✦",
    range: "200 – 280 TFT",
    lidGrad: ["#FF6EB4", "#FFB347"],
    bodyGrad: ["#7B61FF", "#FF6EB4"],
    glowColor: "#FFD700",
    ribbonColor: "#FFD700",
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
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 22 : 7, height: 7, borderRadius: 4,
            backgroundColor: i === active ? "#5CBFFE" : "#D1D5DB",
          }}
        />
      ))}
    </View>
  );
}

// ── Physical Box Visual ───────────────────────────────────────────────────────
function BoxVisual({
  box,
  isUnlocked,
  lidUp = false,
  size = 1,
}: {
  box: BoxConfig;
  isUnlocked: boolean;
  lidUp?: boolean;
  size?: number;
}) {
  const bw = BOX_W * size;
  const bh = BOX_BODY_H * size;
  const lh = LID_H * size;
  const locked = !isUnlocked;

  return (
    <View style={{ alignItems: "center", width: bw + 12 }}>
      {/* LID */}
      <View style={{
        width: bw + 12, height: lh, borderRadius: 10 * size, overflow: "hidden",
        marginBottom: lidUp ? -(lh) : 0,
        transform: lidUp ? [{ translateY: -(lh + 20 * size) }] : [],
        shadowColor: box.glowColor, shadowOpacity: 0.6, shadowRadius: 10, elevation: 8,
      }}>
        <LinearGradient colors={locked ? ["#9CA3AF", "#6B7280"] : box.lidGrad} style={StyleSheet.absoluteFill} />
        {/* Ribbon knob on lid */}
        <View style={{
          position: "absolute", bottom: -8 * size, left: "50%",
          marginLeft: -14 * size,
          width: 28 * size, height: 16 * size,
          backgroundColor: locked ? "#aaa" : box.ribbonColor,
          borderRadius: 6 * size,
          shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
        }} />
        {/* Lid shine */}
        <View style={{ position: "absolute", top: 4 * size, left: 10 * size, right: 10 * size, height: 6 * size, borderRadius: 3 * size, backgroundColor: "rgba(255,255,255,0.35)" }} />
        {/* Tier label */}
        <Text style={{
          position: "absolute", bottom: 6 * size, alignSelf: "center",
          fontSize: 9 * size, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.85)",
          letterSpacing: 1.5,
        }}>{box.tierName}</Text>
      </View>

      {/* BODY */}
      <View style={{
        width: bw, height: bh, borderRadius: 12 * size, overflow: "hidden",
        shadowColor: box.glowColor, shadowOpacity: locked ? 0.1 : 0.5, shadowRadius: 18, elevation: 10,
      }}>
        <LinearGradient colors={locked ? ["#9CA3AF", "#6B7280"] : box.bodyGrad} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

        {/* Front Apex logo panel */}
        <View style={{
          position: "absolute", top: 14 * size, left: "50%", marginLeft: -(52 * size / 2),
          width: 52 * size, height: 52 * size, borderRadius: 14 * size,
          overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
          opacity: locked ? 0.4 : 1,
        }}>
          <Image source={require("../assets/images/apex-logo.jpeg")} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        </View>

        {/* Vertical ribbon stripe */}
        <View style={{ position: "absolute", top: 0, bottom: 0, left: "50%", marginLeft: -(4 * size / 2), width: 4 * size, backgroundColor: locked ? "rgba(255,255,255,0.1)" : box.ribbonColor, opacity: 0.6 }} />

        {/* Shine panels */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 * size, backgroundColor: "rgba(255,255,255,0.12)" }} />

        {/* Level badge */}
        <View style={{
          position: "absolute", bottom: 10 * size, alignSelf: "center",
          backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 8 * size,
          paddingHorizontal: 10 * size, paddingVertical: 3 * size,
          borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
        }}>
          <Text style={{ fontSize: 10 * size, fontFamily: "Inter_700Bold", color: "#fff" }}>LV {box.level}</Text>
        </View>

        {/* Lock overlay */}
        {locked && (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" }}>
            <Feather name="lock" size={32 * size} color="rgba(255,255,255,0.7)" />
          </View>
        )}
      </View>
    </View>
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
  return (
    <Animated.View entering={FadeIn.duration(350)} style={styles.card}>
      {/* Soft gradient BG */}
      <LinearGradient
        colors={isUnlocked ? [box.glowColor + "22", "#F4F6FB"] : ["#F0F2F5", "#F4F6FB"]}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top badge row */}
      <View style={styles.cardTopRow}>
        <View style={[styles.tierBadge, { backgroundColor: isUnlocked ? box.glowColor + "33" : "#E5E8EE" }]}>
          <Text style={[styles.tierBadgeText, { color: isUnlocked ? box.bodyGrad[0] : Colors.textMuted }]}>
            {box.tierName}
          </Text>
        </View>
        {!isUnlocked && (
          <View style={styles.lockPill}>
            <Feather name="lock" size={10} color={Colors.textMuted} />
            <Text style={styles.lockPillText}>
              {box.requiredPlan ? box.requiredPlan.charAt(0).toUpperCase() + box.requiredPlan.slice(1) : "Locked"}
            </Text>
          </View>
        )}
      </View>

      {/* Box visual */}
      <View style={styles.boxVisualWrap}>
        {isUnlocked && (
          <View style={[styles.glowCircle, { backgroundColor: box.glowColor + "40" }]} />
        )}
        <BoxVisual box={box} isUnlocked={isUnlocked} />
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.boxName}>{box.name}</Text>
        <Text style={styles.boxSubtitle}>{box.subtitle}</Text>

        <View style={[styles.rangePill, { borderColor: isUnlocked ? box.glowColor : "#E5E8EE" }]}>
          <Text style={[styles.rangeText, { color: isUnlocked ? box.bodyGrad[0] : Colors.textMuted }]}>🎁  {box.range}</Text>
        </View>

        {/* Odds */}
        <View style={styles.oddsRow}>
          {box.tiers.map((t) => (
            <View key={t.reward} style={styles.oddsPill}>
              <Text style={styles.oddsAmt}>{t.reward}</Text>
              <Text style={styles.oddsUnit}>TFT</Text>
              <Text style={styles.oddsChance}>{t.weight}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Open button */}
      <Pressable
        style={[styles.openBtn, isUnlocked ? styles.openBtnActive : styles.openBtnLocked]}
        onPress={() => isUnlocked && onOpen(box)}
        disabled={!isUnlocked}
      >
        {isUnlocked ? (
          <LinearGradient
            colors={[box.lidGrad[0], box.bodyGrad[0]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
            borderRadius={14}
          />
        ) : null}
        <Feather
          name={isUnlocked ? "gift" : "lock"}
          size={16}
          color={isUnlocked ? "#fff" : Colors.textMuted}
        />
        <Text style={[styles.openBtnText, !isUnlocked && styles.openBtnTextLocked]}>
          {isUnlocked ? "Open Box" : `Requires ${box.requiredPlan ? box.requiredPlan.charAt(0).toUpperCase() + box.requiredPlan.slice(1) + " Plan" : "Plan"}`}
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
  // Lid slides up
  const lidY = useSharedValue(0);
  // Reward card rises from inside box
  const cardY = useSharedValue(120);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.7);
  // Glow pulse
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (phase === "opening") {
      // Lid flies up
      lidY.value = withSpring(-(LID_H + 80), { damping: 14, stiffness: 120 });
      // Glow bursts from inside
      glowOpacity.value = withDelay(300, withTiming(1, { duration: 250 }));
      glowScale.value = withDelay(300, withSpring(2.8, { damping: 8 }));
    } else {
      // Reward card rises
      cardY.value = withSpring(0, { damping: 14, stiffness: 90 });
      cardOpacity.value = withTiming(1, { duration: 300 });
      cardScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    }
  }, [phase]);

  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lidY.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }, { scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.modalOverlay}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.modalSheet}>

        {/* Close */}
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Feather name="x" size={16} color={Colors.textMuted} />
        </Pressable>

        <Text style={styles.modalTitle}>
          {phase === "opening" ? "Opening…" : "🎉 You Got It!"}
        </Text>
        <Text style={styles.modalBoxName}>{box.name}</Text>

        {/* Box + animation stage */}
        <View style={styles.stageWrap}>
          {/* Glow burst from inside */}
          <Animated.View style={[styles.glowBurst, { backgroundColor: box.glowColor }, glowStyle]} />

          {/* Box lid (animated upward) */}
          <View style={styles.lidContainer}>
            <Animated.View style={[lidStyle, { alignItems: "center" }]}>
              <View style={{
                width: BOX_W * 1.1 + 12, height: LID_H * 1.1, borderRadius: 12, overflow: "hidden",
                shadowColor: box.glowColor, shadowOpacity: 0.7, shadowRadius: 14, elevation: 10,
              }}>
                <LinearGradient colors={box.lidGrad} style={StyleSheet.absoluteFill} />
                <View style={{ position: "absolute", bottom: -5, left: "50%", marginLeft: -14, width: 28, height: 14, backgroundColor: box.ribbonColor, borderRadius: 6 }} />
                <View style={{ position: "absolute", top: 4, left: 10, right: 10, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" }} />
                <Text style={{ position: "absolute", bottom: 6, alignSelf: "center", fontSize: 9, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.85)", letterSpacing: 1.5 }}>{box.tierName}</Text>
              </View>
            </Animated.View>
          </View>

          {/* Box body (stays) */}
          <View style={{ zIndex: 2 }}>
            <BoxVisual box={box} isUnlocked={true} lidUp={false} size={1.1} />
          </View>

          {/* Reward card rises from inside */}
          {phase === "reveal" && (
            <Animated.View style={[styles.rewardCardFloat, cardStyle]}>
              <LinearGradient colors={[box.lidGrad[0], box.bodyGrad[0]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
              <Text style={styles.rewardCardLabel}>Reward</Text>
              <Text style={styles.rewardCardAmt}>{reward}</Text>
              <Text style={styles.rewardCardUnit}>TFT</Text>
              <Text style={styles.rewardCardNote}>Added to your balance</Text>
            </Animated.View>
          )}
        </View>

        {/* Claim button */}
        {phase === "reveal" && (
          <Animated.View entering={FadeInUp.duration(350).delay(200)} style={{ width: "100%", marginTop: 24 }}>
            <Pressable style={styles.claimBtn} onPress={onConfirm}>
              <LinearGradient
                colors={[box.lidGrad[0], box.bodyGrad[0]]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
              />
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={styles.claimBtnText}>Claim {reward} TFT</Text>
            </Pressable>
          </Animated.View>
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

  const planLevel = plan ? (PLAN_LEVEL[plan.id] ?? 1) : 1;
  const unlockedLevel = planLevel;

  const isUnlocked = useCallback((box: BoxConfig) => {
    if (box.level === 1) return true;
    return box.level <= unlockedLevel;
  }, [unlockedLevel]);

  const handleOpen = useCallback((box: BoxConfig) => {
    const r = pickReward(box.tiers);
    setReward(r);
    setOpeningBox(box);
    setPhase("opening");
    setTimeout(() => setPhase("reveal"), 1400);
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
      <LinearGradient
        colors={["#7B61FF", "#5CBFFE", "#2BD9A8"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.headerGrad}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Image source={require("../assets/images/apex-logo.jpeg")} style={styles.headerLogo} contentFit="cover" />
          <Text style={styles.headerTitle}>Airdrop Boxes</Text>
          <Text style={styles.headerSub}>Open mystery boxes to earn TFT rewards</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Plan strip */}
      <View style={styles.planRow}>
        <Feather name="shield" size={13} color="#5CBFFE" />
        <Text style={styles.planText}>
          {plan ? `${plan.name} Plan  ·  LV1–LV${unlockedLevel} unlocked` : "No plan  ·  LV1 only"}
        </Text>
        <Pressable onPress={() => router.push("/subscriptions")} style={styles.upgradeBtn}>
          <Text style={styles.upgradeText}>Upgrade ›</Text>
        </Pressable>
      </View>

      {/* Slider */}
      <ScrollView
        horizontal
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

      {/* Info bar */}
      <View style={styles.infoStrip}>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>📦</Text>
          <Text style={styles.infoLabel}>6 Boxes</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>🎁</Text>
          <Text style={styles.infoLabel}>5–280 TFT</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>⚡</Text>
          <Text style={styles.infoLabel}>Instant Credit</Text>
        </View>
      </View>

      {/* Modal */}
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

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F6FB" },

  headerGrad: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 10, flexDirection: "row", alignItems: "flex-start" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", marginTop: 2 },
  headerLogo: { width: 50, height: 50, borderRadius: 14, marginBottom: 6, borderWidth: 2, borderColor: "rgba(255,255,255,0.45)" },
  headerTitle: { fontSize: 19, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.3 },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2, textAlign: "center" },

  planRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#E5E8EE" },
  planText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  upgradeBtn: { backgroundColor: "#EEF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  upgradeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#5CBFFE" },

  slider: { paddingHorizontal: 20, paddingVertical: 16, gap: 16 },

  // Card
  card: {
    width: CARD_W,
    borderRadius: 24,
    overflow: "hidden",
    padding: 20,
    paddingBottom: 18,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    gap: 12,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tierBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  lockPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  lockPillText: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textMuted },

  boxVisualWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 8, position: "relative" },
  glowCircle: { position: "absolute", width: 170, height: 170, borderRadius: 85 },

  cardInfo: { alignItems: "center", gap: 6 },
  boxName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, textAlign: "center", letterSpacing: -0.3 },
  boxSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  rangePill: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 6 },
  rangeText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  oddsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 2 },
  oddsPill: { backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignItems: "center", minWidth: 52 },
  oddsAmt: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  oddsUnit: { fontSize: 8, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  oddsChance: { fontSize: 9, fontFamily: "Inter_500Medium", color: "#5CBFFE" },

  openBtn: {
    height: 48, borderRadius: 14, overflow: "hidden",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  openBtnActive: { shadowColor: "#5CBFFE", shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  openBtnLocked: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E8EE" },
  openBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  openBtnTextLocked: { color: Colors.textMuted, fontSize: 12 },

  // Info bar
  infoStrip: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#E5E8EE" },
  infoItem: { flex: 1, alignItems: "center", gap: 2 },
  infoEmoji: { fontSize: 18 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  infoDivider: { width: 1, height: 30, backgroundColor: "#E5E8EE" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "flex-end" },
  modalSheet: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
    minHeight: 520,
  },
  modalClose: { position: "absolute", top: 16, right: 20, width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 2, marginTop: 4 },
  modalBoxName: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginBottom: 16 },

  stageWrap: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: 310,
    position: "relative",
    width: "100%",
  },
  glowBurst: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: BOX_BODY_H * 1.1 * 0.5,
    opacity: 0.5,
    zIndex: 1,
  },
  lidContainer: {
    position: "absolute",
    bottom: BOX_BODY_H * 1.1 - 4,
    zIndex: 10,
    width: "100%",
    alignItems: "center",
  },
  rewardCardFloat: {
    position: "absolute",
    bottom: BOX_BODY_H * 1.1 * 0.25,
    width: BOX_W * 1.1 - 16,
    height: 160,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 14,
    gap: 2,
  },
  rewardCardLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)", letterSpacing: 1.2, textTransform: "uppercase" },
  rewardCardAmt: { fontSize: 52, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 58 },
  rewardCardUnit: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)" },
  rewardCardNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 4 },

  claimBtn: {
    height: 54, borderRadius: 16, overflow: "hidden",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    shadowColor: "#5CBFFE", shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  claimBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
});
