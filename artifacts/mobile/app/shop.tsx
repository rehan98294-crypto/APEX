import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const GRAD: [string, string, string] = ["#5CBFFE", "#2BD9A8", "#FFB08A"];

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>Shop</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} borderRadius={40} />
          <Feather name="shopping-bag" size={38} color="#fff" />
        </View>
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.sub}>
          The Apex Shop is currently under development.{"\n"}Check back soon for exclusive items and rewards.
        </Text>
        <View style={styles.tbaBadge}>
          <Text style={styles.tbaText}>TBA</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.offWhite, alignItems: "center", justifyContent: "center",
  },
  topTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 20 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, overflow: "hidden",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  sub: {
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    textAlign: "center", lineHeight: 24,
  },
  tbaBadge: {
    backgroundColor: "#E8F6FF", borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7,
  },
  tbaText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#5CBFFE" },
});
