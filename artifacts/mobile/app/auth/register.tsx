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

type OtpPhase = "idle" | "sent" | "verified";

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
function CountryPickerModal({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (c: (typeof COUNTRIES)[0]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search)
  );
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={s.modalOverlay} onPress={onClose} />
      <View style={s.modalSheet}>
        <View style={s.modalHandle} />
        <Text style={s.modalTitle}>Select Country</Text>
        <View style={s.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={s.searchInput}
            placeholder="Search country or code"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          style={{ flex: 1 }}
          renderItem={({ item }) => (
            <Pressable
              style={s.countryRow}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={s.countryFlag}>{item.flag}</Text>
              <Text style={s.countryName}>{item.name}</Text>
              <Text style={s.countryDial}>{item.dial}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

// ─── Success loading overlay (4-second) ──────────────────────────────────────
function LoadingOverlay({ visible }: { visible: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start();
    }
  }, [visible]);
  if (!visible) return null;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={s.loadingOverlay}>
      <Animated.View style={[s.loadingRing, { transform: [{ rotate }] }]}>
        <LinearGradient colors={GRAD} style={StyleSheet.absoluteFill} borderRadius={40} />
      </Animated.View>
      <Text style={s.loadingTitle}>Creating account…</Text>
      <Text style={s.loadingSubText}>Just a moment</Text>
    </View>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────────
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>
        {label}
        {required && <Text style={{ color: "#FF6B6B" }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const otpRef = useRef<TextInput>(null);

  // form values
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");

  // OTP flow
  const [otpPhase, setOtpPhase] = useState<OtpPhase>("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [emailDelivered, setEmailDelivered] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // overall form
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  function startResendTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(120);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    if (!email.trim().includes("@")) {
      setError("Please enter a valid email address first.");
      return;
    }
    setError("");
    setOtpError("");
    setSendingCode(true);
    try {
      const result = await authApi.sendCode(email.trim(), "verify");
      setEmailDelivered(result.emailDelivered);
      setOtpPhase("sent");
      setOtpCode("");
      startResendTimer();
      // auto-focus OTP input
      setTimeout(() => otpRef.current?.focus(), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    if (otpCode.trim().length !== 6) {
      setOtpError("Enter the full 6-digit code.");
      return;
    }
    setOtpError("");
    setVerifyingCode(true);
    try {
      const result = await authApi.verifyCode(email.trim(), otpCode.trim());
      if (result.success) {
        setOtpPhase("verified");
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setOtpError("Incorrect code. Please try again.");
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleRegister() {
    if (otpPhase !== "verified") {
      setError("Please verify your email first.");
      return;
    }
    if (!username.trim() || !phone.trim() || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await authApi.register({
        username: username.trim(),
        email: email.trim(),
        phone: `${country.dial}${phone.trim()}`,
        password,
        confirmPassword,
        referralCode: referral.trim() || undefined,
      });
      // 4-second loading animation, then navigate
      await new Promise((r) => setTimeout(r, 4000));
      await signIn(result.token, result.user);
      router.replace("/(tabs)/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <LoadingOverlay visible={loading} />
      <CountryPickerModal
        visible={showCountryPicker}
        onSelect={setCountry}
        onClose={() => setShowCountryPicker(false)}
      />

      <LinearGradient colors={["#0A0E1A", "#0D1525", "#0A0E1A"]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(43,217,168,0.10)", "transparent", "rgba(92,191,254,0.06)"]}
        style={[StyleSheet.absoluteFill, { height: 280 }]}
        start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoRow}>
            <LinearGradient colors={GRAD} style={s.logoCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={s.logoText}>TF</Text>
            </LinearGradient>
            <Text style={s.brandName}>TreasureFun</Text>
          </View>

          <Text style={s.heading}>Sign up</Text>
          <Text style={s.subheading}>Create your account and start earning</Text>

          {/* Global error */}
          {!!error && (
            <View style={s.errorBox}>
              <MaterialCommunityIcons name="alert-circle" size={15} color="#FF6B6B" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Username ─────────────────────────── */}
          <Field label="Username" required>
            <View style={s.inputWrap}>
              <MaterialCommunityIcons name="account-outline" size={19} color="rgba(255,255,255,0.35)" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Choose a username"
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </Field>

          {/* ── Email + OTP section ───────────────── */}
          <Field label="Email" required>
            {/* Email row */}
            <View style={s.inputWrap}>
              <MaterialCommunityIcons name="email-outline" size={19} color="rgba(255,255,255,0.35)" style={s.inputIcon} />
              <TextInput
                style={[s.input, { paddingRight: 90 }]}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (otpPhase !== "idle") {
                    setOtpPhase("idle");
                    setOtpCode("");
                    setOtpError("");
                  }
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={otpPhase === "idle"}
              />
              {otpPhase === "idle" && (
                <Pressable
                  style={[s.getCodeBtn, sendingCode && { opacity: 0.6 }]}
                  onPress={handleSendCode}
                  disabled={sendingCode}
                >
                  {sendingCode ? (
                    <ActivityIndicator size="small" color="#5CBFFE" />
                  ) : (
                    <Text style={s.getCodeText}>Get Code</Text>
                  )}
                </Pressable>
              )}
              {otpPhase !== "idle" && (
                <View style={s.verifiedBadgeSmall}>
                  <MaterialCommunityIcons
                    name={otpPhase === "verified" ? "check-circle" : "clock-outline"}
                    size={16}
                    color={otpPhase === "verified" ? "#2BD9A8" : "#FFB08A"}
                  />
                </View>
              )}
            </View>

            {/* OTP input — visible when phase is "sent" */}
            {otpPhase === "sent" && (
              <View style={s.otpSection}>
                {/* Email delivery notice */}
                {!emailDelivered && (
                  <View style={s.noEmailBanner}>
                    <MaterialCommunityIcons name="email-off-outline" size={14} color="#FFB08A" />
                    <Text style={s.noEmailText}>
                      Email not delivered — check server console for your OTP code
                    </Text>
                  </View>
                )}
                {emailDelivered && (
                  <View style={s.emailSentBanner}>
                    <MaterialCommunityIcons name="email-check-outline" size={14} color="#2BD9A8" />
                    <Text style={s.emailSentText}>Code sent to {email}</Text>
                  </View>
                )}

                {/* Code input row */}
                <View style={s.otpRow}>
                  <TextInput
                    ref={otpRef}
                    style={[s.otpInput, !!otpError && s.otpInputError]}
                    placeholder="_ _ _ _ _ _"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={otpCode}
                    onChangeText={(v) => {
                      setOtpCode(v.replace(/[^0-9]/g, "").slice(0, 6));
                      setOtpError("");
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  <Pressable
                    style={[s.verifyBtn, (verifyingCode || otpCode.length < 6) && { opacity: 0.55 }]}
                    onPress={handleVerifyCode}
                    disabled={verifyingCode || otpCode.length < 6}
                  >
                    <LinearGradient colors={GRAD} style={[StyleSheet.absoluteFill, { borderRadius: 11 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                    {verifyingCode ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={s.verifyBtnText}>Verify</Text>
                    )}
                  </Pressable>
                </View>

                {/* OTP error */}
                {!!otpError && (
                  <Text style={s.otpErrorText}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={12} color="#FF6B6B" /> {otpError}
                  </Text>
                )}

                {/* Resend */}
                <View style={s.resendRow}>
                  {resendTimer > 0 ? (
                    <Text style={s.timerText}>Resend in {resendTimer}s</Text>
                  ) : (
                    <Pressable onPress={handleSendCode} disabled={sendingCode}>
                      <Text style={s.resendText}>
                        {sendingCode ? "Sending…" : "Resend code"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* Verified badge */}
            {otpPhase === "verified" && (
              <View style={s.verifiedBadge}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#2BD9A8" />
                <Text style={s.verifiedText}>Email verified</Text>
                <Pressable onPress={() => { setOtpPhase("idle"); setOtpCode(""); }} style={s.changeEmailBtn}>
                  <Text style={s.changeEmailText}>Change</Text>
                </Pressable>
              </View>
            )}
          </Field>

          {/* ── Password ─────────────────────────── */}
          <Field label="Password" required>
            <View style={s.inputWrap}>
              <MaterialCommunityIcons name="lock-outline" size={19} color="rgba(255,255,255,0.35)" style={s.inputIcon} />
              <TextInput
                style={[s.input, { paddingRight: 44 }]}
                placeholder="Min. 8 characters"
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <Pressable style={s.eyeBtn} onPress={() => setShowPw((v) => !v)}>
                <MaterialCommunityIcons name={showPw ? "eye" : "eye-off"} size={19} color="rgba(255,255,255,0.35)" />
              </Pressable>
            </View>
          </Field>

          <Field label="Confirm Password" required>
            <View style={s.inputWrap}>
              <MaterialCommunityIcons name="lock-check-outline" size={19} color="rgba(255,255,255,0.35)" style={s.inputIcon} />
              <TextInput
                style={[s.input, { paddingRight: 44 }]}
                placeholder="Re-enter password"
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showCpw}
                autoCapitalize="none"
              />
              <Pressable style={s.eyeBtn} onPress={() => setShowCpw((v) => !v)}>
                <MaterialCommunityIcons name={showCpw ? "eye" : "eye-off"} size={19} color="rgba(255,255,255,0.35)" />
              </Pressable>
            </View>
          </Field>

          {/* ── Phone ────────────────────────────── */}
          <Field label="Mobile Number" required>
            <View style={s.phoneRow}>
              <Pressable style={s.countryBtn} onPress={() => setShowCountryPicker(true)}>
                <Text style={s.countryBtnFlag}>{country.flag}</Text>
                <Text style={s.countryBtnDial}>{country.dial}</Text>
                <MaterialCommunityIcons name="chevron-down" size={15} color="rgba(255,255,255,0.5)" />
              </Pressable>
              <View style={[s.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={[s.input, { paddingLeft: 14 }]}
                  placeholder="Phone number"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </Field>

          {/* ── Referral ─────────────────────────── */}
          <Field label="Referral Code">
            <View style={s.inputWrap}>
              <MaterialCommunityIcons name="ticket-outline" size={19} color="rgba(255,255,255,0.35)" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Optional"
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={referral}
                onChangeText={setReferral}
                autoCapitalize="characters"
              />
            </View>
          </Field>

          {/* ── Register button ───────────────────── */}
          <Pressable
            style={[s.submitWrap, (loading || otpPhase !== "verified") && { opacity: otpPhase !== "verified" ? 0.45 : 0.7 }]}
            onPress={handleRegister}
            disabled={loading || otpPhase !== "verified"}
          >
            <LinearGradient colors={GRAD} style={s.submitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitText}>
                  {otpPhase !== "verified" ? "Verify email to continue" : "Sign up"}
                </Text>
              )}
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
  root: { flex: 1, backgroundColor: "#0A0E1A" },
  scroll: { paddingHorizontal: 22 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 32 },
  logoCircle: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  brandName: { color: "#fff", fontSize: 19, fontWeight: "700" },
  heading: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 5, letterSpacing: -0.4 },
  subheading: { color: "rgba(255,255,255,0.38)", fontSize: 14, marginBottom: 26, lineHeight: 20 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,107,107,0.1)", borderRadius: 10, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: "rgba(255,107,107,0.22)" },
  errorText: { color: "#FF6B6B", fontSize: 13, flex: 1 },
  label: { color: "rgba(255,255,255,0.6)", fontSize: 12.5, fontWeight: "600", marginBottom: 7, letterSpacing: 0.2 },
  inputWrap: { backgroundColor: "rgba(255,255,255,0.055)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", flexDirection: "row", alignItems: "center", height: 50, overflow: "hidden" },
  inputIcon: { marginLeft: 13, marginRight: 2 },
  input: { flex: 1, color: "#fff", fontSize: 15, paddingHorizontal: 11, height: "100%" },
  eyeBtn: { position: "absolute", right: 12, padding: 4 },
  // Email / OTP
  getCodeBtn: { position: "absolute", right: 6, backgroundColor: "rgba(92,191,254,0.10)", borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(92,191,254,0.25)" },
  getCodeText: { color: "#5CBFFE", fontWeight: "700", fontSize: 13 },
  verifiedBadgeSmall: { position: "absolute", right: 12 },
  otpSection: { marginTop: 10, gap: 8 },
  noEmailBanner: { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: "rgba(255,176,138,0.10)", borderRadius: 9, padding: 10, borderWidth: 1, borderColor: "rgba(255,176,138,0.22)" },
  noEmailText: { color: "#FFB08A", fontSize: 12, flex: 1, lineHeight: 18 },
  emailSentBanner: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(43,217,168,0.08)", borderRadius: 9, padding: 10, borderWidth: 1, borderColor: "rgba(43,217,168,0.18)" },
  emailSentText: { color: "#2BD9A8", fontSize: 12, flex: 1 },
  otpRow: { flexDirection: "row", gap: 10 },
  otpInput: { flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center", height: 52, letterSpacing: 6 },
  otpInputError: { borderColor: "rgba(255,107,107,0.5)" },
  verifyBtn: { width: 90, height: 52, borderRadius: 11, overflow: "hidden", alignItems: "center", justifyContent: "center", position: "relative" },
  verifyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14, zIndex: 1 },
  otpErrorText: { color: "#FF6B6B", fontSize: 12, marginTop: 2 },
  resendRow: { flexDirection: "row", justifyContent: "flex-end" },
  timerText: { color: "rgba(255,255,255,0.38)", fontSize: 12 },
  resendText: { color: "#5CBFFE", fontSize: 12, fontWeight: "600" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(43,217,168,0.08)", borderRadius: 9, padding: 10, marginTop: 8, borderWidth: 1, borderColor: "rgba(43,217,168,0.18)" },
  verifiedText: { color: "#2BD9A8", fontSize: 13, fontWeight: "600", flex: 1 },
  changeEmailBtn: { paddingHorizontal: 8 },
  changeEmailText: { color: "#5CBFFE", fontSize: 12, fontWeight: "600" },
  // Phone
  phoneRow: { flexDirection: "row", gap: 10 },
  countryBtn: { backgroundColor: "rgba(255,255,255,0.055)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", flexDirection: "row", alignItems: "center", height: 50, paddingHorizontal: 10, gap: 5 },
  countryBtnFlag: { fontSize: 18 },
  countryBtnDial: { color: "#fff", fontWeight: "600", fontSize: 13 },
  // Submit
  submitWrap: { borderRadius: 14, overflow: "hidden", marginTop: 20, marginBottom: 22 },
  submitBtn: { height: 54, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  switchLabel: { color: "rgba(255,255,255,0.45)", fontSize: 14 },
  switchLink: { color: "#5CBFFE", fontSize: 14, fontWeight: "700" },
  // Country modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  modalSheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: "70%", backgroundColor: "#111827", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 },
  modalHandle: { width: 38, height: 4, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 14 },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 9, paddingHorizontal: 11, gap: 7, marginBottom: 10, height: 42 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  countryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)", gap: 11 },
  countryFlag: { fontSize: 22 },
  countryName: { flex: 1, color: "#fff", fontSize: 14 },
  countryDial: { color: "rgba(255,255,255,0.45)", fontSize: 13 },
  // Loading overlay
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,14,26,0.97)", zIndex: 100, alignItems: "center", justifyContent: "center", gap: 20 },
  loadingRing: { width: 76, height: 76, borderRadius: 38, overflow: "hidden" },
  loadingTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  loadingSubText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
});
