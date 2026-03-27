import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";

const STAKE_PLANS = [
  { days: 7, apy: 8, label: "7 Days", badge: "Flexible" },
  { days: 30, apy: 18, label: "30 Days", badge: "Popular", highlight: true },
  { days: 90, apy: 35, label: "90 Days", badge: "Best APY" },
  { days: 180, apy: 55, label: "180 Days", badge: "Max Earn" },
];

const EARN_TASKS = [
  { id: "1", title: "Daily Check-in", reward: 5, icon: "calendar", done: false },
  { id: "2", title: "First Purchase", reward: 25, icon: "shopping-bag", done: false },
  { id: "3", title: "Invite a Friend", reward: 50, icon: "users", done: false },
  { id: "4", title: "List your first NFT", reward: 30, icon: "upload", done: false },
  { id: "5", title: "Complete Profile", reward: 10, icon: "user-check", done: false },
];

export default function EarnScreen() {
  const insets = useSafeAreaInsets();
  const { balance, stakedTotal, earnedTotal, stakes, transactions, stakeTokens, unstakeTokens, earnReward } = useBalance();
  const [selectedPlan, setSelectedPlan] = useState(STAKE_PLANS[1]);
  const [stakeInput, setStakeInput] = useState("");
  const [tab, setTab] = useState<"stake" | "history">("stake");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const stakeAmount = parseFloat(stakeInput) || 0;
  const projectedReward = ((stakeAmount * selectedPlan.apy * selectedPlan.days) / 36500).toFixed(2);

  const handleStake = () => {
    if (!stakeInput || stakeAmount <= 0) {
      Alert.alert("Enter amount", "Please enter a valid amount to stake.");
      return;
    }
    if (stakeAmount > balance) {
      Alert.alert("Insufficient Balance", `You only have ${balance.toFixed(2)} TFT available.`);
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ok = stakeTokens(stakeAmount, selectedPlan.days, selectedPlan.apy);
    if (ok) {
      setStakeInput("");
      Alert.alert("Staked!", `Successfully staked ${stakeAmount} TFT for ${selectedPlan.days} days at ${selectedPlan.apy}% APY!`);
    }
  };

  const handleUnstake = (stakeId: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    unstakeTokens(stakeId);
    Alert.alert("Unstaked!", "Your tokens + rewards have been returned to your balance.");
  };

  const handleCompleteTask = (taskId: string, reward: number, title: string) => {
    if (completedTasks.includes(taskId)) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    earnReward(reward, `Task: ${title}`);
    setCompletedTasks((prev) => [...prev, taskId]);
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <StickyGlassHeader />
        
        {/* Balance Cards */}
        <View style={styles.balanceGrid}>
          <BalanceCard label="Available" value={balance} color={Colors.primary} icon="dollar-sign" />
          <BalanceCard label="Staked" value={stakedTotal} color={Colors.accent} icon="lock" />
          <BalanceCard label="Total Earned" value={earnedTotal} color={Colors.pink} icon="trending-up" />
        </View>

        {/* Earn Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Earn Tasks</Text>
          <View style={styles.tasksList}>
            {EARN_TASKS.map((task) => {
              const done = completedTasks.includes(task.id);
              return (
                <Pressable
                  key={task.id}
                  onPress={() => handleCompleteTask(task.id, task.reward, task.title)}
                  style={[styles.taskRow, done && styles.taskRowDone]}
                  disabled={done}
                >
                  <View style={[styles.taskIcon, { backgroundColor: done ? Colors.primary + "20" : Colors.offWhite }]}>
                    <Feather name={task.icon as any} size={18} color={done ? Colors.primary : Colors.textSecondary} />
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskTitle, done && { color: Colors.textMuted }]}>{task.title}</Text>
                    <View style={styles.taskRewardRow}>
                      <View style={styles.tokenIconSm}>
                        <Text style={styles.tokenIconSmText}>T</Text>
                      </View>
                      <Text style={styles.taskReward}>+{task.reward} TFT</Text>
                    </View>
                  </View>
                  {done ? (
                    <View style={styles.doneBadge}>
                      <Feather name="check" size={14} color={Colors.primary} />
                    </View>
                  ) : (
                    <View style={styles.claimBtn}>
                      <Text style={styles.claimBtnText}>Claim</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setTab("stake")}
            style={[styles.tabBtn, tab === "stake" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, tab === "stake" && styles.tabBtnTextActive]}>Stake TFT</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("history")}
            style={[styles.tabBtn, tab === "history" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, tab === "history" && styles.tabBtnTextActive]}>
              Active Stakes ({stakes.filter((s) => s.status === "active").length})
            </Text>
          </Pressable>
        </View>

        {tab === "stake" ? (
          <View style={styles.section}>
            {/* Stake Plans */}
            <Text style={styles.subTitle}>Choose Lock Period</Text>
            <View style={styles.plansGrid}>
              {STAKE_PLANS.map((plan) => (
                <Pressable
                  key={plan.days}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPlan(plan);
                  }}
                  style={[styles.planCard, selectedPlan.days === plan.days && styles.planCardActive]}
                >
                  {plan.highlight && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>{plan.badge}</Text>
                    </View>
                  )}
                  <Text style={[styles.planApy, selectedPlan.days === plan.days && { color: "#fff" }]}>{plan.apy}%</Text>
                  <Text style={[styles.planApyLabel, selectedPlan.days === plan.days && { color: "rgba(255,255,255,0.7)" }]}>APY</Text>
                  <Text style={[styles.planDays, selectedPlan.days === plan.days && { color: "#fff" }]}>{plan.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Stake Input */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Amount to Stake</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={stakeInput}
                  onChangeText={setStakeInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
                <View style={styles.inputRight}>
                  <View style={styles.tokenIconSm}><Text style={styles.tokenIconSmText}>T</Text></View>
                  <Text style={styles.inputCurrency}>TFT</Text>
                  <Pressable
                    onPress={() => setStakeInput(balance.toFixed(0))}
                    style={styles.maxBtn}
                  >
                    <Text style={styles.maxBtnText}>MAX</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.availableText}>Available: {balance.toFixed(2)} TFT</Text>

              {stakeAmount > 0 && (
                <View style={styles.projectionCard}>
                  <View style={styles.projRow}>
                    <Text style={styles.projLabel}>Lock Period</Text>
                    <Text style={styles.projValue}>{selectedPlan.days} days</Text>
                  </View>
                  <View style={styles.projRow}>
                    <Text style={styles.projLabel}>APY Rate</Text>
                    <Text style={[styles.projValue, { color: Colors.primary }]}>{selectedPlan.apy}%</Text>
                  </View>
                  <View style={styles.projRowDivider} />
                  <View style={styles.projRow}>
                    <Text style={styles.projLabel}>Projected Reward</Text>
                    <Text style={[styles.projValue, { color: Colors.primary, fontFamily: "Inter_700Bold" }]}>+{projectedReward} TFT</Text>
                  </View>
                  <View style={styles.projRow}>
                    <Text style={styles.projLabel}>Total Return</Text>
                    <Text style={[styles.projValue, { fontFamily: "Inter_700Bold" }]}>
                      {(stakeAmount + parseFloat(projectedReward)).toFixed(2)} TFT
                    </Text>
                  </View>
                </View>
              )}

              <Pressable onPress={handleStake} style={styles.stakeBtn}>
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.stakeBtnGrad}
                >
                  <Feather name="lock" size={16} color="#fff" />
                  <Text style={styles.stakeBtnText}>Stake TFT</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            {stakes.filter((s) => s.status === "active").length === 0 ? (
              <View style={styles.emptyStake}>
                <Feather name="lock" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No active stakes</Text>
                <Text style={styles.emptySub}>Stake your TFT to start earning rewards</Text>
              </View>
            ) : (
              stakes
                .filter((s) => s.status === "active")
                .map((stake) => {
                  const daysElapsed = Math.min(
                    (Date.now() - stake.startDate) / (1000 * 60 * 60 * 24),
                    stake.lockDays
                  );
                  const progress = daysElapsed / stake.lockDays;
                  const earned = ((stake.amount * stake.apy * daysElapsed) / 36500).toFixed(4);
                  const unlockDate = new Date(stake.startDate + stake.lockDays * 86400000);
                  return (
                    <Animated.View key={stake.id} entering={FadeInDown.springify()}>
                      <View style={styles.stakeCard}>
                        <View style={styles.stakeCardTop}>
                          <View>
                            <Text style={styles.stakeAmount}>{stake.amount} TFT</Text>
                            <Text style={styles.stakeApy}>{stake.apy}% APY · {stake.lockDays}d lock</Text>
                          </View>
                          <View style={styles.earnedBadge}>
                            <Text style={styles.earnedText}>+{earned} earned</Text>
                          </View>
                        </View>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
                        </View>
                        <View style={styles.stakeCardBottom}>
                          <Text style={styles.stakeDate}>
                            Unlocks {unlockDate.toLocaleDateString()}
                          </Text>
                          <Pressable onPress={() => handleUnstake(stake.id)} style={styles.unstakeBtn}>
                            <Text style={styles.unstakeBtnText}>Unstake</Text>
                          </Pressable>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function BalanceCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: any }) {
  return (
    <View style={[styles.balanceCard, { borderTopColor: color }]}>
      <View style={[styles.balanceIconBox, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={styles.balanceValue}>{value.toFixed(2)}</Text>
      <Text style={styles.balanceLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  balanceGrid: { flexDirection: "row", gap: 10 },
  balanceCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    borderTopWidth: 3,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  balanceIconBox: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  balanceValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  balanceLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 12 },
  subTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 10 },
  tasksList: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  taskRowDone: { opacity: 0.6 },
  taskIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  taskRewardRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  tokenIconSm: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  tokenIconSmText: { fontSize: 7, fontFamily: "Inter_700Bold", color: "#fff" },
  taskReward: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  doneBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + "20", alignItems: "center", justifyContent: "center" },
  claimBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  claimBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  tabBtnTextActive: { color: "#fff" },
  plansGrid: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  planCard: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    position: "relative",
    overflow: "hidden",
    gap: 2,
  },
  planCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
  },
  popularText: { fontSize: 7, fontFamily: "Inter_700Bold", color: "#fff" },
  planApy: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.primary },
  planApyLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  planDays: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginTop: 2 },
  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  inputLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 52,
  },
  input: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  inputRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  inputCurrency: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  maxBtn: { backgroundColor: Colors.accent + "20", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  maxBtnText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.accent },
  availableText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  projectionCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  projRow: { flexDirection: "row", justifyContent: "space-between" },
  projLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  projValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  projRowDivider: { height: 1, backgroundColor: Colors.border },
  stakeBtn: { borderRadius: 14, overflow: "hidden", height: 50 },
  stakeBtnGrad: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  stakeBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  stakeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  stakeCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  stakeAmount: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  stakeApy: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  earnedBadge: { backgroundColor: Colors.primary + "15", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  earnedText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: Colors.primary, borderRadius: 3 },
  stakeCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stakeDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  unstakeBtn: {
    backgroundColor: Colors.danger + "15",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.danger + "30",
  },
  unstakeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.danger },
  emptyStake: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
});
