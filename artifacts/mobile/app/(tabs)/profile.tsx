import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useWatchlist } from "@/context/WatchlistContext";

const STATS = [
  { label: "Purchases", value: "14" },
  { label: "Bids Won", value: "6" },
  { label: "Items Sold", value: "3" },
];

const MENU_ITEMS = [
  { icon: "shopping-bag", label: "My Orders", badge: "2" },
  { icon: "clock", label: "Bid History" },
  { icon: "credit-card", label: "Payment Methods" },
  { icon: "map-pin", label: "Shipping Address" },
  { icon: "bell", label: "Notifications", badge: "5" },
  { icon: "shield", label: "Security" },
  { icon: "help-circle", label: "Help & Support" },
  { icon: "info", label: "About TreasureFun" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { watchlist } = useWatchlist();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleMenuPress = (label: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable style={styles.settingsBtn} onPress={() => handleMenuPress("Settings")}>
          <Feather name="settings" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Avatar & Name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>JD</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Feather name="check" size={10} color="#fff" />
          </View>
        </View>
        <Text style={styles.name}>James Doe</Text>
        <Text style={styles.username}>@jamesdoe · Member since 2022</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Feather key={i} name="star" size={14} color={i <= 5 ? Colors.gold : Colors.border} />
          ))}
          <Text style={styles.ratingText}>5.0 (32 reviews)</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {STATS.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{watchlist.length}</Text>
          <Text style={styles.statLabel}>Watchlist</Text>
        </View>
      </View>

      {/* Seller Level */}
      <View style={styles.sellerCard}>
        <View style={styles.sellerCardLeft}>
          <View style={styles.levelBadge}>
            <Feather name="award" size={16} color={Colors.gold} />
            <Text style={styles.levelText}>Gold Seller</Text>
          </View>
          <Text style={styles.sellerDesc}>Top 10% of sellers this month</Text>
        </View>
        <Pressable style={styles.upgradeBtn}>
          <Text style={styles.upgradeBtnText}>View Perks</Text>
        </Pressable>
      </View>

      {/* Sell CTA */}
      <Pressable style={styles.sellCTA} onPress={() => handleMenuPress("Sell")}>
        <View style={styles.sellLeft}>
          <View style={styles.sellIconBox}>
            <Feather name="tag" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.sellTitle}>Start Selling</Text>
            <Text style={styles.sellSub}>List your items in under 2 minutes</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.textMuted} />
      </Pressable>

      {/* Menu */}
      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item, idx) => (
          <Pressable
            key={item.label}
            onPress={() => handleMenuPress(item.label)}
            style={[
              styles.menuItem,
              idx === MENU_ITEMS.length - 1 && styles.menuItemLast,
            ]}
          >
            <View style={styles.menuIcon}>
              <Feather name={item.icon as any} size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={styles.menuRight}>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Feather name="chevron-right" size={16} color={Colors.textMuted} />
            </View>
          </Pressable>
        ))}
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={() => handleMenuPress("Logout")}>
        <Feather name="log-out" size={18} color={Colors.danger} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarInitials: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.dark,
  },
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  username: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  sellerCard: {
    backgroundColor: Colors.gold + "10",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gold + "30",
  },
  sellerCardLeft: {
    gap: 4,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  levelText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  sellerDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  upgradeBtn: {
    backgroundColor: Colors.gold + "20",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.gold + "50",
  },
  upgradeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  sellCTA: {
    backgroundColor: Colors.primary + "15",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  sellLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sellIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  sellTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  sellSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  menuSection: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.darkCardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: Colors.danger,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.danger + "30",
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
  },
});
