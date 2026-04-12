import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import QRCode from "react-native-qrcode-svg";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useReferral, type DateFilter } from "@/hooks/useReferral";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];
const BLUE = "#5CBFFE";
const { width } = Dimensions.get("window");

type Tab = "qr" | "code" | "link" | "community";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "qr",        label: "Referral QR",   icon: "grid"     },
  { key: "code",      label: "Ref Code",       icon: "hash"     },
  { key: "link",      label: "Share Link",     icon: "link-2"   },
  { key: "community", label: "My Team",        icon: "users"    },
];

const FILTERS: { key: DateFilter; label: string }[] = [
  { key: "all",   label: "All"   },
  { key: "today", label: "Today" },
  { key: "week",  label: "Week"  },
];

export default function MyTeamScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("qr");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const {
    info, stats, filter, changeFilter,
    loadingInfo, loadingStat, error, refresh,
  } = useReferral();

  const topPad = Platform.OS === "web" ? 20 : insets.top;

  // ── Copy helper ──────────────────────────────────────────────────────────────
  async function copyText(text: string, which: "code" | "link") {
    await Clipboard.setStringAsync(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Share link ───────────────────────────────────────────────────────────────
  async function shareLink() {
    if (!info) return;
    if (Platform.OS === "web") {
      await copyText(info.referralLink, "link");
      return;
    }
    try {
      await Share.share({
        message: `Join Apex via my referral link: ${info.referralLink}`,
        url: info.referralLink,
      });
    } catch {}
  }

  // ── Referral code display ────────────────────────────────────────────────────
  const displayCode = info?.referralCode ?? "—";
  const displayLink = info?.referralLink ?? "—";

  return (
    <View style={s.root}>
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color="#1A1A2E" />
        </Pressable>
        <Text style={s.headerTitle}>My Team</Text>
        <Pressable style={s.backBtn} onPress={refresh} hitSlop={12}>
          <Feather name="refresh-cw" size={17} color="#7B8794" />
        </Pressable>
      </View>

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} style={s.tabItem} onPress={() => setTab(t.key)}>
              {active && (
                <LinearGradient
                  colors={GRAD}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
                />
              )}
              <Feather name={t.icon as any} size={14} color={active ? "#fff" : "#7B8794"} />
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* ══ TAB: QR Code ════════════════════════════════════════════════════ */}
        {tab === "qr" && (
          <Animated.View entering={FadeIn.duration(280)} style={s.tabContent}>
            <View style={s.qrCard}>
              <LinearGradient
                colors={["#E8F7FF", "#F0FFF9", "#FFF5F0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={s.qrWarning}>
                Share this QR to invite friends to join under your referral line.
              </Text>

              {loadingInfo ? (
                <ActivityIndicator color={BLUE} size="large" style={{ marginVertical: 60 }} />
              ) : (
                <View style={s.qrBox}>
                  <QRCode
                    value={displayLink !== "—" ? displayLink : "https://app.apexmeta.io"}
                    size={200}
                    color="#2563EB"
                    backgroundColor="#ffffff"
                  />
                </View>
              )}

              <Pressable style={s.saveQrBtn} onPress={() => copyText(displayLink, "link")}>
                <Feather name="download" size={15} color="#1A1A2E" style={{ marginRight: 6 }} />
                <Text style={s.saveQrText}>{copied === "link" ? "Copied!" : "Copy Link"}</Text>
              </Pressable>

              <Text style={s.qrDisclaimer}>
                Invitees who register using this QR code will be added to your A/B/C team line.
              </Text>

              <InfoRow label="USDT Deposit Address" value={displayCode} icon="copy" onPress={() => copyText(displayCode, "code")} />
              <InfoRow label="Chain" value="TRON (TRC-20)" />
            </View>
          </Animated.View>
        )}

        {/* ══ TAB: Referral Code ══════════════════════════════════════════════ */}
        {tab === "code" && (
          <Animated.View entering={FadeIn.duration(280)} style={s.tabContent}>
            <View style={s.codeCard}>
              <Text style={s.codeCardTitle}>Your Referral Code</Text>
              <Text style={s.codeCardSub}>
                Share this code with friends. When they register using it, they join your team line.
              </Text>

              {loadingInfo ? (
                <ActivityIndicator color={BLUE} style={{ marginVertical: 30 }} />
              ) : (
                <>
                  <View style={s.codeDisplayBox}>
                    <LinearGradient
                      colors={["#EBF8FF", "#F0FFF4"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={s.codeDisplayText} selectable>{displayCode}</Text>
                  </View>

                  <Pressable
                    style={[s.copyBtn, copied === "code" && s.copyBtnDone]}
                    onPress={() => copyText(displayCode, "code")}
                  >
                    <LinearGradient
                      colors={copied === "code" ? ["#2BD9A8", "#2BD9A8"] : GRAD}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                    />
                    <Feather name={copied === "code" ? "check" : "copy"} size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={s.copyBtnText}>{copied === "code" ? "Copied!" : "Copy Code"}</Text>
                  </Pressable>
                </>
              )}

              {info?.position && (
                <View style={s.positionBadge}>
                  <Text style={s.positionBadgeLabel}>Your position in your parent's team:</Text>
                  <View style={s.positionDot}>
                    <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={20} />
                    <Text style={s.positionDotText}>{info.position}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* How it works */}
            <View style={s.howCard}>
              <Text style={s.howTitle}>How the A/B/C System Works</Text>
              {[
                { pos: "A", desc: "Your 1st referral — highest earning line" },
                { pos: "B", desc: "Your 2nd referral — second line member" },
                { pos: "C", desc: "Your 3rd referral — third line member" },
              ].map(({ pos, desc }) => (
                <View key={pos} style={s.howRow}>
                  <View style={s.howDot}>
                    <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={16} />
                    <Text style={s.howDotText}>{pos}</Text>
                  </View>
                  <Text style={s.howDesc}>{desc}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ══ TAB: Share Link ═════════════════════════════════════════════════ */}
        {tab === "link" && (
          <Animated.View entering={FadeIn.duration(280)} style={s.tabContent}>
            <View style={s.codeCard}>
              <Text style={s.codeCardTitle}>Share Your Referral Link</Text>
              <Text style={s.codeCardSub}>
                Send this link to friends. They'll be automatically linked to your referral tree on registration.
              </Text>

              {loadingInfo ? (
                <ActivityIndicator color={BLUE} style={{ marginVertical: 30 }} />
              ) : (
                <>
                  <View style={[s.codeDisplayBox, { paddingHorizontal: 12 }]}>
                    <LinearGradient
                      colors={["#F3EEFF", "#EBF8FF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={[s.codeDisplayText, { fontSize: 12, letterSpacing: 0.3, textAlign: "center" }]} selectable numberOfLines={2}>
                      {displayLink}
                    </Text>
                  </View>

                  <View style={s.actionRow}>
                    <Pressable
                      style={[s.halfBtn, { marginRight: 8 }]}
                      onPress={() => copyText(displayLink, "link")}
                    >
                      <LinearGradient
                        colors={copied === "link" ? ["#2BD9A8", "#2BD9A8"] : ["#5CBFFE", "#2BD9A8"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                      />
                      <Feather name={copied === "link" ? "check" : "copy"} size={15} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={s.copyBtnText}>{copied === "link" ? "Copied!" : "Copy Link"}</Text>
                    </Pressable>
                    <Pressable style={[s.halfBtn, { marginLeft: 0 }]} onPress={shareLink}>
                      <LinearGradient
                        colors={["#FFB08A", "#FF6B6B"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                      />
                      <Feather name="share-2" size={15} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={s.copyBtnText}>Share</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            {/* Platform share buttons */}
            <View style={s.platformCard}>
              <Text style={s.platformTitle}>Share via</Text>
              <View style={s.platformRow}>
                {[
                  { icon: "message-circle", label: "Message", color: "#25D366" },
                  { icon: "send",           label: "Telegram", color: "#0088CC" },
                  { icon: "twitter",        label: "Twitter",  color: "#1DA1F2" },
                  { icon: "copy",           label: "Copy",     color: "#5CBFFE" },
                ].map((p) => (
                  <Pressable key={p.label} style={s.platformItem} onPress={p.label === "Copy" ? () => copyText(displayLink, "link") : shareLink}>
                    <View style={[s.platformIcon, { backgroundColor: p.color + "18" }]}>
                      <Feather name={p.icon as any} size={22} color={p.color} />
                    </View>
                    <Text style={s.platformLabel}>{p.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ══ TAB: My Team / Community ════════════════════════════════════════ */}
        {tab === "community" && (
          <Animated.View entering={FadeIn.duration(280)} style={s.tabContent}>
            {/* Date filter */}
            <View style={s.filterCard}>
              <View style={s.filterHeader}>
                <Text style={s.filterLabel}>Select date</Text>
                <Feather name="calendar" size={18} color="#7B8794" />
              </View>
              <View style={s.filterRow}>
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      style={[s.filterPill, active && s.filterPillActive]}
                      onPress={() => changeFilter(f.key)}
                    >
                      {active && (
                        <LinearGradient
                          colors={GRAD}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                        />
                      )}
                      <Text style={[s.filterPillText, active && s.filterPillTextActive]}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Stats grid */}
            <View style={s.statsCard}>
              {loadingStat ? (
                <ActivityIndicator color={BLUE} size="large" style={{ padding: 40 }} />
              ) : (
                <>
                  {/* Row 1: Total */}
                  <View style={s.statsRow}>
                    <StatCell value={stats.totalMembers} label="Total Registered Member" accent />
                    <View style={s.statsDivider} />
                    <StatCell value={stats.validMembers} label="Total Valid Member" />
                  </View>
                  <View style={s.statsHR} />

                  {/* Row 2: A */}
                  <View style={s.statsRow}>
                    <StatCell value={stats.A.total} label="Member A" />
                    <View style={s.statsDivider} />
                    <StatCell value={stats.A.valid} label="Valid A" />
                  </View>
                  <View style={s.statsHR} />

                  {/* Row 3: B */}
                  <View style={s.statsRow}>
                    <StatCell value={stats.B.total} label="Member B" />
                    <View style={s.statsDivider} />
                    <StatCell value={stats.B.valid} label="Valid B" />
                  </View>
                  <View style={s.statsHR} />

                  {/* Row 4: C */}
                  <View style={s.statsRow}>
                    <StatCell value={stats.C.total} label="Member C" />
                    <View style={s.statsDivider} />
                    <StatCell value={stats.C.valid} label="Valid C" />
                  </View>
                </>
              )}
            </View>

            {/* Community action buttons */}
            <View style={s.communityGrid}>
              <CommunityBtn
                icon="users"
                title="Community Enthusiasts"
                subtitle="View your active referrals"
                onPress={() => {}}
              />
              <CommunityBtn
                icon="award"
                title="Community Contribution"
                subtitle="See your earnings from the team"
                onPress={() => {}}
              />
              <CommunityBtn
                icon="list"
                title="Community Orders"
                subtitle="Track orders within your team"
                onPress={() => {}}
              />
              <CommunityBtn
                icon="trending-up"
                title="Team Performance"
                subtitle="Deposits & activity overview"
                onPress={() => {}}
              />
            </View>

            {/* Deposit activation info */}
            <View style={s.infoCard}>
              <Feather name="info" size={16} color={BLUE} style={{ marginTop: 1, flexShrink: 0 }} />
              <Text style={s.infoText}>
                A member becomes a <Text style={{ fontWeight: "700" }}>Valid Member</Text> only after they make a successful deposit. Valid members count towards your team rewards.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Error */}
        {!!error && (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color="#E53935" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <View style={s.statCell}>
      <Text style={[s.statValue, accent && s.statValueAccent]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function CommunityBtn({
  icon, title, subtitle, onPress
}: { icon: string; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={s.commBtn} onPress={onPress}>
      <View style={s.commBtnIcon}>
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
        <Feather name={icon as any} size={22} color="#fff" />
      </View>
      <Text style={s.commBtnTitle}>{title}</Text>
      <Text style={s.commBtnSub}>{subtitle}</Text>
    </Pressable>
  );
}

function InfoRow({
  label, value, icon, onPress
}: { label: string; value: string; icon?: string; onPress?: () => void }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoRowLabel}>{label}</Text>
      <Pressable style={s.infoRowValue} onPress={onPress}>
        <Text style={s.infoRowValueText} selectable numberOfLines={1} ellipsizeMode="middle">
          {value}
        </Text>
        {icon && <Feather name={icon as any} size={16} color="#7B8794" style={{ marginLeft: 8 }} />}
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#F8F9FB" },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#F8F9FB",
    borderBottomWidth: 1, borderBottomColor: "#F0F2F7",
  },
  backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E" },

  // Tab bar
  tabBar: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "#F8F9FB", gap: 6,
  },
  tabItem: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 22, overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#E5E8EE",
  },
  tabLabel:       { fontSize: 11, fontWeight: "600", color: "#7B8794" },
  tabLabelActive: { color: "#fff" },

  tabContent: { paddingTop: 4 },

  // ── QR tab ────────────────────────────────────────────────────────────────
  qrCard: {
    borderRadius: 20, overflow: "hidden", padding: 20,
    alignItems: "center", marginBottom: 16,
    borderWidth: 1, borderColor: "#E5E8EE",
    backgroundColor: "#fff",
  },
  qrWarning: {
    color: "#E53935", fontSize: 12, marginBottom: 20, textAlign: "center", lineHeight: 18,
  },
  qrBox: {
    backgroundColor: "#fff", padding: 16, borderRadius: 18,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 4, marginBottom: 18,
  },
  saveQrBtn: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#D1D9E6", borderRadius: 22,
    paddingHorizontal: 20, paddingVertical: 9, backgroundColor: "#fff",
    marginBottom: 14,
  },
  saveQrText: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  qrDisclaimer: {
    fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 18, marginBottom: 18,
  },
  infoRow: {
    width: "100%", backgroundColor: "#F8F9FB", borderRadius: 12,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#E5E8EE",
  },
  infoRowLabel: { fontSize: 12, fontWeight: "700", color: "#1A1A2E", marginBottom: 8 },
  infoRowValue: { flexDirection: "row", alignItems: "center" },
  infoRowValueText: { fontSize: 14, color: "#4B5563", flex: 1 },

  // ── Code / Link tab ───────────────────────────────────────────────────────
  codeCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: "#E5E8EE",
  },
  codeCardTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  codeCardSub:   { fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 24 },
  codeDisplayBox: {
    borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center",
    height: 72, marginBottom: 20, borderWidth: 1, borderColor: "#E5E8EE",
  },
  codeDisplayText: {
    fontSize: 28, fontWeight: "800", color: "#1A1A2E", letterSpacing: 6,
  },
  copyBtn: {
    height: 52, borderRadius: 14, overflow: "hidden",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
  },
  copyBtnDone: {},
  copyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  actionRow: { flexDirection: "row", marginBottom: 0 },
  halfBtn: {
    flex: 1, height: 50, borderRadius: 14, overflow: "hidden",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
  },

  positionBadge: {
    marginTop: 20, flexDirection: "row", alignItems: "center",
    backgroundColor: "#F8F9FB", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#E5E8EE", gap: 12,
  },
  positionBadgeLabel: { fontSize: 13, color: "#6B7280", flex: 1 },
  positionDot: {
    width: 36, height: 36, borderRadius: 18, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  positionDotText: { fontSize: 16, fontWeight: "800", color: "#fff" },

  // How it works
  howCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: "#E5E8EE",
  },
  howTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A2E", marginBottom: 16 },
  howRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  howDot: {
    width: 32, height: 32, borderRadius: 16, overflow: "hidden",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  howDotText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  howDesc:    { fontSize: 13, color: "#4B5563", flex: 1, lineHeight: 18 },

  // Platform share
  platformCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: "#E5E8EE",
  },
  platformTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A2E", marginBottom: 14 },
  platformRow:   { flexDirection: "row", justifyContent: "space-around" },
  platformItem:  { alignItems: "center", gap: 8 },
  platformIcon:  { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  platformLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600" },

  // ── Community tab ─────────────────────────────────────────────────────────
  filterCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: "#E5E8EE",
  },
  filterHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
  },
  filterLabel: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  filterRow:   { flexDirection: "row", gap: 8 },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: "hidden",
    backgroundColor: "#F0F2F7", borderWidth: 1, borderColor: "#E5E8EE",
  },
  filterPillActive:    { borderColor: "transparent" },
  filterPillText:      { fontSize: 13, fontWeight: "600", color: "#7B8794" },
  filterPillTextActive: { color: "#fff" },

  // Stats grid
  statsCard: {
    backgroundColor: "#fff", borderRadius: 20, overflow: "hidden",
    marginBottom: 16, borderWidth: 1, borderColor: "#E5E8EE",
  },
  statsRow: { flexDirection: "row" },
  statsDivider: { width: 1, backgroundColor: "#F0F2F7" },
  statsHR: { height: 1, backgroundColor: "#F0F2F7" },
  statCell: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 22, paddingHorizontal: 8,
  },
  statValue:       { fontSize: 28, fontWeight: "800", color: "#1A1A2E", marginBottom: 4 },
  statValueAccent: { color: BLUE },
  statLabel:       { fontSize: 12, color: "#6B7280", textAlign: "center", lineHeight: 16 },

  // Community buttons
  communityGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16,
  },
  commBtn: {
    width: (width - 32 - 12) / 2, backgroundColor: "#fff",
    borderRadius: 18, padding: 16, alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: "#E5E8EE",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  commBtnIcon:  { width: 52, height: 52, borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  commBtnTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A2E", textAlign: "center", lineHeight: 18 },
  commBtnSub:   { fontSize: 11, color: "#9CA3AF", textAlign: "center", lineHeight: 15 },

  // Info box
  infoCard: {
    flexDirection: "row", gap: 10, backgroundColor: "#EBF8FF",
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  infoText: { fontSize: 12, color: "#1D4ED8", lineHeight: 18, flex: 1 },

  // Error
  errorBox: {
    flexDirection: "row", gap: 8, alignItems: "center",
    backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: "#FECACA",
  },
  errorText: { fontSize: 13, color: "#E53935", flex: 1 },
});
