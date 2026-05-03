import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AirdropScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 12 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Header */}
      <LinearGradient
        colors={["#7B61FF", "#5CBFFE", "#2BD9A8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/")}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Image
            source={require("../assets/images/apex-logo.jpeg")}
            style={styles.headerLogo}
            contentFit="cover"
          />
          <Text style={styles.headerTitle}>Airdrop</Text>
          <Text style={styles.headerSub}>Exclusive rewards for our community</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Coming Soon body */}
      <View style={styles.body}>
        <View style={styles.iconRing}>
          <LinearGradient
            colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            borderRadius={56}
          />
          <View style={styles.iconInner}>
            <Feather name="gift" size={40} color="#5CBFFE" />
          </View>
        </View>

        <View style={styles.badge}>
          <LinearGradient
            colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
            borderRadius={20}
          />
          <Feather name="zap" size={11} color="#fff" />
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>

        <Text style={styles.title}>Airdrop is on its way!</Text>
        <Text style={styles.subtitle}>
          We're preparing something exciting for our community. Stay tuned for airdrop campaigns, mystery rewards, and exclusive token drops.
        </Text>

        <View style={styles.chipsRow}>
          {[
            { icon: "droplet",      label: "Token Drops"    },
            { icon: "gift",         label: "Mystery Rewards" },
            { icon: "users",        label: "Community Events" },
            { icon: "trending-up",  label: "Earn Boosts"    },
          ].map((c) => (
            <View key={c.label} style={styles.chip}>
              <Feather name={c.icon as any} size={13} color="#5CBFFE" />
              <Text style={styles.chipText}>{c.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0F4FA" },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 13,
    marginBottom: 5,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },

  iconRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    overflow: "hidden",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },

  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#1A1D23",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF6FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#3B82F6",
  },
});
