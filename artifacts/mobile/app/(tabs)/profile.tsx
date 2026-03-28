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
  { label: "Community\nRewards", value: "0.1" },
  { label: "Valid\nMembers", value: "0" },
  { label: "A\nEnthusiast", value: "0" },
  { label: "B+C\nEnthusiasts", value: "0" },
];

const TEAM_LINKS = [
  { icon: "users", label: "Community\nEnthusiasts" },
  { icon: "award", label: "Community\nContribution" },
  { icon: "list", label: "Community\nOrders" },
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
  const { balance, earnedTotal } = useBalance();
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const [nameVisible, setNameVisible] = useState(false);
  const [uidVisible, setUidVisible] = useState(false);

  const INCOME_ROWS = [
    { label: "Comprehensive", daily: "0.0", total: earnedTotal.toFixed(2), star: false },
    { label: "Reserve",       daily: "0.0", total: "0.0", star: false },
    { label: "Team",          daily: "0.0", total: "0.1", star: false },
    { label: "Activity",      daily: "0.0", total: "0.0", star: false },
    { label: "Missions",      daily: "0.0", total: "0.0", star: false },
    { label: "Stake",         daily: "0.0", total: "0.0", star: true },
  ];

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <StickyGlassHeader showBalance={false} showMenu={false} />

        {/* ── Profile Header ── */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.profileHeader}>
          <LinearGradient
            colors={["#C8EEFF", "#E8F9F4", "#FFF0E8"]}
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
                <Feather name="check" size={9} color="#fff" />
              </View>
            </View>

            {/* Name + UID */}
            <View style={{ flex: 1, gap: 8 }}>
              <View style={styles.nameRow}>
                <Text style={styles.nameHidden}>{nameVisible ? "James Doe" : "•••••• "}</Text>
                <Pressable onPress={() => setNameVisible((v) => !v)}>
                  <Feather name={nameVisible ? "eye" : "eye-off"} size={17} color={Colors.textMuted} />
                </Pressable>
              </View>
              <View style={styles.uidRow}>
                <Text style={styles.uidLabel}>UID : </Text>
                <Text style={styles.uidValue}>{uidVisible ? "TF29834" : "••••••"}</Text>
                <Pressable onPress={() => setUidVisible((v) => !v)} style={{ marginLeft: 6 }}>
                  <Feather name={uidVisible ? "eye" : "eye-off"} size={14} color={Colors.textMuted} />
                </Pressable>
              </View>
            </View>

            {/* Calendar */}
            <Pressable style={styles.calendarBtn}>
              <Feather name="calendar" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Level + Points pills */}
          <View style={styles.pillsRow}>
            <Pressable style={styles.pill}>
              <Feather name="user" size={13} color={Colors.textSecondary} />
              <Text style={styles.pillText}>Level 2</Text>
              <Feather name="chevron-right" size={13} color={Colors.textMuted} />
            </Pressable>
            <Pressable style={styles.pill}>
              <Text style={styles.pillText}>350 Points</Text>
              <Feather name="chevron-right" size={13} color={Colors.textMuted} />
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Wallet Balance ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.section}>
          <Text style={styles.sectionLabel}>Wallet Balance</Text>
          <View style={styles.balanceBigRow}>
            <View style={styles.tIconMd}><Text style={styles.tIconMdText}>T</Text></View>
            <Text style={styles.balanceBig}>{balance.toFixed(1)}</Text>
          </View>

          {/* Income Table */}
          <View style={styles.incomeTable}>
            <View style={styles.incomeTableHeader}>
              <View style={{ flex: 1.8 }} />
              <Text style={[styles.incomeColLabel, { flex: 1.2 }]}>Daily</Text>
              <Text style={[styles.incomeColLabel, { flex: 1.2, textAlign: "right" }]}>Total</Text>
            </View>
            {INCOME_ROWS.map((row, i) => (
              <View key={row.label} style={[styles.incomeRow, i < INCOME_ROWS.length - 1 && styles.incomeRowBorder]}>
                <Text style={styles.incomeRowLabel}>{row.label}</Text>
                <View style={[styles.incomeCell, { flex: 1.2 }]}>
                  {row.star
                    ? <View style={styles.starIconXs}><Text style={styles.starIconXsText}>★</Text></View>
                    : <View style={styles.tIconXs}><Text style={styles.tIconXsText}>T</Text></View>}
                  <Text style={styles.incomeCellValue}>{row.daily}</Text>
                </View>
                <View style={[styles.incomeCell, { flex: 1.2, justifyContent: "flex-end" }]}>
                  {row.star
                    ? <View style={styles.starIconXs}><Text style={styles.starIconXsText}>★</Text></View>
                    : <View style={styles.tIconXs}><Text style={styles.tIconXsText}>T</Text></View>}
                  <Text style={[styles.incomeCellValue, parseFloat(row.total) > 0 && styles.incomeCellActive]}>
                    {row.total}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.sectionDivider} />

        {/* ── My Team ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>My Team</Text>

          <View style={styles.statsRow}>
            {TEAM_STATS.map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.innerDivider} />

          <View style={styles.linkGrid}>
            {TEAM_LINKS.map((link) => (
              <Pressable key={link.label} style={styles.linkItem}>
                <View style={styles.linkIconBox}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={32} />
                  <Feather name={link.icon as any} size={26} color="#fff" />
                </View>
                <Text style={styles.linkLabel}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <View style={styles.sectionDivider} />

        {/* ── My Orders ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>My Orders</Text>
            <Pressable style={styles.checkOrdersBtn}>
              <Text style={styles.checkOrdersText}>Check Orders</Text>
              <Feather name="chevron-right" size={15} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            {ORDER_STATS.map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.innerDivider} />

          <View style={styles.linkGrid}>
            {ORDER_LINKS.map((link) => (
              <Pressable key={link.label} style={styles.linkItem}>
                <View style={styles.linkIconBox}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={32} />
                  <Feather name={link.icon as any} size={26} color="#fff" />
                </View>
                <Text style={styles.linkLabel}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <View style={styles.sectionDivider} />

        {/* ── Common Functions ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)} style={styles.section}>
          <Text style={styles.sectionTitle}>Common Functions</Text>
          <View style={styles.linkGrid}>
            {COMMON_FUNCS.map((fn) => (
              <Pressable key={fn.label} style={styles.linkItem}>
                <View style={styles.linkIconBox}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={32} />
                  <Feather name={fn.icon as any} size={26} color="#fff" />
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

  /* ── Profile Header ── */
  profileHeader: {
    marginHorizontal: 14,
    marginBottom: 6,
    borderRadius: 22,
    overflow: "hidden",
    padding: 20,
    gap: 16,
  },
  profileTopRow: { flexDirection: "row", alignItems: "center", gap: 16 },

  avatarWrap: { position: "relative" },
  avatarGrad: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "#fff",
  },
  avatarInitials: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarVerify: {
    position: "absolute", bottom: 1, right: 1,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#5CBFFE",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },

  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameHidden: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, letterSpacing: 2 },
  uidRow: { flexDirection: "row", alignItems: "center" },
  uidLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  uidValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, letterSpacing: 2 },

  calendarBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center", justifyContent: "center",
  },

  pillsRow: { flexDirection: "row", gap: 10 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.9)",
  },
  pillText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary },

  /* ── Flat Sections ── */
  section: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 18,
  },
  sectionLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  checkOrdersBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  checkOrdersText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },

  sectionDivider: { height: 8, backgroundColor: Colors.border, opacity: 0.4 },
  innerDivider: { height: 1, backgroundColor: Colors.border },

  /* ── Wallet Balance ── */
  balanceBigRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tIconMd: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tIconMdText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  balanceBig: { fontSize: 40, fontFamily: "Inter_700Bold", color: Colors.textPrimary, letterSpacing: -1 },

  /* ── Income Table ── */
  incomeTable: { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  incomeTableHeader: {
    flexDirection: "row",
    paddingHorizontal: 16, paddingVertical: 11,
    backgroundColor: Colors.offWhite,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  incomeColLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  incomeRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: "#fff",
  },
  incomeRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  incomeRowLabel: { flex: 1.8, fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  incomeCell: { flexDirection: "row", alignItems: "center", gap: 5 },
  incomeCellValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  incomeCellActive: { color: Colors.textPrimary, fontFamily: "Inter_700Bold" },
  tIconXs: { width: 17, height: 17, borderRadius: 9, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tIconXsText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff" },
  starIconXs: { width: 17, height: 17, borderRadius: 9, backgroundColor: "#FFB800", alignItems: "center", justifyContent: "center" },
  starIconXsText: { fontSize: 9, color: "#fff" },

  /* ── Stats Row ── */
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { flex: 1, alignItems: "center", gap: 6 },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  statLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted, textAlign: "center" },

  /* ── Link Grid ── */
  linkGrid: { flexDirection: "row", justifyContent: "space-between" },
  linkItem: { flex: 1, alignItems: "center", gap: 10 },
  linkIconBox: {
    width: 64, height: 64, borderRadius: 32,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  linkLabel: {
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary, textAlign: "center",
    lineHeight: 17,
  },
});
