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
  { code: "AR", flag: "🇦🇷", name: "Argentina", dial: "+54" },
  { code: "PK", flag: "🇵🇰", name: "Pakistan", dial: "+92" },
  { code: "BD", flag: "🇧🇩", name: "Bangladesh", dial: "+880" },
  { code: "EG", flag: "🇪🇬", name: "Egypt", dial: "+20" },
];

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
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Select Country</Text>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={styles.searchInput}
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
            <Pressable style={styles.countryRow} onPress={() => { onSelect(item); onClose(); }}>
              <Text style={styles.countryFlag}>{item.flag}</Text>
              <Text style={styles.countryName}>{item.name}</Text>
              <Text style={styles.countryDial}>{item.dial}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

function LoadingOverlay({ visible }: { visible: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })
      ).start();
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={styles.loadingOverlay}>
      <Animated.View style={[styles.loadingCircle, { transform: [{ rotate }, { scale }] }]}>
        <LinearGradient colors={GRAD} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Text style={styles.loadingText}>Creating your account…</Text>
      <Text style={styles.loadingSubText}>Just a moment</Text>
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    setTimer(120);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
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
    setSendingCode(true);
    try {
      await authApi.sendCode(email.trim(), "verify");
      setOtpSent(true);
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleRegister() {
    if (!username.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!otpSent || !otpCode.trim()) {
      setError("Please get and enter the email verification code.");
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
      const verify = await authApi.verifyCode(email.trim(), otpCode.trim());
      if (!verify.success) {
        setError("Incorrect verification code.");
        setLoading(false);
        return;
      }
      const result = await authApi.register({
        username: username.trim(),
        email: email.trim(),
        phone: `${country.dial}${phone.trim()}`,
        password,
        confirmPassword,
        referralCode: referral.trim() || undefined,
      });
      await new Promise((r) => setTimeout(r, 4000));
      await signIn(result.token, result.user);
      router.replace("/(tabs)/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <LoadingOverlay visible={loading} />
      <CountryPickerModal
        visible={showCountryPicker}
        onSelect={setCountry}
        onClose={() => setShowCountryPicker(false)}
      />
      <LinearGradient
        colors={["#0A0E1A", "#0D1525", "#0A0E1A"]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(43,217,168,0.12)", "transparent", "rgba(92,191,254,0.08)"]}
        style={[StyleSheet.absoluteFill, { height: 300 }]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoRow}>
            <LinearGradient colors={GRAD} style={styles.logoCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.logoText}>TF</Text>
            </LinearGradient>
            <Text style={styles.brandName}>TreasureFun</Text>
          </View>

          <Text style={styles.heading}>Sign up</Text>
          <Text style={styles.subheading}>Create your account and start earning</Text>

          {error ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username <Text style={{ color: "#FF6B6B" }}>*</Text></Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="account-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Email <Text style={{ color: "#FF6B6B" }}>*</Text></Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="email-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 88 }]}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Pressable
                style={[styles.codeBtn, (sendingCode || timer > 0) && { opacity: 0.6 }]}
                onPress={handleSendCode}
                disabled={sendingCode || timer > 0}
              >
                {sendingCode ? (
                  <ActivityIndicator size="small" color="#5CBFFE" />
                ) : timer > 0 ? (
                  <Text style={styles.codeBtnText}>{timer}s</Text>
                ) : (
                  <Text style={styles.codeBtnText}>Get</Text>
                )}
              </Pressable>
            </View>

            {otpSent && (
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>Verification Code <Text style={{ color: "#FF6B6B" }}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons name="shield-key-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                {timer > 0 && (
                  <Text style={styles.timerText}>Resend code in {timer}s</Text>
                )}
                {timer === 0 && otpSent && (
                  <Pressable onPress={handleSendCode} style={styles.resendBtn}>
                    <Text style={styles.resendText}>Resend code</Text>
                  </Pressable>
                )}
              </>
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Password <Text style={{ color: "#FF6B6B" }}>*</Text></Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="Min. 8 characters"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPw((v) => !v)}>
                <MaterialCommunityIcons name={showPw ? "eye" : "eye-off"} size={20} color="rgba(255,255,255,0.4)" />
              </Pressable>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password <Text style={{ color: "#FF6B6B" }}>*</Text></Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="Re-enter password"
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

            <Text style={[styles.label, { marginTop: 16 }]}>Mobile Number <Text style={{ color: "#FF6B6B" }}>*</Text></Text>
            <View style={styles.phoneRow}>
              <Pressable style={styles.countryBtn} onPress={() => setShowCountryPicker(true)}>
                <Text style={styles.countryBtnFlag}>{country.flag}</Text>
                <Text style={styles.countryBtnDial}>{country.dial}</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color="rgba(255,255,255,0.5)" />
              </Pressable>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={[styles.input, { paddingLeft: 14 }]}
                  placeholder="Phone number"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Referral Code <Text style={{ color: "rgba(255,255,255,0.35)" }}>(optional)</Text></Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="ticket-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter referral code"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={referral}
                onChangeText={setReferral}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <Pressable
            style={[styles.submitWrap, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <LinearGradient colors={GRAD} style={styles.submitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Sign up</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Have an account? </Text>
            <Pressable onPress={() => router.push("/auth/login")}>
              <Text style={styles.switchLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0E1A" },
  scroll: { paddingHorizontal: 24 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 36 },
  logoCircle: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  brandName: { color: "#fff", fontSize: 19, fontWeight: "700", letterSpacing: 0.3 },
  heading: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 6, letterSpacing: -0.5 },
  subheading: { color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 28, lineHeight: 20 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,107,107,0.12)", borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,107,107,0.25)" },
  errorText: { color: "#FF6B6B", fontSize: 13, flex: 1 },
  fieldGroup: { gap: 0 },
  label: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: "600", marginBottom: 8, letterSpacing: 0.2 },
  inputWrap: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", flexDirection: "row", alignItems: "center", height: 52 },
  inputIcon: { marginLeft: 14, marginRight: 2 },
  input: { flex: 1, color: "#fff", fontSize: 15, paddingHorizontal: 12, height: "100%" },
  eyeBtn: { position: "absolute", right: 12, padding: 4 },
  codeBtn: { position: "absolute", right: 6, backgroundColor: "rgba(92,191,254,0.12)", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(92,191,254,0.3)" },
  codeBtnText: { color: "#5CBFFE", fontWeight: "700", fontSize: 13 },
  timerText: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 6, textAlign: "right" },
  resendBtn: { alignSelf: "flex-end", marginTop: 6 },
  resendText: { color: "#5CBFFE", fontSize: 13, fontWeight: "600" },
  phoneRow: { flexDirection: "row", gap: 10 },
  countryBtn: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: 12, gap: 6 },
  countryBtnFlag: { fontSize: 20 },
  countryBtnDial: { color: "#fff", fontWeight: "600", fontSize: 14 },
  submitWrap: { borderRadius: 16, overflow: "hidden", marginTop: 28, marginBottom: 24 },
  submitBtn: { height: 56, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  switchLabel: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  switchLink: { color: "#5CBFFE", fontSize: 14, fontWeight: "700" },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: "70%", backgroundColor: "#111827", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, paddingHorizontal: 12, gap: 8, marginBottom: 12, height: 44 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  countryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)", gap: 12 },
  countryFlag: { fontSize: 24 },
  countryName: { flex: 1, color: "#fff", fontSize: 15 },
  countryDial: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,14,26,0.97)", zIndex: 100, alignItems: "center", justifyContent: "center", gap: 20 },
  loadingCircle: { width: 80, height: 80, borderRadius: 40, overflow: "hidden" },
  loadingText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  loadingSubText: { color: "rgba(255,255,255,0.45)", fontSize: 14 },
});
