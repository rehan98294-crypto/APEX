import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";
import { useOrders } from "@/context/OrderContext";

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

const COMMON_FUNCS = [
  { icon: "book-open", label: "Tutorials" },
  { icon: "settings", label: "Settings" },
  { icon: "layers", label: "Mint" },
  { icon: "bookmark", label: "Collection" },
];

export default function ProfileScreen() {
  const { balance, earnedTotal } = useBalance();
  const { orders } = useOrders();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const processingOrders = orders.filter((o) => o.status === "processing");
  const boughtOrders = orders.filter((o) => o.status === "bought");
  const soldOrders = orders.filter((o) => o.status === "sold");
  const [nameVisible, setNameVisible] = useState(false);
  const [uidVisible, setUidVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);

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
            colors={["#D0F0FF", "#E6F8FF", "#F8F0FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrap}>
              <LinearGradient colors={["#5CBFFE", "#2BD9A8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarGrad}>
                <Text style={styles.avatarInitials}>JD</Text>
              </LinearGradient>
              <View style={styles.avatarVerify}>
                <Feather name="check" size={8} color="#fff" />
              </View>
            </View>

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

            <Pressable style={styles.calendarBtn}>
              <Feather name="calendar" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

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
            <View style={styles.incomeTableHeader}>
              <View style={{ flex: 1.6 }} />
              <Text style={[styles.incomeColLabel, { flex: 1.2 }]}>Daily income</Text>
              <Text style={[styles.incomeColLabel, { flex: 1.2, textAlign: "right" }]}>Total income</Text>
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
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={26} />
                  <Feather name={link.icon as any} size={22} color="#fff" />
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
            {[
              { label: "Orders", value: String(orders.length) },
              { label: "Processing", value: String(processingOrders.length) },
              { label: "Bought", value: String(boughtOrders.length) },
              { label: "Sold", value: String(soldOrders.length) },
            ].map((s) => (
              <View key={s.label} style={styles.teamStatItem}>
                <Text style={styles.teamStatValue}>{s.value}</Text>
                <Text style={styles.teamStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.linkGrid}>
            {[
              { icon: "user", label: "My Bid" },
              { icon: "file-text", label: "Details" },
              { icon: "credit-card", label: "Deposit" },
              { icon: "download", label: "Withdraw" },
            ].map((link) => (
              <Pressable key={link.label} style={styles.linkItem}>
                <View style={styles.linkIconBox}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={26} />
                  <Feather name={link.icon as any} size={22} color="#fff" />
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
              <Pressable
                key={fn.label}
                style={styles.linkItem}
                onPress={fn.label === "Settings" ? () => setSettingsOpen(true) : undefined}
              >
                <View style={styles.linkIconBox}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={26} />
                  <Feather name={fn.icon as any} size={22} color="#fff" />
                </View>
                <Text style={styles.linkLabel}>{fn.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

      </ScrollView>

      {/* ── Settings Modal ── */}
      <Modal visible={settingsOpen} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={stScreen.root}>
          <StickyGlassHeader showBalance={false} showMenu={false} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Profile mini-header */}
            <View style={stScreen.profileCard}>
              <LinearGradient colors={["#D0F0FF", "#E6F8FF", "#F8F0FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={20} />
              <View style={stScreen.profileRow}>
                <View style={stScreen.avatarRing}>
                  <LinearGradient colors={["#5CBFFE", "#2BD9A8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={32} />
                  <Feather name="user" size={28} color="#fff" />
                </View>
                <View style={stScreen.profileInfo}>
                  <Text style={stScreen.profileName}>— —</Text>
                  <Text style={stScreen.profilePoints}>Points : — —</Text>
                </View>
              </View>
            </View>

            {/* Google verification + User Settings */}
            <View style={stScreen.card}>
              <Pressable style={stScreen.verifyBox}>
                <Feather name="shield" size={28} color="#5CBFFE" />
                <Text style={stScreen.verifyLabel}>Google verification</Text>
                <Text style={stScreen.verifyStatus}>Bound</Text>
              </Pressable>
              <View style={stScreen.cardDivider} />
              <Pressable style={stScreen.verifyBox} onPress={() => setUserSettingsOpen(true)}>
                <Feather name="user" size={28} color="#5CBFFE" />
                <Text style={stScreen.verifyLabel}>User Settings</Text>
              </Pressable>
            </View>

            {/* Change Password + Line Settings */}
            <View style={stScreen.listCard}>
              <Pressable style={stScreen.listRow}>
                <Feather name="lock" size={20} color={Colors.textPrimary} style={{ marginRight: 14 }} />
                <Text style={stScreen.listRowLabel}>Change Password</Text>
                <Feather name="chevron-right" size={18} color={Colors.textMuted} />
              </Pressable>
              <View style={stScreen.listDivider} />
              <Pressable style={stScreen.listRow}>
                <Feather name="sliders" size={20} color={Colors.textPrimary} style={{ marginRight: 14 }} />
                <Text style={stScreen.listRowLabel}>Line Settings</Text>
                <Feather name="chevron-right" size={18} color={Colors.textMuted} />
              </Pressable>
            </View>

            <Text style={stScreen.versionText}>Version v3.0.6</Text>

            {/* Log out */}
            <Pressable style={stScreen.actionBtn} onPress={() => setSettingsOpen(false)}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={30} />
              <Text style={stScreen.actionBtnText}>Log out</Text>
            </Pressable>

            {/* Delete account */}
            <Pressable style={stScreen.actionBtn}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={30} />
              <Text style={stScreen.actionBtnText}>Delete account</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── User Settings Modal ── */}
      <Modal visible={userSettingsOpen} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={stScreen.root}>
          <StickyGlassHeader showBalance={false} showMenu={false} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={stScreen.userSettingsContent}>
            {/* Back + Title */}
            <View style={stScreen.userSettingsHeader}>
              <Pressable onPress={() => setUserSettingsOpen(false)} style={stScreen.backBtn}>
                <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
              </Pressable>
              <Text style={stScreen.userSettingsTitle}>User Settings</Text>
            </View>

            {[
              { label: "Nationality" },
              { label: "wallet address" },
              { label: "User name" },
              { label: "Mobile no." },
              { label: "Email", hasEdit: true },
            ].map((field) => (
              <View key={field.label} style={stScreen.fieldGroup}>
                <Text style={stScreen.fieldLabel}>{field.label}</Text>
                <View style={stScreen.fieldBox}>
                  <View style={{ flex: 1 }} />
                  {field.hasEdit && <Feather name="edit-2" size={16} color={Colors.textMuted} />}
                </View>
              </View>
            ))}

            {/* Gender */}
            <View style={stScreen.fieldGroup}>
              <Text style={stScreen.fieldLabel}>Gender</Text>
              <Pressable style={stScreen.dropdownBox}>
                <Text style={stScreen.dropdownPlaceholder}>— —</Text>
                <Feather name="chevron-down" size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const stScreen = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  userSettingsContent: { paddingHorizontal: 20, paddingBottom: 60 },

  profileCard: {
    margin: 14,
    borderRadius: 20,
    overflow: "hidden",
    padding: 18,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarRing: {
    width: 64, height: 64, borderRadius: 32,
    overflow: "hidden", alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "#fff",
  },
  profileInfo: { gap: 4 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  profilePoints: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },

  card: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: "#fff", borderRadius: 20,
    flexDirection: "row",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    overflow: "hidden",
  },
  verifyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 22, gap: 8 },
  verifyLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textPrimary, textAlign: "center" },
  verifyStatus: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#5CBFFE" },
  cardDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 16 },

  listCard: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: "#fff", borderRadius: 20,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    overflow: "hidden",
  },
  listRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 18 },
  listRowLabel: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  listDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 18 },

  versionText: {
    textAlign: "center", fontSize: 13,
    fontFamily: "Inter_400Regular", color: Colors.textMuted,
    marginBottom: 20, marginTop: 4,
  },

  actionBtn: {
    marginHorizontal: 20, marginBottom: 14,
    height: 52, borderRadius: 30, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  actionBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  userSettingsHeader: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 16, gap: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.offWhite, alignItems: "center", justifyContent: "center",
  },
  userSettingsTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, flex: 1, textAlign: "center", marginRight: 36 },

  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textPrimary, marginBottom: 8 },
  fieldBox: {
    backgroundColor: Colors.offWhite, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", minHeight: 52,
  },
  dropdownBox: {
    backgroundColor: Colors.offWhite, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    alignSelf: "flex-start", minWidth: 120,
  },
  dropdownPlaceholder: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginRight: 8 },
});

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
    gap: 16,
  },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  checkOrdersBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  checkOrdersText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },

  balanceSection: { gap: 8 },
  balanceSectionLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  balanceBigRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tIconMd: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tIconMdText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  balanceBig: { fontSize: 36, fontFamily: "Inter_700Bold", color: Colors.textPrimary, letterSpacing: -0.5 },

  incomeTable: { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  incomeTableHeader: {
    flexDirection: "row",
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: Colors.offWhite,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  incomeColLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  incomeRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: "#fff",
  },
  incomeRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  incomeRowLabel: { flex: 1.6, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  incomeCell: { flexDirection: "row", alignItems: "center", gap: 5 },
  incomeCellValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  tIconXs: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tIconXsText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff" },
  starIconXs: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFB800", alignItems: "center", justifyContent: "center" },
  starIconXsText: { fontSize: 9, color: "#fff" },

  teamStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  teamStatItem: { flex: 1, alignItems: "center", gap: 5 },
  teamStatValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  teamStatLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted, textAlign: "center" },

  divider: { height: 1, backgroundColor: Colors.border },

  linkGrid: { flexDirection: "row", justifyContent: "space-between" },
  linkItem: { flex: 1, alignItems: "center", gap: 10 },
  linkIconBox: {
    width: 52, height: 52, borderRadius: 26,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  linkLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary, textAlign: "center",
    lineHeight: 16,
  },
});
