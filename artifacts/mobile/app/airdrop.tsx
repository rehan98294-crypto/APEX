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

// ── Sprite-sheet constants (image: 631×1024) ─────────────────────────────────
// 6 chests in a 2×3 grid. Each cell ≈ 316×295 (rows 0-1) / 316×245 (row 2).
// Row top positions: 55, 380, 700  |  Col left positions: 0, 316
const IMG_W = 631;
const IMG_H = 1024;
const CHEST_DISPLAY = 138;           // desired display size
const SCALE = CHEST_DISPLAY / 316;  // ≈ 0.437
const IMG_DISP_W = IMG_W * SCALE;   // full image at display scale
const IMG_DISP_H = IMG_H * SCALE;

// Pixel positions inside source image for each chest
const CHEST_SRC: { row: number; col: number; srcY: number; h: number }[] = [
  { row: 0, col: 0, srcY: 55,  h: 295 }, // Silver
  { row: 0, col: 1, srcY: 55,  h: 295 }, // Wooden
  { row: 1, col: 0, srcY: 380, h: 295 }, // Golden
  { row: 1, col: 1, srcY: 380, h: 295 }, // Giant
  { row: 2, col: 0, srcY: 700, h: 245 }, // Magical
  { row: 2, col: 1, srcY: 700, h: 245 }, // Super Magical
];

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
  chestIdx: number;        // index into CHEST_SRC
  accentColor: string;     // glow / badge color
  accentGrad: [string, string];
  tiers: BoxRewardTier[];
  requiredPlan: string | null;
}

const BOXES: BoxConfig[] = [
  {
    level: 1,
    name: "Mystery Box I",
    subtitle: "Silver Chest",
    chestIdx: 0,
    accentColor: "#7DD3FC",
    accentGrad: ["#BAE6FD", "#38BDF8"],
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
    subtitle: "Wooden Chest",
    chestIdx: 1,
    accentColor: "#D97706",
    accentGrad: ["#FCD34D", "#D97706"],
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
    subtitle: "Golden Chest",
    chestIdx: 2,
    accentColor: "#F59E0B",
    accentGrad: ["#FFE066", "#F59E0B"],
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
    subtitle: "Giant Chest",
    chestIdx: 3,
    accentColor: "#92400E",
    accentGrad: ["#D97706", "#78350F"],
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
    subtitle: "Magical Chest",
    chestIdx: 4,
    accentColor: "#D946EF",
    accentGrad: ["#F0ABFC", "#A855F7"],
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
    subtitle: "Super Magical",
    chestIdx: 5,
    accentColor: "#7C3AED",
    accentGrad: ["#818CF8", "#4F46E5"],
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

// ── Dots ─────────────────────────────────────────────────────────────────────
function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 22 : 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: i === active ? "#5CBFFE" : "#D1D5DB",
          }}
        />
      ))}
    </View>
  );
}

// ── Chest sprite ──────────────────────────────────────────────────────────────
function ChestSprite({
  chestIdx,
  size = CHEST_DISPLAY,
  locked = false,
}: {
  chestIdx: number;
  size?: number;
  locked?: boolean;
}) {
  const src = CHEST_SRC[chestIdx];
  const scale = size / 316;
  const imgW = IMG_W * scale;
  const imgH = IMG_H * scale;
  const offsetX = -(src.col * 316 * scale);
  const offsetY = -(src.srcY * scale);
  const containerH = src.h * scale;

  return (
    <View style={{ width: size, height: containerH, overflow: "hidden" }}>
      <Image
        source={require("../assets/images/boxes.jpg")}
        style={{
          width: imgW,
          height: imgH,
          position: "absolute",
          left: offsetX,
          top: offsetY,
          opacity: locked ? 0.35 : 1,
        }}
        contentFit="fill"
      />
      {locked && (
        <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
          <View style={{ backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 50, padding: 10 }}>
            <Feather name="lock" size={28} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
      )}
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
      {/* Subtle glow bg */}
      {isUnlocked && (
        <LinearGradient
          colors={[box.accentColor + "18", "#ffffff"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Top row: level + lock */}
      <View style={styles.cardTopRow}>
        <View style={[styles.levelBadge, { backgroundColor: isUnlocked ? box.accentColor + "22" : "#F3F4F6" }]}>
          <Text style={[styles.levelBadgeText, { color: isUnlocked ? box.accentGrad[1] : Colors.textMuted }]}>
            LV {box.level}
          </Text>
        </View>
        {!isUnlocked && (
          <View style={styles.lockPill}>
            <Feather name="lock" size={10} color={Colors.textMuted} />
            <Text style={styles.lockPillText}>
              {box.requiredPlan
                ? box.requiredPlan.charAt(0).toUpperCase() + box.requiredPlan.slice(1) + " Plan"
                : "Locked"}
            </Text>
          </View>
        )}
        {isUnlocked && (
          <View style={[styles.unlockedPill, { backgroundColor: box.accentColor + "22" }]}>
            <Feather name="unlock" size={10} color={box.accentGrad[1]} />
            <Text style={[styles.unlockedPillText, { color: box.accentGrad[1] }]}>Available</Text>
          </View>
        )}
      </View>

      {/* Chest sprite */}
      <View style={styles.chestWrap}>
        {isUnlocked && <View style={[styles.glowCircle, { backgroundColor: box.accentColor + "30" }]} />}
        <ChestSprite chestIdx={box.chestIdx} size={CHEST_DISPLAY} locked={!isUnlocked} />
      </View>

      {/* Info */}
      <Text style={styles.boxName}>{box.name}</Text>
      <Text style={styles.boxSubtitle}>{box.subtitle}</Text>

      {/* Range badge */}
      <View style={[styles.rangePill, { borderColor: isUnlocked ? box.accentColor : "#E5E8EE" }]}>
        <Text style={[styles.rangeText, { color: isUnlocked ? box.accentGrad[1] : Colors.textMuted }]}>
          🎁  {box.tiers[0].reward} – {box.tiers[box.tiers.length - 1].reward} TFT
        </Text>
      </View>

      {/* Odds pills */}
      <View style={styles.oddsRow}>
        {box.tiers.map((t) => (
          <View key={t.reward} style={styles.oddsPill}>
            <Text style={styles.oddsAmt}>{t.reward}</Text>
            <Text style={styles.oddsUnit}>TFT</Text>
            <Text style={[styles.oddsChance, { color: isUnlocked ? box.accentGrad[1] : "#9CA3AF" }]}>
              {t.weight}%
            </Text>
          </View>
        ))}
      </View>

      {/* Open button */}
      <Pressable
        style={[styles.openBtn, isUnlocked ? styles.openBtnActive : styles.openBtnLocked]}
        onPress={() => isUnlocked && onOpen(box)}
        disabled={!isUnlocked}
      >
        {isUnlocked && (
          <LinearGradient
            colors={box.accentGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
          />
        )}
        <Feather
          name={isUnlocked ? "gift" : "lock"}
          size={16}
          color={isUnlocked ? "#fff" : Colors.textMuted}
        />
        <Text style={[styles.openBtnText, !isUnlocked && styles.openBtnTextLocked]}>
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

// ── Opening Modal ─────────────────────────────────────────────────────────────
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
  // Chest bounces up on enter, then lid lifts
  const chestY = useSharedValue(60);
  const chestScale = useSharedValue(0.6);
  const lidY = useSharedValue(0);
  // Reward card rises from inside
  const cardY = useSharedValue(80);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.7);
  // Glow burst
  const glowScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);

  React.useEffect(() => {
    // Chest drops in
    chestY.value = withSpring(0, { damping: 12, stiffness: 100 });
    chestScale.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, []);

  React.useEffect(() => {
    if (phase === "reveal") {
      // Glow burst
      glowOpacity.value = withTiming(1, { duration: 200 });
      glowScale.value = withSpring(2.4, { damping: 8, stiffness: 80 });
      // Reward card rises
      cardY.value = withDelay(150, withSpring(0, { damping: 14, stiffness: 80 }));
      cardOpacity.value = withDelay(150, withTiming(1, { duration: 350 }));
      cardScale.value = withDelay(150, withSpring(1, { damping: 12, stiffness: 90 }));
    }
  }, [phase]);

  const chestStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chestY.value }, { scale: chestScale.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }, { scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const chestSrc = CHEST_SRC[box.chestIdx];
  const MODAL_CHEST = 160;
  const ms = MODAL_CHEST / 316;

  return (
    <View style={styles.modalOverlay}>
      <Animated.View entering={FadeIn.duration(220)} style={styles.modalSheet}>
        {/* Close */}
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Feather name="x" size={16} color={Colors.textMuted} />
        </Pressable>

        <Text style={styles.modalTitle}>
          {phase === "opening" ? "Opening…" : "🎉 You Got It!"}
        </Text>
        <Text style={styles.modalBoxSub}>{box.name}  ·  {box.subtitle}</Text>

        {/* Stage */}
        <View style={styles.stageWrap}>
          {/* Glow circle behind chest */}
          <Animated.View
            style={[
              styles.glowBurst,
              { backgroundColor: box.accentColor },
              glowStyle,
            ]}
          />

          {/* Chest */}
          <Animated.View style={[styles.modalChestWrap, chestStyle]}>
            <ChestSprite chestIdx={box.chestIdx} size={MODAL_CHEST} locked={false} />
          </Animated.View>

          {/* Reward card flies up from chest */}
          {phase === "reveal" && (
            <Animated.View style={[styles.rewardCard, cardStyle]}>
              <LinearGradient
                colors={box.accentGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
              />
              <Text style={styles.rewardCardLabel}>Reward</Text>
              <Text style={styles.rewardCardAmt}>{reward}</Text>
              <Text style={styles.rewardCardUnit}>TFT</Text>
              <Text style={styles.rewardCardNote}>Added to your balance</Text>
            </Animated.View>
          )}
        </View>

        {/* Claim button */}
        {phase === "reveal" && (
          <Animated.View entering={FadeInUp.duration(350).delay(300)} style={{ width: "100%", marginTop: 20 }}>
            <Pressable style={styles.claimBtn} onPress={onConfirm}>
              <LinearGradient
                colors={box.accentGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
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

  const isUnlocked = useCallback(
    (box: BoxConfig) => box.level === 1 || box.level <= unlockedLevel,
    [unlockedLevel]
  );

  const handleOpen = useCallback((box: BoxConfig) => {
    const r = pickReward(box.tiers);
    setReward(r);
    setOpeningBox(box);
    setPhase("opening");
    setTimeout(() => setPhase("reveal"), 1200);
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
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGrad}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Image
            source={require("../assets/images/apex-logo.jpeg")}
            style={styles.headerLogo}
            contentFit="cover"
          />
          <Text style={styles.headerTitle}>Airdrop Boxes</Text>
          <Text style={styles.headerSub}>Open mystery boxes to earn TFT rewards</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Plan strip */}
      <View style={styles.planRow}>
        <Feather name="shield" size={13} color="#5CBFFE" />
        <Text style={styles.planText}>
          {plan
            ? `${plan.name} Plan  ·  LV1–LV${unlockedLevel} unlocked`
            : "No plan  ·  LV1 only"}
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

      {/* Info strip */}
      <View style={styles.infoStrip}>
        {[
          { emoji: "📦", label: "6 Boxes" },
          { emoji: "🎁", label: "5–280 TFT" },
          { emoji: "⚡", label: "Instant" },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <View style={styles.infoItem}>
              <Text style={styles.infoEmoji}>{item.emoji}</Text>
              <Text style={styles.infoLabel}>{item.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.infoDivider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Modal */}
      <Modal
        visible={!!openingBox}
        transparent
        animationType="fade"
        onRequestClose={() => setOpeningBox(null)}
      >
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

  headerGrad: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  headerLogo: {
    width: 50, height: 50, borderRadius: 14, marginBottom: 6,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.45)",
  },
  headerTitle: {
    fontSize: 19, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)", marginTop: 2, textAlign: "center",
  },

  planRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "#E5E8EE",
  },
  planText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  upgradeBtn: {
    backgroundColor: "#EEF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  upgradeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#5CBFFE" },

  slider: { paddingHorizontal: 20, paddingVertical: 14, gap: 16 },

  card: {
    width: CARD_W,
    borderRadius: 24,
    overflow: "hidden",
    padding: 18,
    paddingBottom: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    gap: 10,
    alignItems: "center",
  },
  cardTopRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", width: "100%",
  },
  levelBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  levelBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  lockPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  lockPillText: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  unlockedPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  unlockedPillText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  chestWrap: {
    alignItems: "center", justifyContent: "center",
    position: "relative", paddingVertical: 4,
  },
  glowCircle: {
    position: "absolute",
    width: 160, height: 160, borderRadius: 80,
  },

  boxName: {
    fontSize: 17, fontFamily: "Inter_700Bold",
    color: Colors.textPrimary, textAlign: "center", letterSpacing: -0.3,
  },
  boxSubtitle: {
    fontSize: 12, fontFamily: "Inter_500Medium",
    color: Colors.textSecondary, textAlign: "center", marginTop: -4,
  },

  rangePill: {
    borderRadius: 10, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  rangeText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  oddsRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    justifyContent: "center",
  },
  oddsPill: {
    backgroundColor: "#F3F4F6", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
    alignItems: "center", minWidth: 52,
  },
  oddsAmt: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  oddsUnit: { fontSize: 8, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  oddsChance: { fontSize: 9, fontFamily: "Inter_700Bold" },

  openBtn: {
    width: "100%", height: 48, borderRadius: 14,
    overflow: "hidden", flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  openBtnActive: {
    shadowColor: "#5CBFFE", shadowOpacity: 0.3,
    shadowRadius: 8, elevation: 4,
  },
  openBtnLocked: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1, borderColor: "#E5E8EE",
  },
  openBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  openBtnTextLocked: { color: Colors.textMuted, fontSize: 12 },

  infoStrip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "#E5E8EE",
  },
  infoItem: { flex: 1, alignItems: "center", gap: 2 },
  infoEmoji: { fontSize: 18 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  infoDivider: { width: 1, height: 30, backgroundColor: "#E5E8EE" },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center", justifyContent: "flex-end",
  },
  modalSheet: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 28, paddingBottom: 44,
    alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.2,
    shadowRadius: 30, elevation: 20,
    minHeight: 500,
  },
  modalClose: {
    position: "absolute", top: 16, right: 20,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  modalTitle: {
    fontSize: 22, fontFamily: "Inter_700Bold",
    color: Colors.textPrimary, marginBottom: 2, marginTop: 4,
  },
  modalBoxSub: {
    fontSize: 13, fontFamily: "Inter_500Medium",
    color: Colors.textSecondary, marginBottom: 8,
  },

  stageWrap: {
    width: "100%", height: 280,
    alignItems: "center", justifyContent: "flex-end",
    position: "relative",
  },
  glowBurst: {
    position: "absolute",
    width: 80, height: 80, borderRadius: 40,
    bottom: "35%",
    opacity: 0.45,
    zIndex: 0,
  },
  modalChestWrap: {
    zIndex: 2, alignItems: "center",
  },
  rewardCard: {
    position: "absolute",
    bottom: "38%",
    width: 170, height: 170,
    borderRadius: 22, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    zIndex: 10, gap: 2,
    shadowColor: "#000", shadowOpacity: 0.2,
    shadowRadius: 20, elevation: 12,
  },
  rewardCardLabel: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)", letterSpacing: 1.5, textTransform: "uppercase",
  },
  rewardCardAmt: {
    fontSize: 54, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 60,
  },
  rewardCardUnit: {
    fontSize: 18, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)",
  },
  rewardCardNote: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)", marginTop: 4,
  },

  claimBtn: {
    height: 54, borderRadius: 16, overflow: "hidden",
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
    shadowColor: "#5CBFFE", shadowOpacity: 0.35,
    shadowRadius: 12, elevation: 6,
    width: "100%",
  },
  claimBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
});
