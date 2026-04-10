import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
      setSuccess(true);
      await signIn(result.token, result.user);
      router.replace("/(tabs)/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
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
          {/* Brand header */}
          <View style={s.brandRow}>
            <Image source={require("../../assets/images/icon.png")} style={s.brandLogo} resizeMode="contain" />
            <Text style={s.brandName}>Apex</Text>
          </View>

          <Text style={s.heading}>Welcome Back</Text>
          <Text style={s.subheading}>Sign in to continue</Text>

          {!!error && (
            <View style={s.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#E53935" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
          {success && (
            <View style={s.successBox}>
              <MaterialCommunityIcons name="check-circle-outline" size={15} color="#2BD9A8" />
              <Text style={s.successText}>Login successful! Redirecting…</Text>
            </View>
          )}

          {/* Username / Email */}
          <Text style={s.label}>Username or Email</Text>
          <View style={s.inputBox}>
            <MaterialCommunityIcons name="account-outline" size={19} color="#B0B7C3" style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Enter username or email"
              placeholderTextColor="#C4CAD4"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <Text style={[s.label, { marginTop: 16 }]}>Password</Text>
          <View style={s.inputBox}>
            <MaterialCommunityIcons name="lock-outline" size={19} color="#B0B7C3" style={s.inputIcon} />
            <TextInput
              style={[s.input, { paddingRight: 44 }]}
              placeholder="Enter your password"
              placeholderTextColor="#C4CAD4"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
            <Pressable style={s.eyeBtn} onPress={() => setShowPw((v) => !v)}>
              <MaterialCommunityIcons name={showPw ? "eye-outline" : "eye-off-outline"} size={19} color="#B0B7C3" />
            </Pressable>
          </View>

          <Pressable style={s.forgotBtn} onPress={() => router.push("/auth/forgot")}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </Pressable>

          {/* Log in */}
          <Pressable
            style={[s.btnWrap, (loading || success) && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading || success}
          >
            <LinearGradient colors={GRAD} style={s.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Log In</Text>}
            </LinearGradient>
          </Pressable>

          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Don't have an account? </Text>
            <Pressable onPress={() => router.push("/auth/register")}>
              <Text style={s.switchLink}>Sign up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FB" },
  scroll: { paddingHorizontal: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 36 },
  brandLogo: { width: 40, height: 40 },
  brandIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  brandIconText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  brandName: { color: "#1A1A2E", fontSize: 17, fontWeight: "700" },
  heading: { color: "#1A1A2E", fontSize: 28, fontWeight: "800", marginBottom: 6, letterSpacing: -0.4 },
  subheading: { color: "#7B8794", fontSize: 14, marginBottom: 28, lineHeight: 20 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: "#FECACA" },
  errorText: { color: "#E53935", fontSize: 13, flex: 1 },
  successBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF9", borderRadius: 10, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: "#A7F3D0" },
  successText: { color: "#059669", fontSize: 13 },
  label: { color: "#3D4A5C", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  inputBox: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E8EE", height: 52, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  input: { flex: 1, color: "#1A1A2E", fontSize: 15, paddingHorizontal: 10, height: "100%" },
  eyeBtn: { position: "absolute", right: 14 },
  forgotBtn: { alignSelf: "flex-end", marginTop: 12, marginBottom: 30 },
  forgotText: { color: "#5CBFFE", fontSize: 13, fontWeight: "600" },
  btnWrap: { borderRadius: 14, overflow: "hidden", marginBottom: 24 },
  btn: { height: 54, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  switchLabel: { color: "#7B8794", fontSize: 14, fontWeight: "600" },
  switchLink: { color: "#5CBFFE", fontSize: 14, fontWeight: "700" },
});
