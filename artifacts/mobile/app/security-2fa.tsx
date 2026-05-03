import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/authApi";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];
const BLUE = "#5CBFFE";

type Step = "status" | "setup-qr" | "setup-verify" | "disable";

export default function Security2FAScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [step, setStep] = useState<Step>("status");
  const [enabled, setEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Setup flow
  const [qrUri, setQrUri] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [verifyCode, setVerifyCode] = useState(["", "", "", "", "", ""]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const verifyRefs = useRef<(TextInput | null)[]>([]);

  // Disable flow
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState(["", "", "", "", "", ""]);
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const disableRefs = useRef<(TextInput | null)[]>([]);

  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const { enabled: isEnabled } = await authApi.twofa.getStatus(token);
        setEnabled(isEnabled);
      } catch {
        setEnabled(false);
      } finally {
        setLoadingStatus(false);
      }
    })();
  }, [token]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function fillCode(
    val: string,
    idx: number,
    arr: string[],
    setArr: (a: string[]) => void,
    refs: React.MutableRefObject<(TextInput | null)[]>
  ) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...arr];
    next[idx] = digit;
    setArr(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  }

  function backspaceCode(
    e: any,
    idx: number,
    arr: string[],
    refs: React.MutableRefObject<(TextInput | null)[]>
  ) {
    if (e.nativeEvent.key === "Backspace" && !arr[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  }

  async function copyKey() {
    await Clipboard.setStringAsync(manualKey.replace(/ /g, ""));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  // ── Start setup ──────────────────────────────────────────────────────────────

  async function startSetup() {
    if (!token) return;
    setLoadingSetup(true);
    try {
      const data = await authApi.twofa.setup(token);
      setQrUri(data.qrDataUri);
      setManualKey(data.manualKey);
      setStep("setup-qr");
    } catch (err) {
      // already enabled or column missing — just stay on status
    } finally {
      setLoadingSetup(false);
    }
  }

  // ── Enable after scanning ────────────────────────────────────────────────────

  async function handleEnable() {
    const codeStr = verifyCode.join("");
    if (codeStr.length !== 6) { setVerifyError("Enter all 6 digits."); return; }
    if (!token) return;
    setVerifyError("");
    setVerifyLoading(true);
    try {
      await authApi.twofa.enable(token, codeStr);
      setEnabled(true);
      setStep("status");
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Invalid code.");
      setVerifyCode(["", "", "", "", "", ""]);
      setTimeout(() => verifyRefs.current[0]?.focus(), 50);
    } finally {
      setVerifyLoading(false);
    }
  }

  // ── Disable ──────────────────────────────────────────────────────────────────

  async function handleDisable() {
    const codeStr = disableCode.join("");
    if (!disablePassword) { setDisableError("Enter your password."); return; }
    if (codeStr.length !== 6) { setDisableError("Enter the 6-digit authenticator code."); return; }
    if (!token) return;
    setDisableError("");
    setDisableLoading(true);
    try {
      await authApi.twofa.disable(token, disablePassword, codeStr);
      setEnabled(false);
      setDisablePassword("");
      setDisableCode(["", "", "", "", "", ""]);
      setStep("status");
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : "Failed. Check your password and code.");
      setDisableCode(["", "", "", "", "", ""]);
      setTimeout(() => disableRefs.current[0]?.focus(), 50);
    } finally {
      setDisableLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable style={s.backBtn} onPress={() => {
              if (step === "setup-qr" || step === "setup-verify" || step === "disable") {
                setStep("status");
                setVerifyError("");
                setDisableError("");
                setVerifyCode(["", "", "", "", "", ""]);
                setDisableCode(["", "", "", "", "", ""]);
              } else {
                router.canGoBack() ? router.back() : router.replace("/(tabs)/");
              }
            }}>
              <Feather name="chevron-left" size={24} color="#1A1A2E" />
            </Pressable>
            <Text style={s.headerTitle}>
              {step === "setup-qr"      ? "Scan QR Code" :
               step === "setup-verify"  ? "Verify Setup" :
               step === "disable"       ? "Disable 2FA"  :
               "Two-Factor Auth"}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* ── STATUS / TOGGLE ── */}
          {step === "status" && (
            <>
              {loadingStatus ? (
                <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
              ) : (
                <>
                  <View style={s.shieldWrap}>
                    <LinearGradient
                      colors={enabled ? ["#2BD9A822", "#5CBFFE22"] : ["#F3F4F6", "#E5E7EB"]}
                      style={s.shieldBg}
                    >
                      <Feather
                        name="shield"
                        size={48}
                        color={enabled ? "#2BD9A8" : "#9CA3AF"}
                      />
                    </LinearGradient>
                    <Text style={[s.statusLabel, enabled && s.statusLabelOn]}>
                      {enabled ? "2FA Enabled" : "2FA Disabled"}
                    </Text>
                    <Text style={s.statusSub}>
                      {enabled
                        ? "Your account is protected with Google Authenticator."
                        : "Add an extra layer of security to your account."}
                    </Text>
                  </View>

                  {/* Toggle row */}
                  <View style={s.toggleCard}>
                    <View style={s.toggleRow}>
                      <View style={s.toggleLeft}>
                        <Feather name="smartphone" size={20} color={BLUE} />
                        <View>
                          <Text style={s.toggleTitle}>Google Authenticator</Text>
                          <Text style={s.toggleSub}>
                            {enabled ? "Tap to disable 2FA" : "Tap to enable 2FA"}
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={enabled}
                        onValueChange={(v) => {
                          if (v) startSetup();
                          else setStep("disable");
                        }}
                        trackColor={{ false: "#E5E8EE", true: "#2BD9A8" }}
                        thumbColor="#fff"
                        disabled={loadingSetup}
                      />
                    </View>
                    {loadingSetup && <ActivityIndicator color={BLUE} style={{ marginTop: 12 }} />}
                  </View>

                  {/* Info boxes */}
                  <View style={s.infoCard}>
                    <View style={s.infoRow}>
                      <View style={[s.infoDot, { backgroundColor: "#5CBFFE" }]} />
                      <Text style={s.infoText}>Requires a code from your phone every login</Text>
                    </View>
                    <View style={s.infoRow}>
                      <View style={[s.infoDot, { backgroundColor: "#2BD9A8" }]} />
                      <Text style={s.infoText}>Works offline — no internet needed for codes</Text>
                    </View>
                    <View style={s.infoRow}>
                      <View style={[s.infoDot, { backgroundColor: "#FFB08A" }]} />
                      <Text style={s.infoText}>Codes refresh every 30 seconds automatically</Text>
                    </View>
                  </View>
                </>
              )}
            </>
          )}

          {/* ── SETUP: SCAN QR ── */}
          {step === "setup-qr" && (
            <>
              <Text style={s.stepHeading}>1. Install the app</Text>
              <Text style={s.stepSub}>
                Download <Text style={{ fontWeight: "700" }}>Google Authenticator</Text> from the
                App Store or Play Store if you haven't already.
              </Text>

              <Text style={s.stepHeading}>2. Scan this QR code</Text>
              <Text style={s.stepSub}>Open the app, tap the + button, and scan this code.</Text>

              {qrUri ? (
                <View style={s.qrWrap}>
                  <Image source={{ uri: qrUri }} style={s.qrImage} contentFit="contain" />
                </View>
              ) : (
                <ActivityIndicator color={BLUE} style={{ marginVertical: 40 }} />
              )}

              {/* Manual key */}
              <Text style={s.manualLabel}>Or enter the key manually:</Text>
              <Pressable style={s.manualBox} onPress={copyKey}>
                <Text style={s.manualKey}>{manualKey}</Text>
                <Feather
                  name={copiedKey ? "check" : "copy"}
                  size={16}
                  color={copiedKey ? "#2BD9A8" : "#9CA3AF"}
                />
              </Pressable>
              {copiedKey && <Text style={s.copiedNote}>Key copied!</Text>}

              <Pressable
                style={s.btnWrap}
                onPress={() => { setStep("setup-verify"); setTimeout(() => verifyRefs.current[0]?.focus(), 100); }}
              >
                <LinearGradient colors={GRAD} style={s.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.btnText}>I've scanned it — Next</Text>
                </LinearGradient>
              </Pressable>
            </>
          )}

          {/* ── SETUP: VERIFY ── */}
          {step === "setup-verify" && (
            <>
              <View style={s.shieldWrap}>
                <LinearGradient colors={["#5CBFFE22", "#2BD9A822"]} style={s.shieldBg}>
                  <Feather name="check-circle" size={44} color={BLUE} />
                </LinearGradient>
              </View>

              <Text style={s.stepHeading}>3. Enter the 6-digit code</Text>
              <Text style={s.stepSub}>
                Open Google Authenticator and type the current code shown for Apex.
              </Text>

              {!!verifyError && (
                <View style={s.errorBox}>
                  <Feather name="alert-circle" size={15} color="#E53935" />
                  <Text style={s.errorText}>{verifyError}</Text>
                </View>
              )}

              <View style={s.codeRow}>
                {verifyCode.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => { verifyRefs.current[i] = r; }}
                    style={[s.codeBox, d && s.codeBoxFilled]}
                    value={d}
                    onChangeText={(v) => fillCode(v, i, verifyCode, setVerifyCode, verifyRefs)}
                    onKeyPress={(e) => backspaceCode(e, i, verifyCode, verifyRefs)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>
              <Text style={s.codeHint}>Codes refresh every 30 seconds</Text>

              <Pressable
                style={[s.btnWrap, (verifyLoading || verifyCode.join("").length !== 6) && { opacity: 0.6 }]}
                onPress={handleEnable}
                disabled={verifyLoading || verifyCode.join("").length !== 6}
              >
                <LinearGradient colors={GRAD} style={s.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {verifyLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>Activate 2FA</Text>}
                </LinearGradient>
              </Pressable>

              <Pressable style={s.linkBtn} onPress={() => setStep("setup-qr")}>
                <Feather name="arrow-left" size={14} color={BLUE} />
                <Text style={s.linkBtnText}>Back to QR code</Text>
              </Pressable>
            </>
          )}

          {/* ── DISABLE ── */}
          {step === "disable" && (
            <>
              <View style={s.shieldWrap}>
                <LinearGradient colors={["#FEF2F2", "#FEE2E2"]} style={s.shieldBg}>
                  <Feather name="shield-off" size={44} color="#E53935" />
                </LinearGradient>
              </View>

              <Text style={s.stepHeading}>Disable Two-Factor Auth</Text>
              <Text style={s.stepSub}>
                Enter your account password and the current authenticator code to confirm.
              </Text>

              {!!disableError && (
                <View style={s.errorBox}>
                  <Feather name="alert-circle" size={15} color="#E53935" />
                  <Text style={s.errorText}>{disableError}</Text>
                </View>
              )}

              <Text style={s.fieldLabel}>Account Password</Text>
              <View style={s.pwBox}>
                <Feather name="lock" size={18} color="#B0B7C3" style={{ marginLeft: 14, marginRight: 4 }} />
                <TextInput
                  style={s.pwInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#C4CAD4"
                  value={disablePassword}
                  onChangeText={setDisablePassword}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                />
                <Pressable style={s.eyeBtn} onPress={() => setShowPw((v) => !v)}>
                  <Feather name={showPw ? "eye" : "eye-off"} size={18} color="#B0B7C3" />
                </Pressable>
              </View>

              <Text style={[s.fieldLabel, { marginTop: 18 }]}>Authenticator Code</Text>
              <View style={s.codeRow}>
                {disableCode.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => { disableRefs.current[i] = r; }}
                    style={[s.codeBox, d && s.codeBoxFilled]}
                    value={d}
                    onChangeText={(v) => fillCode(v, i, disableCode, setDisableCode, disableRefs)}
                    onKeyPress={(e) => backspaceCode(e, i, disableCode, disableRefs)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <Pressable
                style={[s.btnWrap, s.dangerBtn, (disableLoading || !disablePassword || disableCode.join("").length !== 6) && { opacity: 0.6 }]}
                onPress={handleDisable}
                disabled={disableLoading || !disablePassword || disableCode.join("").length !== 6}
              >
                {disableLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>Disable 2FA</Text>}
              </Pressable>

              <Pressable style={s.linkBtn} onPress={() => { setStep("status"); setDisableError(""); }}>
                <Text style={s.linkBtnText}>Cancel</Text>
              </Pressable>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#F8F9FB" },
  scroll: { paddingHorizontal: 24 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 28,
  },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E8EE" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E" },

  shieldWrap: { alignItems: "center", marginBottom: 24 },
  shieldBg: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  statusLabel: { fontSize: 18, fontWeight: "700", color: "#6B7280", marginTop: 12, marginBottom: 6 },
  statusLabelOn: { color: "#2BD9A8" },
  statusSub: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 19 },

  toggleCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: "#E5E8EE",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
    marginBottom: 16,
  },
  toggleRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A2E", marginBottom: 2 },
  toggleSub:   { fontSize: 12, color: "#6B7280" },

  infoCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: "#E5E8EE", gap: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoDot: { width: 8, height: 8, borderRadius: 4 },
  infoText: { fontSize: 13, color: "#4B5563", lineHeight: 18, flex: 1 },

  stepHeading: { fontSize: 16, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  stepSub: { fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 24 },

  qrWrap: {
    alignSelf: "center", backgroundColor: "#fff", borderRadius: 20,
    padding: 20, marginBottom: 24,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  qrImage: { width: 220, height: 220 },

  manualLabel: { fontSize: 13, color: "#6B7280", marginBottom: 10 },
  manualBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#E5E8EE", marginBottom: 4,
  },
  manualKey: { fontSize: 14, fontWeight: "600", color: "#1A1A2E", letterSpacing: 1.5, flex: 1 },
  copiedNote: { fontSize: 12, color: "#2BD9A8", marginBottom: 16, fontWeight: "600" },

  codeRow: { flexDirection: "row", gap: 9, justifyContent: "center", marginBottom: 8 },
  codeBox: {
    width: 44, height: 56, borderRadius: 12, borderWidth: 1.5,
    borderColor: "#E5E8EE", backgroundColor: "#fff", textAlign: "center",
    fontSize: 22, fontWeight: "700", color: "#1A1A2E",
  },
  codeBoxFilled: { borderColor: "#5CBFFE", backgroundColor: "#EBF8FF" },
  codeHint: { fontSize: 12, color: "#9CA3AF", textAlign: "center", marginBottom: 28 },

  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#3D4A5C", marginBottom: 8 },
  pwBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 12, borderWidth: 1, borderColor: "#E5E8EE", height: 52, marginBottom: 16,
  },
  pwInput: { flex: 1, color: "#1A1A2E", fontSize: 15, paddingHorizontal: 10, height: "100%" },
  eyeBtn:  { position: "absolute", right: 14 },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: "#FECACA",
  },
  errorText: { color: "#E53935", fontSize: 13, flex: 1 },

  btnWrap:   { borderRadius: 14, overflow: "hidden", marginTop: 8, marginBottom: 16 },
  btn:       { height: 54, alignItems: "center", justifyContent: "center" },
  btnText:   { color: "#fff", fontSize: 16, fontWeight: "700" },
  dangerBtn: { backgroundColor: "#E53935", borderRadius: 14 },

  linkBtn:     { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", padding: 8 },
  linkBtnText: { color: BLUE, fontSize: 14, fontWeight: "600" },
});
