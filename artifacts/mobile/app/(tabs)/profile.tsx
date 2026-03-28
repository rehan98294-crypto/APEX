import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";

const { width } = Dimensions.get("window");
const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

const TEAM_STATS = [
  { label: "Community\nrewards", value: "0.1" },
  { label: "Valid\nMembers", value: "0" },
  { label: "A enthusiast", value: "0" },
  { label: "B+C\nenthusiasts", value: "0" },
];

const TEAM_LINKS = [
  { icon: "users", label: "Community\nenthusiasts" },
  { icon: "award", label: "Community\ncontribution" },
  { icon: "list", label: "Community\norders" },
  { icon: "share-2", label: "Referral" },
];

const ORDER_STATS = [
  { label: "Orders", value: "0" },
  { label: "Processing", value: "0" },
  { label: "Bought", value: "0" },
  { label: "Sold", value: "0" },
];

const ORDER_LINKS = [
  { icon: "tag", label: "My Bid" },
  { icon: "file-text", label: "Details" },
  { icon: "credit-card", label: "Deposit" },
  { icon: "download", label: "Withdraw" },
];

const COMMON_FUNCS = [
  { icon: "book-open", label: "Tutorials" },
  { icon: "settings", label: "Settings" },
  { icon: "layers", label: "Mint" },
  { icon: "bookmark", label: "Collection" },
];

export default function ProfileScreen() {
  const { balance, earnedTotal, transactions } = useBalance();
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const [nameVisible, setNameVisible] = useState(false);
  const [uidVisible, setUidVisible] = useState(false);

  const INCOME_ROWS = [
    { label: "Comprehensive", dailyIcon: "T", totalIcon: "T", daily: "0.0", total: earnedTotal.toFixed(2) },
    { label: "Reserve", dailyIcon: "T", totalIcon: "T", daily: "0.0", total: "0.0" },
    { label: "Team", dailyIcon: "T", totalIcon: "T", daily: "0.0", total: "0.1" },
    { label: "Activity", dailyIcon: "T", totalIcon: "T", daily: "0.0", total: "0.0" },
    { label: "Missions", dailyIcon: "T", totalIcon: "T", daily: "0.0", total: "0.0" },
    { label: "Stake", dailyIcon: "★", totalIcon: "★", daily: "0.0", total: "0.0" },
  ];

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <StickyGlassHeader showBalance={false} showMenu={false} />

        {/* ── Profile Header ── */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.profileHeader}>
          <LinearGradient
            colors={["#D0F0FF", "#E6F8FF", "#F8F0FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.profileTopRow}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <LinearGradient colors={["#5CBFFE", "#2BD9A8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarGrad}>
                <Text style={styles.avatarInitials}>JD</Text>
              </LinearGradient>
              <View style={styles.avatarVerify}>
                <Feather name="check" size={8} color="#fff" />
              </View>
            </View>

            {/* Name + UID */}
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.nameRow}>
                <Text style={styles.nameHidden}>{nameVisible ? "James Doe" : "•••••• "}</Text>
                <Pressable onPress={() => setNameVisible((v) => !v)}>
                  <Feather name={nameVisible ? "eye" : "eye-off"} size={15} color={Colors.textMuted} />
                </Pressable>
              </View>
              <View style={styles.uidRow}>
                <Text style={styles.uidLabel}>UID : </Text>
                <Text style={styles.uidValue}>{uidVisible ? "TF29834" : "••••••"}</Text>
                <Pressable onPress={() => setUidVisible((v) => !v)} style={{ marginLeft: 4 }}>
                  <Feather name={uidVisible ? "eye" : "eye-off"} size={12} color={Colors.textMuted} />
                </Pressable>
              </View>
            </View>

            {/* Calendar */}
            <Pressable style={styles.calendarBtn}>
              <Feather name="calendar" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Level + Points pills */}
          <View style={styles.pillsRow}>
            <Pressable style={styles.pill}>
              <Feather name="user" size={12} color={Colors.textSecondary} />
              <Text style={styles.pillText}>Level 2</Text>
              <Feather name="chevron-right" size={12} color={Colors.textMuted} />
            </Pressable>
            <Pressable style={styles.pill}>
              <Text style={styles.pillText}>350 Points</Text>
              <Feather name="chevron-right" size={12} color={Colors.textMuted} />
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Wallet Balance Card ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.card}>
          <View style={styles.balanceSection}>
            <Text style={styles.balanceSectionLabel}>Wallet Balance</Text>
            <View style={styles.balanceBigRow}>
              <View style={styles.tIconMd}><Text style={styles.tIconMdText}>T</Text></View>
              <Text style={styles.balanceBig}>{balance.toFixed(1)}</Text>
            </View>
          </View>

          {/* Income Table */}
          <View style={styles.incomeTable}>
            {/* Table Header */}
            <View style={styles.incomeTableHeader}>
              <View style={{ flex: 1.6 }} />
              <Text style={[styles.incomeColLabel, { flex: 1.2 }]}>Daily income</Text>
              <Text style={[styles.incomeColLabel, { flex: 1.2, textAlign: "right" }]}>Total income</Text>
            </View>

            {INCOME_ROWS.map((row, i) => (
              <View key={row.label} style={[styles.incomeRow, i < INCOME_ROWS.length - 1 && styles.incomeRowBorder]}>
                <Text style={styles.incomeRowLabel}>{row.label}</Text>
                <View style={[styles.incomeCell, { flex: 1.2 }]}>
                  {row.dailyIcon === "T" ? (
                    <View style={styles.tIconXs}><Text style={styles.tIconXsText}>T</Text></View>
                  ) : (
                    <View style={styles.starIconXs}><Text style={styles.starIconXsText}>★</Text></View>
                  )}
                  <Text style={styles.incomeCellValue}>{row.daily}</Text>
                </View>
                <View style={[styles.incomeCell, { flex: 1.2, justifyContent: "flex-end" }]}>
                  {row.totalIcon === "T" ? (
                    <View style={styles.tIconXs}><Text style={styles.tIconXsText}>T</Text></View>
                  ) : (
                    <View style={styles.starIconXs}><Text style={styles.starIconXsText}>★</Text></View>
                  )}
                  <Text style={[styles.incomeCellValue, parseFloat(row.total) > 0 && { color: Colors.textPrimary, fontFamily: "Inter_700Bold" }]}>
                    {row.total}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── My Team ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.card}>
          <Text style={styles.cardTitle}>My Team</Text>

          <View style={styles.teamStatsRow}>
            {TEAM_STATS.map((s) => (
              <View key={s.label} style={styles.teamStatItem}>
                <Text style={styles.teamStatValue}>{s.value}</Text>
                <Text style={styles.teamStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.linkGrid}>
            {TEAM_LINKS.map((link) => (
              <Pressable key={link.label} style={styles.linkItem}>
                <View style={styles.linkIconBox}>
                  <Feather name={link.icon as any} size={20} color="#5CBFFE" />
                </View>
                <Text style={styles.linkLabel}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ── My Orders ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>My Orders</Text>
            <Pressable style={styles.checkOrdersBtn}>
              <Text style={styles.checkOrdersText}>Check Orders</Text>
              <Feather name="chevron-right" size={14} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.teamStatsRow}>
            {ORDER_STATS.map((s) => (
              <View key={s.label} style={styles.teamStatItem}>
                <Text style={styles.teamStatValue}>{s.value}</Text>
                <Text style={styles.teamStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.linkGrid}>
            {ORDER_LINKS.map((link) => (
              <Pressable key={link.label} style={styles.linkItem}>
                <View style={styles.linkIconBox}>
                  <Feather name={link.icon as any} size={20} color="#5CBFFE" />
                </View>
                <Text style={styles.linkLabel}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ── Common Functions ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)} style={styles.card}>
          <Text style={styles.cardTitle}>Common Functions</Text>
          <View style={styles.linkGrid}>
            {COMMON_FUNCS.map((fn) => (
              <Pressable key={fn.label} style={styles.linkItem}>
                <View style={styles.linkIconBox}>
                  <Feather name={fn.icon as any} size={20} color="#5CBFFE" />
                </View>
                <Text style={styles.linkLabel}>{fn.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  profileHeader: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
    padding: 18,
    gap: 14,
  },
  profileTopRow: { flexDirection: "row", alignItems: "center", gap: 14 },

  avatarWrap: { position: "relative" },
  avatarGrad: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  avatarInitials: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarVerify: {
    position: "absolute", bottom: 1, right: 1,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#5CBFFE",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#fff",
  },

  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameHidden: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, letterSpacing: 2 },
  uidRow: { flexDirection: "row", alignItems: "center" },
  uidLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  uidValue: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, letterSpacing: 2 },

  calendarBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center", justifyContent: "center",
  },

  pillsRow: { flexDirection: "row", gap: 10 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.9)",
  },
  pillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },

  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 14,
  },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  checkOrdersBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  checkOrdersText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },

  balanceSection: { gap: 8 },
  balanceSectionLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  balanceBigRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tIconMd: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tIconMdText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  balanceBig: { fontSize: 34, fontFamily: "Inter_700Bold", color: Colors.textPrimary, letterSpacing: -0.5 },

  incomeTable: { gap: 0, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  incomeTableHeader: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  incomeColLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  incomeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  incomeRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  incomeRowLabel: { flex: 1.6, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  incomeCell: { flexDirection: "row", alignItems: "center", gap: 4 },
  incomeCellValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  tIconXs: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tIconXsText: { fontSize: 7, fontFamily: "Inter_700Bold", color: "#fff" },
  starIconXs: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFB800", alignItems: "center", justifyContent: "center" },
  starIconXsText: { fontSize: 8, color: "#fff" },

  teamStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  teamStatItem: { flex: 1, alignItems: "center", gap: 4 },
  teamStatValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  teamStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },

  divider: { height: 1, backgroundColor: Colors.border },

  linkGrid: { flexDirection: "row", justifyContent: "space-between" },
  linkItem: { flex: 1, alignItems: "center", gap: 8 },
  linkIconBox: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "#EFF9FF",
    alignItems: "center", justifyContent: "center",
  },
  linkLabel: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, textAlign: "center",
    lineHeight: 15,
  },
});
