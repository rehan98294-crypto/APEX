import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { useWatchlist } from "@/context/WatchlistContext";

const MENU_ITEMS = [
  { icon: "shopping-bag", label: "My Purchases", badge: null },
  { icon: "clock", label: "Transaction History", badge: null },
  { icon: "bookmark", label: "Watchlist", badge: null },
  { icon: "bell", label: "Notifications", badge: "3" },
  { icon: "shield", label: "Security", badge: null },
  { icon: "gift", label: "Referral Program", badge: "New" },
  { icon: "help-circle", label: "Help & Support", badge: null },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { balance, stakedTotal, earnedTotal, transactions } = useBalance();
  const { watchlist } = useWatchlist();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.containerWrap, { paddingBottom: bottomPad }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <StickyGlassHeader showBalance={false} showMenu={false} />

      {/* Avatar Card */}
      <LinearGradient
        colors={["#E8FFF3", "#EBF8FF", "#FFF0F8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileCard}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <View style={styles.verifyBadge}>
            <Feather name="check" size={10} color="#fff" />
          </View>
        </View>
        <Text style={styles.name}>James Doe</Text>
        <Text style={styles.handle}>@jamesdoe · Member since 2022</Text>
        <View style={styles.levelBadge}>
          <Feather name="award" size={14} color={Colors.gold} />
          <Text style={styles.levelText}>Gold Member</Text>
        </View>
      </LinearGradient>

      {/* Balance Overview */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceSectionTitle}>TFT Balance</Text>
          <View style={styles.tokenPill}>
            <View style={styles.tokenIcon}><Text style={styles.tokenIconText}>T</Text></View>
            <Text style={styles.tokenPillText}>TreasureFun Token</Text>
          </View>
        </View>
        <Text style={styles.mainBalance}>{balance.toFixed(2)}</Text>
        <Text style={styles.mainBalanceLabel}>Available TFT</Text>
        <View style={styles.balanceBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownValue}>{stakedTotal.toFixed(2)}</Text>
            <Text style={styles.breakdownLabel}>Staked</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownValue, { color: Colors.primary }]}>{earnedTotal.toFixed(2)}</Text>
            <Text style={styles.breakdownLabel}>Total Earned</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownValue}>{watchlist.length}</Text>
            <Text style={styles.breakdownLabel}>Watchlist</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          onPress={() => router.push("/(tabs)/earn")}
          style={[styles.quickBtn, { backgroundColor: Colors.primary + "15", borderColor: Colors.primary + "30" }]}
        >
          <View style={[styles.quickBtnIcon, { backgroundColor: Colors.primary + "20" }]}>
            <Feather name="trending-up" size={20} color={Colors.primary} />
          </View>
          <Text style={[styles.quickBtnText, { color: Colors.primary }]}>Earn TFT</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/reserve")}
          style={[styles.quickBtn, { backgroundColor: Colors.pink + "12", borderColor: Colors.pink + "30" }]}
        >
          <View style={[styles.quickBtnIcon, { backgroundColor: Colors.pink + "20" }]}>
            <Feather name="bookmark" size={20} color={Colors.pink} />
          </View>
          <Text style={[styles.quickBtnText, { color: Colors.pink }]}>My Reserves</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/index")}
          style={[styles.quickBtn, { backgroundColor: Colors.accent + "15", borderColor: Colors.accent + "30" }]}
        >
          <View style={[styles.quickBtnIcon, { backgroundColor: Colors.accent + "20" }]}>
            <Feather name="grid" size={20} color={Colors.accent} />
          </View>
          <Text style={[styles.quickBtnText, { color: Colors.accent }]}>Explore</Text>
        </Pressable>
      </View>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <View style={styles.txSection}>
          <Text style={styles.txTitle}>Recent Activity</Text>
          {transactions.slice(0, 5).map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={[styles.txIcon, {
                backgroundColor:
                  tx.type === "earn" || tx.type === "unstake"
                    ? Colors.primary + "15"
                    : tx.type === "stake"
                    ? Colors.accent + "15"
                    : Colors.pink + "15",
              }]}>
                <Feather
                  name={tx.type === "earn" ? "trending-up" : tx.type === "stake" ? "lock" : tx.type === "unstake" ? "unlock" : "bookmark"}
                  size={16}
                  color={tx.type === "earn" || tx.type === "unstake" ? Colors.primary : tx.type === "stake" ? Colors.accent : Colors.pink}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                <Text style={styles.txDate}>{new Date(tx.timestamp).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, {
                color: tx.type === "stake" || tx.type === "reserve" ? Colors.danger : Colors.primary,
              }]}>
                {tx.type === "stake" || tx.type === "reserve" ? "-" : "+"}{tx.amount.toFixed(2)} TFT
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Airdrop Banner */}
      <Pressable style={styles.airdropBanner}>
        <LinearGradient
          colors={[Colors.accent, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.airdropGrad}
        >
          <View>
            <Text style={styles.airdropTitle}>Airdrop Active!</Text>
            <Text style={styles.airdropSub}>Invite friends, earn 50 TFT each</Text>
          </View>
          <View style={styles.airdropBtn}>
            <Feather name="gift" size={16} color={Colors.accent} />
            <Text style={styles.airdropBtnText}>Invite</Text>
          </View>
        </LinearGradient>
      </Pressable>

      {/* Menu */}
      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, idx) => (
          <Pressable
            key={item.label}
            onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.menuRow, idx === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 }]}
          >
            <View style={styles.menuIcon}>
              <Feather name={item.icon as any} size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={styles.menuRight}>
              {item.badge && (
                <View style={[styles.badge, item.badge === "New" && { backgroundColor: Colors.accent }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Feather name="chevron-right" size={16} color={Colors.textMuted} />
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.signOutBtn}>
        <Feather name="log-out" size={18} color={Colors.danger} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  containerWrap: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.offWhite },
  content: { paddingHorizontal: 20 },
  profileCard: { borderRadius: 20, padding: 20, alignItems: "center", gap: 6, marginBottom: 16 },
  avatarWrap: { position: "relative", marginBottom: 4 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#fff",
  },
  avatarText: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  verifyBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  name: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  handle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  levelBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.gold + "20", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.gold + "40",
  },
  levelText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.gold },
  balanceCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  balanceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  balanceSectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  tokenPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.primary + "12", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tokenIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  tokenIconText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  tokenPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  mainBalance: { fontSize: 40, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  mainBalanceLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 16 },
  balanceBreakdown: { flexDirection: "row", justifyContent: "space-around", paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  breakdownItem: { alignItems: "center", gap: 4 },
  breakdownValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  breakdownLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  breakdownDivider: { width: 1, backgroundColor: Colors.border },
  quickActions: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickBtn: {
    flex: 1, alignItems: "center", gap: 8, padding: 14,
    borderRadius: 16, borderWidth: 1,
  },
  quickBtnIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  txSection: { marginBottom: 16 },
  txTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 12 },
  txRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.white, borderRadius: 14,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  txDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  airdropBanner: { borderRadius: 18, overflow: "hidden", marginBottom: 16 },
  airdropGrad: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
  airdropTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  airdropSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  airdropBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  airdropBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.accent },
  menuCard: {
    backgroundColor: Colors.white, borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.offWhite, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { backgroundColor: Colors.danger, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.white, borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: Colors.danger + "30",
  },
  signOutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.danger },
});
