import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApi } from "@/lib/authApi";
import { useAuth } from "@/context/AuthContext";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

// ─── Country list ─────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "US", flag: "🇺🇸", name: "United States", dial: "+1" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", dial: "+44" },
  { code: "CN", flag: "🇨🇳", name: "China", dial: "+86" },
  { code: "JP", flag: "🇯🇵", name: "Japan", dial: "+81" },
  { code: "KR", flag: "🇰🇷", name: "South Korea", dial: "+82" },
  { code: "TW", flag: "🇹🇼", name: "Taiwan", dial: "+886" },
  { code: "HK", flag: "🇭🇰", name: "Hong Kong", dial: "+852" },
  { code: "SG", flag: "🇸🇬", name: "Singapore", dial: "+65" },
  { code: "AU", flag: "🇦🇺", name: "Australia", dial: "+61" },
  { code: "CA", flag: "🇨🇦", name: "Canada", dial: "+1" },
  { code: "DE", flag: "🇩🇪", name: "Germany", dial: "+49" },
  { code: "FR", flag: "🇫🇷", name: "France", dial: "+33" },
  { code: "IN", flag: "🇮🇳", name: "India", dial: "+91" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia", dial: "+62" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia", dial: "+60" },
  { code: "TH", flag: "🇹🇭", name: "Thailand", dial: "+66" },
  { code: "PH", flag: "🇵🇭", name: "Philippines", dial: "+63" },
  { code: "VN", flag: "🇻🇳", name: "Vietnam", dial: "+84" },
  { code: "BR", flag: "🇧🇷", name: "Brazil", dial: "+55" },
  { code: "MX", flag: "🇲🇽", name: "Mexico", dial: "+52" },
  { code: "RU", flag: "🇷🇺", name: "Russia", dial: "+7" },
  { code: "TR", flag: "🇹🇷", name: "Turkey", dial: "+90" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia", dial: "+966" },
  { code: "AE", flag: "🇦🇪", name: "UAE", dial: "+971" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria", dial: "+234" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa", dial: "+27" },
  { code: "PK", flag: "🇵🇰", name: "Pakistan", dial: "+92" },
  { code: "BD", flag: "🇧🇩", name: "Bangladesh", dial: "+880" },
  { code: "EG", flag: "🇪🇬", name: "Egypt", dial: "+20" },
];

// ─── Country picker ───────────────────────────────────────────────────────────
function CountryPicker({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (c: (typeof COUNTRIES)[0]) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.dial.includes(q)
  );
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>Select Country</Text>
        <View style={s.searchRow}>
          <MaterialCommunityIcons name="magnify" size={18} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={s.searchInput}
            placeholder="Search…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={q}
            onChangeText={setQ}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.code}
          renderItem={({ item }) => (
            <Pressable style={s.countryRow} onPress={() => { onSelect(item); setQ(""); onClose(); }}>
              <Text style={{ fontSize: 22 }}>{item.flag}</Text>
              <Text style={s.countryName}>{item.name}</Text>
              <Text style={s.countryDial}>{item.dial}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen({ visible }: { visible: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    if (!visible) return;
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  }, [visible]);
  if (!visible) return null;
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={[s.loadScreen, { opacity: visible ? 1 : 0 }]}>
      <LinearGradient colors={["#0A0E1A", "#0D1525"]} style={StyleSheet.absoluteFill} />
      <Animated.View style={{ transform: [{ rotate: rot }, { scale }] }}>
        <LinearGradient colors={GRAD} style={s.loadRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
      <Text style={s.loadTitle}>Creating account…</Text>
      <Text style={s.loadSub}>Please wait a moment</Text>
    </Animated.View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const codeRef = useRef<TextInput>(null);

  // Fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [referral, setReferral] = useState("");

  // OTP states
  const [codeSent, setCodeSent] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);
  const [sendingCode, setSendingCode] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form states
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCountry, setShowCountry] = useState(false);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(120);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  async function handleGetCode() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSendingCode(true);
    try {
      const res = await authApi.sendCode(trimmedEmail, "verify");
      setCodeSent(true);
      setEmailDelivered(res.emailDelivered);
      setDevOtp(res.devOtp);
      setCode("");
      startTimer();
      setTimeout(() => codeRef.current?.focus(), 200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send code.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSignUp() {
    if (!username.trim()) return setError("Username is required.");
    if (!password) return setError("Password is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPw) return setError("Passwords do not match.");
    if (!phone.trim()) return setError("Mobile number is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!codeSent) return setError("Please request a verification code first.");
    if (!code.trim() || code.length < 6) return setError("Enter the 6-digit verification code.");
    setError("");
    setLoading(true);
    try {
      // Step 1: verify OTP
      const verified = await authApi.verifyCode(email.trim(), code.trim());
      if (!verified.success) throw new Error("Incorrect code. Please try again.");
      // Step 2: register
      const result = await authApi.register({
        username: username.trim(),
        email: email.trim(),
        phone: `${country.dial}${phone.trim()}`,
        password,
        confirmPassword: confirmPw,
        referralCode: referral.trim() || undefined,
      });
      await new Promise((r) => setTimeout(r, 3500));
      await signIn(result.token, result.user);
      router.replace("/(tabs)/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <LoadingScreen visible={loading} />
      <CountryPicker
        visible={showCountry}
        onSelect={setCountry}
        onClose={() => setShowCountry(false)}
      />

      {/* Background */}
      <LinearGradient colors={["#0A0E1A", "#0C1220", "#0A0E1A"]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(92,191,254,0.12)", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: 320 }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand header */}
          <View style={s.brandRow}>
            <LinearGradient colors={GRAD} style={s.brandIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>TF</Text>
            </LinearGradient>
            <Text style={s.brandText}>Treasure Fun</Text>
          </View>

          <Text style={s.heading}>Sign up</Text>

          {/* Global error */}
          {!!error && (
            <View style={s.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#FF6B6B" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          {/* ── User name ── */}
          <Text style={s.label}>User name <Text style={s.required}>*</Text></Text>
          <View style={s.inputBox}>
            <TextInput
              style={s.input}
              placeholder="Please enter user name"
              placeholderTextColor="rgba(255,255,255,0.22)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* ── Password ── */}
          <Text style={s.label}>Password <Text style={s.required}>*</Text></Text>
          <View style={s.inputBox}>
            <TextInput
              style={[s.input, { paddingRight: 44 }]}
              placeholder="Please enter your password"
              placeholderTextColor="rgba(255,255,255,0.22)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
            <Pressable style={s.eyeBtn} onPress={() => setShowPw((v) => !v)}>
              <MaterialCommunityIcons name={showPw ? "eye-outline" : "eye-off-outline"} size={20} color="rgba(255,255,255,0.3)" />
            </Pressable>
          </View>

          {/* ── Confirm password ── */}
          <Text style={s.label}>Please re-enter your password</Text>
          <View style={s.inputBox}>
            <TextInput
              style={[s.input, { paddingRight: 44 }]}
              placeholder="Please re-enter your password"
              placeholderTextColor="rgba(255,255,255,0.22)"
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry={!showCpw}
              autoCapitalize="none"
            />
            <Pressable style={s.eyeBtn} onPress={() => setShowCpw((v) => !v)}>
              <MaterialCommunityIcons name={showCpw ? "eye-outline" : "eye-off-outline"} size={20} color="rgba(255,255,255,0.3)" />
            </Pressable>
          </View>

          {/* ── Mobile ── */}
          <Text style={s.label}>Mobile no.</Text>
          <View style={s.phoneRow}>
            <Pressable style={s.countryBtn} onPress={() => setShowCountry(true)}>
              <Text style={{ fontSize: 18 }}>{country.flag}</Text>
              <Text style={s.countryDial2}>{country.dial}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
            </Pressable>
            <View style={[s.inputBox, { flex: 1 }]}>
              <TextInput
                style={[s.input, { paddingLeft: 14 }]}
                placeholder="Enter Mobile No."
                placeholderTextColor="rgba(255,255,255,0.22)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* ── Email ── */}
          <Text style={s.label}>Email <Text style={s.required}>*</Text></Text>
          <View style={s.inputBox}>
            <TextInput
              style={s.input}
              placeholder="Please enter your email"
              placeholderTextColor="rgba(255,255,255,0.22)"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (codeSent) { setCodeSent(false); setCode(""); }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {codeSent && (
              <MaterialCommunityIcons name="check-circle" size={17} color="#2BD9A8" style={{ marginRight: 12 }} />
            )}
          </View>

          {/* ── Email verification code ── */}
          <View style={s.codeRow}>
            <View style={[s.inputBox, { flex: 1 }]}>
              <TextInput
                ref={codeRef}
                style={[s.input, { paddingLeft: 14, letterSpacing: codeSent ? 4 : 0 }]}
                placeholder="Email verification code"
                placeholderTextColor="rgba(255,255,255,0.22)"
                value={code}
                onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                editable={codeSent}
              />
            </View>
            {/* Get / Timer / Resend button */}
            {!codeSent ? (
              <Pressable
                style={[s.getBtn, sendingCode && { opacity: 0.6 }]}
                onPress={handleGetCode}
                disabled={sendingCode}
              >
                <LinearGradient
                  colors={["#5CBFFE", "#2BD9A8"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {sendingCode ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.getBtnText}>Get</Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                style={[s.getBtn, timer > 0 && { opacity: 0.55 }]}
                onPress={timer === 0 ? handleGetCode : undefined}
                disabled={timer > 0 || sendingCode}
              >
                <LinearGradient
                  colors={timer > 0 ? ["#334155", "#334155"] : ["#5CBFFE", "#2BD9A8"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {sendingCode ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[s.getBtnText, timer > 0 && { fontSize: 11 }]}>
                    {timer > 0 ? `${timer}s` : "Resend"}
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          {/* Email delivery status */}
          {codeSent && emailDelivered && (
            <Text style={[s.codeHint, { color: "#2BD9A8" }]}>✓ Code sent to {email}</Text>
          )}

          {/* Dev OTP box — shown only when email isn't delivered */}
          {codeSent && !emailDelivered && (
            <View style={s.devBox}>
              <View style={s.devBoxHeader}>
                <MaterialCommunityIcons name="wrench-outline" size={13} color="#FFB08A" />
                <Text style={s.devBoxLabel}>Dev mode — email not configured</Text>
              </View>
              <Text style={s.devBoxSub}>Your OTP code:</Text>
              <Pressable
                style={s.devOtpRow}
                onPress={() => {
                  if (devOtp) { setCode(devOtp); }
                }}
              >
                <Text style={s.devOtpCode}>{devOtp ?? "—"}</Text>
                <View style={s.devOtpCopyBtn}>
                  <MaterialCommunityIcons name="content-copy" size={13} color="#FFB08A" />
                  <Text style={s.devOtpCopyText}>tap to fill</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* ── Referral code ── */}
          <Text style={[s.label, { marginTop: 14 }]}>Referral code <Text style={s.required}>*</Text></Text>
          <View style={s.inputBox}>
            <TextInput
              style={s.input}
              placeholder="Please enter your Referral Code"
              placeholderTextColor="rgba(255,255,255,0.22)"
              value={referral}
              onChangeText={setReferral}
              autoCapitalize="characters"
            />
          </View>

          {/* ── Sign up button ── */}
          <Pressable style={[s.signUpWrap, loading && { opacity: 0.7 }]} onPress={handleSignUp} disabled={loading}>
            <LinearGradient colors={GRAD} style={s.signUpBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.signUpText}>Sign up</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Login link */}
          <View style={s.loginRow}>
            <Text style={s.loginLabel}>Have an account? </Text>
            <Pressable onPress={() => router.push("/auth/login")}>
              <Text style={s.loginLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0E1A" },
  scroll: { paddingHorizontal: 22 },

  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 },
  brandIcon: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  brandText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  heading: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 22, letterSpacing: -0.5 },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,107,107,0.1)", borderRadius: 10,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(255,107,107,0.2)",
  },
  errorTxt: { color: "#FF6B6B", fontSize: 13, flex: 1 },

  label: { color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: "500", marginBottom: 8, marginTop: 14 },
  required: { color: "#FF6B6B" },

  inputBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  input: { flex: 1, color: "#fff", fontSize: 15, paddingHorizontal: 16, height: "100%" },
  eyeBtn: { position: "absolute", right: 14 },

  phoneRow: { flexDirection: "row", gap: 10 },
  countryBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 6,
  },
  countryDial2: { color: "#fff", fontWeight: "600", fontSize: 13 },

  codeRow: { flexDirection: "row", gap: 10, marginTop: 14, alignItems: "center" },
  getBtn: {
    width: 80, height: 52, borderRadius: 12,
    overflow: "hidden", alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  getBtnText: { color: "#fff", fontWeight: "700", fontSize: 14, zIndex: 1 },
  codeHint: { fontSize: 12, marginTop: 7 },

  devBox: {
    marginTop: 8,
    backgroundColor: "rgba(255,176,138,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,176,138,0.25)",
    padding: 14,
    gap: 6,
  },
  devBoxHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  devBoxLabel: { color: "#FFB08A", fontSize: 12, fontWeight: "600" },
  devBoxSub: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 },
  devOtpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,176,138,0.18)",
  },
  devOtpCode: { color: "#FFB08A", fontSize: 26, fontWeight: "800", letterSpacing: 6 },
  devOtpCopyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  devOtpCopyText: { color: "#FFB08A", fontSize: 11, fontWeight: "600" },

  signUpWrap: { borderRadius: 14, overflow: "hidden", marginTop: 28, marginBottom: 20 },
  signUpBtn: { height: 56, alignItems: "center", justifyContent: "center" },
  signUpText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.2 },

  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  loginLabel: { color: "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: "600" },
  loginLink: { color: "#5CBFFE", fontSize: 14, fontWeight: "700" },

  // Country modal
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: "68%",
    backgroundColor: "#111827", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 14 },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 10,
    paddingHorizontal: 12, marginBottom: 10, height: 42,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  countryRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 13, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  countryName: { flex: 1, color: "#fff", fontSize: 14 },
  countryDial: { color: "rgba(255,255,255,0.4)", fontSize: 13 },

  // Loading
  loadScreen: {
    ...StyleSheet.absoluteFillObject, zIndex: 999,
    alignItems: "center", justifyContent: "center", gap: 22,
  },
  loadRing: { width: 80, height: 80, borderRadius: 40 },
  loadTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  loadSub: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
});
