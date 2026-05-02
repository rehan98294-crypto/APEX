import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useBalance } from "@/context/BalanceContext";
import { authApi } from "@/lib/authApi";
import { AssetsSkeleton } from "@/components/Skeleton";

const USD_ICON = require("../../assets/images/icon-usd.png");

const { width } = Dimensions.get("window");

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

const NODES = ["Node 1", "Node 2", "Node 3"];

const MOCK_HISTORY = [
  { id: "1", type: "Reservation Profit", amount: "+12.50", date: "2025-01-10 07:41", status: "Won" },
  { id: "2", type: "NFT Sale", amount: "+28.30", date: "2025-01-09 14:22", status: "Won" },
  { id: "3", type: "Staking Reward", amount: "+5.00", date: "2025-01-08 09:11", status: "Won" },
];

type Network = "TRC20" | "BEP20" | "ERC20" | "SOL";

interface NetworkOption {
  key: Network;
  label: string;
  subtitle: string;
  color: string;
}

const NETWORKS: NetworkOption[] = [
  { key: "TRC20", label: "USDT (TRC20)", subtitle: "TRON Network",    color: "#E84141" },
  { key: "BEP20", label: "USDT (BEP20)", subtitle: "BNB Smart Chain", color: "#F0B90B" },
  { key: "ERC20", label: "USDT (ERC20)", subtitle: "Ethereum Network", color: "#627EEA" },
  { key: "SOL",   label: "USDT (SOL)",   subtitle: "Solana Network",   color: "#9945FF" },
];

interface DepositPayment {
  payment_id: string;
  pay_address: string;
  pay_amount: number;
  amount: number;
  network: string;
  status: string;
}

const CREDITED_KEY = "apex_credited_payments";

async function getCreditedIds(): Promise<string[]> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(CREDITED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function markCredited(payment_id: string) {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const ids = await getCreditedIds();
    if (!ids.includes(payment_id)) {
      await AsyncStorage.setItem(CREDITED_KEY, JSON.stringify([...ids, payment_id]));
    }
  } catch {}
}

export default function AssetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { balance, earnedTotal, transactions, creditBalance, dataLoaded } = useBalance();
  const { token } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [selectedNode, setSelectedNode] = useState(NODES[0]);
  const [nodeOpen, setNodeOpen] = useState(false);

  const totalEarnings = parseFloat(earnedTotal.toFixed(2));
  const withdrawn = 0;
  const undrawn = parseFloat(balance.toFixed(2));

  // ── Deposit Modal State ─────────────────────────────────────────────────────
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositStep, setDepositStep] = useState<"select" | "amount" | "payment">("select");
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [amountInput, setAmountInput] = useState("100");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [payment, setPayment] = useState<DepositPayment | null>(null);
  const [pollStatus, setPollStatus] = useState<string>("waiting");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((pmt: DepositPayment) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      if (!token) return;
      try {
        const data = await authApi.deposit.getStatus(token, pmt.payment_id);
        setPollStatus(data.status);
        if (data.status === "confirmed" || data.status === "finished") {
          stopPolling();
          const credited = await getCreditedIds();
          if (!credited.includes(pmt.payment_id)) {
            creditBalance(pmt.amount, `USDT Deposit (${pmt.network})`);
            await markCredited(pmt.payment_id);
          }
        } else if (data.status === "failed" || data.status === "expired") {
          stopPolling();
        }
      } catch {}
    }, 5000);
  }, [token, stopPolling, creditBalance]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const closeDepositModal = () => {
    stopPolling();
    setDepositOpen(false);
    setDepositStep("select");
    setSelectedNetwork(null);
    setAmountInput("100");
    setCreating(false);
    setCreateError(null);
    setPayment(null);
    setPollStatus("waiting");
  };

  const handleSelectNetwork = (net: Network) => {
    setSelectedNetwork(net);
    setDepositStep("amount");
    setCreateError(null);
  };

  const handleCreateDeposit = async () => {
    if (!token) { setCreateError("Please log in first"); return; }
    if (!selectedNetwork) { setCreateError("Select a network"); return; }
    const amt = parseFloat(amountInput);
    if (!amt || amt < 50) { setCreateError("Minimum deposit is $50"); return; }

    setCreating(true);
    setCreateError(null);
    try {
      const result = await authApi.deposit.create(token, amt, selectedNetwork);
      setPayment(result);
      setPollStatus(result.status ?? "waiting");
      setDepositStep("payment");
      startPolling(result);
    } catch (err: any) {
      setCreateError(err.message ?? "Failed to create deposit");
    } finally {
      setCreating(false);
    }
  };

  const copyAddress = () => {
    if (payment?.pay_address) {
      Clipboard.setString(payment.pay_address);
      Alert.alert("Copied", "Address copied to clipboard");
    }
  };

  const statusColor = (s: string) => {
    if (s === "confirmed" || s === "finished") return "#2BD9A8";
    if (s === "failed" || s === "expired") return "#FF5C5C";
    return "#FFB08A";
  };

  const statusLabel = (s: string) => {
    if (s === "confirmed" || s === "finished") return "Confirmed ✓";
    if (s === "failed") return "Failed";
    if (s === "expired") return "Expired";
    return "Waiting for payment…";
  };

  const qrUrl = payment?.pay_address
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(payment.pay_address)}&size=180x180&margin=10`
    : null;

  if (!dataLoaded) {
    return (
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        <AssetsSkeleton />
      </View>
    );
  }

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

        {/* ── USDT Deposit Networks ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.section}>
          <Text style={styles.sectionTitle}>Deposit USDT</Text>
          <View style={styles.networkGrid}>
            {NETWORKS.map((net) => (
              <Pressable
                key={net.key}
                style={styles.networkCard}
                onPress={() => { setSelectedNetwork(net.key); setDepositStep("amount"); setDepositOpen(true); }}
              >
                <LinearGradient
                  colors={["#fff", "#F8FBFF"]}
                  style={StyleSheet.absoluteFill}
                  borderRadius={16}
                />
                <View style={[styles.networkDot, { backgroundColor: net.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.networkLabel}>{net.label}</Text>
                  <Text style={styles.networkSub}>{net.subtitle}</Text>
                </View>
                <View style={styles.depositBtn}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={20} />
                  <Text style={styles.depositBtnText}>Deposit</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <View style={styles.actionsRow}>
            {[
              { icon: "credit-card", label: "Deposit",  isUsd: false },
              { icon: "download",    label: "Withdraw", isUsd: true  },
              { icon: "settings",    label: "Settings", isUsd: false },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={styles.actionItem}
                onPress={
                  action.label === "Deposit"  ? () => { setDepositStep("select"); setDepositOpen(true); } :
                  action.label === "Withdraw" ? () => router.push("/withdraw") :
                  action.label === "Settings" ? () => router.push("/withdrawal-links") :
                  undefined
                }
              >
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
                <View key={tx.id}>
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

      {/* ══════════════════════════════════════════════════════════════════════
          DEPOSIT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={depositOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDepositModal}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={modal.root}>
            {/* Header */}
            <View style={modal.header}>
              {depositStep !== "select" ? (
                <Pressable
                  style={modal.backBtn}
                  onPress={() => {
                    if (depositStep === "amount") setDepositStep("select");
                    else if (depositStep === "payment") { stopPolling(); setDepositStep("amount"); setPayment(null); setPollStatus("waiting"); }
                  }}
                >
                  <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
                </Pressable>
              ) : <View style={{ width: 36 }} />}
              <Text style={modal.title}>
                {depositStep === "select" ? "Select Network" :
                 depositStep === "amount" ? `Deposit USDT (${selectedNetwork})` :
                 "Payment Details"}
              </Text>
              <Pressable style={modal.closeBtn} onPress={closeDepositModal}>
                <Feather name="x" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

              {/* ── Step 1: Select Network ── */}
              {depositStep === "select" && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <Text style={modal.subtitle}>Choose the USDT network for your deposit</Text>
                  <View style={{ gap: 12, marginTop: 8 }}>
                    {NETWORKS.map((net) => (
                      <Pressable
                        key={net.key}
                        style={modal.netRow}
                        onPress={() => handleSelectNetwork(net.key)}
                      >
                        <View style={[modal.netDot, { backgroundColor: net.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={modal.netLabel}>{net.label}</Text>
                          <Text style={modal.netSub}>{net.subtitle}</Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={Colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                </Animated.View>
              )}

              {/* ── Step 2: Enter Amount ── */}
              {depositStep === "amount" && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <Text style={modal.subtitle}>Enter the amount you want to deposit in USD</Text>

                  <View style={modal.amountBox}>
                    <Text style={modal.amountCurrency}>$</Text>
                    <TextInput
                      style={modal.amountInput}
                      value={amountInput}
                      onChangeText={(t) => { setAmountInput(t.replace(/[^0-9.]/g, "")); setCreateError(null); }}
                      keyboardType="decimal-pad"
                      placeholder="100"
                      placeholderTextColor={Colors.textMuted}
                      autoFocus
                    />
                    <Text style={modal.amountLabel}>USD</Text>
                  </View>

                  <View style={modal.presetRow}>
                    {["50", "100", "200", "500"].map((p) => (
                      <Pressable key={p} style={[modal.preset, amountInput === p && modal.presetActive]} onPress={() => setAmountInput(p)}>
                        <Text style={[modal.presetText, amountInput === p && modal.presetActiveText]}>${p}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {createError && (
                    <View style={modal.errorBox}>
                      <Feather name="alert-circle" size={14} color="#FF5C5C" />
                      <Text style={modal.errorText}>{createError}</Text>
                    </View>
                  )}

                  <Pressable style={modal.confirmBtn} onPress={handleCreateDeposit} disabled={creating}>
                    <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={16} />
                    {creating
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={modal.confirmBtnText}>Generate Deposit Address</Text>
                    }
                  </Pressable>

                  <Text style={modal.note}>A unique USDT address will be generated for this transaction.</Text>
                </Animated.View>
              )}

              {/* ── Step 3: Payment Screen ── */}
              {depositStep === "payment" && payment && (
                <Animated.View entering={FadeIn.duration(250)} style={{ gap: 20 }}>

                  {/* Status Banner */}
                  <View style={[modal.statusBanner, { borderColor: statusColor(pollStatus) }]}>
                    {(pollStatus === "waiting" || pollStatus === "confirming") && (
                      <ActivityIndicator size="small" color={statusColor(pollStatus)} style={{ marginRight: 8 }} />
                    )}
                    <Text style={[modal.statusText, { color: statusColor(pollStatus) }]}>
                      {statusLabel(pollStatus)}
                    </Text>
                  </View>

                  {/* Network Badge */}
                  <View style={modal.networkBadgeRow}>
                    <View style={[modal.networkBadge, { backgroundColor: NETWORKS.find(n => n.key === payment.network)?.color + "22" }]}>
                      <View style={[modal.networkBadgeDot, { backgroundColor: NETWORKS.find(n => n.key === payment.network)?.color }]} />
                      <Text style={[modal.networkBadgeText, { color: NETWORKS.find(n => n.key === payment.network)?.color }]}>
                        {payment.network} Network
                      </Text>
                    </View>
                  </View>

                  {/* QR Code */}
                  {qrUrl && (
                    <View style={modal.qrWrap}>
                      <Image
                        source={{ uri: qrUrl }}
                        style={modal.qrImage}
                        resizeMode="contain"
                      />
                      <Text style={modal.qrHint}>Scan with your crypto wallet</Text>
                    </View>
                  )}

                  {/* Address */}
                  <View style={modal.addressBox}>
                    <Text style={modal.addressBoxLabel}>Deposit Address</Text>
                    <View style={modal.addressRow}>
                      <Text style={modal.addressText} numberOfLines={2} selectable>
                        {payment.pay_address}
                      </Text>
                      <Pressable style={modal.copyBtn} onPress={copyAddress}>
                        <Feather name="copy" size={16} color="#5CBFFE" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Amount Info */}
                  <View style={modal.infoGrid}>
                    <View style={modal.infoItem}>
                      <Text style={modal.infoLabel}>USD Amount</Text>
                      <Text style={modal.infoValue}>${payment.amount.toFixed(2)}</Text>
                    </View>
                    <View style={modal.infoDiv} />
                    <View style={modal.infoItem}>
                      <Text style={modal.infoLabel}>USDT to Send</Text>
                      <Text style={modal.infoValue}>{payment.pay_amount} USDT</Text>
                    </View>
                  </View>

                  {/* Warning */}
                  <View style={modal.warnBox}>
                    <Feather name="alert-triangle" size={14} color="#FFB08A" />
                    <Text style={modal.warnText}>
                      Send only USDT ({payment.network}) to this address. Sending other assets will result in permanent loss.
                    </Text>
                  </View>

                  {/* Success message */}
                  {(pollStatus === "confirmed" || pollStatus === "finished") && (
                    <View style={modal.successBox}>
                      <Feather name="check-circle" size={24} color="#2BD9A8" />
                      <Text style={modal.successText}>
                        Your balance has been credited with ${payment.amount.toFixed(2)} USDT!
                      </Text>
                      <Pressable style={modal.doneBtn} onPress={closeDepositModal}>
                        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={12} />
                        <Text style={modal.doneBtnText}>Done</Text>
                      </Pressable>
                    </View>
                  )}
                </Animated.View>
              )}

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 12 },

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

  networkGrid: { gap: 10 },
  networkCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  networkDot: { width: 12, height: 12, borderRadius: 6 },
  networkLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  networkSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  depositBtn: {
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  depositBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff", zIndex: 1 },

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

const modal = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 16 : 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 20,
    marginTop: 20,
    lineHeight: 20,
  },

  netRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  netDot: { width: 14, height: 14, borderRadius: 7 },
  netLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  netSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },

  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: "#5CBFFE",
    marginBottom: 16,
    gap: 8,
  },
  amountCurrency: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.textMuted },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  amountLabel: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textMuted },

  presetRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  preset: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  presetActive: { borderColor: "#5CBFFE", backgroundColor: "#EAF6FF" },
  presetText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  presetActiveText: { color: "#5CBFFE", fontFamily: "Inter_700Bold" },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF0F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#FF5C5C", flex: 1 },

  confirmBtn: {
    height: 54,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", zIndex: 1 },

  note: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },

  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    marginTop: 16,
  },
  statusText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  networkBadgeRow: { alignItems: "flex-start" },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  networkBadgeDot: { width: 8, height: 8, borderRadius: 4 },
  networkBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  qrWrap: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  qrImage: { width: 180, height: 180, borderRadius: 8 },
  qrHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },

  addressBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  addressBoxLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  addressText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textPrimary, lineHeight: 20 },
  copyBtn: { padding: 8 },

  infoGrid: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoItem: { flex: 1, alignItems: "center", gap: 4 },
  infoDiv: { width: 1, backgroundColor: Colors.border },
  infoLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  infoValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textPrimary },

  warnBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFE5CC",
  },
  warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#CC7722", lineHeight: 18 },

  successBox: {
    alignItems: "center",
    backgroundColor: "#F0FBF7",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#B3EDD8",
    gap: 12,
  },
  successText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#1A7A55", textAlign: "center", lineHeight: 22 },
  doneBtn: {
    height: 48,
    width: 180,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  doneBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", zIndex: 1 },
});
