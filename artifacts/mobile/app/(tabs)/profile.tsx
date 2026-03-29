import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
        <Animated.View entering={FadeInDown.duration(400).delay(140)} style={[styles.card, { gap: 0, padding: 0, overflow: "hidden" }]}>
          {/* Header */}
          <View style={styles.ordersHeader}>
            <Text style={styles.cardTitle}>My Orders</Text>
            <View style={styles.ordersBadgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: "#FFF3E0" }]}>
                <Text style={[styles.statusBadgeText, { color: "#FF8A00" }]}>{processingOrders.length} Processing</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: "#E8F5E9" }]}>
                <Text style={[styles.statusBadgeText, { color: "#2BD9A8" }]}>{boughtOrders.length} Bought</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: "#E8F0FE" }]}>
                <Text style={[styles.statusBadgeText, { color: "#5CBFFE" }]}>{soldOrders.length} Sold</Text>
              </View>
            </View>
          </View>

          {/* Summary stats */}
          <View style={styles.ordersSummaryRow}>
            {[
              { label: "Total", value: orders.length },
              { label: "Processing", value: processingOrders.length },
              { label: "Bought", value: boughtOrders.length },
              { label: "Sold", value: soldOrders.length },
            ].map((s) => (
              <View key={s.label} style={styles.ordersStat}>
                <Text style={styles.ordersStatValue}>{s.value}</Text>
                <Text style={styles.ordersStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Empty state */}
          {orders.length === 0 && (
            <View style={styles.ordersEmptyState}>
              <Feather name="inbox" size={34} color={Colors.textMuted} />
              <Text style={styles.ordersEmptyText}>No orders yet</Text>
              <Text style={styles.ordersEmptySubtext}>Reserve an NFT to create your first order</Text>
            </View>
          )}

          {/* Processing section */}
          {processingOrders.length > 0 && (
            <View style={styles.orderSection}>
              <View style={styles.orderSectionHeader}>
                <View style={[styles.orderSectionDot, { backgroundColor: "#FF8A00" }]} />
                <Text style={styles.orderSectionTitle}>Processing</Text>
                <Text style={styles.orderSectionCount}>{processingOrders.length}</Text>
              </View>
              {processingOrders.map((order) => (
                <View key={order.order_id} style={styles.orderRow}>
                  {/* Shimmer placeholder image */}
                  <View style={styles.orderImgPlaceholder}>
                    <LinearGradient
                      colors={["#f0f0f0", "#e0e0e0", "#f0f0f0"]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <ActivityIndicator size="small" color="#5CBFFE" />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderIdText}>{order.order_id}</Text>
                    <Text style={styles.orderSubtext}>Opening box · Level {order.level}</Text>
                    <View style={[styles.orderStatusPill, { backgroundColor: "#FFF3E0" }]}>
                      <View style={[styles.orderStatusDot, { backgroundColor: "#FF8A00" }]} />
                      <Text style={[styles.orderStatusLabel, { color: "#FF8A00" }]}>Processing</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {processingOrders.length > 0 && (boughtOrders.length > 0 || soldOrders.length > 0) && (
            <View style={styles.divider} />
          )}

          {/* Bought section */}
          {boughtOrders.length > 0 && (
            <View style={styles.orderSection}>
              <View style={styles.orderSectionHeader}>
                <View style={[styles.orderSectionDot, { backgroundColor: "#2BD9A8" }]} />
                <Text style={styles.orderSectionTitle}>Bought</Text>
                <Text style={styles.orderSectionCount}>{boughtOrders.length}</Text>
              </View>
              {boughtOrders.map((order) => (
                <View key={order.order_id} style={styles.orderRow}>
                  <View style={styles.orderImgBox}>
                    {order.image_source ? (
                      <Image source={order.image_source} style={styles.orderImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.orderImgBox, { backgroundColor: "#e8f5e9", alignItems: "center", justifyContent: "center" }]}>
                        <Feather name="image" size={20} color="#2BD9A8" />
                      </View>
                    )}
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNftName} numberOfLines={1}>{order.nft_name || "NFT"}</Text>
                    <Text style={styles.orderIdText}>{order.order_id}</Text>
                    <View style={styles.orderProfitRow}>
                      <View style={styles.orderTIcon}><Text style={styles.orderTIconText}>T</Text></View>
                      <Text style={styles.orderProfitText}>+{order.profit.toFixed(2)} TFT</Text>
                    </View>
                  </View>
                  <View style={[styles.orderStatusPill, { backgroundColor: "#E8F5E9", alignSelf: "flex-start", marginTop: 2 }]}>
                    <View style={[styles.orderStatusDot, { backgroundColor: "#2BD9A8" }]} />
                    <Text style={[styles.orderStatusLabel, { color: "#2BD9A8" }]}>Bought</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {boughtOrders.length > 0 && soldOrders.length > 0 && (
            <View style={styles.divider} />
          )}

          {/* Sold section */}
          {soldOrders.length > 0 && (
            <View style={styles.orderSection}>
              <View style={styles.orderSectionHeader}>
                <View style={[styles.orderSectionDot, { backgroundColor: "#5CBFFE" }]} />
                <Text style={styles.orderSectionTitle}>Sold</Text>
                <Text style={styles.orderSectionCount}>{soldOrders.length}</Text>
              </View>
              {soldOrders.map((order) => (
                <View key={order.order_id} style={[styles.orderRow, { opacity: 0.85 }]}>
                  <View style={styles.orderImgBox}>
                    {order.image_source ? (
                      <Image source={order.image_source} style={[styles.orderImg, { opacity: 0.7 }]} contentFit="cover" />
                    ) : (
                      <View style={[styles.orderImgBox, { backgroundColor: "#E8F0FE", alignItems: "center", justifyContent: "center" }]}>
                        <Feather name="check-circle" size={20} color="#5CBFFE" />
                      </View>
                    )}
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNftName} numberOfLines={1}>{order.nft_name || "NFT"}</Text>
                    <Text style={styles.orderIdText}>{order.order_id}</Text>
                    <View style={styles.orderProfitRow}>
                      <View style={styles.orderTIcon}><Text style={styles.orderTIconText}>T</Text></View>
                      <Text style={[styles.orderProfitText, { color: "#5CBFFE" }]}>+{order.profit.toFixed(2)} TFT</Text>
                    </View>
                  </View>
                  <View style={[styles.orderStatusPill, { backgroundColor: "#E8F0FE", alignSelf: "flex-start", marginTop: 2 }]}>
                    <View style={[styles.orderStatusDot, { backgroundColor: "#5CBFFE" }]} />
                    <Text style={[styles.orderStatusLabel, { color: "#5CBFFE" }]}>Sold</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 4 }} />
        </Animated.View>

        {/* ── Common Functions ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)} style={styles.card}>
          <Text style={styles.cardTitle}>Common Functions</Text>
          <View style={styles.linkGrid}>
            {COMMON_FUNCS.map((fn) => (
              <Pressable key={fn.label} style={styles.linkItem}>
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

  ordersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  ordersBadgeRow: { flexDirection: "row", gap: 6 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  ordersSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  ordersStat: { flex: 1, alignItems: "center", gap: 4 },
  ordersStatValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  ordersStatLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted, textAlign: "center" },

  ordersEmptyState: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  ordersEmptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  ordersEmptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", paddingHorizontal: 20 },

  orderSection: { paddingHorizontal: 18, paddingVertical: 10, gap: 10 },
  orderSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderSectionDot: { width: 8, height: 8, borderRadius: 4 },
  orderSectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary, flex: 1 },
  orderSectionCount: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    backgroundColor: Colors.offWhite,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },

  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 12,
  },
  orderImgPlaceholder: {
    width: 56, height: 56, borderRadius: 12,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  orderImgBox: { width: 56, height: 56, borderRadius: 12, overflow: "hidden" },
  orderImg: { width: 56, height: 56 },
  orderInfo: { flex: 1, gap: 4 },
  orderNftName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  orderIdText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  orderSubtext: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  orderProfitRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  orderProfitText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#2BD9A8" },
  orderStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  orderStatusDot: { width: 6, height: 6, borderRadius: 3 },
  orderStatusLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  orderTIcon: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  orderTIconText: { fontSize: 7, fontFamily: "Inter_700Bold", color: "#fff" },

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
