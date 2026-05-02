import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
const SLIDE_W = SW - 40;

// ── Sprite sheet ──────────────────────────────────────────────────────────────
// Image: 631×1024 px  —  2 cols × 3 rows of chests
// Tightly cropped to the chest body, cutting out the blue JPEG background
const IMG_W = 631;
const IMG_H = 1024;

// Each chest "cell" in source pixels (col × row origin + size)
// Tweaked inward to cut off most of the blue game background
const SRC_CELLS = [
  { col: 0, srcX: 18,  srcY: 70,  cw: 278, ch: 255 }, // Silver
  { col: 1, srcX: 334, srcY: 70,  cw: 278, ch: 255 }, // Wooden
  { col: 0, srcX: 10,  srcY: 380, cw: 295, ch: 260 }, // Golden
  { col: 1, srcX: 328, srcY: 390, cw: 278, ch: 255 }, // Giant
  { col: 0, srcX: 8,   srcY: 700, cw: 300, ch: 260 }, // Magical
  { col: 1, srcX: 318, srcY: 700, cw: 300, ch: 260 }, // Super Magical
];

// ── Plan level mapping ────────────────────────────────────────────────────────
const PLAN_LEVEL: Record<string, number> = {
  basic: 2, advance: 3, pro: 4, elite: 5, ultimate: 6,
};

// ── Box data ──────────────────────────────────────────────────────────────────
interface Tier { reward: number; weight: number; }

interface BoxDef {
  level: number;
  name: string;
  subtitle: string;
  chestIdx: number;
  accentColor: string;
  grad: [string, string];
  tiers: Tier[];
  requiredPlan: string | null;
}

const BOXES: BoxDef[] = [
  {
    level: 1, name: "Mystery Box I",   subtitle: "Silver Chest",       chestIdx: 0,
    accentColor: "#38BDF8", grad: ["#BAE6FD", "#0EA5E9"],
    tiers: [{ reward: 5, weight: 82 }, { reward: 10, weight: 10 }, { reward: 15, weight: 5 }, { reward: 20, weight: 3 }],
    requiredPlan: null,
  },
  {
    level: 2, name: "Mystery Box II",  subtitle: "Wooden Chest",       chestIdx: 1,
    accentColor: "#D97706", grad: ["#FDE68A", "#D97706"],
    tiers: [{ reward: 20, weight: 80 }, { reward: 30, weight: 12 }, { reward: 40, weight: 5 }, { reward: 50, weight: 3 }],
    requiredPlan: "basic",
  },
  {
    level: 3, name: "Mystery Box III", subtitle: "Golden Chest",       chestIdx: 2,
    accentColor: "#F59E0B", grad: ["#FEF08A", "#F59E0B"],
    tiers: [{ reward: 50, weight: 80 }, { reward: 60, weight: 12 }, { reward: 70, weight: 5 }, { reward: 80, weight: 3 }],
    requiredPlan: "advance",
  },
  {
    level: 4, name: "Mystery Box IV",  subtitle: "Giant Chest",        chestIdx: 3,
    accentColor: "#B45309", grad: ["#FCD34D", "#92400E"],
    tiers: [{ reward: 80, weight: 80 }, { reward: 100, weight: 12 }, { reward: 110, weight: 5 }, { reward: 120, weight: 3 }],
    requiredPlan: "pro",
  },
  {
    level: 5, name: "Mystery Box V",   subtitle: "Magical Chest",      chestIdx: 4,
    accentColor: "#D946EF", grad: ["#F5D0FE", "#A855F7"],
    tiers: [{ reward: 120, weight: 75 }, { reward: 150, weight: 15 }, { reward: 180, weight: 7 }, { reward: 200, weight: 3 }],
    requiredPlan: "elite",
  },
  {
    level: 6, name: "Mystery Box VI",  subtitle: "Super Magical",      chestIdx: 5,
    accentColor: "#6366F1", grad: ["#C7D2FE", "#4338CA"],
    tiers: [{ reward: 200, weight: 75 }, { reward: 230, weight: 15 }, { reward: 260, weight: 7 }, { reward: 280, weight: 3 }],
    requiredPlan: "ultimate",
  },
];

function pickReward(tiers: Tier[]): number {
  const total = tiers.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of tiers) { r -= t.weight; if (r <= 0) return t.reward; }
  return tiers[0].reward;
}

// ── Dots ─────────────────────────────────────────────────────────────────────
function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: i === active ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === active ? "#5CBFFE" : "#D1D5DB" }} />
      ))}
    </View>
  );
}

// ── Chest image — tightly cropped from sprite sheet ───────────────────────────
function ChestImage({ chestIdx, displayW, locked }: { chestIdx: number; displayW: number; locked: boolean }) {
  const src = SRC_CELLS[chestIdx];
  const scale = displayW / src.cw;
  const displayH = src.ch * scale;
  const imgW = IMG_W * scale;
  const imgH = IMG_H * scale;
  const left = -(src.srcX * scale);
  const top  = -(src.srcY * scale);

  return (
    <View style={{ width: displayW, height: displayH, overflow: "hidden" }}>
      <Image
        source={require("../assets/images/boxes.jpg")}
        style={{ width: imgW, height: imgH, position: "absolute", left, top, opacity: locked ? 0.3 : 1 }}
        contentFit="fill"
      />
      {locked && (
        <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
          <View style={{ backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 50, padding: 12 }}>
            <Feather name="lock" size={30} color="#fff" />
          </View>
        </View>
      )}
    </View>
  );
}

// ── Slide (no card background — chest floats directly) ────────────────────────
function BoxSlide({ box, isUnlocked, onOpen }: { box: BoxDef; isUnlocked: boolean; onOpen: (b: BoxDef) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.slide]}>

      {/* LV badge */}
      <View style={[styles.lvBadge, { backgroundColor: isUnlocked ? box.accentColor : "#9CA3AF" }]}>
        <Text style={styles.lvText}>LV {box.level}</Text>
      </View>

      {/* ─── Chest image — no background box ─── */}
      <View style={styles.chestArea}>
        {isUnlocked && (
          <View style={[styles.chestGlow, { backgroundColor: box.accentColor + "35" }]} />
        )}
        <ChestImage chestIdx={box.chestIdx} displayW={220} locked={!isUnlocked} />
      </View>

      {/* Name + subtitle */}
      <Text style={styles.chestName}>{box.name}</Text>
      <Text style={[styles.chestSub, { color: isUnlocked ? box.accentColor : Colors.textMuted }]}>
        {box.subtitle}
      </Text>

      {/* Reward range */}
      <View style={[styles.rangePill, { borderColor: isUnlocked ? box.accentColor : "#E5E8EE", backgroundColor: isUnlocked ? box.accentColor + "14" : "#F9FAFB" }]}>
        <Text style={[styles.rangeText, { color: isUnlocked ? box.grad[1] : Colors.textMuted }]}>
          🎁  {box.tiers[0].reward} – {box.tiers[box.tiers.length - 1].reward} TFT
        </Text>
      </View>

      {/* Odds */}
      <View style={styles.oddsRow}>
        {box.tiers.map((t) => (
          <View key={t.reward} style={styles.oddsPill}>
            <Text style={styles.oddsAmt}>{t.reward} TFT</Text>
            <Text style={[styles.oddsChance, { color: isUnlocked ? box.accentColor : "#9CA3AF" }]}>{t.weight}%</Text>
          </View>
        ))}
      </View>

      {/* Open button */}
      <Pressable
        style={[styles.openBtn, !isUnlocked && styles.openBtnDisabled]}
        onPress={() => isUnlocked && onOpen(box)}
        disabled={!isUnlocked}
      >
        {isUnlocked && (
          <LinearGradient colors={box.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
        )}
        <Feather name={isUnlocked ? "gift" : "lock"} size={17} color={isUnlocked ? "#fff" : "#9CA3AF"} />
        <Text style={[styles.openBtnText, !isUnlocked && styles.openBtnTextDisabled]}>
          {isUnlocked
            ? "Open Box"
            : box.requiredPlan
            ? `Requires ${box.requiredPlan.charAt(0).toUpperCase() + box.requiredPlan.slice(1)} Plan`
            : "Locked"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Opening modal ─────────────────────────────────────────────────────────────
function OpenModal({ box, reward, phase, onConfirm, onClose }: {
  box: BoxDef; reward: number; phase: "opening" | "reveal";
  onConfirm: () => void; onClose: () => void;
}) {
  const chestY     = useSharedValue(80);
  const chestScale = useSharedValue(0.5);
  const cardY      = useSharedValue(100);
  const cardOp     = useSharedValue(0);
  const cardSc     = useSharedValue(0.6);
  const glowSc     = useSharedValue(0.3);
  const glowOp     = useSharedValue(0);

  React.useEffect(() => {
    chestY.value     = withSpring(0,   { damping: 12, stiffness: 100 });
    chestScale.value = withSpring(1,   { damping: 12, stiffness: 100 });
  }, []);

  React.useEffect(() => {
    if (phase === "reveal") {
      glowOp.value = withTiming(1, { duration: 250 });
      glowSc.value = withSpring(2.6, { damping: 7, stiffness: 70 });
      cardY.value  = withDelay(100, withSpring(0,  { damping: 14, stiffness: 80 }));
      cardOp.value = withDelay(100, withTiming(1,  { duration: 300 }));
      cardSc.value = withDelay(100, withSpring(1,  { damping: 12, stiffness: 90 }));
    }
  }, [phase]);

  const chestStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chestY.value }, { scale: chestScale.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }, { scale: cardSc.value }],
    opacity: cardOp.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowSc.value }],
    opacity: glowOp.value,
  }));

  return (
    <View style={styles.modalBg}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.modalSheet}>
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Feather name="x" size={15} color={Colors.textMuted} />
        </Pressable>

        <Text style={styles.modalTitle}>{phase === "opening" ? "Opening…" : "🎉 You Got It!"}</Text>
        <Text style={styles.modalSub}>{box.name}  ·  {box.subtitle}</Text>

        {/* Stage */}
        <View style={styles.stageWrap}>
          <Animated.View style={[styles.glowBlob, { backgroundColor: box.accentColor }, glowStyle]} />

          <Animated.View style={chestStyle}>
            <ChestImage chestIdx={box.chestIdx} displayW={190} locked={false} />
          </Animated.View>

          {phase === "reveal" && (
            <Animated.View style={[styles.rewardCard, cardStyle]}>
              <LinearGradient colors={box.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 22 }]} />
              <Text style={styles.rcLabel}>Reward</Text>
              <Text style={styles.rcAmt}>{reward}</Text>
              <Text style={styles.rcUnit}>TFT</Text>
              <Text style={styles.rcNote}>Added to your balance</Text>
            </Animated.View>
          )}
        </View>

        {phase === "reveal" && (
          <Animated.View entering={FadeInUp.duration(350).delay(280)} style={{ width: "100%", marginTop: 16 }}>
            <Pressable style={styles.claimBtn} onPress={onConfirm}>
              <LinearGradient colors={box.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={styles.claimText}>Claim {reward} TFT</Text>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function AirdropScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const topPad    = Platform.OS === "web" ? 12 : insets.top;
  const { plan }  = useSubscription();
  const { creditBalance } = useBalance();

  const [activeIdx,  setActiveIdx]  = useState(0);
  const [openBox,    setOpenBox]    = useState<BoxDef | null>(null);
  const [reward,     setReward]     = useState(0);
  const [phase,      setPhase]      = useState<"opening" | "reveal">("opening");
  const [showTBA,    setShowTBA]    = useState(false);

  const planLevel    = plan ? (PLAN_LEVEL[plan.id] ?? 1) : 1;
  const isUnlocked   = useCallback((b: BoxDef) => b.level === 1 || b.level <= planLevel, [planLevel]);

  const handleOpen = useCallback((box: BoxDef) => {
    setReward(pickReward(box.tiers));
    setOpenBox(box);
    setPhase("opening");
    setTimeout(() => setPhase("reveal"), 1300);
  }, []);

  const handleClaim = useCallback(() => {
    if (reward > 0) creditBalance(reward, `Mystery Box LV${openBox?.level} reward`);
    setOpenBox(null);
  }, [reward, openBox, creditBalance]);

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Header */}
      <LinearGradient colors={["#7B61FF", "#5CBFFE", "#2BD9A8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Image source={require("../assets/images/apex-logo.jpeg")} style={styles.headerLogo} contentFit="cover" />
          <Text style={styles.headerTitle}>Airdrop Boxes</Text>
          <Text style={styles.headerSub}>Open mystery chests to earn TFT</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Plan strip */}
      <View style={styles.planRow}>
        <Feather name="shield" size={13} color="#5CBFFE" />
        <Text style={styles.planText}>
          {plan ? `${plan.name}  ·  LV1–LV${planLevel} unlocked` : "No plan  ·  LV1 only"}
        </Text>
        <Pressable onPress={() => setShowTBA(true)} style={styles.upgradeBtn}>
          <Text style={styles.upgradeText}>Upgrade ›</Text>
        </Pressable>
      </View>

      {/* Scroll */}
      <ScrollView
        horizontal
        decelerationRate="fast"
        snapToInterval={SLIDE_W + 16}
        snapToAlignment="center"
        contentContainerStyle={styles.slider}
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (SLIDE_W + 16));
          if (idx !== activeIdx) setActiveIdx(idx);
        }}
        scrollEventThrottle={16}
      >
        {BOXES.map((box) => (
          <BoxSlide key={box.level} box={box} isUnlocked={isUnlocked(box)} onOpen={handleOpen} />
        ))}
      </ScrollView>

      <Dots count={BOXES.length} active={activeIdx} />

      {/* Info bar */}
      <View style={styles.infoBar}>
        {[{ e: "📦", l: "6 Chests" }, { e: "🎁", l: "5–280 TFT" }, { e: "⚡", l: "Instant" }].map((it, i, a) => (
          <React.Fragment key={it.l}>
            <View style={styles.infoItem}><Text style={styles.infoEmoji}>{it.e}</Text><Text style={styles.infoLabel}>{it.l}</Text></View>
            {i < a.length - 1 && <View style={styles.infoDiv} />}
          </React.Fragment>
        ))}
      </View>

      <Modal visible={!!openBox} transparent animationType="fade" onRequestClose={() => setOpenBox(null)}>
        {openBox && <OpenModal box={openBox} reward={reward} phase={phase} onConfirm={handleClaim} onClose={() => setOpenBox(null)} />}
      </Modal>

      {/* ── TBA Modal ── */}
      <Modal visible={showTBA} transparent animationType="fade" onRequestClose={() => setShowTBA(false)}>
        <View style={styles.tbaOverlay}>
          <View style={styles.tbaSheet}>
            <View style={styles.tbaIconRing}>
              <LinearGradient colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={36} />
              <View style={styles.tbaIconInner}>
                <Feather name="clock" size={28} color="#5CBFFE" />
              </View>
            </View>
            <View style={styles.tbaBadge}>
              <LinearGradient colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={20} />
              <Feather name="zap" size={11} color="#fff" />
              <Text style={styles.tbaBadgeText}>TBA</Text>
            </View>
            <Text style={styles.tbaTitle}>Coming Soon</Text>
            <Text style={styles.tbaSub}>
              Subscription plans are currently in development. Exciting membership tiers with exclusive perks are on their way!
            </Text>
            <View style={styles.tbaChips}>
              {[{ icon: "unlock", label: "Level Unlocks" }, { icon: "trending-up", label: "Earn Boosts" }, { icon: "star", label: "VIP Perks" }, { icon: "users", label: "Team Rewards" }].map((c) => (
                <View key={c.label} style={styles.tbaChip}>
                  <Feather name={c.icon as any} size={12} color="#5CBFFE" />
                  <Text style={styles.tbaChipText}>{c.label}</Text>
                </View>
              ))}
            </View>
            <Pressable style={styles.tbaBtn} onPress={() => setShowTBA(false)}>
              <LinearGradient colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.tbaBtnText}>Got it, I'll wait!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0F4FA" },

  header: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 10, flexDirection: "row", alignItems: "flex-start" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", marginTop: 2 },
  headerLogo: { width: 48, height: 48, borderRadius: 13, marginBottom: 5, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.3 },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },

  planRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#E5E8EE" },
  planText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  upgradeBtn: { backgroundColor: "#EEF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  upgradeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#5CBFFE" },

  slider: { paddingHorizontal: 20, paddingVertical: 14, gap: 16 },

  // ── Slide — NO card background ──────────────────────────────────────────────
  slide: {
    width: SLIDE_W,
    alignItems: "center",
    paddingBottom: 8,
    gap: 8,
  },

  lvBadge: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5 },
  lvText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },

  chestArea: { alignItems: "center", justifyContent: "center", position: "relative", paddingVertical: 4 },
  chestGlow: { position: "absolute", width: 200, height: 160, borderRadius: 100 },

  chestName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, textAlign: "center", letterSpacing: -0.3 },
  chestSub: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: -4 },

  rangePill: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 6 },
  rangeText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  oddsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  oddsPill: { backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignItems: "center", minWidth: 60, borderWidth: 1, borderColor: "#E5E8EE" },
  oddsAmt: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  oddsChance: { fontSize: 10, fontFamily: "Inter_700Bold" },

  openBtn: { width: "100%", height: 50, borderRadius: 16, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  openBtnDisabled: { backgroundColor: "#E5E8EE" },
  openBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  openBtnTextDisabled: { color: "#9CA3AF", fontSize: 12 },

  infoBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#E5E8EE" },
  infoItem: { flex: 1, alignItems: "center", gap: 2 },
  infoEmoji: { fontSize: 18 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  infoDiv: { width: 1, height: 28, backgroundColor: "#E5E8EE" },

  // ── Modal ───────────────────────────────────────────────────────────────────
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "flex-end" },
  modalSheet: { width: "100%", backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: 44, alignItems: "center", minHeight: 500 },
  modalClose: { position: "absolute", top: 16, right: 20, width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginTop: 4 },
  modalSub: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginTop: 2, marginBottom: 10 },

  stageWrap: { width: "100%", height: 280, alignItems: "center", justifyContent: "flex-end", position: "relative" },
  glowBlob: { position: "absolute", width: 80, height: 80, borderRadius: 40, bottom: "30%", opacity: 0.4, zIndex: 0 },

  rewardCard: { position: "absolute", bottom: "35%", width: 170, height: 170, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", zIndex: 10, gap: 1, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  rcLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)", letterSpacing: 1.5, textTransform: "uppercase" },
  rcAmt: { fontSize: 54, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 60 },
  rcUnit: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)" },
  rcNote: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 4 },

  claimBtn: { height: 54, borderRadius: 16, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, width: "100%" },
  claimText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },

  // TBA modal
  tbaOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.52)", alignItems: "center", justifyContent: "center", padding: 24 },
  tbaSheet: { width: "100%", backgroundColor: "#fff", borderRadius: 28, padding: 28, alignItems: "center", gap: 16, shadowColor: "#5CBFFE", shadowOpacity: 0.14, shadowRadius: 24, elevation: 8 },
  tbaIconRing: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 3 },
  tbaIconInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  tbaBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, overflow: "hidden" },
  tbaBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 1.5 },
  tbaTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#111", textAlign: "center" },
  tbaSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666", textAlign: "center", lineHeight: 20 },
  tbaChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  tbaChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#EFF8FF", paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(92,191,254,0.25)" },
  tbaChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#3a8fd4" },
  tbaBtn: { width: "100%", height: 50, borderRadius: 14, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  tbaBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
