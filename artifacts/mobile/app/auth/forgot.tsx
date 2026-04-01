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
    if (!email.trim().includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSendingCode(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep("reset");
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset code.");
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
    if (!code.trim() || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
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
    <View style={styles.root}>
      <LinearGradient colors={["#0A0E1A", "#0D1525", "#0A0E1A"]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(255,176,138,0.12)", "transparent", "rgba(92,191,254,0.08)"]}
        style={[StyleSheet.absoluteFill, { height: 300 }]}
        start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="rgba(255,255,255,0.7)" />
          </Pressable>

          {step === "done" ? (
            <View style={styles.doneContainer}>
              <LinearGradient colors={GRAD} style={styles.doneCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <MaterialCommunityIcons name="check-bold" size={36} color="#fff" />
              </LinearGradient>
              <Text style={styles.doneTitle}>Password Reset!</Text>
              <Text style={styles.doneSub}>Your password has been updated successfully.</Text>
              <Pressable style={styles.submitWrap} onPress={() => router.replace("/auth/login")}>
                <LinearGradient colors={GRAD} style={styles.submitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.submitText}>Back to Login</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.iconCircle}>
                <LinearGradient colors={GRAD} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <MaterialCommunityIcons name="lock-reset" size={28} color="#fff" />
              </View>

              <Text style={styles.heading}>Reset Password</Text>
              <Text style={styles.subheading}>
                {step === "email"
                  ? "Enter your email to receive a verification code"
                  : `We sent a code to ${email}. Enter it below with your new password.`}
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color="#FF6B6B" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {step === "email" && (
                <>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrap}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your registered email"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <Pressable
                    style={[styles.submitWrap, sendingCode && { opacity: 0.7 }, { marginTop: 28 }]}
                    onPress={handleSendCode}
                    disabled={sendingCode}
                  >
                    <LinearGradient colors={GRAD} style={styles.submitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      {sendingCode ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send Code</Text>}
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              {step === "reset" && (
                <>
                  <Text style={styles.label}>Verification Code</Text>
                  <View style={styles.inputWrap}>
                    <MaterialCommunityIcons name="shield-key-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="6-digit code"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  {timer > 0 ? (
                    <Text style={styles.timerText}>Resend in {timer}s</Text>
                  ) : (
                    <Pressable onPress={handleResend} style={styles.resendBtn}>
                      <Text style={styles.resendText}>
                        {sendingCode ? "Sending…" : "Resend code"}
                      </Text>
                    </Pressable>
                  )}

                  <Text style={[styles.label, { marginTop: 18 }]}>New Password</Text>
                  <View style={styles.inputWrap}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { paddingRight: 44 }]}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                    />
                    <Pressable style={styles.eyeBtn} onPress={() => setShowPw((v) => !v)}>
                      <MaterialCommunityIcons name={showPw ? "eye" : "eye-off"} size={20} color="rgba(255,255,255,0.4)" />
                    </Pressable>
                  </View>

                  <Text style={[styles.label, { marginTop: 16 }]}>Confirm New Password</Text>
                  <View style={styles.inputWrap}>
                    <MaterialCommunityIcons name="lock-check-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { paddingRight: 44 }]}
                      placeholder="Re-enter new password"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showCpw}
                      autoCapitalize="none"
                    />
                    <Pressable style={styles.eyeBtn} onPress={() => setShowCpw((v) => !v)}>
                      <MaterialCommunityIcons name={showCpw ? "eye" : "eye-off"} size={20} color="rgba(255,255,255,0.4)" />
                    </Pressable>
                  </View>

                  <Pressable
                    style={[styles.submitWrap, loading && { opacity: 0.7 }, { marginTop: 28 }]}
                    onPress={handleReset}
                    disabled={loading}
                  >
                    <LinearGradient colors={GRAD} style={styles.submitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Reset Password</Text>}
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              <Pressable style={styles.backToLogin} onPress={() => router.push("/auth/login")}>
                <MaterialCommunityIcons name="arrow-left" size={16} color="#5CBFFE" />
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0E1A" },
  scroll: { paddingHorizontal: 28 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  iconCircle: { width: 68, height: 68, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 28 },
  heading: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 8, letterSpacing: -0.5 },
  subheading: { color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32, lineHeight: 21 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,107,107,0.12)", borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,107,107,0.25)" },
  errorText: { color: "#FF6B6B", fontSize: 13, flex: 1 },
  label: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: "600", marginBottom: 8, letterSpacing: 0.2 },
  inputWrap: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", flexDirection: "row", alignItems: "center", height: 52 },
  inputIcon: { marginLeft: 14, marginRight: 2 },
  input: { flex: 1, color: "#fff", fontSize: 15, paddingHorizontal: 12, height: "100%" },
  eyeBtn: { position: "absolute", right: 12, padding: 4 },
  timerText: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 8, textAlign: "right" },
  resendBtn: { alignSelf: "flex-end", marginTop: 8 },
  resendText: { color: "#5CBFFE", fontSize: 13, fontWeight: "600" },
  submitWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 24 },
  submitBtn: { height: 56, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
  backToLogin: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 },
  backToLoginText: { color: "#5CBFFE", fontSize: 14, fontWeight: "600" },
  doneContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 16 },
  doneCircle: { width: 90, height: 90, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  doneTitle: { color: "#fff", fontSize: 28, fontWeight: "800" },
  doneSub: { color: "rgba(255,255,255,0.5)", fontSize: 15, textAlign: "center", lineHeight: 22 },
});
