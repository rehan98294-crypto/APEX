import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

interface StickyGlassHeaderProps {
  title?: string;
  showBalance?: boolean;
  showMenu?: boolean;
}

export default function StickyGlassHeader({}: StickyGlassHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 8 : insets.top;

  return (
    <View style={[styles.headerContainer, { paddingTop: topPad }]}>
      <View style={styles.headerContent}>
        {/* Logo + Brand */}
        <View style={styles.logoBox}>
          <LinearGradient
            colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Image
            source={require("../assets/images/logo-new.jpeg")}
            style={styles.logo}
            contentFit="cover"
          />
        </View>
        <Text style={styles.brandName}>Apex.NFT</Text>

        <View style={styles.spacer} />

        {/* Bell + Airdrop + Menu */}
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn}>
            <Feather name="bell" size={18} color={Colors.textPrimary} />
            <View style={styles.notifDot} />
          </Pressable>

          <Pressable style={styles.airdropBtn}>
            <LinearGradient
              colors={["#5CBFFE", "#2BD9A8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              borderRadius={16}
            />
            <Text style={styles.airdropText}>Airdrop</Text>
          </Pressable>

          <Pressable style={styles.iconBtn}>
            <Feather name="menu" size={18} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: "100%", height: "100%" },
  brandName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  spacer: { flex: 1 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF4D4F",
    borderWidth: 1,
    borderColor: Colors.white,
  },
  airdropBtn: {
    overflow: "hidden",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "relative",
  },
  airdropText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
