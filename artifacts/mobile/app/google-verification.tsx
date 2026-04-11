import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/authApi";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];
const BLUE = "#5CBFFE";
const TEAL = "#2BD9A8";

type Step = "status" | "setup" | "enable" | "done" | "disable";

export default function GoogleVerificationScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { token, user } = useAuth();

  const [step,       setStep]       = useState<Step>("status");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [enabled,    setEnabled]    = useState(false);
  const [qrDataUri,  setQrDataUri]  = useState("");
  const [manualKey,  setManualKey]  = useState("");
  const [code,       setCode]       = useState(["", "", "", "", "", ""]);
  const [disablePw,  setDisablePw]  = useState("");
  const [showDsPw,   setShowDsPw]   = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // ── Load status on mount ───────────────────────────────────────────────────
  React.useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const st = await authApi.twofa.getStatus(token);
        setEnabled(st.enabled);
        setStep(st.enabled ? "done" : "status");
      } catch {
        setStep("status");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ── Code input helpers ─────────────────────────────────────────────────────
  const codeStr = code.join("");

  function handleCodeChange(val: string, idx: number) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handleCodeKeyPress(e: any, idx: number) {
    if (e.nativeEvent.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function resetCode() { setCode(["", "", "", "", "", ""]); }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleSetup() {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const res = await authApi.twofa.setup(token);
      setQrDataUri(res.qrDataUri);
      setManualKey(res.manualKey);
      setStep("setup");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start setup.");
    } finally { setLoading(false); }
  }

  async function handleEnable() {
    if (codeStr.length !== 6) { setError("Enter all 6 digits."); return; }
    setLoading(true); setError("");
    try {
      await authApi.twofa.enable(token!, codeStr);
      setEnabled(true);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code.");
      resetCode();
      inputRefs.current[0]?.focus();
    } finally { setLoading(false); }
  }

  async function handleDisable() {
    if (codeStr.length !== 6) { setError("Enter all 6 digits."); return; }
    if (!disablePw) { setError("Enter your password."); return; }
    setLoading(true); setError("");
    try {
      await authApi.twofa.disable(token!, disablePw, codeStr);
      setEnabled(false);
      setStep("status");
      setDisablePw(""); resetCode();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disable 2FA.");
      resetCode();
    } finally { setLoading(false); }
  }

  // ── Shared components ──────────────────────────────────────────────────────
  function CodeInputs({ label }: { label: string }) {
    return (
      <View>
        <Text style={s.codeLabel}>{label}</Text>
        <View style={s.codeRow}>
          {code.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputRefs.current[i] = r; }}
              style={[s.codeBox, d ? s.codeBoxFilled : {}]}
              value={d}
              onChangeText={(v) => handleCodeChange(v, i)}
              onKeyPress={(e) => handleCodeKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </View>
      </View>
    );
  }

  function GradBtn({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
    return (
      <Pressable style={[s.btnWrap, disabled && { opacity: 0.55 }]} onPress={onPress} disabled={disabled || loading}>
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>{label}</Text>
          }
        </LinearGradient>
      </Pressable>
    );
  }

  // ── Header back button ─────────────────────────────────────────────────────
  function Header({ title, onBack }: { title: string; onBack: () => void }) {
    return (
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={s.backBtn} onPress={onBack} hitSlop={12}>
          <Feather name="chevron-left" size={22} color="#1A1A2E" />
        </Pressable>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>
    );
  }

  // ── Loading overlay ────────────────────────────────────────────────────────
  if (loading && step === "status") {
    return (
      <View style={s.root}>
        <Header title="Google Verification" onBack={() => router.back()} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      </View>
    );
  }

  // ── STEP: Status (not enabled) ─────────────────────────────────────────────
  if (step === "status") {
    return (
      <View style={s.root}>
        <Header title="Google Verification" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={[s.scroll, { paddingTop: 16, paddingBottom: insets.bottom + 40 }]}>
          <View style={s.shieldBox}>
            <LinearGradient colors={["#EBF8FF", "#F0FFF4"]} style={StyleSheet.absoluteFill} borderRadius={20} />
            <View style={s.shieldIcon}>
              <LinearGradient colors={[BLUE, TEAL]} style={StyleSheet.absoluteFill} borderRadius={40} />
              <Feather name="shield" size={36} color="#fff" />
            </View>
            <Text style={s.shieldTitle}>Two-Factor Authentication</Text>
            <Text style={s.shieldSub}>
              Add an extra layer of security to your account using Google Authenticator.
            </Text>
            <View style={s.statusBadge}>
              <Feather name="x-circle" size={14} color="#E53935" />
              <Text style={s.statusBadgeText}>Not Enabled</Text>
            </View>
          </View>

          <View style={s.stepCard}>
            <Text style={s.stepCardTitle}>How it works</Text>
            {[
              "Get your secret key and QR code",
              "Open Google Authenticator and scan the QR code (or enter the key manually)",
              "Enter the 6-digit code from the app to verify and activate",
            ].map((text, i) => (
              <View key={i} style={s.stepRow}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={s.stepText}>{text}</Text>
              </View>
            ))}
          </View>

          {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

          <GradBtn label="Set Up Google Authenticator" onPress={handleSetup} />
        </ScrollView>
      </View>
    );
  }

  // ── STEP: Show QR + key ────────────────────────────────────────────────────
  if (step === "setup") {
    return (
      <View style={s.root}>
        <Header title="Scan QR Code" onBack={() => setStep("status")} />
        <ScrollView contentContainerStyle={[s.scroll, { paddingTop: 16, paddingBottom: insets.bottom + 40 }]}>
          <Text style={s.instructions}>
            Open <Text style={{ fontWeight: "700" }}>Google Authenticator</Text>, tap{" "}
            <Text style={{ fontWeight: "700" }}>+</Text> and scan this QR code.
          </Text>

          {qrDataUri ? (
            <View style={s.qrWrapper}>
              <Image source={{ uri: qrDataUri }} style={s.qrImage} resizeMode="contain" />
            </View>
          ) : null}

          <View style={s.manualCard}>
            <Text style={s.manualLabel}>Or enter the key manually:</Text>
            <Text style={s.manualKey} selectable>{manualKey}</Text>
          </View>

          <View style={s.noteBox}>
            <Feather name="alert-circle" size={14} color="#F59E0B" style={{ marginTop: 1 }} />
            <Text style={s.noteText}>
              Save this key in a safe place. You'll need it if you lose access to your phone.
            </Text>
          </View>

          {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

          <GradBtn
            label="I've Added It — Continue"
            onPress={() => { resetCode(); setStep("enable"); }}
          />
        </ScrollView>
      </View>
    );
  }

  // ── STEP: Enter code to enable ─────────────────────────────────────────────
  if (step === "enable") {
    return (
      <View style={s.root}>
        <Header title="Verify Code" onBack={() => setStep("setup")} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={[s.scroll, { paddingTop: 24, paddingBottom: insets.bottom + 40 }]}>
            <Text style={s.instructions}>
              Open <Text style={{ fontWeight: "700" }}>Google Authenticator</Text> and enter the{" "}
              <Text style={{ fontWeight: "700" }}>6-digit code</Text> shown for Apex.
            </Text>

            <CodeInputs label="Enter the 6-digit code" />

            {!!error && <View style={[s.errorBox, { marginTop: 20 }]}><Text style={s.errorText}>{error}</Text></View>}

            <GradBtn label="Verify & Activate 2FA" onPress={handleEnable} disabled={codeStr.length !== 6} />

            <Pressable style={s.backLink} onPress={() => setStep("setup")}>
              <Text style={s.backLinkText}>Back to QR code</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── STEP: Done / Enabled ───────────────────────────────────────────────────
  if (step === "done") {
    return (
      <View style={s.root}>
        <Header title="Google Verification" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={[s.scroll, { paddingTop: 24, paddingBottom: insets.bottom + 40 }]}>
          <View style={s.shieldBox}>
            <LinearGradient colors={["#F0FFF4", "#EBF8FF"]} style={StyleSheet.absoluteFill} borderRadius={20} />
            <View style={[s.shieldIcon, { backgroundColor: "transparent" }]}>
              <LinearGradient colors={[TEAL, BLUE]} style={StyleSheet.absoluteFill} borderRadius={40} />
              <Feather name="shield" size={36} color="#fff" />
            </View>
            <Text style={s.shieldTitle}>2FA is Active</Text>
            <Text style={s.shieldSub}>
              Your account is protected with Google Authenticator. A 6-digit code is required at every login.
            </Text>
            <View style={[s.statusBadge, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
              <Feather name="check-circle" size={14} color="#059669" />
              <Text style={[s.statusBadgeText, { color: "#059669" }]}>Enabled</Text>
            </View>
          </View>

          <Pressable style={s.disableBtn} onPress={() => { resetCode(); setStep("disable"); }}>
            <Feather name="shield-off" size={16} color="#E53935" />
            <Text style={s.disableBtnText}>Disable 2FA</Text>
          </Pressable>

          <Pressable style={s.backLink} onPress={() => router.back()}>
            <Text style={s.backLinkText}>← Back to Settings</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── STEP: Disable ──────────────────────────────────────────────────────────
  if (step === "disable") {
    return (
      <View style={s.root}>
        <Header title="Disable 2FA" onBack={() => setStep("done")} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={[s.scroll, { paddingTop: 24, paddingBottom: insets.bottom + 40 }]}>
            <View style={s.noteBox}>
              <Feather name="alert-circle" size={14} color="#E53935" style={{ marginTop: 1 }} />
              <Text style={[s.noteText, { color: "#E53935" }]}>
                Disabling 2FA will make your account less secure. You must confirm with your password and current code.
              </Text>
            </View>

            <Text style={s.fieldLabel}>Current Password</Text>
            <View style={s.passwordBox}>
              <TextInput
                style={s.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#C4CAD4"
                value={disablePw}
                onChangeText={setDisablePw}
                secureTextEntry={!showDsPw}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowDsPw((v) => !v)}>
                <Feather name={showDsPw ? "eye" : "eye-off"} size={18} color="#B0B7C3" />
              </Pressable>
            </View>

            <CodeInputs label="Enter 6-digit code from Google Authenticator" />

            {!!error && <View style={[s.errorBox, { marginTop: 20 }]}><Text style={s.errorText}>{error}</Text></View>}

            <Pressable
              style={[s.redBtnWrap, (loading || codeStr.length !== 6 || !disablePw) && { opacity: 0.55 }]}
              onPress={handleDisable}
              disabled={loading || codeStr.length !== 6 || !disablePw}
            >
              <Text style={s.redBtnText}>{loading ? "Disabling…" : "Disable 2FA"}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#F8F9FB" },
  scroll:  { paddingHorizontal: 20 },
  center:  { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#F8F9FB",
    borderBottomWidth: 1, borderBottomColor: "#F0F2F7",
  },
  backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },

  shieldBox: {
    borderRadius: 20, overflow: "hidden", padding: 28, alignItems: "center",
    marginBottom: 20, borderWidth: 1, borderColor: "#E5E8EE", gap: 10,
  },
  shieldIcon: {
    width: 72, height: 72, borderRadius: 40, alignItems: "center",
    justifyContent: "center", overflow: "hidden",
  },
  shieldTitle: { fontSize: 20, fontWeight: "800", color: "#1A1A2E", textAlign: "center" },
  shieldSub:   { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 19, paddingHorizontal: 8 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700", color: "#E53935" },

  stepCard:      { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#E5E8EE", gap: 16 },
  stepCardTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A2E", marginBottom: 4 },
  stepRow:       { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum:       { width: 26, height: 26, borderRadius: 13, backgroundColor: "#EBF8FF", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNumText:   { fontSize: 13, fontWeight: "800", color: "#5CBFFE" },
  stepText:      { fontSize: 13, color: "#4B5563", lineHeight: 19, flex: 1 },

  instructions: { fontSize: 14, color: "#4B5563", lineHeight: 21, marginBottom: 24, textAlign: "center" },

  qrWrapper: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: "#E5E8EE",
    marginBottom: 20,
  },
  qrImage: { width: 200, height: 200 },

  manualCard:  { backgroundColor: "#F8F9FB", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E8EE" },
  manualLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  manualKey:   { fontSize: 16, fontWeight: "700", color: "#1A1A2E", letterSpacing: 3, textAlign: "center" },

  noteBox:  { flexDirection: "row", gap: 10, backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "#FEF3C7" },
  noteText: { fontSize: 12, color: "#92400E", lineHeight: 18, flex: 1 },

  codeLabel:    { fontSize: 13, fontWeight: "600", color: "#3D4A5C", marginBottom: 14, textAlign: "center" },
  codeRow:      { flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 8 },
  codeBox:      {
    width: 46, height: 58, borderRadius: 12, borderWidth: 1.5,
    borderColor: "#E5E8EE", backgroundColor: "#fff", textAlign: "center",
    fontSize: 24, fontWeight: "700", color: "#1A1A2E",
  },
  codeBoxFilled: { borderColor: "#5CBFFE", backgroundColor: "#EBF8FF" },

  fieldLabel:   { fontSize: 13, fontWeight: "600", color: "#3D4A5C", marginBottom: 8, marginTop: 20 },
  passwordBox:  {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 12, borderWidth: 1, borderColor: "#E5E8EE", paddingHorizontal: 16,
    height: 52, marginBottom: 24,
  },
  passwordInput: { flex: 1, fontSize: 15, color: "#1A1A2E" },

  btnWrap:    { borderRadius: 14, overflow: "hidden", marginTop: 24, marginBottom: 12 },
  btn:        { height: 54, alignItems: "center", justifyContent: "center" },
  btnText:    { color: "#fff", fontSize: 16, fontWeight: "700" },

  redBtnWrap: {
    marginTop: 24, height: 54, borderRadius: 14, borderWidth: 1.5,
    borderColor: "#E53935", alignItems: "center", justifyContent: "center",
  },
  redBtnText: { color: "#E53935", fontSize: 15, fontWeight: "700" },

  backLink:     { alignSelf: "center", padding: 8, marginTop: 4 },
  backLinkText: { color: "#5CBFFE", fontSize: 14, fontWeight: "600" },

  disableBtn:     { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 20, padding: 12 },
  disableBtnText: { color: "#E53935", fontSize: 14, fontWeight: "600" },

  errorBox:  { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FECACA", marginBottom: 4 },
  errorText: { color: "#E53935", fontSize: 13 },
});
