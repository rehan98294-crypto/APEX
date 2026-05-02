import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image as RNImage,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useBalance } from "@/context/BalanceContext";
import { useOrders } from "@/context/OrderContext";
import { useTick } from "@/context/TickContext";
import { useReferral } from "@/hooks/useReferral";
import { authApi } from "@/lib/authApi";

const { width } = Dimensions.get("window");
const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];
const USD_ICON = require("../../assets/images/icon-usd.png");

// TEAM_STATS is now dynamic — built inside the component using live referral data

const TEAM_LINKS = [
  { icon: "users",    label: "Community\nenthusiasts",  route: "/my-team", params: { section: "enthusiasts" } },
  { icon: "award",    label: "Community\ncontribution", route: "/my-team", params: { section: "contribution" } },
  { icon: "list",     label: "Community\norders",       route: "/my-team", params: { section: "enthusiasts" } },
  { icon: "share-2",  label: "Referral",                route: "/my-team", params: { section: "referral" } },
];

const COMMON_FUNCS = [
  { icon: "book-open", label: "Tutorials" },
  { icon: "settings", label: "Settings" },
  { icon: "layers", label: "Mint" },
  { icon: "bookmark", label: "Collection" },
];

export default function ProfileScreen() {
  const { balance, earnedTotal, reserveProfit, todayReserveProfit, stakeEarned, todayStakeEarned } = useBalance();
  const { orders } = useOrders();
  const { user, token, signOut } = useAuth();
  const { activeBadgeTick, activeCircleTick } = useTick();
  const { stats: teamStats } = useReferral();
  const router = useRouter();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [teamRewardTotal, setTeamRewardTotal] = useState(0);
  const [teamRewardToday, setTeamRewardToday] = useState(0);
  const [teamRewardByLine, setTeamRewardByLine] = useState({ A: 0, B: 0, C: 0 });

  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [bannerImageUri, setBannerImageUri] = useState<string | null>(null);

  const processingOrders = orders.filter((o) => o.status === "processing");
  const boughtOrders = orders.filter((o) => o.status === "bought");
  const soldOrders = orders.filter((o) => o.status === "sold");
  const [uidVisible, setUidVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [has2FA, setHas2FA] = useState(false);

  // Change password state
  const [cpStep, setCpStep] = useState<"verify" | "password">("verify");
  const [cpEmailCode, setCpEmailCode] = useState("");
  const [cp2FACode, setCp2FACode] = useState("");
  const [cpOldPw, setCpOldPw] = useState("");
  const [cpNewPw, setCpNewPw] = useState("");
  const [cpConfirmPw, setCpConfirmPw] = useState("");
  const [cpSending, setCpSending] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpCodeSent, setCpCodeSent] = useState(false);
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Delete account state
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      authApi.twofa.getStatus(token)
        .then((s) => setHas2FA(s.enabled))
        .catch(() => {});
      authApi.rewards.getTeamReward(token)
        .then((r) => {
          setTeamRewardTotal(r.totalReward);
          setTeamRewardToday(r.todayReward);
          setTeamRewardByLine(r.byLine);
        })
        .catch(() => {});
    }
    AsyncStorage.getItem("apex_profile_image").then((v) => v && setProfileImageUri(v)).catch(() => {});
    AsyncStorage.getItem("apex_banner_image").then((v) => v && setBannerImageUri(v)).catch(() => {});
  }, [token]);

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfileImageUri(uri);
      AsyncStorage.setItem("apex_profile_image", uri).catch(() => {});
    }
  };

  const pickBannerImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setBannerImageUri(uri);
      AsyncStorage.setItem("apex_banner_image", uri).catch(() => {});
    }
  };

  const initials = user?.username
    ? user.username.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "JD";

  const openChangePw = () => {
    setCpStep("verify"); setCpEmailCode(""); setCp2FACode("");
    setCpOldPw(""); setCpNewPw(""); setCpConfirmPw("");
    setCpError(null); setCpSuccess(false); setCpCodeSent(false);
    setCpLoading(false); setCpSending(false);
    setChangePwOpen(true);
  };

  const sendCpCode = async () => {
    if (!user?.email) return;
    setCpSending(true); setCpError(null);
    try {
      await authApi.sendCode(user.email, "verify");
      setCpCodeSent(true);
    } catch (e: any) { setCpError(e.message ?? "Failed to send code"); }
    finally { setCpSending(false); }
  };

  const handleChangePassword = async () => {
    if (!token || !user?.email) return;
    setCpLoading(true); setCpError(null);
    try {
      await authApi.changePassword(token, {
        oldPassword: cpOldPw,
        newPassword: cpNewPw,
        confirmPassword: cpConfirmPw,
        emailCode: cpEmailCode,
        twoFaCode: has2FA ? cp2FACode : undefined,
      });
      setCpSuccess(true);
    } catch (e: any) { setCpError(e.message ?? "Failed to change password"); }
    finally { setCpLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleting(true); setDeleteError(null);
    try {
      await authApi.deleteAccount(token);
      setDeleteConfirmOpen(false);
      setSettingsOpen(false);
      await signOut();
      router.replace("/auth/login");
    } catch (e: any) {
      setDeleteError(e.message ?? "Deletion failed");
      setDeleting(false);
    }
  };

  const comprehensiveTotal = reserveProfit + stakeEarned + teamRewardTotal;
  const comprehensiveToday = todayReserveProfit + todayStakeEarned + teamRewardToday;

  const INCOME_ROWS = [
    { label: "Comprehensive", daily: comprehensiveToday.toFixed(2), total: comprehensiveTotal.toFixed(2), star: false },
    { label: "Reserve",       daily: todayReserveProfit.toFixed(2), total: reserveProfit.toFixed(2),      star: false },
    { label: "Team",          daily: teamRewardToday.toFixed(2),    total: teamRewardTotal.toFixed(2),    star: false },
    { label: "Activity",      daily: "0.00",                        total: "0.00",                        star: false },
    { label: "Missions",      daily: "0.00",                        total: "0.00",                        star: false },
    { label: "Stake",         daily: todayStakeEarned.toFixed(2),   total: stakeEarned.toFixed(2),        star: true  },
  ];

  const TEAM_STATS = [
    { label: "Community\nrewards", value: teamRewardTotal.toFixed(2) },
    { label: "Valid\nMembers",     value: String(teamStats.validMembers) },
    { label: "A enthusiast",       value: String(teamStats.A.total) },
    { label: "B+C\nenthusiasts",   value: String(teamStats.B.total + teamStats.C.total) },
  ];

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <StickyGlassHeader showBalance={false} showMenu={false} />

        {/* ── Profile Header ── */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.profileHeader}>
          {bannerImageUri
            ? <Image source={{ uri: bannerImageUri }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} contentFit="cover" />
            : <LinearGradient colors={["#D0F0FF", "#E6F8FF", "#F8F0FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          }
          <Pressable style={styles.bannerEditBtn} onPress={pickBannerImage}>
            <Feather name="camera" size={13} color="#fff" />
          </Pressable>

          <View style={styles.profileTopRow}>
            <Pressable style={styles.avatarWrap} onPress={pickProfileImage}>
              {profileImageUri
                ? <Image source={{ uri: profileImageUri }} style={styles.avatarGrad} contentFit="cover" />
                : <LinearGradient colors={["#5CBFFE", "#2BD9A8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarGrad}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </LinearGradient>
              }
              <View style={styles.avatarVerify}>
                <Feather name="check" size={8} color="#fff" />
              </View>
            </Pressable>

            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.nameRow}>
                <Text style={styles.nameHidden}>{user?.username ?? "James Doe"}</Text>
                {activeBadgeTick && (
                  <View style={{ marginLeft: 5 }}>
                    {activeBadgeTick.imageSource ? (
                      <Image source={activeBadgeTick.imageSource} style={{ width: 20, height: 20 }} contentFit="contain" />
                    ) : (
                      <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: activeBadgeTick.color, alignItems: "center", justifyContent: "center" }}>
                        <Feather name="check" size={11} color="#fff" />
                      </View>
                    )}
                  </View>
                )}
                {activeCircleTick && (
                  <View style={{ marginLeft: 4 }}>
                    {activeCircleTick.imageSource ? (
                      <Image source={activeCircleTick.imageSource} style={{ width: 20, height: 20 }} contentFit="contain" />
                    ) : (
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: activeCircleTick.color, alignItems: "center", justifyContent: "center" }}>
                        <Feather name="check" size={11} color="#fff" />
                      </View>
                    )}
                  </View>
                )}
              </View>
              <View style={styles.uidRow}>
                <Text style={styles.uidLabel}>UID : </Text>
                <Text style={styles.uidValue}>{uidVisible ? "TF29834" : "••••••"}</Text>
                <Pressable onPress={() => setUidVisible((v) => !v)} style={{ marginLeft: 4 }}>
                  <Feather name={uidVisible ? "eye" : "eye-off"} size={12} color={Colors.textMuted} />
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.calendarBtn}>
              <Feather name="calendar" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.pillsRow}>
            <Pressable style={styles.pill}>
              <Feather name="user" size={12} color={Colors.textSecondary} />
              <Text style={styles.pillText}>Level 2</Text>
              <Feather name="chevron-right" size={12} color={Colors.textMuted} />
            </Pressable>
            <Pressable style={styles.pill}>
              <Text style={styles.pillText}>350 Points</Text>
              <Feather name="chevron-right" size={12} color={Colors.textMuted} />
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Wallet Balance Card ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.card}>
          <View style={styles.balanceSection}>
            <Text style={styles.balanceSectionLabel}>Wallet Balance</Text>
            <View style={styles.balanceBigRow}>
              <View style={styles.tIconMd}><Text style={styles.tIconMdText}>T</Text></View>
              <Text style={styles.balanceBig}>{balance.toFixed(1)}</Text>
            </View>
          </View>

          {/* Income Table */}
          <View style={styles.incomeTable}>
            <View style={styles.incomeTableHeader}>
              <View style={{ flex: 1.6 }} />
              <Text style={[styles.incomeColLabel, { flex: 1.2 }]}>Daily income</Text>
              <Text style={[styles.incomeColLabel, { flex: 1.2, textAlign: "right" }]}>Total income</Text>
            </View>

            {INCOME_ROWS.map((row, i) => (
              <View key={row.label} style={[styles.incomeRow, i < INCOME_ROWS.length - 1 && styles.incomeRowBorder]}>
                <Text style={styles.incomeRowLabel}>{row.label}</Text>
                <View style={[styles.incomeCell, { flex: 1.2 }]}>
                  {row.star
                    ? <View style={styles.starIconXs}><Text style={styles.starIconXsText}>★</Text></View>
                    : <View style={styles.tIconXs}><Text style={styles.tIconXsText}>T</Text></View>}
                  <Text style={styles.incomeCellValue}>{row.daily}</Text>
                </View>
                <View style={[styles.incomeCell, { flex: 1.2, justifyContent: "flex-end" }]}>
                  {row.star
                    ? <View style={styles.starIconXs}><Text style={styles.starIconXsText}>★</Text></View>
                    : <View style={styles.tIconXs}><Text style={styles.tIconXsText}>T</Text></View>}
                  <Text style={[styles.incomeCellValue, parseFloat(row.total) > 0 && { color: Colors.textPrimary, fontFamily: "Inter_700Bold" }]}>
                    {row.total}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── My Team ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.card}>
          <Text style={styles.cardTitle}>My Team</Text>

          <View style={styles.teamStatsRow}>
            {TEAM_STATS.map((s) => (
              <View key={s.label} style={styles.teamStatItem}>
                <Text style={styles.teamStatValue}>{s.value}</Text>
                <Text style={styles.teamStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.linkGrid}>
            {TEAM_LINKS.map((link) => (
              <Pressable
                key={link.label}
                style={styles.linkItem}
                onPress={() => link.route && router.push({ pathname: link.route as any, params: link.params })}
              >
                <View style={styles.linkIconBox}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={26} />
                  <Feather name={link.icon as any} size={22} color="#fff" />
                </View>
                <Text style={styles.linkLabel}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ── My Orders ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>My Orders</Text>
            <Pressable style={styles.checkOrdersBtn}>
              <Text style={styles.checkOrdersText}>Check Orders</Text>
              <Feather name="chevron-right" size={14} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.teamStatsRow}>
            {[
              { label: "Orders", value: String(orders.length) },
              { label: "Processing", value: String(processingOrders.length) },
              { label: "Bought", value: String(boughtOrders.length) },
              { label: "Sold", value: String(soldOrders.length) },
            ].map((s) => (
              <View key={s.label} style={styles.teamStatItem}>
                <Text style={styles.teamStatValue}>{s.value}</Text>
                <Text style={styles.teamStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.linkGrid}>
            {[
              { icon: "user",        label: "My Bid",  isUsd: false },
              { icon: "file-text",   label: "Details", isUsd: false },
              { icon: "credit-card", label: "Deposit", isUsd: false },
              { icon: "download",    label: "Withdraw", isUsd: true },
            ].map((link) => (
              <Pressable
                key={link.label}
                style={styles.linkItem}
                onPress={link.label === "Deposit" ? () => router.push("/(tabs)/earn") : undefined}
              >
                <View style={styles.linkIconBox}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={26} />
                  {link.isUsd
                    ? <RNImage source={USD_ICON} style={{ width: 22, height: 22 }} tintColor="#fff" resizeMode="contain" />
                    : <Feather name={link.icon as any} size={22} color="#fff" />
                  }
                </View>
                <Text style={styles.linkLabel}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ── Common Functions ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)} style={styles.card}>
          <Text style={styles.cardTitle}>Common Functions</Text>
          <View style={styles.linkGrid}>
            {COMMON_FUNCS.map((fn) => (
              <Pressable
                key={fn.label}
                style={styles.linkItem}
                onPress={fn.label === "Settings" ? () => setSettingsOpen(true) : undefined}
              >
                <View style={styles.linkIconBox}>
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={26} />
                  <Feather name={fn.icon as any} size={22} color="#fff" />
                </View>
                <Text style={styles.linkLabel}>{fn.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

      </ScrollView>

      {/* ── Settings Modal ── */}
      <Modal visible={settingsOpen} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={stScreen.root}>
          <View style={stScreen.modalTopBar}>
            <Text style={stScreen.modalTopTitle}>Settings</Text>
            <Pressable style={stScreen.xBtn} onPress={() => setSettingsOpen(false)}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Profile mini-header */}
            <View style={stScreen.profileCard}>
              <LinearGradient colors={["#D0F0FF", "#E6F8FF", "#F8F0FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={20} />
              <View style={stScreen.profileRow}>
                <Pressable style={stScreen.avatarRing} onPress={pickProfileImage}>
                  {profileImageUri
                    ? <Image source={{ uri: profileImageUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    : <>
                        <LinearGradient colors={["#5CBFFE", "#2BD9A8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={32} />
                        <Feather name="user" size={28} color="#fff" />
                      </>
                  }
                </Pressable>
                <View style={stScreen.profileInfo}>
                  <Text style={stScreen.profileName}>{user?.username ?? "— —"}</Text>
                  <Text style={stScreen.profilePoints}>Points : — —</Text>
                </View>
              </View>
            </View>

            {/* 2FA + User Settings */}
            <View style={stScreen.card}>
              <Pressable
                style={[stScreen.verifyBox, { flexDirection: "row", paddingHorizontal: 18, gap: 14 }]}
                onPress={() => { setSettingsOpen(false); router.push("/security-2fa"); }}
              >
                <Feather name="shield" size={26} color="#5CBFFE" />
                <View style={{ flex: 1 }}>
                  <Text style={stScreen.verifyLabel}>Two-Factor Auth (2FA)</Text>
                  <Text style={stScreen.verifySubLabel}>Google Authenticator</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#9CA3AF" />
              </Pressable>
              <View style={stScreen.cardDivider} />
              <Pressable style={stScreen.verifyBox} onPress={() => setUserSettingsOpen(true)}>
                <Feather name="user" size={28} color="#5CBFFE" />
                <Text style={stScreen.verifyLabel}>User Settings</Text>
              </Pressable>
            </View>

            {/* Change Password + Line Settings */}
            <View style={stScreen.listCard}>
              <Pressable style={stScreen.listRow} onPress={openChangePw}>
                <Feather name="lock" size={20} color={Colors.textPrimary} style={{ marginRight: 14 }} />
                <Text style={stScreen.listRowLabel}>Change Password</Text>
                <Feather name="chevron-right" size={18} color={Colors.textMuted} />
              </Pressable>
              <View style={stScreen.listDivider} />
              <Pressable style={stScreen.listRow}>
                <Feather name="sliders" size={20} color={Colors.textPrimary} style={{ marginRight: 14 }} />
                <Text style={stScreen.listRowLabel}>Line Settings</Text>
                <Feather name="chevron-right" size={18} color={Colors.textMuted} />
              </Pressable>
            </View>

            <Text style={stScreen.versionText}>Version v3.0.6</Text>

            {/* Log out */}
            <Pressable
              style={stScreen.actionBtn}
              onPress={async () => {
                setSettingsOpen(false);
                await signOut();
                router.replace("/auth/login");
              }}
            >
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={30} />
              <Text style={stScreen.actionBtnText}>Log out</Text>
            </Pressable>

            {/* Delete account */}
            <Pressable style={stScreen.deleteBtn} onPress={() => { setDeleteError(null); setDeleteConfirmOpen(true); }}>
              <Text style={stScreen.deleteBtnText}>Delete account</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── User Settings Modal ── */}
      <Modal visible={userSettingsOpen} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={stScreen.root}>
          <View style={stScreen.modalTopBar}>
            <Text style={stScreen.modalTopTitle}>User Info</Text>
            <Pressable style={stScreen.xBtn} onPress={() => setUserSettingsOpen(false)}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={stScreen.userSettingsContent}>

            {/* Avatar */}
            <Pressable style={stScreen.uiAvatarWrap} onPress={pickProfileImage}>
              {profileImageUri
                ? <Image source={{ uri: profileImageUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                : <>
                    <LinearGradient colors={["#5CBFFE", "#2BD9A8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={44} />
                    <Feather name="user" size={38} color="#fff" />
                  </>
              }
            </Pressable>

            {[
              { label: "Full Name",   value: user?.username ?? "— —" },
              { label: "Username",    value: user?.username ?? "— —" },
              { label: "Email",       value: user?.email    ?? "— —" },
              { label: "Phone",       value: user?.phone    ?? "— —" },
              { label: "User ID",     value: user?.id       ? user.id.slice(0, 8).toUpperCase() + "…" : "— —" },
              { label: "Nationality", value: "— —" },
              { label: "Gender",      value: "— —" },
              { label: "Wallet Address", value: "— —" },
            ].map((field) => (
              <View key={field.label} style={stScreen.fieldGroup}>
                <Text style={stScreen.fieldLabel}>{field.label}</Text>
                <View style={stScreen.fieldBox}>
                  <Text style={stScreen.fieldValue}>{field.value}</Text>
                  <View style={stScreen.fieldReadBadge}>
                    <Text style={stScreen.fieldReadBadgeText}>Read-only</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Change Password Modal ── */}
      <Modal visible={changePwOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setChangePwOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={stScreen.root}>
            <View style={stScreen.modalTopBar}>
              <Text style={stScreen.modalTopTitle}>Change Password</Text>
              <Pressable style={stScreen.xBtn} onPress={() => setChangePwOpen(false)}>
                <Feather name="x" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
              {cpSuccess ? (
                <Animated.View entering={FadeIn.duration(300)} style={stScreen.successBox}>
                  <Feather name="check-circle" size={52} color="#2BD9A8" />
                  <Text style={stScreen.successTitle}>Password Changed!</Text>
                  <Text style={stScreen.successSub}>Your password has been updated successfully.</Text>
                  <Pressable style={stScreen.cpSubmitBtn} onPress={() => setChangePwOpen(false)}>
                    <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                    <Text style={stScreen.cpSubmitText}>Done</Text>
                  </Pressable>
                </Animated.View>
              ) : (
                <>
                  {/* Step indicator */}
                  <View style={stScreen.stepRow}>
                    <View style={[stScreen.stepDot, { backgroundColor: "#5CBFFE" }]} />
                    <View style={[stScreen.stepLine, cpStep === "password" && { backgroundColor: "#5CBFFE" }]} />
                    <View style={[stScreen.stepDot, cpStep === "password" && { backgroundColor: "#5CBFFE" }]} />
                  </View>
                  <View style={stScreen.stepLabels}>
                    <Text style={stScreen.stepLabel}>Verify Identity</Text>
                    <Text style={[stScreen.stepLabel, { textAlign: "right" }]}>New Password</Text>
                  </View>

                  {cpStep === "verify" && (
                    <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16, marginTop: 8 }}>
                      <Text style={stScreen.cpSectionLabel}>Email Verification</Text>

                      {/* Email code row */}
                      <View style={stScreen.cpCodeRow}>
                        <TextInput
                          style={[stScreen.cpInput, { flex: 1 }]}
                          placeholder="6-digit email code"
                          placeholderTextColor={Colors.textMuted}
                          value={cpEmailCode}
                          onChangeText={setCpEmailCode}
                          keyboardType="number-pad"
                          maxLength={6}
                        />
                        <Pressable style={stScreen.sendCodeBtn} onPress={sendCpCode} disabled={cpSending}>
                          {cpSending
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={stScreen.sendCodeText}>{cpCodeSent ? "Resend" : "Send Code"}</Text>
                          }
                        </Pressable>
                      </View>
                      {cpCodeSent && (
                        <Text style={stScreen.cpHint}>Code sent to {user?.email}</Text>
                      )}

                      {/* 2FA code (only if enabled) */}
                      {has2FA && (
                        <>
                          <Text style={stScreen.cpSectionLabel}>Authenticator Code</Text>
                          <TextInput
                            style={stScreen.cpInput}
                            placeholder="6-digit 2FA code"
                            placeholderTextColor={Colors.textMuted}
                            value={cp2FACode}
                            onChangeText={setCp2FACode}
                            keyboardType="number-pad"
                            maxLength={6}
                          />
                        </>
                      )}

                      {cpError && (
                        <View style={stScreen.cpError}>
                          <Feather name="alert-circle" size={14} color="#FF5C5C" />
                          <Text style={stScreen.cpErrorText}>{cpError}</Text>
                        </View>
                      )}

                      <Pressable
                        style={stScreen.cpSubmitBtn}
                        onPress={() => {
                          setCpError(null);
                          if (!cpEmailCode || cpEmailCode.length < 6) { setCpError("Enter the 6-digit email code"); return; }
                          if (has2FA && (!cp2FACode || cp2FACode.length < 6)) { setCpError("Enter your 2FA code"); return; }
                          setCpStep("password");
                        }}
                      >
                        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                        <Text style={stScreen.cpSubmitText}>Continue</Text>
                      </Pressable>
                    </Animated.View>
                  )}

                  {cpStep === "password" && (
                    <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16, marginTop: 8 }}>
                      <Text style={stScreen.cpSectionLabel}>Current Password</Text>
                      <View style={stScreen.cpPwRow}>
                        <TextInput
                          style={[stScreen.cpInput, { flex: 1 }]}
                          placeholder="Enter current password"
                          placeholderTextColor={Colors.textMuted}
                          value={cpOldPw}
                          onChangeText={setCpOldPw}
                          secureTextEntry={!showOldPw}
                        />
                        <Pressable style={stScreen.eyeToggle} onPress={() => setShowOldPw(v => !v)}>
                          <Feather name={showOldPw ? "eye" : "eye-off"} size={18} color={Colors.textMuted} />
                        </Pressable>
                      </View>

                      <Text style={stScreen.cpSectionLabel}>New Password</Text>
                      <View style={stScreen.cpPwRow}>
                        <TextInput
                          style={[stScreen.cpInput, { flex: 1 }]}
                          placeholder="Enter new password (min. 8 chars)"
                          placeholderTextColor={Colors.textMuted}
                          value={cpNewPw}
                          onChangeText={setCpNewPw}
                          secureTextEntry={!showNewPw}
                        />
                        <Pressable style={stScreen.eyeToggle} onPress={() => setShowNewPw(v => !v)}>
                          <Feather name={showNewPw ? "eye" : "eye-off"} size={18} color={Colors.textMuted} />
                        </Pressable>
                      </View>

                      <Text style={stScreen.cpSectionLabel}>Confirm New Password</Text>
                      <View style={stScreen.cpPwRow}>
                        <TextInput
                          style={[stScreen.cpInput, { flex: 1 }]}
                          placeholder="Re-enter new password"
                          placeholderTextColor={Colors.textMuted}
                          value={cpConfirmPw}
                          onChangeText={setCpConfirmPw}
                          secureTextEntry={!showConfirmPw}
                        />
                        <Pressable style={stScreen.eyeToggle} onPress={() => setShowConfirmPw(v => !v)}>
                          <Feather name={showConfirmPw ? "eye" : "eye-off"} size={18} color={Colors.textMuted} />
                        </Pressable>
                      </View>

                      {cpError && (
                        <View style={stScreen.cpError}>
                          <Feather name="alert-circle" size={14} color="#FF5C5C" />
                          <Text style={stScreen.cpErrorText}>{cpError}</Text>
                        </View>
                      )}

                      <Pressable style={stScreen.cpSubmitBtn} onPress={handleChangePassword} disabled={cpLoading}>
                        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={14} />
                        {cpLoading
                          ? <ActivityIndicator color="#fff" />
                          : <Text style={stScreen.cpSubmitText}>Change Password</Text>
                        }
                      </Pressable>
                    </Animated.View>
                  )}
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Delete Account Confirm Modal ── */}
      <Modal visible={deleteConfirmOpen} animationType="fade" transparent>
        <View style={stScreen.delOverlay}>
          <Animated.View entering={FadeIn.duration(200)} style={stScreen.delCard}>
            <View style={stScreen.delIconWrap}>
              <Feather name="alert-triangle" size={32} color="#FF5C5C" />
            </View>
            <Text style={stScreen.delTitle}>Delete Account?</Text>
            <Text style={stScreen.delSub}>
              This will permanently delete your account and all associated data. This action cannot be undone.
            </Text>

            {deleteError && (
              <View style={stScreen.cpError}>
                <Feather name="alert-circle" size={14} color="#FF5C5C" />
                <Text style={stScreen.cpErrorText}>{deleteError}</Text>
              </View>
            )}

            <View style={stScreen.delBtnRow}>
              <Pressable
                style={stScreen.delCancelBtn}
                onPress={() => { setDeleteConfirmOpen(false); setDeleteError(null); }}
                disabled={deleting}
              >
                <Text style={stScreen.delCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={stScreen.delConfirmBtn} onPress={handleDeleteAccount} disabled={deleting}>
                {deleting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={stScreen.delConfirmText}>Yes, Delete</Text>
                }
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const stScreen = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  userSettingsContent: { paddingHorizontal: 20, paddingBottom: 60 },

  modalTopBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTopTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  xBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.offWhite, alignItems: "center", justifyContent: "center",
  },

  deleteBtn: {
    marginHorizontal: 20, marginBottom: 14,
    height: 52, borderRadius: 30, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#FF5C5C",
  },
  deleteBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FF5C5C" },

  uiAvatarWrap: {
    width: 88, height: 88, borderRadius: 44, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginTop: 24, marginBottom: 28,
  },
  fieldValue: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  fieldReadBadge: {
    backgroundColor: "#EFF6FF", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  fieldReadBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#5CBFFE" },

  stepRow: { flexDirection: "row", alignItems: "center", marginTop: 24, marginBottom: 6 },
  stepDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.border,
  },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  stepLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  stepLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },

  cpSectionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  cpCodeRow: { flexDirection: "row", gap: 10 },
  cpInput: {
    backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textPrimary,
  },
  sendCodeBtn: {
    backgroundColor: "#5CBFFE", borderRadius: 12,
    paddingHorizontal: 14, alignItems: "center", justifyContent: "center", minWidth: 90,
  },
  sendCodeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  cpHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: -8 },

  cpPwRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingRight: 12,
  },
  eyeToggle: { padding: 6 },

  cpError: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF0F0", borderRadius: 10, padding: 12,
  },
  cpErrorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#FF5C5C", flex: 1 },

  cpSubmitBtn: {
    height: 52, borderRadius: 14, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  cpSubmitText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", zIndex: 1 },

  successBox: {
    alignItems: "center", gap: 14,
    backgroundColor: "#F0FBF7", borderRadius: 20,
    padding: 32, marginTop: 40,
    borderWidth: 1, borderColor: "#B3EDD8",
  },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },

  delOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  delCard: {
    backgroundColor: "#fff", borderRadius: 24,
    padding: 28, width: "100%", gap: 12,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  delIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#FFF0F0", alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 4,
  },
  delTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary, textAlign: "center" },
  delSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  delBtnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  delCancelBtn: {
    flex: 1, height: 50, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  delCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  delConfirmBtn: {
    flex: 1, height: 50, borderRadius: 14,
    backgroundColor: "#FF5C5C", alignItems: "center", justifyContent: "center",
  },
  delConfirmText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },

  profileCard: {
    margin: 14,
    borderRadius: 20,
    overflow: "hidden",
    padding: 18,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarRing: {
    width: 64, height: 64, borderRadius: 32,
    overflow: "hidden", alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "#fff",
  },
  profileInfo: { gap: 4 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  profilePoints: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },

  card: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: "#fff", borderRadius: 20,
    flexDirection: "row",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    overflow: "hidden",
  },
  verifyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 22, gap: 8 },
  verifyLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  verifySubLabel: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  verifyStatus: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#5CBFFE" },
  cardDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 16 },

  listCard: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: "#fff", borderRadius: 20,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    overflow: "hidden",
  },
  listRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 18 },
  listRowLabel: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  listDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 18 },

  versionText: {
    textAlign: "center", fontSize: 13,
    fontFamily: "Inter_400Regular", color: Colors.textMuted,
    marginBottom: 20, marginTop: 4,
  },

  actionBtn: {
    marginHorizontal: 20, marginBottom: 14,
    height: 52, borderRadius: 30, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  actionBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  userSettingsHeader: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 16, gap: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.offWhite, alignItems: "center", justifyContent: "center",
  },
  userSettingsTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary, flex: 1, textAlign: "center", marginRight: 36 },

  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textPrimary, marginBottom: 8 },
  fieldBox: {
    backgroundColor: Colors.offWhite, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", minHeight: 52,
  },
  dropdownBox: {
    backgroundColor: Colors.offWhite, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    alignSelf: "flex-start", minWidth: 120,
  },
  dropdownPlaceholder: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginRight: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  profileHeader: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
    padding: 18,
    gap: 14,
  },
  profileTopRow: { flexDirection: "row", alignItems: "center", gap: 14 },

  bannerEditBtn: {
    position: "absolute", top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.40)",
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },

  avatarWrap: { position: "relative" },
  avatarGrad: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  avatarInitials: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarVerify: {
    position: "absolute", bottom: 1, right: 1,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#5CBFFE",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#fff",
  },

  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameHidden: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, letterSpacing: 2 },
  uidRow: { flexDirection: "row", alignItems: "center" },
  uidLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  uidValue: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, letterSpacing: 2 },

  calendarBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center", justifyContent: "center",
  },

  pillsRow: { flexDirection: "row", gap: 10 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.9)",
  },
  pillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },

  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 16,
  },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  checkOrdersBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  checkOrdersText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },

  balanceSection: { gap: 8 },
  balanceSectionLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  balanceBigRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tIconMd: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tIconMdText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  balanceBig: { fontSize: 36, fontFamily: "Inter_700Bold", color: Colors.textPrimary, letterSpacing: -0.5 },

  incomeTable: { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  incomeTableHeader: {
    flexDirection: "row",
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: Colors.offWhite,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  incomeColLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  incomeRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: "#fff",
  },
  incomeRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  incomeRowLabel: { flex: 1.6, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  incomeCell: { flexDirection: "row", alignItems: "center", gap: 5 },
  incomeCellValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  tIconXs: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  tIconXsText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff" },
  starIconXs: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFB800", alignItems: "center", justifyContent: "center" },
  starIconXsText: { fontSize: 9, color: "#fff" },

  teamStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  teamStatItem: { flex: 1, alignItems: "center", gap: 5 },
  teamStatValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  teamStatLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted, textAlign: "center" },

  divider: { height: 1, backgroundColor: Colors.border },

  linkGrid: { flexDirection: "row", justifyContent: "space-between" },
  linkItem: { flex: 1, alignItems: "center", gap: 10 },
  linkIconBox: {
    width: 52, height: 52, borderRadius: 26,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  linkLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary, textAlign: "center",
    lineHeight: 16,
  },
});
