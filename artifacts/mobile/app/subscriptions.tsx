import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import Colors from "@/constants/colors";

const { width } = Dimensions.get("window");
const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

function PulsingOrb({ size, color, delay = 0 }: { size: number; color: string; delay?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1600 }),
        withTiming(1, { duration: 1600 })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1600 }),
        withTiming(0.18, { duration: 1600 })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function GradientIcon() {
  const rotate = useSharedValue(0);
  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 8000 }), -1, false);
  }, []);
  const rotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <View style={styles.iconRing}>
      <Animated.View style={[StyleSheet.absoluteFill, rotStyle]}>
        <LinearGradient
          colors={GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 48 }]}
        />
      </Animated.View>
      <View style={styles.iconInner}>
        <Feather name="clock" size={36} color="#5CBFFE" />
      </View>
    </View>
  );
}

export default function SubscriptionsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/")}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Subscriptions</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Background orbs */}
        <PulsingOrb size={280} color="#5CBFFE" />
        <PulsingOrb size={200} color="#2BD9A8" delay={600} />
        <PulsingOrb size={160} color="#FFB08A" delay={1200} />

        <Animated.View entering={FadeInDown.duration(500)} style={styles.card}>
          {/* Spinning gradient icon */}
          <GradientIcon />

          {/* TBA badge */}
          <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.tbaBadge}>
            <LinearGradient
              colors={GRAD}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              borderRadius={20}
            />
            <Feather name="zap" size={12} color="#fff" />
            <Text style={styles.tbaBadgeText}>TBA</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <Text style={styles.title}>Coming Soon</Text>
            <Text style={styles.sub}>
              Subscription plans are currently in development. Stay tuned — exciting membership tiers with exclusive perks are on their way.
            </Text>
          </Animated.View>

          {/* Feature preview chips */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.chips}>
            {[
              { icon: "unlock", label: "Level Unlocks" },
              { icon: "trending-up", label: "Earn Boosts" },
              { icon: "star", label: "VIP Perks" },
              { icon: "users", label: "Team Rewards" },
            ].map((item) => (
              <View key={item.label} style={styles.chip}>
                <Feather name={item.icon as any} size={13} color="#5CBFFE" />
                <Text style={styles.chipText}>{item.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Confirm button */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)} style={{ width: "100%" }}>
            <Pressable style={styles.confirmBtn} onPress={() => router.back()}>
              <LinearGradient
                colors={GRAD}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
                borderRadius={16}
              />
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.confirmBtnText}>Got it, I'll wait!</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.offWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
  },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 20,
    shadowColor: "#5CBFFE",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 3,
  },
  iconInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(92,191,254,0.2)",
  },

  tbaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  tbaBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1.5,
  },

  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF8FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(92,191,254,0.25)",
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#3a8fd4",
  },

  confirmBtn: {
    height: 54,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  confirmBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
