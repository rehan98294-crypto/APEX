import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
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

// ─── Country picker modal ─────────────────────────────────────────────────────
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
          <MaterialCommunityIcons name="magnify" size={18} color="#B0B7C3" />
          <TextInput
            style={s.searchInput}
            placeholder="Search…"
            placeholderTextColor="#C4CAD4"
            value={q}
            onChangeText={setQ}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.code}
          renderItem={({ item }) => (
            <Pressable
              style={s.countryRow}
              onPress={() => { onSelect(item); setQ(""); onClose(); }}
            >
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

// ─── Loading overlay ──────────────────────────────────────────────────────────
function LoadingScreen({ visible }: { visible: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
  }, [visible]);
  if (!visible) return null;
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={s.loadScreen}>
      <Animated.View style={{ transform: [{ rotate: rot }] }}>
        <LinearGradient colors={GRAD} style={s.loadRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
      <Text style={s.loadTitle}>Creating account…</Text>
      <Text style={s.loadSub}>Please wait a moment</Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const codeRef = useRef<TextInput>(null);

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

  const [codeSent, setCodeSent] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);
  const [sendingCode, setSendingCode] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // 1. Verify OTP
      const verified = await authApi.verifyCode(email.trim(), code.trim());
      if (!verified.success) throw new Error("Incorrect code. Please try again.");
      // 2. Register + auto-login
      const result = await authApi.register({
        username: username.trim(),
        email: email.trim(),
        phone: `${country.dial}${phone.trim()}`,
        password,
        confirmPassword: confirmPw,
        referralCode: referral.trim() || undefined,
      });
      // 3. Sign in immediately — _layout.tsx handles redirect to /(tabs)/
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

          <Text style={s.heading}>Sign up</Text>

          {!!error && (
            <View style={s.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#E53935" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          {/* User name */}
          <Text style={s.label}>User name <Text style={s.req}>*</Text></Text>
          <View style={s.inputBox}>
            <TextInput
              style={s.input}
              placeholder="Please enter user name"
              placeholderTextColor="#C4CAD4"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <Text style={[s.label, { marginTop: 14 }]}>Password <Text style={s.req}>*</Text></Text>
          <View style={s.inputBox}>
            <TextInput
              style={[s.input, { paddingRight: 44 }]}
              placeholder="Please enter your password"
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

          {/* Confirm password */}
          <Text style={[s.label, { marginTop: 14 }]}>Please re-enter your password</Text>
          <View style={s.inputBox}>
            <TextInput
              style={[s.input, { paddingRight: 44 }]}
              placeholder="Please re-enter your password"
              placeholderTextColor="#C4CAD4"
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry={!showCpw}
              autoCapitalize="none"
            />
            <Pressable style={s.eyeBtn} onPress={() => setShowCpw((v) => !v)}>
              <MaterialCommunityIcons name={showCpw ? "eye-outline" : "eye-off-outline"} size={19} color="#B0B7C3" />
            </Pressable>
          </View>

          {/* Mobile */}
          <Text style={[s.label, { marginTop: 14 }]}>Mobile no.</Text>
          <View style={s.phoneRow}>
            <Pressable style={s.countryBtn} onPress={() => setShowCountry(true)}>
              <Text style={{ fontSize: 18 }}>{country.flag}</Text>
              <Text style={s.countryDialText}>{country.dial}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color="#B0B7C3" />
            </Pressable>
            <View style={[s.inputBox, { flex: 1 }]}>
              <TextInput
                style={[s.input, { paddingLeft: 14 }]}
                placeholder="Enter Mobile No."
                placeholderTextColor="#C4CAD4"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Email */}
          <Text style={[s.label, { marginTop: 14 }]}>Email <Text style={s.req}>*</Text></Text>
          <View style={s.inputBox}>
            <TextInput
              style={s.input}
              placeholder="Please enter your email"
              placeholderTextColor="#C4CAD4"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (codeSent) { setCodeSent(false); setCode(""); setDevOtp(undefined); }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {codeSent && (
              <MaterialCommunityIcons name="check-circle" size={17} color="#2BD9A8" style={{ marginRight: 12 }} />
            )}
          </View>

          {/* Verification code row */}
          <View style={[s.codeRow, { marginTop: 10 }]}>
            <View style={[s.inputBox, { flex: 1 }]}>
              <TextInput
                ref={codeRef}
                style={[s.input, { paddingLeft: 14, letterSpacing: codeSent ? 4 : 0, fontWeight: codeSent ? "700" : "400" }]}
                placeholder="Email verification code"
                placeholderTextColor="#C4CAD4"
                value={code}
                onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                editable={codeSent}
              />
            </View>

            {/* Get / Timer / Resend */}
            {!codeSent ? (
              <Pressable style={[s.getBtn, sendingCode && { opacity: 0.6 }]} onPress={handleGetCode} disabled={sendingCode}>
                <LinearGradient colors={["#5CBFFE", "#2BD9A8"]} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                {sendingCode ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.getBtnText}>Get</Text>}
              </Pressable>
            ) : (
              <Pressable
                style={[s.getBtn, timer > 0 && { opacity: 0.55 }]}
                onPress={timer === 0 ? handleGetCode : undefined}
                disabled={timer > 0 || sendingCode}
              >
                <LinearGradient
                  colors={timer > 0 ? ["#D1D5DB", "#D1D5DB"] : ["#5CBFFE", "#2BD9A8"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {sendingCode ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[s.getBtnText, timer > 0 && { fontSize: 11, color: "#6B7280" }]}>
                    {timer > 0 ? `${timer}s` : "Resend"}
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          {/* Email status */}
          {codeSent && emailDelivered && (
            <Text style={s.codeHintGreen}>✓ Code sent to {email}</Text>
          )}

          {/* Dev OTP box */}
          {codeSent && !emailDelivered && (
            <View style={s.devBox}>
              <View style={s.devBoxHeader}>
                <MaterialCommunityIcons name="wrench-outline" size={13} color="#D97706" />
                <Text style={s.devBoxLabel}>Dev mode — email not configured</Text>
              </View>
              <Text style={s.devBoxSub}>Your OTP code:</Text>
              <Pressable style={s.devOtpRow} onPress={() => { if (devOtp) setCode(devOtp); }}>
                <Text style={s.devOtpCode}>{devOtp ?? "—"}</Text>
                <View style={s.devCopyBtn}>
                  <MaterialCommunityIcons name="content-copy" size={12} color="#D97706" />
                  <Text style={s.devCopyText}>tap to fill</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* Referral code */}
          <Text style={[s.label, { marginTop: 14 }]}>Referral code <Text style={s.req}>*</Text></Text>
          <View style={s.inputBox}>
            <TextInput
              style={s.input}
              placeholder="Please enter your Referral Code"
              placeholderTextColor="#C4CAD4"
              value={referral}
              onChangeText={setReferral}
              autoCapitalize="characters"
            />
          </View>

          {/* Sign up */}
          <Pressable style={[s.btnWrap, loading && { opacity: 0.7 }]} onPress={handleSignUp} disabled={loading}>
            <LinearGradient colors={GRAD} style={s.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign up</Text>}
            </LinearGradient>
          </Pressable>

          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Have an account? </Text>
            <Pressable onPress={() => router.push("/auth/login")}>
              <Text style={s.switchLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FB" },
  scroll: { paddingHorizontal: 24 },

  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 },
  brandLogo: { width: 40, height: 40 },
  brandIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  brandIconText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  brandName: { color: "#1A1A2E", fontSize: 17, fontWeight: "700" },

  heading: { color: "#1A1A2E", fontSize: 28, fontWeight: "800", marginBottom: 22, letterSpacing: -0.4 },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#FECACA" },
  errorTxt: { color: "#E53935", fontSize: 13, flex: 1 },

  label: { color: "#3D4A5C", fontSize: 13, fontWeight: "500", marginBottom: 8 },
  req: { color: "#E53935" },

  inputBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E8EE",
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  input: { flex: 1, color: "#1A1A2E", fontSize: 15, paddingHorizontal: 16, height: "100%" },
  eyeBtn: { position: "absolute", right: 14 },

  phoneRow: { flexDirection: "row", gap: 10 },
  countryBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E8EE",
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  countryDialText: { color: "#1A1A2E", fontWeight: "600", fontSize: 13 },

  codeRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  getBtn: {
    width: 78, height: 52, borderRadius: 12,
    overflow: "hidden", alignItems: "center", justifyContent: "center", position: "relative",
  },
  getBtnText: { color: "#fff", fontWeight: "700", fontSize: 14, zIndex: 1 },

  codeHintGreen: { color: "#059669", fontSize: 12, marginTop: 6 },

  devBox: {
    marginTop: 8, backgroundColor: "#FFFBEB",
    borderRadius: 10, borderWidth: 1, borderColor: "#FCD34D",
    padding: 12, gap: 5,
  },
  devBoxHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  devBoxLabel: { color: "#D97706", fontSize: 12, fontWeight: "600" },
  devBoxSub: { color: "#92400E", fontSize: 11 },
  devOtpRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FEF3C7", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "#FCD34D",
  },
  devOtpCode: { color: "#92400E", fontSize: 24, fontWeight: "800", letterSpacing: 6 },
  devCopyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  devCopyText: { color: "#D97706", fontSize: 11, fontWeight: "600" },

  btnWrap: { borderRadius: 14, overflow: "hidden", marginTop: 26, marginBottom: 20 },
  btn: { height: 54, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  switchLabel: { color: "#7B8794", fontSize: 14, fontWeight: "600" },
  switchLink: { color: "#5CBFFE", fontSize: 14, fontWeight: "700" },

  // Country modal
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: "68%", backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 },
  sheetHandle: { width: 36, height: 4, backgroundColor: "#E5E8EE", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { color: "#1A1A2E", fontSize: 17, fontWeight: "700", marginBottom: 14 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 12, marginBottom: 10, height: 42 },
  searchInput: { flex: 1, color: "#1A1A2E", fontSize: 14 },
  countryRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderColor: "#F3F4F6" },
  countryName: { flex: 1, color: "#1A1A2E", fontSize: 14 },
  countryDial: { color: "#7B8794", fontSize: 13 },

  // Loading
  loadScreen: { ...StyleSheet.absoluteFillObject, zIndex: 999, backgroundColor: "rgba(248,249,251,0.97)", alignItems: "center", justifyContent: "center", gap: 20 },
  loadRing: { width: 80, height: 80, borderRadius: 40 },
  loadTitle: { color: "#1A1A2E", fontSize: 22, fontWeight: "700" },
  loadSub: { color: "#7B8794", fontSize: 14 },
});
