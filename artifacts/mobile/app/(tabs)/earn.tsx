import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";

const USD_ICON = require("../../assets/images/icon-usd.png");

const { width } = Dimensions.get("window");

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

const DEPOSIT_ADDRESSES: { label: string; key: string; address: string }[] = [
  // Add deposit addresses here when ready
];

const NODES = ["Node 1", "Node 2", "Node 3"];

const MOCK_HISTORY = [
  { id: "1", type: "Reservation Profit", amount: "+12.50", date: "2025-01-10 07:41", status: "Won" },
  { id: "2", type: "NFT Sale", amount: "+28.30", date: "2025-01-09 14:22", status: "Won" },
  { id: "3", type: "Staking Reward", amount: "+5.00", date: "2025-01-08 09:11", status: "Won" },
];

export default function AssetsScreen() {
  const insets = useSafeAreaInsets();
  const { balance, earnedTotal, transactions } = useBalance();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [selectedNode, setSelectedNode] = useState(NODES[0]);
  const [nodeOpen, setNodeOpen] = useState(false);
  const [visibleAddress, setVisibleAddress] = useState<string | null>(null);

  const totalEarnings = parseFloat(earnedTotal.toFixed(2));
  const withdrawn = 0;
  const undrawn = parseFloat(balance.toFixed(2));

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        onScrollBeginDrag={() => setNodeOpen(false)}
      >
        <StickyGlassHeader />
        <View style={{ height: 16 }} />

        {/* ── Assets(USDT) Card ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.assetCard}>
          <Text style={styles.assetCardLabel}>Assets(USDT)</Text>

          <View style={styles.bigBalanceRow}>
            <View style={styles.tIconLg}>
              <Text style={styles.tIconLgText}>T</Text>
            </View>
            <Text style={styles.bigBalance}>{balance.toFixed(1)}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={styles.tIconSm}><Text style={styles.tIconSmText}>T</Text></View>
                <Text style={styles.statValue}>{totalEarnings}</Text>
              </View>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={styles.tIconSm}><Text style={styles.tIconSmText}>T</Text></View>
                <Text style={styles.statValue}>{withdrawn}</Text>
              </View>
              <Text style={styles.statLabel}>Withdrawn</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={styles.tIconSm}><Text style={styles.tIconSmText}>T</Text></View>
                <Text style={styles.statValue}>{undrawn}</Text>
              </View>
              <Text style={styles.statLabel}>Undrawn</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Node Selector ── */}
        <View style={[styles.section, { zIndex: 10 }]}>
          <View style={{ position: "relative" }}>
            <Pressable
              style={styles.nodeSelector}
              onPress={() => setNodeOpen((o) => !o)}
            >
              <Text style={styles.nodeSelectorText}>{selectedNode}</Text>
              <Feather name={nodeOpen ? "chevron-up" : "chevron-down"} size={18} color={Colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.nodeHelpBtn}>
              <Text style={styles.nodeHelpText}>?</Text>
            </Pressable>

            {nodeOpen && (
              <Animated.View entering={FadeIn.duration(150)} style={styles.nodeDropdown}>
                {NODES.map((node) => (
                  <Pressable
                    key={node}
                    style={[styles.nodeOption, selectedNode === node && styles.nodeOptionActive]}
                    onPress={() => { setSelectedNode(node); setNodeOpen(false); }}
                  >
                    <Text style={[styles.nodeOptionText, selectedNode === node && { color: "#5CBFFE", fontFamily: "Inter_600SemiBold" }]}>
                      {node}
                    </Text>
                    {selectedNode === node && <Feather name="check" size={14} color="#5CBFFE" />}
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </View>
        </View>

        {/* ── Deposit Addresses (hidden until addresses are configured) ── */}
        {DEPOSIT_ADDRESSES.length > 0 && (
          <View style={styles.section}>
            <View style={styles.addressCard}>
              {DEPOSIT_ADDRESSES.map((addr, i) => {
                const isVisible = visibleAddress === addr.key;
                return (
                  <View key={addr.key}>
                    <View style={styles.addressRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.addressLabel}>{addr.label}</Text>
                        <Text style={styles.addressValue} numberOfLines={1}>
                          {isVisible ? addr.address : "••••••••••••••••••••••••••••••••••••"}
                        </Text>
                      </View>
                      <Pressable onPress={() => setVisibleAddress(isVisible ? null : addr.key)} style={styles.eyeBtn}>
                        <Feather name={isVisible ? "eye" : "eye-off"} size={16} color={Colors.textMuted} />
                      </Pressable>
                    </View>
                    {i < DEPOSIT_ADDRESSES.length - 1 && <View style={styles.rowDivider} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <View style={styles.actionsRow}>
            {[
              { icon: "credit-card", label: "Deposit",  isUsd: false },
              { icon: "download",    label: "Withdraw", isUsd: true  },
              { icon: "settings",    label: "Settings", isUsd: false },
            ].map((action) => (
              <Pressable key={action.label} style={styles.actionItem}>
                <View style={styles.actionIconBox}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={26} />
                  {action.isUsd
                    ? <Image source={USD_ICON} style={{ width: 22, height: 22 }} tintColor="#fff" resizeMode="contain" />
                    : <Feather name={action.icon as any} size={22} color="#fff" />
                  }
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Fiat Currency Recharge ── */}
        <View style={styles.section}>
          <Pressable style={styles.fiatBtn}>
            <LinearGradient
              colors={GRAD}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              borderRadius={28}
            />
            <Text style={styles.fiatBtnText}>Fiat Currency Recharge</Text>
          </Pressable>
        </View>

        {/* ── History ── */}
        <View style={styles.section}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>History</Text>
            <Pressable style={styles.historyAllBtn}>
              <Text style={styles.historyAllText}>All</Text>
              <Feather name="chevron-right" size={14} color="#5CBFFE" />
            </Pressable>
          </View>

          <View style={styles.historyList}>
            {(transactions.length > 0 ? transactions.slice(0, 5) : MOCK_HISTORY).map((tx: any, i: number) => {
              const isReal = transactions.length > 0;
              const label = isReal ? tx.description : tx.type;
              const amount = isReal ? `+${tx.amount.toFixed(2)}` : tx.amount;
              const date = isReal ? new Date(tx.timestamp).toLocaleString() : tx.date;
              return (
                <View key={isReal ? tx.id : tx.id}>
                  <View style={styles.historyRow}>
                    <View style={styles.historyIconBox}>
                      <Feather name="trending-up" size={16} color="#2BD9A8" />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.historyLabel} numberOfLines={1}>{label}</Text>
                      <Text style={styles.historyDate}>{date}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={styles.historyAmount}>{amount}</Text>
                      <View style={styles.wonBadge}>
                        <Text style={styles.wonText}>Won</Text>
                      </View>
                    </View>
                  </View>
                  {i < (transactions.length > 0 ? Math.min(transactions.length, 5) : MOCK_HISTORY.length) - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </View>
              );
            })}

            {transactions.length === 0 && MOCK_HISTORY.length === 0 && (
              <View style={styles.emptyHistory}>
                <Feather name="clock" size={28} color={Colors.textMuted} />
                <Text style={styles.emptyHistoryText}>No history yet</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  assetCard: {
    marginHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 16,
  },
  assetCardLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },

  bigBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tIconLg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#00C853",
    alignItems: "center",
    justifyContent: "center",
  },
  tIconLgText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  bigBalance: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -1,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  tIconSm: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tIconSmText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff" },
  statValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },

  section: { paddingHorizontal: 14, marginBottom: 16 },

  nodeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 52,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  nodeSelectorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  nodeHelpBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  nodeHelpText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  nodeDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 52,
    marginTop: 4,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    overflow: "hidden",
    zIndex: 999,
  },
  nodeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  nodeOptionActive: { backgroundColor: "#F0F9FF" },
  nodeOptionText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textPrimary },

  addressCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 10,
  },
  addressLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  addressValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 3,
    letterSpacing: 1,
  },
  eyeBtn: { padding: 6 },
  rowDivider: { height: 1, backgroundColor: Colors.border },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionItem: { alignItems: "center", gap: 8 },
  actionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  actionLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },

  fiatBtn: {
    overflow: "hidden",
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  fiatBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", zIndex: 1 },

  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  historyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  historyAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  historyAllText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#5CBFFE" },

  historyList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  historyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "#E6FBF5",
  },
  historyLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  historyDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  historyAmount: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#2BD9A8" },
  wonBadge: { backgroundColor: "#00C853", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  wonText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },

  emptyHistory: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyHistoryText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
