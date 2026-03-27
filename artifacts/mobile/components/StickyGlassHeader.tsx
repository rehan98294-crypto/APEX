import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useBalance } from "@/context/BalanceContext";

interface StickyGlassHeaderProps {
  title?: string;
  subtitle?: string;
  showBalance?: boolean;
  showMenu?: boolean;
}

export default function StickyGlassHeader({
  title,
  subtitle,
  showBalance = true,
  showMenu = true,
}: StickyGlassHeaderProps) {
  const insets = useSafeAreaInsets();
  const { balance } = useBalance();
  const topPad = Platform.OS === "web" ? 12 : insets.top;

  return (
    <View style={[styles.headerContainer, { paddingTop: topPad }]}>
      <BlurView intensity={40} style={styles.blurView}>
        <View style={[styles.blurBackground, { paddingTop: topPad }]} />
        <View style={styles.headerContent}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <View style={styles.headerRight}>
            {showBalance && (
              <View style={styles.balancePill}>
                <View style={styles.tokenIconSm}>
                  <Text style={styles.tokenIconSmText}>T</Text>
                </View>
                <Text style={styles.balancePillText}>{balance.toFixed(0)}</Text>
              </View>
            )}
            {showMenu && (
              <>
                <Pressable style={styles.iconBtn}>
                  <Feather
                    name="bell"
                    size={20}
                    color={Colors.textPrimary}
                  />
                  <View style={styles.notifDot} />
                </Pressable>
                <Pressable style={styles.iconBtn}>
                  <Feather
                    name="menu"
                    size={20}
                    color={Colors.textPrimary}
                  />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "transparent",
  },
  blurView: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
  },
  blurBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 130,
    height: 34,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary + "15",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  balancePillText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  tokenIconSm: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenIconSmText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white + "80",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.pink,
    borderWidth: 1.5,
    borderColor: Colors.offWhite,
  },
});
