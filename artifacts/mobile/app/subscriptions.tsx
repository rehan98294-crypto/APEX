import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { PLANS, PlanConfig, PlanId, useSubscription } from "@/context/SubscriptionContext";

const { width: SCREEN_W } = Dimensions.get("window");
const SLIDE_PAD = 18;
const SLIDE_W = SCREEN_W - SLIDE_PAD * 2;
const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

const SLIDES = [
  require("@/assets/subscriptions/slide1.png"),
  require("@/assets/subscriptions/slide2.png"),
  require("@/assets/subscriptions/slide3.png"),
  require("@/assets/subscriptions/slide4.png"),
  require("@/assets/subscriptions/slide5.png"),
];

// ─── Slideshow ─────────────────────────────────────────────────────────────
function Slideshow() {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (idx: number) => {
    const target = idx % SLIDES.length;
    setCurrent(target);
    scrollRef.current?.scrollTo({ x: target * SLIDE_W, animated: true });
  };

  useEffect(() => {
    timer.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % SLIDES.length;
        scrollRef.current?.scrollTo({ x: next * SLIDE_W, animated: true });
        return next;
      });
    }, 3000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  return (
    <View style={ss.slideshowWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ width: SLIDE_W }}
      >
        {SLIDES.map((src, i) => (
          <Image
            key={i}
            source={src}
            style={ss.slideImage}
            contentFit="cover"
          />
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={ss.dotsRow}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)} style={[ss.dot, i === current && ss.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const PAGE_SIZE = 3;

// ─── Skeleton Card ─────────────────────────────────────────────────────────
function PlanCardSkeleton() {
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750 }),
        withTiming(0.55, { duration: 750 })
      ),
      -1,
      false
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[sk.card, animStyle]}>
      <View style={sk.header} />
      <View style={sk.statsRow}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={sk.stat} />)}
      </View>
      <View style={sk.body}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={sk.line} />)}
      </View>
      <View style={sk.btn} />
    </Animated.View>
  );
}

// ─── Plan Card ─────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  isActive,
  onPress,
}: {
  plan: PlanConfig;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(80)} style={[pc.card, isActive && { borderColor: plan.color, borderWidth: 2 }]}>
      {/* Header gradient */}
      <View style={[pc.cardHeader, { overflow: "hidden" }]}>
        <LinearGradient
          colors={plan.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={pc.headerRow}>
          <View>
            <Text style={pc.planName}>{plan.name}</Text>
            <Text style={pc.planSub}>Subscription Plan</Text>
          </View>
          <View style={pc.priceBadge}>
            <Text style={pc.priceLabel}>TFT</Text>
            <Text style={pc.priceValue}>{plan.price.toLocaleString()}</Text>
          </View>
        </View>

        {/* Active badge */}
        {isActive && (
          <View style={pc.activeBadge}>
            <Feather name="check-circle" size={12} color="#fff" />
            <Text style={pc.activeBadgeText}>ACTIVE</Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={pc.statsRow}>
        <View style={pc.statItem}>
          <Text style={pc.statLabel}>Unlocks</Text>
          <Text style={[pc.statValue, { color: plan.color }]}>Level {plan.unlocksLevel}</Text>
        </View>
        <View style={pc.statDivider} />
        <View style={pc.statItem}>
          <Text style={pc.statLabel}>Stake Boost</Text>
          <Text style={[pc.statValue, { color: plan.color }]}>+{plan.stakeBoost}%</Text>
        </View>
        <View style={pc.statDivider} />
        <View style={pc.statItem}>
          <Text style={pc.statLabel}>Income Boost</Text>
          <Text style={[pc.statValue, { color: plan.color }]}>+{plan.incomeBoost}%</Text>
        </View>
        <View style={pc.statDivider} />
        <View style={pc.statItem}>
          <Text style={pc.statLabel}>Members</Text>
          <Text style={[pc.statValue, { color: plan.color }]}>{plan.membersOnly}</Text>
        </View>
      </View>

      {/* Perks */}
      <View style={pc.perksList}>
        {plan.perks.map((perk, i) => (
          <View key={i} style={pc.perkRow}>
            <View style={[pc.perkDot, { backgroundColor: plan.color }]} />
            <Text style={pc.perkText}>{perk}</Text>
          </View>
        ))}

        {/* Deposit & withdrawal summary */}
        <View style={pc.infoBox}>
          <View style={pc.infoRow}>
            <Feather name="trending-up" size={13} color={plan.color} />
            <Text style={pc.infoLabel}>Deposit:</Text>
            <Text style={[pc.infoValue, { color: plan.color }]}>{plan.deposit.toLocaleString()} TFT</Text>
          </View>
          <View style={pc.infoRow}>
            <Feather name="download" size={13} color={plan.color} />
            <Text style={pc.infoLabel}>Range:</Text>
            <Text style={[pc.infoValue, { color: plan.color }]}>{plan.depositRange}</Text>
          </View>
          <View style={pc.infoRow}>
            <Feather name="arrow-up-circle" size={13} color={plan.color} />
            <Text style={pc.infoLabel}>Withdrawal:</Text>
            <Text style={[pc.infoValue, { color: plan.color }]}>{plan.withdrawal}</Text>
          </View>
        </View>
      </View>

      {/* CTA */}
      {isActive ? (
        <View style={[pc.ctaBtn, { backgroundColor: "#F0F0F0" }]}>
          <Feather name="check-circle" size={16} color={plan.color} />
          <Text style={[pc.ctaBtnText, { color: plan.color }]}>Currently Active</Text>
        </View>
      ) : (
        <Pressable style={pc.ctaBtnWrap} onPress={onPress}>
          <LinearGradient
            colors={plan.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
            borderRadius={14}
          />
          <Feather name="zap" size={16} color="#fff" />
          <Text style={pc.ctaBtnText}>Activate for {plan.price.toLocaleString()} TFT</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function SubscriptionsScreen() {
  const router = useRouter();
  const { balance, spendBalance } = useBalance();
  const { activePlan, subscribeToPlan } = useSubscription();

  const [confirmPlan, setConfirmPlan] = useState<PlanConfig | null>(null);
  const [successPlan, setSuccessPlan] = useState<PlanConfig | null>(null);
  const [insufficientPlan, setInsufficientPlan] = useState<PlanConfig | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((v) => Math.min(v + (PLANS.length - PAGE_SIZE), PLANS.length));
      setLoadingMore(false);
    }, 600);
  };

  const handleActivate = (plan: PlanConfig) => {
    if (activePlan === plan.id) return;
    setConfirmPlan(plan);
  };

  const handleConfirm = () => {
    if (!confirmPlan) return;
    if (balance < confirmPlan.price) {
      setConfirmPlan(null);
      setInsufficientPlan(confirmPlan);
      return;
    }
    spendBalance(confirmPlan.price, `Activated ${confirmPlan.name} subscription plan`);
    subscribeToPlan(confirmPlan.id as PlanId);
    setConfirmPlan(null);
    setSuccessPlan(confirmPlan);
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Subscriptions</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Slideshow */}
        <Slideshow />

        {/* Section headline */}
        <View style={s.sectionHead}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.headAccent} />
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Boost Your Earnings</Text>
            <Text style={s.sectionSub}>
              Activate a plan to unlock higher stake levels, earn rate boosts, and exclusive perks.
            </Text>
          </View>
        </View>

        {/* Active plan banner */}
        {activePlan && (
          <Animated.View entering={FadeInDown.duration(300)} style={s.activeBanner}>
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={16} />
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={s.activeBannerText}>
              Active: <Text style={{ fontFamily: "Inter_700Bold" }}>{PLANS.find(p => p.id === activePlan)?.name}</Text> Plan
            </Text>
          </Animated.View>
        )}

        {/* Balance chip */}
        <View style={s.balanceChip}>
          <View style={s.tDot}><Text style={s.tDotText}>T</Text></View>
          <Text style={s.balanceLabel}>Balance: </Text>
          <Text style={s.balanceValue}>{balance.toFixed(1)} TFT</Text>
        </View>

        {/* Plan cards — paginated with skeleton loading */}
        {initialLoading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <PlanCardSkeleton key={i} />)
          : (
            <>
              {PLANS.slice(0, visibleCount).map((plan, i) => (
                <Animated.View key={plan.id} entering={FadeInDown.duration(350).delay(i * 70)}>
                  <PlanCard
                    plan={plan}
                    isActive={activePlan === plan.id}
                    onPress={() => handleActivate(plan)}
                  />
                </Animated.View>
              ))}

              {/* Loading more skeletons */}
              {loadingMore && Array.from({ length: PLANS.length - visibleCount }).map((_, i) => (
                <PlanCardSkeleton key={`more-${i}`} />
              ))}

              {/* Load More button */}
              {!loadingMore && visibleCount < PLANS.length && (
                <Animated.View entering={FadeInDown.duration(300)}>
                  <Pressable style={s.loadMoreBtn} onPress={handleLoadMore}>
                    <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                    <Feather name="chevrons-down" size={16} color="#fff" />
                    <Text style={s.loadMoreText}>Load More Plans</Text>
                  </Pressable>
                </Animated.View>
              )}
            </>
          )
        }
      </ScrollView>

      {/* ── Confirm Purchase Modal ── */}
      <Modal visible={!!confirmPlan} transparent animationType="fade">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={{ overflow: "hidden", borderRadius: 16, marginBottom: 20 }}>
              <LinearGradient
                colors={confirmPlan?.gradientColors ?? ["#5CBFFE", "#2BD9A8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={m.sheetGradBanner}
              />
              <Text style={m.sheetPlanName}>{confirmPlan?.name} Plan</Text>
              <Text style={m.sheetPlanPrice}>{confirmPlan?.price.toLocaleString()} TFT</Text>
            </View>

            <Text style={m.sheetTitle}>Confirm Purchase</Text>
            <Text style={m.sheetBody}>
              {confirmPlan?.price.toLocaleString()} TFT will be deducted from your balance. This activates the{" "}
              <Text style={{ fontFamily: "Inter_700Bold", color: confirmPlan?.color }}>
                {confirmPlan?.name}
              </Text>{" "}
              plan and unlocks Level {confirmPlan?.unlocksLevel} staking.
            </Text>

            <View style={m.balanceRow}>
              <Text style={m.balanceRowLabel}>Your balance:</Text>
              <Text style={m.balanceRowValue}>{balance.toFixed(1)} TFT</Text>
            </View>
            <View style={m.balanceRow}>
              <Text style={m.balanceRowLabel}>After payment:</Text>
              <Text style={[m.balanceRowValue, { color: balance - (confirmPlan?.price ?? 0) < 0 ? "#E53935" : "#2BD9A8" }]}>
                {(balance - (confirmPlan?.price ?? 0)).toFixed(1)} TFT
              </Text>
            </View>

            <View style={m.btnRow}>
              <Pressable style={m.cancelBtn} onPress={() => setConfirmPlan(null)}>
                <Text style={m.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={m.confirmBtnWrap} onPress={handleConfirm}>
                <LinearGradient
                  colors={confirmPlan?.gradientColors ?? ["#5CBFFE", "#2BD9A8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                  borderRadius={14}
                />
                <Text style={m.confirmBtnText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ── */}
      <Modal visible={!!successPlan} transparent animationType="fade">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.successIconWrap}>
              <LinearGradient
                colors={successPlan?.gradientColors ?? GRAD}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                borderRadius={40}
              />
              <Feather name="check" size={32} color="#fff" />
            </View>
            <Text style={m.sheetTitle}>Plan Activated!</Text>
            <Text style={m.sheetBody}>
              <Text style={{ fontFamily: "Inter_700Bold", color: successPlan?.color }}>
                {successPlan?.name}
              </Text>{" "}
              plan is now active. You've unlocked Level {successPlan?.unlocksLevel} and a{" "}
              +{successPlan?.stakeBoost}% stake boost.
            </Text>
            <Pressable style={m.confirmBtnWrap} onPress={() => setSuccessPlan(null)}>
              <LinearGradient
                colors={successPlan?.gradientColors ?? GRAD}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
                borderRadius={14}
              />
              <Text style={m.confirmBtnText}>Awesome!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Insufficient Balance Modal ── */}
      <Modal visible={!!insufficientPlan} transparent animationType="fade">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={[m.successIconWrap, { backgroundColor: "#FEECEC" }]}>
              <Feather name="alert-circle" size={32} color="#E53935" />
            </View>
            <Text style={m.sheetTitle}>Insufficient Balance</Text>
            <Text style={m.sheetBody}>
              You need{" "}
              <Text style={{ fontFamily: "Inter_700Bold", color: "#E53935" }}>
                {insufficientPlan?.price.toLocaleString()} TFT
              </Text>{" "}
              to activate the {insufficientPlan?.name} plan. Your balance is{" "}
              <Text style={{ fontFamily: "Inter_700Bold" }}>{balance.toFixed(1)} TFT</Text>.
            </Text>
            <Pressable style={m.confirmBtnWrap} onPress={() => setInsufficientPlan(null)}>
              <LinearGradient colors={["#E53935", "#FF6B6B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
              <Text style={m.confirmBtnText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const SLIDE_H = Math.round(SLIDE_W * 0.58);

const ss = StyleSheet.create({
  slideshowWrap: {
    width: SLIDE_W,
    height: SLIDE_H,
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#111",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  slideImage: {
    width: SLIDE_W,
    height: SLIDE_H,
  },
  dotsRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#fff",
  },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.offWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },

  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  headAccent: {
    width: 4,
    height: "100%",
    borderRadius: 2,
    minHeight: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  activeBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activeBannerText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },

  balanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#00C853",
    alignItems: "center",
    justifyContent: "center",
  },
  tDotText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  balanceLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  balanceValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  loadMoreBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 24,
    height: 50,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadMoreText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});

const sk = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#F0F2F5",
    borderRadius: 20,
    overflow: "hidden",
    padding: 0,
  },
  header: {
    height: 90,
    backgroundColor: "#E3E6EC",
    borderRadius: 0,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    justifyContent: "space-between",
  },
  stat: {
    flex: 1,
    height: 36,
    backgroundColor: "#E3E6EC",
    borderRadius: 8,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  line: {
    height: 14,
    backgroundColor: "#E3E6EC",
    borderRadius: 6,
    width: "80%",
  },
  btn: {
    marginHorizontal: 16,
    marginBottom: 16,
    height: 46,
    backgroundColor: "#E3E6EC",
    borderRadius: 14,
  },
});

const pc = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    position: "relative",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  planName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  planSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  priceBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  activeBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.8,
  },

  statsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },

  perksList: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  perkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  perkText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textPrimary,
    flex: 1,
  },

  infoBox: {
    marginTop: 10,
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    padding: 12,
    gap: 7,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  ctaBtnWrap: {
    margin: 16,
    height: 50,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaBtn: {
    margin: 16,
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  sheetGradBanner: {
    height: 70,
    borderRadius: 16,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sheetPlanName: {
    position: "absolute",
    top: 14,
    left: 16,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  sheetPlanPrice: {
    position: "absolute",
    top: 14,
    right: 16,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  sheetBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  balanceRowLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  balanceRowValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  confirmBtnWrap: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
});
