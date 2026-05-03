import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import React, { useState } from "react";
import {
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

import { useLocalSearchParams } from "expo-router";
import { useReferral, type DateFilter } from "@/hooks/useReferral";
import { MyTeamReferralSkeleton, MyTeamStatsSkeleton } from "@/components/Skeleton";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];
const BLUE = "#5CBFFE";

type Section = "referral" | "enthusiasts" | "contribution";

const FILTERS: { key: DateFilter; label: string }[] = [
  { key: "all",   label: "All"   },
  { key: "today", label: "Today" },
  { key: "week",  label: "Week"  },
];

export default function MyTeamScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === "web" ? 20 : insets.top;

  const params = useLocalSearchParams<{ section?: string }>();
  const initialSection = (["referral","enthusiasts","contribution"].includes(params.section ?? "")
    ? params.section
    : "referral") as Section;
  const [section, setSection] = useState<Section>(initialSection);
  const [copied,  setCopied]  = useState<"code" | "link" | null>(null);

  const {
    info, stats, filter, changeFilter,
    loadingInfo, loadingStat,
  } = useReferral();

  const displayCode = info?.referralCode ?? "—";
  const displayLink = info?.referralLink ?? "—";

  async function copy(text: string, which: "code" | "link") {
    await Clipboard.setStringAsync(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  async function share() {
    if (!info) return;
    if (Platform.OS === "web") { copy(displayLink, "link"); return; }
    try {
      await Share.share({
        message: `Join Apex via my referral link: ${displayLink}`,
        url: displayLink,
      });
    } catch {}
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/")} style={s.iconBtn} hitSlop={12}>
          <Feather name="chevron-left" size={22} color="#1A1A2E" />
        </Pressable>
        <Text style={s.headerTitle}>My Team</Text>
        <View style={s.iconBtn} />
      </View>

      {/* Section selector */}
      <View style={s.sectionBar}>
        {(["referral", "enthusiasts", "contribution"] as Section[]).map((key) => {
          const labels: Record<Section, string> = {
            referral:     "Referral",
            enthusiasts:  "Enthusiasts",
            contribution: "Contribution",
          };
          const active = section === key;
          return (
            <Pressable key={key} style={s.sectionItem} onPress={() => setSection(key)}>
              {active && (
                <LinearGradient
                  colors={GRAD}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                />
              )}
              <Text style={[s.sectionLabel, active && s.sectionLabelActive]}>
                {labels[key]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 48 }]}
      >
        {/* ══ REFERRAL ══ */}
        {section === "referral" && (
          <Animated.View entering={FadeIn.duration(260)}>
            {/* Invite banner */}
            <View style={s.inviteRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.inviteTitle}>Invite your friends and{"\n"}earn together</Text>
                <Text style={s.inviteSub}>You can earn extra profit from every trade.</Text>
              </View>
              <Pressable onPress={share} style={s.shareIconBtn}>
                <Feather name="share-2" size={20} color={BLUE} />
              </Pressable>
            </View>

            {loadingInfo ? (
              <MyTeamReferralSkeleton />
            ) : (
              <>
                {/* QR code */}
                <View style={s.qrWrapper}>
                  <View style={s.qrBox}>
                    <QRCode
                      value={displayLink !== "—" ? displayLink : "https://app.apexmeta.io"}
                      size={200}
                      color="#2B64DE"
                      backgroundColor="#ffffff"
                    />
                  </View>
                </View>

                {/* ── Referral code display ── */}
                <Pressable style={s.codeRow} onPress={() => copy(displayCode, "code")}>
                  <Text style={s.codeText}>{displayCode}</Text>
                  <View style={s.copyIcon}>
                    <Feather
                      name={copied === "code" ? "check" : "copy"}
                      size={18}
                      color={copied === "code" ? "#2BD9A8" : "#5CBFFE"}
                    />
                  </View>
                </Pressable>

                {/* ── Referral link ── */}
                <Pressable style={s.linkRow} onPress={() => copy(displayLink, "link")}>
                  <Text style={s.linkText} numberOfLines={1} ellipsizeMode="middle">
                    {displayLink}
                  </Text>
                  <View style={s.copyIcon}>
                    <Feather
                      name={copied === "link" ? "check" : "copy"}
                      size={16}
                      color={copied === "link" ? "#2BD9A8" : "#9CA3AF"}
                    />
                  </View>
                </Pressable>

                {copied && (
                  <Text style={s.copiedNote}>
                    {copied === "code" ? "Referral code copied!" : "Link copied!"}
                  </Text>
                )}

                {/* ── Share button ── */}
                <Pressable style={s.shareBtn} onPress={share}>
                  <LinearGradient
                    colors={GRAD}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                  />
                  <Feather name="share-2" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.shareBtnText}>Share Referral Link</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        )}

        {/* ══ COMMUNITY ENTHUSIASTS — member stats ══ */}
        {section === "enthusiasts" && (
          <Animated.View entering={FadeIn.duration(260)}>
            <Text style={s.sectionTitle}>Community Enthusiasts</Text>
            <Text style={s.sectionSub}>Members registered under your referral line.</Text>

            {/* Date filter */}
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
                    <Text style={[s.filterPillText, active && s.filterPillTextActive]}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Stats grid */}
            {loadingStat ? (
              <MyTeamStatsSkeleton />
            ) : (
              <View style={s.statsCard}>
                <View style={s.statsRow}>
                  <StatCell value={stats.totalMembers} label={"Total Registered\nMember"} accent />
                  <View style={s.statsDividerV} />
                  <StatCell value={stats.validMembers} label={"Total Valid\nMember"} />
                </View>
                <View style={s.statsDividerH} />
                <View style={s.statsRow}>
                  <StatCell value={stats.A.total} label="Member A" />
                  <View style={s.statsDividerV} />
                  <StatCell value={stats.A.valid} label="Valid A" />
                </View>
                <View style={s.statsDividerH} />
                <View style={s.statsRow}>
                  <StatCell value={stats.B.total} label="Member B" />
                  <View style={s.statsDividerV} />
                  <StatCell value={stats.B.valid} label="Valid B" />
                </View>
                <View style={s.statsDividerH} />
                <View style={s.statsRow}>
                  <StatCell value={stats.C.total} label="Member C" />
                  <View style={s.statsDividerV} />
                  <StatCell value={stats.C.valid} label="Valid C" />
                </View>
              </View>
            )}

            <View style={s.noteCard}>
              <Feather name="info" size={14} color={BLUE} style={{ flexShrink: 0, marginTop: 1 }} />
              <Text style={s.noteText}>
                A member becomes <Text style={{ fontWeight: "700" }}>Valid</Text> only after making a successful deposit.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ══ COMMUNITY CONTRIBUTION ══ */}
        {section === "contribution" && (
          <Animated.View entering={FadeIn.duration(260)}>
            <Text style={s.sectionTitle}>Community Contribution</Text>
            <Text style={s.sectionSub}>Earnings and rewards generated from your team's activity.</Text>

            {loadingStat ? (
              <MyTeamStatsSkeleton />
            ) : (
              <View style={s.contributionCard}>
                <ContribRow icon="users" label="Total Team Members" value={String(stats.totalMembers)} />
                <View style={s.statsDividerH} />
                <ContribRow icon="check-circle" label="Valid (Deposited) Members" value={String(stats.validMembers)} />
                <View style={s.statsDividerH} />
                <ContribRow icon="trending-up" label="A-Line Members" value={`${stats.A.valid} / ${stats.A.total}`} />
                <View style={s.statsDividerH} />
                <ContribRow icon="bar-chart-2" label="B-Line Members" value={`${stats.B.valid} / ${stats.B.total}`} />
                <View style={s.statsDividerH} />
                <ContribRow icon="activity" label="C-Line Members" value={`${stats.C.valid} / ${stats.C.total}`} />
              </View>
            )}

            <View style={s.noteCard}>
              <Feather name="info" size={14} color={BLUE} style={{ flexShrink: 0, marginTop: 1 }} />
              <Text style={s.noteText}>
                Rewards are calculated from the valid members in each of your A, B and C lines.
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCell({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <View style={s.statCell}>
      <Text style={[s.statValue, accent && s.statValueAccent]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function ContribRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.contribRow}>
      <Feather name={icon as any} size={18} color={BLUE} />
      <Text style={s.contribLabel}>{label}</Text>
      <Text style={s.contribValue}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#F8F9FB" },
  scroll: { paddingHorizontal: 18, paddingTop: 16 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "#F8F9FB",
    borderBottomWidth: 1, borderBottomColor: "#F0F2F7",
  },
  iconBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E" },

  // Section bar
  sectionBar: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    backgroundColor: "#F8F9FB",
  },
  sectionItem: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 9, borderRadius: 24, overflow: "hidden",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E8EE",
  },
  sectionLabel:       { fontSize: 12, fontWeight: "600", color: "#7B8794" },
  sectionLabelActive: { color: "#fff" },

  // ── Referral section ────────────────────────────────────────────────────────
  inviteRow: {
    flexDirection: "row", alignItems: "flex-start",
    marginBottom: 28,
  },
  inviteTitle: { fontSize: 20, fontWeight: "800", color: "#1A1A2E", lineHeight: 28, marginBottom: 6 },
  inviteSub:   { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  shareIconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#EBF8FF", alignItems: "center", justifyContent: "center",
    marginLeft: 12, marginTop: 2,
  },

  qrWrapper: { alignItems: "center", marginBottom: 28 },
  qrBox: {
    backgroundColor: "#fff", padding: 18, borderRadius: 20,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },

  codeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 12, marginBottom: 14,
  },
  codeText: { fontSize: 30, fontWeight: "800", color: "#1A1A2E", letterSpacing: 5 },
  copyIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#EBF8FF", alignItems: "center", justifyContent: "center",
  },

  linkRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
    borderWidth: 1, borderColor: "#E5E8EE",
    marginBottom: 12,
  },
  linkText:   { flex: 1, fontSize: 13, color: "#4B5563" },
  copiedNote: { textAlign: "center", fontSize: 12, color: "#2BD9A8", marginBottom: 10, fontWeight: "600" },

  shareBtn: {
    height: 50, borderRadius: 14, overflow: "hidden",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: 4,
  },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // ── Enthusiasts section ─────────────────────────────────────────────────────
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 4 },
  sectionSub:   { fontSize: 13, color: "#6B7280", lineHeight: 18, marginBottom: 20 },

  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, overflow: "hidden",
    backgroundColor: "#F0F2F7",
    borderWidth: 1, borderColor: "#E5E8EE",
  },
  filterPillActive:    { borderColor: "transparent" },
  filterPillText:      { fontSize: 13, fontWeight: "600", color: "#7B8794" },
  filterPillTextActive: { color: "#fff" },

  statsCard: {
    backgroundColor: "#fff", borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "#E5E8EE", marginBottom: 16,
  },
  statsRow:      { flexDirection: "row" },
  statsDividerV: { width: 1, backgroundColor: "#F0F2F7" },
  statsDividerH: { height: 1, backgroundColor: "#F0F2F7" },
  statCell: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 24, paddingHorizontal: 8,
  },
  statValue:       { fontSize: 30, fontWeight: "800", color: "#1A1A2E", marginBottom: 6 },
  statValueAccent: { color: BLUE },
  statLabel:       { fontSize: 12, color: "#6B7280", textAlign: "center", lineHeight: 16 },

  noteCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: "#EBF8FF", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  noteText: { fontSize: 12, color: "#1D4ED8", lineHeight: 18, flex: 1 },

  // ── Contribution section ────────────────────────────────────────────────────
  contributionCard: {
    backgroundColor: "#fff", borderRadius: 20,
    borderWidth: 1, borderColor: "#E5E8EE",
    overflow: "hidden", marginBottom: 16,
  },
  contribRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 16, gap: 12,
  },
  contribLabel: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  contribValue: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
});
