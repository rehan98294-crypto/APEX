import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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

import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/authApi";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

export default function TwoFactorScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { signIn } = useAuth();
  const { tempToken } = useLocalSearchParams<{ tempToken: string }>();

  const [code,    setCode]    = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const codeStr = code.join("");

  function handleChange(val: string, idx: number) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handleKeyPress(e: any, idx: number) {
    if (e.nativeEvent.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (codeStr.length !== 6) { setError("Enter all 6 digits."); return; }
    if (!tempToken) { setError("Session expired. Please log in again."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await authApi.twofa.verify(tempToken, codeStr);
      setSuccess(true);
      await signIn(result.token, result.user);
      router.replace("/(tabs)/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code.");
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={s.iconWrap}>
            <LinearGradient colors={["#5CBFFE", "#2BD9A8"]} style={StyleSheet.absoluteFill} borderRadius={36} />
            <Feather name="shield" size={40} color="#fff" />
          </View>

          <Text style={s.heading}>Two-Factor{"\n"}Authentication</Text>
          <Text style={s.sub}>
            Open <Text style={{ fontWeight: "700" }}>Google Authenticator</Text> and enter the{" "}
            <Text style={{ fontWeight: "700" }}>6-digit code</Text> for Apex.
          </Text>

          {success && (
            <View style={s.successBox}>
              <Feather name="check-circle" size={15} color="#059669" />
              <Text style={s.successText}>Verified! Signing in…</Text>
            </View>
          )}

          {!!error && (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={15} color="#E53935" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* 6-box code input */}
          <View style={s.codeRow}>
            {code.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[s.codeBox, d ? s.codeBoxFilled : {}]}
                value={d}
                onChangeText={(v) => handleChange(v, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          <Text style={s.hint}>Code expires every 30 seconds</Text>

          {/* Verify button */}
          <Pressable
            style={[s.btnWrap, (loading || success || codeStr.length !== 6) && { opacity: 0.6 }]}
            onPress={handleVerify}
            disabled={loading || success || codeStr.length !== 6}
          >
            <LinearGradient colors={GRAD} style={s.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Verify & Sign In</Text>
              }
            </LinearGradient>
          </Pressable>

          {/* Back to login */}
          <Pressable style={s.backLink} onPress={() => router.replace("/auth/login")}>
            <Feather name="arrow-left" size={14} color="#5CBFFE" />
            <Text style={s.backLinkText}>Back to Login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: "#F8F9FB" },
  scroll: { paddingHorizontal: 28, alignItems: "center" },

  iconWrap: {
    width: 80, height: 80, borderRadius: 40, alignItems: "center",
    justifyContent: "center", overflow: "hidden", marginBottom: 28, alignSelf: "center",
  },
  heading: { fontSize: 30, fontWeight: "800", color: "#1A1A2E", textAlign: "center", letterSpacing: -0.5, marginBottom: 12 },
  sub:     { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 21, marginBottom: 32 },

  successBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF9", borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "#A7F3D0", width: "100%" },
  successText: { color: "#059669", fontSize: 13, flex: 1 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "#FECACA", width: "100%" },
  errorText: { color: "#E53935", fontSize: 13, flex: 1 },

  codeRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 12 },
  codeBox: {
    width: 46, height: 60, borderRadius: 14, borderWidth: 1.5,
    borderColor: "#E5E8EE", backgroundColor: "#fff", textAlign: "center",
    fontSize: 26, fontWeight: "700", color: "#1A1A2E",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  codeBoxFilled: { borderColor: "#5CBFFE", backgroundColor: "#EBF8FF" },
  hint: { fontSize: 12, color: "#9CA3AF", textAlign: "center", marginBottom: 32 },

  btnWrap: { borderRadius: 14, overflow: "hidden", width: "100%", marginBottom: 20 },
  btn:     { height: 56, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  backLink:     { flexDirection: "row", alignItems: "center", gap: 6, padding: 8 },
  backLinkText: { color: "#5CBFFE", fontSize: 14, fontWeight: "600" },
});
