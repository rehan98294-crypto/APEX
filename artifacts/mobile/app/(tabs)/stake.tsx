import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import StickyGlassHeader from "@/components/StickyGlassHeader";
import Colors from "@/constants/colors";

const { width } = Dimensions.get("window");
const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

const CATEGORY_TABS = ["Stake", "Polygon NFT", "Art", "Collection", "Game"];

const FREE_ZONES = [
  {
    id: 1,
    title: "Free Zone 1",
    levelRange: "LV1-LV6",
    image: require("@/assets/stake/fz1.png"),
    status: "Open",
    priceRange: "50 ~ 2,000",
    income: "1%",
    stakableDays: "3~30",
  },
  {
    id: 2,
    title: "Free Zone 2",
    levelRange: "LV1-LV6",
    image: require("@/assets/stake/fz2.png"),
    status: "Open",
    priceRange: "50 ~ 3,000",
    income: "1.1%",
    stakableDays: "3~30",
  },
  {
    id: 3,
    title: "Free Zone 3",
    levelRange: "LV1-LV6",
    image: require("@/assets/stake/fz3.png"),
    status: "Open",
    priceRange: "50 ~ 4,000",
    income: "1.2%",
    stakableDays: "3~30",
  },
  {
    id: 4,
    title: "Free Zone 4",
    levelRange: "LV1-LV6",
    image: require("@/assets/stake/fz4.png"),
    status: "Open",
    priceRange: "50 ~ 5,000",
    income: "1.3%",
    stakableDays: "3~30",
  },
  {
    id: 5,
    title: "Free Zone 5",
    levelRange: "LV1-LV6",
    image: require("@/assets/stake/fz5.png"),
    status: "Open",
    priceRange: "50 ~ 6,000",
    income: "1.4%",
    stakableDays: "3~30",
  },
  {
    id: 6,
    title: "Free Zone 6",
    levelRange: "LV1-LV6",
    image: require("@/assets/stake/fz6.png"),
    status: "Open",
    priceRange: "50 ~ 8,000",
    income: "1.5%",
    stakableDays: "3~30",
  },
];

const EXCLUSIVE_ZONES = [
  {
    id: 1,
    title: "Exclusive Stake 1",
    levelRange: "LV2-LV6",
    image: require("@/assets/stake/ex1.png"),
    status: "Open",
    priceRange: "499 ~ 1,500",
    income: "1.5%",
    handlingFee: "1%",
    active: true,
  },
  {
    id: 2,
    title: "Exclusive Stake 2",
    levelRange: "LV2-LV6",
    image: require("@/assets/stake/ex2.png"),
    status: "Open",
    priceRange: "499 ~ 2,000",
    income: "1.8%",
    handlingFee: "1%",
    active: true,
  },
  {
    id: 3,
    title: "Exclusive Stake 3",
    levelRange: "LV2-LV6",
    image: require("@/assets/stake/ex3.png"),
    status: "Open",
    priceRange: "999 ~ 3,000",
    income: "2.0%",
    handlingFee: "1%",
    active: true,
  },
  {
    id: 4,
    title: "Exclusive Stake 4",
    levelRange: "LV2-LV6",
    image: require("@/assets/stake/ex4.png"),
    status: "Open",
    priceRange: "999 ~ 4,000",
    income: "2.5%",
    handlingFee: "1%",
    active: true,
  },
  {
    id: 5,
    title: "Exclusive Stake 5",
    levelRange: "LV2-LV6",
    image: require("@/assets/stake/ex5.png"),
    status: "Open",
    priceRange: "1,499 ~ 5,000",
    income: "3.0%",
    handlingFee: "1%",
    active: true,
  },
  {
    id: 6,
    title: "Exclusive Stake 6",
    levelRange: "LV2-LV6",
    image: require("@/assets/stake/ex6.png"),
    status: "Open",
    priceRange: "1,999 ~ 6,000",
    income: "3.5%",
    handlingFee: "1%",
    active: false,
  },
];

export default function StakeScreen() {
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const [categoryTab, setCategoryTab] = useState(0);
  const [mainTab, setMainTab] = useState<"stake" | "collection" | "mystake">("stake");
  const [zoneTab, setZoneTab] = useState<"free" | "exclusive">("free");

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <StickyGlassHeader showBalance={false} showMenu={false} />

        {/* ── Category tabs (horizontal scroll) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabsContent}
          style={styles.categoryTabsRow}
        >
          {CATEGORY_TABS.map((tab, idx) => (
            <Pressable
              key={tab}
              onPress={() => setCategoryTab(idx)}
              style={styles.categoryTabBtn}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  idx === categoryTab && styles.categoryTabTextActive,
                ]}
              >
                {tab}
              </Text>
              {idx === categoryTab && <View style={styles.categoryUnderline} />}
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Main function tabs: Stake | Collection | My Stake ── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.mainTabsCard}>
          {(
            [
              { key: "stake", label: "Stake" },
              { key: "collection", label: "Collection" },
              { key: "mystake", label: "My Stake" },
            ] as const
          ).map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setMainTab(t.key)}
              style={[styles.mainTabBtn, mainTab === t.key && styles.mainTabBtnActive]}
            >
              {mainTab === t.key && (
                <LinearGradient
                  colors={GRAD}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                  borderRadius={14}
                />
              )}
              <Text
                style={[
                  styles.mainTabText,
                  mainTab === t.key && styles.mainTabTextActive,
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* ── Zone sub-tabs: Exclusive Zone | Free Zone ── */}
        {mainTab === "stake" && (
          <View style={styles.zoneTabs}>
            {(
              [
                { key: "exclusive", label: "Exclusive Zone" },
                { key: "free", label: "Free Zone" },
              ] as const
            ).map((z) => (
              <Pressable
                key={z.key}
                onPress={() => setZoneTab(z.key)}
                style={styles.zoneTabBtn}
              >
                <Text
                  style={[
                    styles.zoneTabText,
                    zoneTab === z.key && styles.zoneTabTextActive,
                  ]}
                >
                  {z.label}
                </Text>
                {zoneTab === z.key && <View style={styles.zoneUnderline} />}
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Zone cards ── */}
        {mainTab === "stake" && zoneTab === "free" && (
          <View style={styles.zoneList}>
            {FREE_ZONES.map((zone, i) => (
              <Animated.View
                key={zone.id}
                entering={FadeInDown.duration(350).delay(i * 60)}
                style={styles.zoneCard}
              >
                {/* Card header */}
                <View style={styles.zoneCardHeader}>
                  <Text style={styles.zoneCardTitle}>{zone.title}</Text>
                  <Feather name="info" size={16} color={Colors.textMuted} />
                  <View style={{ flex: 1 }} />
                  <Text style={styles.zoneLevelBadge}>{zone.levelRange}</Text>
                </View>

                {/* Banner image */}
                <View style={styles.zoneBanner}>
                  <Image
                    source={zone.image}
                    style={styles.zoneBannerImg}
                    contentFit="cover"
                  />
                </View>

                {/* Info rows */}
                <View style={styles.zoneInfoRows}>
                  <View style={styles.zoneInfoRow}>
                    <Text style={styles.zoneInfoLabel}>Status</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{zone.status}</Text>
                    </View>
                  </View>
                  <View style={styles.zoneInfoRow}>
                    <Text style={styles.zoneInfoLabel}>Price Range:</Text>
                    <View style={styles.tRow}>
                      <View style={styles.tIcon}>
                        <Text style={styles.tIconText}>T</Text>
                      </View>
                      <Text style={styles.zoneInfoValue}>{zone.priceRange}</Text>
                    </View>
                  </View>
                  <View style={styles.zoneInfoRow}>
                    <Text style={styles.zoneInfoLabel}>Income:</Text>
                    <Text style={styles.zoneInfoValue}>{zone.income}</Text>
                  </View>
                  <View style={styles.zoneInfoRow}>
                    <Text style={styles.zoneInfoLabel}>Stakable Days:</Text>
                    <Text style={styles.zoneInfoValue}>{zone.stakableDays}</Text>
                  </View>
                </View>

                {/* Go to stake button */}
                <Pressable style={styles.stakeBtn}>
                  <LinearGradient
                    colors={GRAD}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                    borderRadius={14}
                  />
                  <Text style={styles.stakeBtnText}>Go to stake</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}

        {mainTab === "stake" && zoneTab === "exclusive" && (
          <View style={styles.zoneList}>
            {EXCLUSIVE_ZONES.map((zone, i) => (
              <Animated.View
                key={zone.id}
                entering={FadeInDown.duration(350).delay(i * 60)}
                style={styles.zoneCard}
              >
                {/* Card header */}
                <View style={styles.zoneCardHeader}>
                  <Text style={styles.zoneCardTitle}>{zone.title}</Text>
                  <Feather name="info" size={16} color={Colors.textMuted} />
                  <View style={{ flex: 1 }} />
                  <Text style={styles.zoneLevelBadge}>{zone.levelRange}</Text>
                </View>

                {/* Banner image */}
                <View style={styles.zoneBanner}>
                  <Image
                    source={zone.image}
                    style={styles.zoneBannerImg}
                    contentFit="cover"
                  />
                </View>

                {/* Info rows */}
                <View style={styles.zoneInfoRows}>
                  <View style={styles.zoneInfoRow}>
                    <Text style={styles.zoneInfoLabel}>Status</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{zone.status}</Text>
                    </View>
                  </View>
                  <View style={styles.zoneInfoRow}>
                    <Text style={styles.zoneInfoLabel}>Price Range:</Text>
                    <View style={styles.tRow}>
                      <View style={styles.tIcon}>
                        <Text style={styles.tIconText}>T</Text>
                      </View>
                      <Text style={styles.zoneInfoValue}>{zone.priceRange}</Text>
                    </View>
                  </View>
                  <View style={styles.zoneInfoRow}>
                    <Text style={styles.zoneInfoLabel}>Income:</Text>
                    <Text style={styles.zoneInfoValue}>{zone.income}</Text>
                  </View>
                  <View style={styles.zoneInfoRow}>
                    <Text style={styles.zoneInfoLabel}>handling fee:</Text>
                    <Text style={styles.zoneInfoValue}>{zone.handlingFee}</Text>
                  </View>
                </View>

                {/* Go to stake button — greyed for inactive */}
                <Pressable style={[styles.stakeBtn, !zone.active && styles.stakeBtnDisabled]}>
                  {zone.active ? (
                    <LinearGradient
                      colors={GRAD}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                      borderRadius={14}
                    />
                  ) : (
                    <LinearGradient
                      colors={["#e0e0e0", "#d0d0d0"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                      borderRadius={14}
                    />
                  )}
                  <Text style={[styles.stakeBtnText, !zone.active && { color: "#aaa" }]}>
                    Go to stake
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}

        {/* ── Collection placeholder ── */}
        {mainTab === "collection" && (
          <View style={styles.placeholderWrap}>
            <Feather name="layers" size={40} color={Colors.textMuted} />
            <Text style={styles.placeholderText}>Collection</Text>
            <Text style={styles.placeholderSub}>Your staked NFT collection appears here</Text>
          </View>
        )}

        {/* ── My Stake placeholder ── */}
        {mainTab === "mystake" && (
          <View style={styles.placeholderWrap}>
            <Feather name="bar-chart-2" size={40} color={Colors.textMuted} />
            <Text style={styles.placeholderText}>My Stake</Text>
            <Text style={styles.placeholderSub}>Your active stake positions appear here</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  categoryTabsRow: { marginTop: 4 },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  categoryTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    position: "relative",
  },
  categoryTabText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  categoryTabTextActive: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  categoryUnderline: {
    position: "absolute",
    bottom: 2,
    left: 14,
    right: 14,
    height: 2.5,
    backgroundColor: "#5CBFFE",
    borderRadius: 2,
  },

  mainTabsCard: {
    flexDirection: "row",
    marginHorizontal: 14,
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 5,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 4,
  },
  mainTabBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    overflow: "hidden",
  },
  mainTabBtnActive: {},
  mainTabText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  mainTabTextActive: {
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  zoneTabs: {
    flexDirection: "row",
    marginHorizontal: 14,
    marginTop: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 24,
  },
  zoneTabBtn: {
    paddingBottom: 12,
    alignItems: "center",
    position: "relative",
  },
  zoneTabText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  zoneTabTextActive: {
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  zoneUnderline: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: Colors.textPrimary,
    borderRadius: 2,
  },

  zoneList: {
    marginTop: 14,
    paddingHorizontal: 14,
    gap: 16,
    paddingBottom: 8,
  },
  zoneCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  zoneCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  zoneCardTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  zoneLevelBadge: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#2BD9A8",
  },

  zoneBanner: {
    width: "100%",
    height: 130,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  zoneBannerImg: {
    width: "100%",
    height: "100%",
  },

  zoneInfoRows: { gap: 10 },
  zoneInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  zoneInfoLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  zoneInfoValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  tRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  tIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#00C853",
    alignItems: "center",
    justifyContent: "center",
  },
  tIconText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },

  statusBadge: {
    backgroundColor: "#00C853",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  stakeBtn: {
    height: 46,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  stakeBtnDisabled: { opacity: 0.6 },
  stakeBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  placeholderWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  placeholderText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
  },
  placeholderSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
