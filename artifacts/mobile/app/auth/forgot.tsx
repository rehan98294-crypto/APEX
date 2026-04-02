import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApi } from "@/lib/authApi";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

export default function ForgotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    setTimer(120);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    if (!email.trim().includes("@")) { setError("Please enter a valid email."); return; }
    setError("");
    setSendingCode(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep("reset");
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleResend() {
    if (timer > 0) return;
    setError("");
    setSendingCode(true);
    try {
      await authApi.forgotPassword(email.trim());
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleReset() {
    if (!code.trim() || !newPassword || !confirmPassword) { setError("Please fill in all fields."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), code: code.trim(), newPassword, confirmPassword });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "done" ? (
            /* ── Done state ── */
            <View style={s.doneWrap}>
              <LinearGradient colors={GRAD} style={s.doneCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <MaterialCommunityIcons name="check-bold" size={38} color="#fff" />
              </LinearGradient>
              <Text style={s.doneTitle}>Password Reset!</Text>
              <Text style={s.doneSub}>Your password has been updated successfully. You can now log in with your new password.</Text>
              <Pressable style={s.btnWrap} onPress={() => router.replace("/auth/login")}>
                <LinearGradient colors={GRAD} style={s.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.btnText}>Back to Login</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Back button */}
              <Pressable style={s.backBtn} onPress={() => router.back()}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#3D4A5C" />
              </Pressable>

              {/* Icon */}
              <View style={s.iconCircle}>
                <LinearGradient colors={GRAD} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <MaterialCommunityIcons name="lock-reset" size={26} color="#fff" />
              </View>

              <Text style={s.heading}>Reset Password</Text>
              <Text style={s.subheading}>
                {step === "email"
                  ? "Enter your email to receive a verification code"
                  : `Code sent to ${email}. Enter it below with your new password.`}
              </Text>

              {!!error && (
                <View style={s.errorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#E53935" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {step === "email" && (
                <>
                  <Text style={s.label}>Email Address</Text>
                  <View style={s.inputBox}>
                    <MaterialCommunityIcons name="email-outline" size={19} color="#B0B7C3" style={s.inputIcon} />
                    <TextInput
                      style={s.input}
                      placeholder="Enter your registered email"
                      placeholderTextColor="#C4CAD4"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <Pressable
                    style={[s.btnWrap, { marginTop: 28 }, sendingCode && { opacity: 0.7 }]}
                    onPress={handleSendCode}
                    disabled={sendingCode}
                  >
                    <LinearGradient colors={GRAD} style={s.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      {sendingCode ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Code</Text>}
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              {step === "reset" && (
                <>
                  <Text style={s.label}>Verification Code</Text>
                  <View style={s.inputBox}>
                    <MaterialCommunityIcons name="shield-key-outline" size={19} color="#B0B7C3" style={s.inputIcon} />
                    <TextInput
                      style={[s.input, { letterSpacing: 4, fontWeight: "700" }]}
                      placeholder="6-digit code"
                      placeholderTextColor="#C4CAD4"
                      value={code}
                      onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                  <View style={s.resendRow}>
                    {timer > 0 ? (
                      <Text style={s.timerText}>Resend in {timer}s</Text>
                    ) : (
                      <Pressable onPress={handleResend}>
                        <Text style={s.resendText}>{sendingCode ? "Sending…" : "Resend code"}</Text>
                      </Pressable>
                    )}
                  </View>

                  <Text style={[s.label, { marginTop: 18 }]}>New Password</Text>
                  <View style={s.inputBox}>
                    <MaterialCommunityIcons name="lock-outline" size={19} color="#B0B7C3" style={s.inputIcon} />
                    <TextInput
                      style={[s.input, { paddingRight: 44 }]}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="#C4CAD4"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                    />
                    <Pressable style={s.eyeBtn} onPress={() => setShowPw((v) => !v)}>
                      <MaterialCommunityIcons name={showPw ? "eye-outline" : "eye-off-outline"} size={19} color="#B0B7C3" />
                    </Pressable>
                  </View>

                  <Text style={[s.label, { marginTop: 16 }]}>Confirm New Password</Text>
                  <View style={s.inputBox}>
                    <MaterialCommunityIcons name="lock-check-outline" size={19} color="#B0B7C3" style={s.inputIcon} />
                    <TextInput
                      style={[s.input, { paddingRight: 44 }]}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#C4CAD4"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showCpw}
                      autoCapitalize="none"
                    />
                    <Pressable style={s.eyeBtn} onPress={() => setShowCpw((v) => !v)}>
                      <MaterialCommunityIcons name={showCpw ? "eye-outline" : "eye-off-outline"} size={19} color="#B0B7C3" />
                    </Pressable>
                  </View>

                  <Pressable
                    style={[s.btnWrap, { marginTop: 28 }, loading && { opacity: 0.7 }]}
                    onPress={handleReset}
                    disabled={loading}
                  >
                    <LinearGradient colors={GRAD} style={s.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Reset Password</Text>}
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              <Pressable style={s.backToLoginRow} onPress={() => router.push("/auth/login")}>
                <MaterialCommunityIcons name="arrow-left" size={14} color="#5CBFFE" />
                <Text style={s.backToLoginText}>Back to Login</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FB" },
  scroll: { paddingHorizontal: 24 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginBottom: 20, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#E5E8EE", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  iconCircle: { width: 62, height: 62, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  heading: { color: "#1A1A2E", fontSize: 26, fontWeight: "800", marginBottom: 6, letterSpacing: -0.4 },
  subheading: { color: "#7B8794", fontSize: 14, marginBottom: 28, lineHeight: 20 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: "#FECACA" },
  errorText: { color: "#E53935", fontSize: 13, flex: 1 },
  label: { color: "#3D4A5C", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  inputBox: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E8EE", height: 52, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  input: { flex: 1, color: "#1A1A2E", fontSize: 15, paddingHorizontal: 10, height: "100%" },
  eyeBtn: { position: "absolute", right: 14 },
  resendRow: { alignItems: "flex-end", marginTop: 8 },
  timerText: { color: "#B0B7C3", fontSize: 12 },
  resendText: { color: "#5CBFFE", fontSize: 13, fontWeight: "600" },
  btnWrap: { borderRadius: 14, overflow: "hidden", marginBottom: 20 },
  btn: { height: 54, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  backToLoginRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 4 },
  backToLoginText: { color: "#5CBFFE", fontSize: 13, fontWeight: "600" },
  doneWrap: { flex: 1, alignItems: "center", paddingTop: 80, gap: 16, paddingHorizontal: 8 },
  doneCircle: { width: 88, height: 88, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  doneTitle: { color: "#1A1A2E", fontSize: 26, fontWeight: "800" },
  doneSub: { color: "#7B8794", fontSize: 14, textAlign: "center", lineHeight: 22 },
});
