import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/authApi";
import { WithdrawalLinksSkeleton } from "@/components/Skeleton";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

const NETWORKS = [
  { key: "TRC20",   label: "USDT (TRC-20)",          subtitle: "TRON Network",    color: "#E84141", bg: "#FFF1F1", letter: "T" },
  { key: "BEP20",   label: "USDT (BEP-20)",          subtitle: "BNB Smart Chain", color: "#F0B90B", bg: "#FFFBEB", letter: "B" },
  { key: "POLYGON", label: "NFT Transfer (Polygon)", subtitle: "Polygon Network", color: "#8247E5", bg: "#F5F0FF", letter: "P" },
  { key: "SOL",     label: "USDT (Solana)",          subtitle: "Solana Network",  color: "#14F195", bg: "#EDFFF9", letter: "S" },
];

type Step = "list" | "sure_popup" | "change_form" | "success";

interface SavedAddress {
  network: string;
  address: string;
  updated_at: string;
}

function maskAddress(addr: string): string {
  if (!addr) return "";
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

export default function WithdrawalLinksScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, token } = useAuth();

  const [step, setStep]           = useState<Step>("list");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading]     = useState(true);

  const [formAddress,   setFormAddress]   = useState("");
  const [formPassword,  setFormPassword]  = useState("");
  const [formEmailCode, setFormEmailCode] = useState("");
  const [formTwoFa,     setFormTwoFa]     = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [sendingCode,   setSendingCode]   = useState(false);
  const [codeSent,      setCodeSent]      = useState(false);
  const [codeCooldown,  setCodeCooldown]  = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAddresses = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await authApi.withdrawAddresses.get(token);
      setSavedAddresses(data.addresses ?? []);
    } catch {
      // silent — table may not exist yet; show empty state
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  const getAddress = (key: string) =>
    savedAddresses.find((a) => a.network === key)?.address ?? "";

  const editingNetwork = NETWORKS.find((n) => n.key === editingKey);

  const openSurePopup = (key: string) => {
    setEditingKey(key);
    setStep("sure_popup");
  };

  const openChangeForm = () => {
    setFormAddress(getAddress(editingKey!));
    setFormPassword("");
    setFormEmailCode("");
    setFormTwoFa("");
    setCodeSent(false);
    setCodeCooldown(0);
    if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; }
    setStep("change_form");
  };

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

  const handleConfirm = async () => {
    if (!formAddress.trim() || formAddress.trim().length < 10) {
      Alert.alert("Invalid address", "Please enter a valid wallet address (at least 10 characters).");
      return;
    }
    if (!formPassword.trim()) {
      Alert.alert("Missing field", "Please enter your login password.");
      return;
    }
    if (!formEmailCode.trim()) {
      Alert.alert("Missing field", "Please enter the email verification code.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.withdrawAddresses.set(token!, {
        network:    editingKey!,
        address:    formAddress.trim(),
        password:   formPassword,
        email_code: formEmailCode.trim(),
        twofa_code: formTwoFa.trim() || undefined,
      });
      await loadAddresses();
      setStep("success");
    } catch (e: any) {
      Alert.alert("Failed", e.message ?? "Could not save address. Check your password and codes.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    setStep("list");
    setEditingKey(null);
  };

  const savedCount = NETWORKS.filter((n) => getAddress(n.key)).length;

  return (
    <View style={[sty.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={sty.topBar}>
        <Pressable style={sty.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={sty.topTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <WithdrawalLinksSkeleton />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={sty.listContent}
        >
          {/* Status banner */}
          {savedCount < 2 && (
            <Animated.View entering={FadeIn.duration(400)} style={sty.infoBanner}>
              <Feather name="info" size={14} color="#5CBFFE" style={{ marginTop: 1 }} />
              <Text style={sty.infoBannerText}>
                Set at least <Text style={{ fontFamily: "Inter_700Bold" }}>2 withdrawal addresses</Text> to enable withdrawals.
                ({savedCount}/2 set)
              </Text>
            </Animated.View>
          )}

          {NETWORKS.map((net, i) => {
            const saved = getAddress(net.key);
            return (
              <Animated.View
                key={net.key}
                entering={FadeInDown.duration(350).delay(i * 60)}
                style={sty.networkCard}
              >
                {/* Card header */}
                <View style={sty.cardHeader}>
                  <View style={[sty.networkIcon, { backgroundColor: net.bg }]}>
                    <Text style={[sty.networkIconLetter, { color: net.color }]}>{net.letter}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={sty.networkName}>{net.label}</Text>
                    <Text style={sty.networkSubtitle}>{net.subtitle}</Text>
                  </View>
                  {saved && (
                    <View style={sty.savedDot} />
                  )}
                </View>

                {/* Address display + edit icon */}
                <Text style={sty.addrLabel}>Address</Text>
                <View style={sty.addrBox}>
                  <Text
                    style={[sty.addrText, !saved && sty.addrTextEmpty]}
                    numberOfLines={1}
                  >
                    {saved ? maskAddress(saved) : ""}
                  </Text>
                  <Pressable style={sty.editIconBtn} onPress={() => openSurePopup(net.key)}>
                    <Feather name="edit-2" size={17} color={Colors.textSecondary} />
                  </Pressable>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      {/* ── "Are you sure?" confirmation modal ── */}
      <Modal visible={step === "sure_popup"} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setStep("list")}>
        <View style={sty.overlay}>
          <Animated.View entering={FadeIn.duration(200)} style={sty.popupCard}>
            <View style={sty.warningIconWrap}>
              <Feather name="alert-triangle" size={26} color="#F0B90B" />
            </View>
            <Text style={sty.popupTitle}>Change address?</Text>
            <Text style={sty.popupBody}>
              After changing this address, the withdrawal service will be{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FF5C5C" }}>disabled for 72 hours</Text>{" "}
              to protect your account.
            </Text>
            <View style={sty.popupBtnRow}>
              <Pressable style={sty.popupCancelBtn} onPress={() => setStep("list")}>
                <Text style={sty.popupCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={sty.popupConfirmBtn} onPress={openChangeForm}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={12} />
                <Text style={sty.popupConfirmText}>Continue</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Change Address form (bottom sheet style) ── */}
      <Modal visible={step === "change_form"} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setStep("list")}>
        <View style={sty.sheetOverlay}>
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: "flex-end" }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Animated.View entering={FadeInDown.duration(280)} style={sty.sheet}>
              {/* Sheet header */}
              <View style={sty.sheetHeader}>
                <Text style={sty.sheetTitle}>Change address</Text>
                <Pressable style={sty.closeBtn} onPress={() => setStep("list")}>
                  <View style={sty.closeBtnInner}>
                    <Feather name="x" size={18} color={Colors.textSecondary} />
                  </View>
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={sty.sheetScroll}
                keyboardShouldPersistTaps="handled"
              >
                {/* Warning banner */}
                <View style={sty.warnBox}>
                  <Text style={sty.warnText}>
                    After changing this setting, the withdrawal service will be disabled for{" "}
                    <Text style={{ fontFamily: "Inter_600SemiBold" }}>72 hours</Text>{" "}
                    to protect your account.
                  </Text>
                </View>

                {/* Network tag */}
                {editingNetwork && (
                  <View style={[sty.networkTag, { backgroundColor: editingNetwork.bg, borderColor: editingNetwork.color + "33" }]}>
                    <View style={[sty.networkTagIcon, { backgroundColor: editingNetwork.color + "22" }]}>
                      <Text style={[sty.networkTagLetter, { color: editingNetwork.color }]}>{editingNetwork.letter}</Text>
                    </View>
                    <Text style={[sty.networkTagLabel, { color: editingNetwork.color }]}>{editingNetwork.label}</Text>
                  </View>
                )}

                {/* Wallet address */}
                <View style={sty.fieldWrap}>
                  <Text style={sty.fieldLabel}>wallet address</Text>
                  <TextInput
                    style={sty.fieldInput}
                    placeholder="Enter wallet address"
                    placeholderTextColor="#9CA3AF"
                    value={formAddress}
                    onChangeText={setFormAddress}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Login password */}
                <View style={sty.fieldWrap}>
                  <Text style={sty.fieldLabel}>Login password</Text>
                  <TextInput
                    style={sty.fieldInput}
                    placeholder="Enter your login password"
                    placeholderTextColor="#9CA3AF"
                    value={formPassword}
                    onChangeText={setFormPassword}
                    secureTextEntry
                  />
                </View>

                {/* Email code */}
                <View style={sty.fieldWrap}>
                  <Text style={sty.fieldLabel}>Email code</Text>
                  <View style={sty.codeRow}>
                    <TextInput
                      style={sty.codeInput}
                      placeholder="Email verification code"
                      placeholderTextColor="#9CA3AF"
                      value={formEmailCode}
                      onChangeText={setFormEmailCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <Pressable
                      style={[sty.getCodeBtn, codeCooldown > 0 && sty.getCodeBtnDim]}
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
                </View>

                {/* Google Verification */}
                <View style={sty.fieldWrap}>
                  <Text style={sty.fieldLabel}>Google Verification</Text>
                  <TextInput
                    style={sty.fieldInput}
                    placeholder="Authenticator code (leave blank if not enabled)"
                    placeholderTextColor="#9CA3AF"
                    value={formTwoFa}
                    onChangeText={setFormTwoFa}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                {/* Confirm button */}
                <Pressable style={sty.confirmBtn} onPress={handleConfirm} disabled={submitting}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={16} />
                  {submitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={sty.confirmBtnText}>Confirm</Text>
                  }
                </Pressable>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Success modal ── */}
      <Modal visible={step === "success"} transparent animationType="fade" statusBarTranslucent onRequestClose={handleDone}>
        <View style={sty.overlay}>
          <Animated.View entering={FadeIn.duration(300)} style={sty.popupCard}>
            <View style={sty.successCircle}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={32} />
              <Feather name="check" size={30} color="#fff" />
            </View>
            <Text style={sty.popupTitle}>Address Saved!</Text>
            <Text style={sty.popupBody}>
              Your withdrawal address has been updated successfully.{"\n\n"}
              Withdrawals are now{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FF5C5C" }}>disabled for 72 hours</Text>{" "}
              to protect your account.
            </Text>
            <Pressable style={sty.doneBtn} onPress={handleDone}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
              <Text style={sty.confirmBtnText}>Done</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const sty = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#F8FAFC" },

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

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  listContent: { padding: 16, gap: 14, paddingBottom: 60 },

  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#EFF8FF", borderRadius: 12,
    borderWidth: 1, borderColor: "#BDE3FF",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  infoBannerText: {
    flex: 1, fontSize: 13, fontFamily: "Inter_400Regular",
    color: "#1A6FA8", lineHeight: 19,
  },

  networkCard: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    gap: 10,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  networkIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  networkIconLetter: { fontSize: 20, fontFamily: "Inter_700Bold" },
  networkName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  networkSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  savedDot: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: "#2BD9A8",
  },

  addrLabel: {
    fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary,
    marginBottom: 4,
  },
  addrBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F8FAFC", borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, height: 50,
  },
  addrText: {
    flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textPrimary,
  },
  addrTextEmpty: { color: "#C9D3DF" },
  editIconBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
  },

  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 28,
  },
  popupCard: {
    width: "100%", backgroundColor: "#fff", borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 28,
    alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 15,
  },
  warningIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#FFF8E1",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  popupTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, textAlign: "center" },
  popupBody: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    textAlign: "center", lineHeight: 20,
  },
  popupBtnRow: { flexDirection: "row", gap: 12, width: "100%", marginTop: 6 },
  popupCancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff",
  },
  popupCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  popupConfirmBtn: {
    flex: 1, height: 48, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
  },
  popupConfirmText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },

  successCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
    marginBottom: 4,
  },
  doneBtn: {
    width: "100%", height: 50, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
    marginTop: 6,
  },

  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "90%",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    position: "relative",
  },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  closeBtn: { position: "absolute", right: 16 },
  closeBtnInner: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.offWhite,
    alignItems: "center", justifyContent: "center",
  },
  sheetScroll: { padding: 20, gap: 16, paddingBottom: 40 },

  warnBox: {
    backgroundColor: "#F8F9FB", borderRadius: 12,
    borderWidth: 1, borderColor: "#E5E9F0",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  warnText: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, lineHeight: 19,
  },

  networkTag: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: "flex-start",
  },
  networkTagIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  networkTagLetter: { fontSize: 13, fontFamily: "Inter_700Bold" },
  networkTagLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  fieldInput: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textPrimary,
  },

  codeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  codeInput: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textPrimary,
  },
  getCodeBtn: {
    minWidth: 60, height: 50, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#5CBFFE",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 12, backgroundColor: "#fff",
  },
  getCodeBtnDim: { borderColor: Colors.border },
  getCodeText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#5CBFFE" },
  codeSentHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#2BD9A8" },

  confirmBtn: {
    height: 52, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
    marginTop: 4,
  },
  confirmBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
