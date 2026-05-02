import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useBalance } from "@/context/BalanceContext";
import { authApi } from "@/lib/authApi";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];
const FEE_RATE = 0.05;
const MIN_WITHDRAWAL = 10;

const NETWORK_INFO: Record<string, { label: string; color: string; bg: string; letter: string }> = {
  TRC20:   { label: "USDT (TRC-20)",          color: "#E84141", bg: "#FFF1F1", letter: "T" },
  BEP20:   { label: "USDT (BEP-20)",          color: "#F0B90B", bg: "#FFFBEB", letter: "B" },
  POLYGON: { label: "NFT Transfer (Polygon)", color: "#8247E5", bg: "#F5F0FF", letter: "P" },
  SOL:     { label: "USDT (Solana)",          color: "#14F195", bg: "#EDFFF9", letter: "S" },
};

interface SavedAddress { network: string; address: string }

export default function WithdrawScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { balance, spendBalance } = useBalance();

  const [address, setAddress]     = useState("");
  const [amount, setAmount]       = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");

  const [sendingCode, setSendingCode]   = useState(false);
  const [codeSent, setCodeSent]         = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);

  // Saved withdrawal addresses
  const [savedAddresses, setSavedAddresses]     = useState<SavedAddress[]>([]);
  const [selectedNetwork, setSelectedNetwork]   = useState<string | null>(null);
  const [disabledUntil, setDisabledUntil]       = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const fee       = numAmount * FEE_RATE;
  const receive   = numAmount - fee;

  // Fetch saved addresses + cooldown status
  const fetchAddresses = useCallback(async () => {
    if (!token) return;
    setLoadingAddresses(true);
    try {
      const data = await authApi.withdrawAddresses.get(token);
      setSavedAddresses(data.addresses ?? []);
      setDisabledUntil(data.withdrawal_disabled_until ?? null);
    } catch {
      // table may not exist yet — silent fallback
    } finally {
      setLoadingAddresses(false);
    }
  }, [token]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const handleSelectNetwork = (network: string) => {
    setSelectedNetwork(network);
    const saved = savedAddresses.find((a) => a.network === network);
    if (saved) setAddress(saved.address);
  };

  const isWithdrawalDisabled =
    !!disabledUntil && new Date(disabledUntil) > new Date();

  const disabledRemainingHours = isWithdrawalDisabled
    ? Math.ceil((new Date(disabledUntil!).getTime() - Date.now()) / (1000 * 60 * 60))
    : 0;

  const handleAllWithdraw = () => { setAmount(balance.toFixed(2)); };

  const handleGetCode = async () => {
    if (!user?.email || codeCooldown > 0) return;
    setSendingCode(true);
    try {
      await authApi.sendCode(user.email, "verify");
      setCodeSent(true);
      let secs = 60;
      setCodeCooldown(secs);
      cooldownRef.current = setInterval(() => {
        secs -= 1;
        setCodeCooldown(secs);
        if (secs <= 0 && cooldownRef.current) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
        }
      }, 1000);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to send code");
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async () => {
    // Check if withdrawal is disabled (72h cooldown after address change)
    if (isWithdrawalDisabled) {
      Alert.alert(
        "Withdrawals Disabled",
        `Your withdrawals are temporarily disabled for account security. Available in approximately ${disabledRemainingHours} hour${disabledRemainingHours === 1 ? "" : "s"}.`
      );
      return;
    }

    // Require at least 2 saved withdrawal addresses
    if (savedAddresses.length < 2) {
      Alert.alert(
        "Set Withdrawal Addresses",
        "Please set at least 2 withdrawal network addresses before withdrawing. Tap the Settings button in the Assets tab.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Settings", onPress: () => router.push("/withdrawal-links") },
        ]
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert("Missing field", "Please enter or select a withdrawal address.");
      return;
    }
    if (numAmount < MIN_WITHDRAWAL) {
      Alert.alert("Invalid amount", `Minimum withdrawal is ${MIN_WITHDRAWAL} USDT.`);
      return;
    }
    if (numAmount > balance) {
      Alert.alert("Insufficient balance", "Amount exceeds your available balance.");
      return;
    }
    if (!emailCode.trim()) {
      Alert.alert("Missing field", "Please enter the email verification code.");
      return;
    }
    if (!twoFaCode.trim()) {
      Alert.alert("Missing field", "Please enter your Google Authenticator code.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.verifyCode(user!.email, emailCode.trim());

      await authApi.withdraw.create(token!, {
        amount: numAmount,
        wallet_address: address.trim(),
        network: selectedNetwork ?? "TRC20",
      });

      spendBalance(numAmount, `Withdrawal to ${address.slice(0, 8)}…`);
      setSuccess(true);
    } catch (e: any) {
      Alert.alert("Withdrawal Failed", e.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={[sty.container, { paddingTop: insets.top }]}>
        <View style={sty.topBar}>
          <Pressable style={sty.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text style={sty.topTitle}>Withdraw</Text>
          <View style={{ width: 40 }} />
        </View>
        <Animated.View entering={FadeIn.duration(500)} style={sty.successWrap}>
          <View style={sty.successCircle}>
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={40} />
            <Feather name="check" size={38} color="#fff" />
          </View>
          <Text style={sty.successTitle}>Withdrawal Submitted</Text>
          <Text style={sty.successSub}>
            Your request of{" "}
            <Text style={{ fontFamily: "Inter_700Bold", color: "#2BD9A8" }}>
              {receive.toFixed(2)} USDT
            </Text>{" "}
            has been submitted.{"\n"}Funds will be credited within 96 hours.
          </Text>
          <View style={sty.successInfoCard}>
            <View style={sty.successRow}>
              <Text style={sty.successRowLabel}>Network</Text>
              <Text style={sty.successRowValue}>{selectedNetwork ?? "TRC20"}</Text>
            </View>
            <View style={sty.successRow}>
              <Text style={sty.successRowLabel}>Amount</Text>
              <Text style={sty.successRowValue}>{numAmount.toFixed(2)} USDT</Text>
            </View>
            <View style={sty.successRow}>
              <Text style={sty.successRowLabel}>Service fee (5%)</Text>
              <Text style={[sty.successRowValue, { color: "#F59E0B" }]}>-{fee.toFixed(2)} USDT</Text>
            </View>
            <View style={[sty.successRow, { borderBottomWidth: 0 }]}>
              <Text style={sty.successRowLabel}>You receive</Text>
              <Text style={[sty.successRowValue, { color: "#2BD9A8" }]}>{receive.toFixed(2)} USDT</Text>
            </View>
          </View>
          <Pressable style={sty.doneBtn} onPress={() => router.back()}>
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
            <Text style={sty.doneBtnText}>Done</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[sty.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={sty.topBar}>
        <Pressable style={sty.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={sty.topTitle}>Withdraw</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 18, gap: 18, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Chain Transfer badge */}
          <Animated.View entering={FadeInDown.duration(300)} style={{ alignItems: "center" }}>
            <View style={sty.chainBadge}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={50} />
              <Text style={sty.chainBadgeText}>Chain Transfer</Text>
            </View>
          </Animated.View>

          {/* Withdrawal cooldown warning */}
          {isWithdrawalDisabled && (
            <Animated.View entering={FadeInDown.duration(300)} style={sty.disabledBanner}>
              <Feather name="lock" size={16} color="#FF5C5C" />
              <Text style={sty.disabledBannerText}>
                Withdrawals disabled for account security — available in{" "}
                <Text style={{ fontFamily: "Inter_700Bold" }}>~{disabledRemainingHours}h</Text>
              </Text>
            </Animated.View>
          )}

          {/* Min-address warning */}
          {!isWithdrawalDisabled && savedAddresses.length < 2 && !loadingAddresses && (
            <Animated.View entering={FadeInDown.duration(300)} style={sty.warnBanner}>
              <Feather name="alert-circle" size={15} color="#F0B90B" />
              <Text style={sty.warnBannerText}>
                Set at least 2 withdrawal network addresses to withdraw.{" "}
              </Text>
              <Pressable onPress={() => router.push("/withdrawal-links")}>
                <Text style={sty.warnBannerLink}>Set now</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Network selector (shows saved addresses as tappable cards) */}
          {savedAddresses.length > 0 && (
            <Animated.View entering={FadeInDown.duration(330).delay(20)} style={sty.section}>
              <Text style={sty.sectionLabel}>Select Network</Text>
              <View style={sty.networkGrid}>
                {savedAddresses.map((addr) => {
                  const info = NETWORK_INFO[addr.network] ?? { label: addr.network, color: "#9CA3AF", bg: "#F3F4F6", letter: addr.network[0] };
                  const isSelected = selectedNetwork === addr.network;
                  return (
                    <Pressable
                      key={addr.network}
                      style={[
                        sty.networkCard,
                        { borderColor: isSelected ? info.color : Colors.border },
                        isSelected && { backgroundColor: info.bg },
                      ]}
                      onPress={() => handleSelectNetwork(addr.network)}
                    >
                      <View style={[sty.networkDot, { backgroundColor: info.bg, borderWidth: 1.5, borderColor: info.color + "55" }]}>
                        <Text style={[sty.networkDotLetter, { color: info.color }]}>{info.letter}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[sty.networkCardLabel, isSelected && { color: info.color }]} numberOfLines={1}>{info.label}</Text>
                        <Text style={sty.networkCardSub} numberOfLines={1}>
                          {addr.address.slice(0, 6)}…{addr.address.slice(-4)}
                        </Text>
                      </View>
                      {isSelected && <Feather name="check-circle" size={16} color={info.color} />}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Withdraw Address */}
          <Animated.View entering={FadeInDown.duration(330).delay(40)} style={sty.section}>
            <Text style={sty.sectionLabel}>Withdraw Address</Text>
            <TextInput
              style={sty.addressInput}
              placeholder="Please enter or select address above"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Animated.View>

          {/* Amount */}
          <Animated.View entering={FadeInDown.duration(330).delay(80)} style={sty.section}>
            <Text style={sty.sectionLabel}>Amount</Text>
            <View style={sty.amountRow}>
              <TextInput
                style={sty.amountInput}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <View style={sty.amountDivider} />
              <Text style={sty.amountUnit}>USDT</Text>
              <View style={sty.amountDivider2} />
              <Pressable onPress={handleAllWithdraw}>
                <Text style={sty.allWithdrawText}>All Withdraw</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Info card */}
          <Animated.View entering={FadeInDown.duration(330).delay(120)} style={sty.infoCard}>
            <View style={sty.infoRow}>
              <Text style={sty.infoLabel}>Available Balance</Text>
              <Text style={sty.infoValue}>{balance.toFixed(2)}</Text>
            </View>
            <View style={sty.infoRow}>
              <Text style={sty.infoLabel}>Minimum Withdrawal</Text>
              <Text style={sty.infoValue}>{MIN_WITHDRAWAL} USDT</Text>
            </View>
            <View style={[sty.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={sty.infoLabel}>Service fee (5%)</Text>
              <Text style={[sty.infoValue, numAmount > 0 && { color: "#F59E0B" }]}>
                {numAmount > 0 ? `${fee.toFixed(2)} USDT` : "0 USDT"}
              </Text>
            </View>
            {numAmount > 0 && (
              <View style={sty.receiveRow}>
                <Text style={sty.receiveLabel}>You receive</Text>
                <Text style={sty.receiveValue}>{receive.toFixed(2)} USDT</Text>
              </View>
            )}
          </Animated.View>

          {/* Email verification */}
          <Animated.View entering={FadeInDown.duration(330).delay(160)} style={sty.section}>
            <Text style={sty.sectionLabel}>Email Verification</Text>
            <View style={sty.codeRow}>
              <TextInput
                style={sty.codeInput}
                placeholder="Email verification code"
                placeholderTextColor="#9CA3AF"
                value={emailCode}
                onChangeText={setEmailCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Pressable
                style={[sty.getCodeBtn, codeCooldown > 0 && sty.getCodeBtnDisabled]}
                onPress={handleGetCode}
                disabled={sendingCode || codeCooldown > 0}
              >
                {sendingCode
                  ? <ActivityIndicator size="small" color="#5CBFFE" />
                  : <Text style={[sty.getCodeText, codeCooldown > 0 && { color: Colors.textMuted }]}>
                      {codeCooldown > 0 ? `${codeCooldown}s` : "Get"}
                    </Text>
                }
              </Pressable>
            </View>
            {codeSent && (
              <Text style={sty.codeSentHint}>Code sent to {user?.email}</Text>
            )}
          </Animated.View>

          {/* Google Verification */}
          <Animated.View entering={FadeInDown.duration(330).delay(200)} style={sty.section}>
            <Text style={sty.sectionLabel}>Google Verification</Text>
            <TextInput
              style={sty.addressInput}
              placeholder="Enter Google Authenticator code"
              placeholderTextColor="#9CA3AF"
              value={twoFaCode}
              onChangeText={setTwoFaCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </Animated.View>

          {/* Rules */}
          <Animated.View entering={FadeInDown.duration(330).delay(240)} style={sty.rulesCard}>
            <Text style={sty.rulesTitle}>Withdrawal rules:</Text>
            <Text style={sty.rulesText}>
              The second withdrawal can only be initiated after the first withdrawal has been credited.
            </Text>
            <Text style={sty.rulesText}>
              Funds will be credited within 96 hours of withdrawal.
            </Text>
            <Text style={sty.rulesText}>
              A 5% service fee is deducted from the withdrawal amount.
            </Text>
            <Text style={sty.rulesText}>
              Withdrawals require at least 2 saved network addresses.
            </Text>
          </Animated.View>

          {/* Buttons */}
          <Animated.View entering={FadeInDown.duration(330).delay(280)} style={sty.btnRow}>
            <Pressable style={sty.cancelBtn} onPress={() => router.back()}>
              <Text style={sty.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sty.submitBtn, isWithdrawalDisabled && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={sty.submitBtnText}>Submit</Text>
              }
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const sty = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.offWhite, alignItems: "center", justifyContent: "center",
  },
  topTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },

  chainBadge: {
    height: 38, paddingHorizontal: 28, borderRadius: 50,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
  },
  chainBadgeText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },

  disabledBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF1F1", borderRadius: 12,
    borderWidth: 1, borderColor: "#FFCDD2",
    paddingHorizontal: 14, paddingVertical: 11,
  },
  disabledBannerText: {
    flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#C62828", lineHeight: 19,
  },

  warnBanner: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6,
    backgroundColor: "#FFFBEB", borderRadius: 12,
    borderWidth: 1, borderColor: "#FDE68A",
    paddingHorizontal: 14, paddingVertical: 11,
  },
  warnBannerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#92400E", flex: 1 },
  warnBannerLink: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#5CBFFE" },

  section: { gap: 10 },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },

  networkGrid: { gap: 10 },
  networkCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  networkDot: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
  networkDotLetter: { fontSize: 17, fontFamily: "Inter_700Bold" },
  networkCardLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  networkCardSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },

  addressInput: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textPrimary,
  },

  amountRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, height: 52,
    gap: 10,
  },
  amountInput: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  amountDivider: { width: 1, height: 22, backgroundColor: Colors.border },
  amountUnit: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  amountDivider2: { width: 1, height: 22, backgroundColor: "#5CBFFE", opacity: 0.4 },
  allWithdrawText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#5CBFFE" },

  infoCard: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingTop: 4,
  },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  receiveRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingTop: 10, paddingBottom: 14,
  },
  receiveLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  receiveValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#2BD9A8" },

  codeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  codeInput: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textPrimary,
  },
  getCodeBtn: {
    minWidth: 58, height: 50, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#5CBFFE",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 12, backgroundColor: "#fff",
  },
  getCodeBtnDisabled: { borderColor: Colors.border },
  getCodeText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#5CBFFE" },
  codeSentHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#2BD9A8", marginTop: 2 },

  rulesCard: {
    backgroundColor: "#F1F5F9", borderRadius: 14,
    padding: 16, gap: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  rulesTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  rulesText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 18 },

  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1, height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff",
  },
  cancelBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  submitBtn: {
    flex: 1, height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
  },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  successWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 20,
  },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
  },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  successSub: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    textAlign: "center", lineHeight: 22,
  },
  successInfoCard: {
    width: "100%", backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 18,
  },
  successRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  successRowLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  successRowValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  doneBtn: {
    width: "100%", height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
  },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
