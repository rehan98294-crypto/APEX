import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { useAuth } from "@/context/AuthContext";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleLogin() {
    if (!identifier.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await authApi.login(identifier.trim(), password);
      await signIn(result.token, result.user);
      setSuccess(true);
      setTimeout(() => {
        router.replace("/(tabs)/");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0A0E1A", "#0D1525", "#0A0E1A"]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(92,191,254,0.15)", "transparent", "rgba(255,176,138,0.1)"]}
        style={[StyleSheet.absoluteFill, { top: 0, height: 350 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoRow}>
            <LinearGradient colors={GRAD} style={styles.logoCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.logoText}>TF</Text>
            </LinearGradient>
            <Text style={styles.brandName}>TreasureFun</Text>
          </View>

          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subheading}>Sign in to your account to continue</Text>

          {error ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successBox}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#2BD9A8" />
              <Text style={styles.successText}>Login successful! Redirecting…</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username or Email</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="account-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter username or email"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="Enter your password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPw((v) => !v)}>
                <MaterialCommunityIcons
                  name={showPw ? "eye" : "eye-off"}
                  size={20}
                  color="rgba(255,255,255,0.4)"
                />
              </Pressable>
            </View>

            <Pressable style={styles.forgotBtn} onPress={() => router.push("/auth/forgot")}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.submitWrap, (loading || success) && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading || success}
          >
            <LinearGradient colors={GRAD} style={styles.submitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Log In</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Don't have an account? </Text>
            <Pressable onPress={() => router.push("/auth/register")}>
              <LinearGradient colors={GRAD} style={styles.switchGradText} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.switchLink}>Sign up</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0E1A" },
  scroll: { paddingHorizontal: 28 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 48 },
  logoCircle: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  brandName: { color: "#fff", fontSize: 20, fontWeight: "700", letterSpacing: 0.4 },
  heading: { color: "#fff", fontSize: 30, fontWeight: "800", marginBottom: 8, letterSpacing: -0.5 },
  subheading: { color: "rgba(255,255,255,0.45)", fontSize: 15, marginBottom: 32, lineHeight: 22 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,107,107,0.12)", borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,107,107,0.25)" },
  errorText: { color: "#FF6B6B", fontSize: 13, flex: 1 },
  successBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(43,217,168,0.12)", borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "rgba(43,217,168,0.25)" },
  successText: { color: "#2BD9A8", fontSize: 13 },
  fieldGroup: { gap: 0 },
  label: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600", marginBottom: 8, letterSpacing: 0.3 },
  inputWrap: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", flexDirection: "row", alignItems: "center", height: 54 },
  inputIcon: { marginLeft: 16, marginRight: 4 },
  input: { flex: 1, color: "#fff", fontSize: 15, paddingHorizontal: 12, height: "100%" },
  eyeBtn: { position: "absolute", right: 14, padding: 4 },
  forgotBtn: { alignSelf: "flex-end", marginTop: 12, marginBottom: 32 },
  forgotText: { color: "#5CBFFE", fontSize: 13, fontWeight: "600" },
  submitWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 24 },
  submitBtn: { height: 56, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  switchLabel: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  switchGradText: { borderRadius: 4, paddingHorizontal: 2 },
  switchLink: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
