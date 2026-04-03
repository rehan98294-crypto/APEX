import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = Math.min(SCREEN_W * 0.72, 280);

interface StickyGlassHeaderProps {
  title?: string;
  showBalance?: boolean;
  showMenu?: boolean;
}

const MENU_ITEMS: { label: string; icon: string }[] = [
  { label: "Service",       icon: "tool" },
  { label: "Community",     icon: "users" },
  { label: "Achievements",  icon: "award" },
  { label: "Subscriptions", icon: "star" },
  { label: "Shop",          icon: "shopping-bag" },
  { label: "Settings",      icon: "settings" },
  { label: "Policy",        icon: "file-text" },
];

export default function StickyGlassHeader({}: StickyGlassHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 8 : insets.top;
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const translateX = useRef(new Animated.Value(DRAWER_W)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: DRAWER_W, useNativeDriver: true, bounciness: 0, speed: 20 }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  return (
    <>
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

            <Pressable style={styles.iconBtn} onPress={openDrawer}>
              <Feather name="menu" size={18} color={Colors.textPrimary} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Drawer Modal */}
      <Modal visible={drawerOpen} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={styles.drawerRoot}>
          {/* Dimmed overlay */}
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>

          {/* Sliding panel */}
          <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
            {/* Drawer header */}
            <View style={[styles.drawerHeader, { paddingTop: topPad + 12 }]}>
              <View style={styles.drawerLogoRow}>
                <View style={styles.logoBox}>
                  <LinearGradient colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <Image source={require("../assets/images/logo-new.jpeg")} style={styles.logo} contentFit="cover" />
                </View>
                <Text style={styles.drawerBrand}>Apex.NFT</Text>
              </View>
              <Pressable onPress={closeDrawer} style={styles.closeBtn}>
                <Feather name="x" size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Menu items */}
            <View style={styles.menuList}>
              {MENU_ITEMS.map((item) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  onPress={() => {
                    if (item.label === "Subscriptions") {
                      closeDrawer();
                      setTimeout(() => router.push("/subscriptions"), 220);
                    }
                  }}
                >
                  <View style={[styles.menuIconBox, item.label === "Subscriptions" && { backgroundColor: "#FFF3E0" }]}>
                    <Feather
                      name={item.icon as any}
                      size={18}
                      color={item.label === "Subscriptions" ? "#F59E0B" : "#5CBFFE"}
                    />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Feather name="chevron-right" size={15} color={Colors.textMuted} style={styles.menuChevron} />
                </Pressable>
              ))}
            </View>

            <View style={styles.drawerFooter}>
              <Text style={styles.drawerVersion}>v1.0.0 · TreasureFun</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
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

  // Drawer
  drawerRoot: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  drawer: {
    width: DRAWER_W,
    height: "100%",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: -4, height: 0 },
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  drawerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerBrand: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.offWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  menuList: {
    paddingTop: 6,
    paddingHorizontal: 14,
    gap: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuItemPressed: {
    backgroundColor: Colors.offWhite,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EBF7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  menuChevron: {
    opacity: 0.4,
  },
  drawerFooter: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  drawerVersion: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
});
