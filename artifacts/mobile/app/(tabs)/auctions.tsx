import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountdownTimer } from "@/components/CountdownTimer";
import Colors from "@/constants/colors";
import { useWatchlist } from "@/context/WatchlistContext";
import { LISTINGS, Listing } from "@/data/listings";

const AUCTION_LISTINGS = LISTINGS.filter((l) => l.isAuction);

const FILTERS = ["All", "Ending Soon", "New Bids", "Most Active"];

export default function AuctionsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState("All");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <FlatList
        data={AUCTION_LISTINGS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Live Auctions</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveIndicator} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.countText}>{AUCTION_LISTINGS.length} active</Text>
            </View>
            <FlatList
              data={FILTERS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.filtersRow}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveFilter(item);
                  }}
                  style={[
                    styles.filterPill,
                    activeFilter === item && styles.filterPillActive,
                  ]}
                >
                  <Text style={[
                    styles.filterText,
                    activeFilter === item && styles.filterTextActive,
                  ]}>
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        }
        renderItem={({ item }) => <AuctionCard listing={item} />}
      />
    </View>
  );
}

function AuctionCard({ listing }: { listing: Listing }) {
  const { isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const watched = isWatched(listing.id);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleWatch = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (watched) {
      removeFromWatchlist(listing.id);
    } else {
      addToWatchlist({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        image: listing.image,
        category: listing.category,
        timeLeft: listing.timeLeft,
        bids: listing.bids,
        isAuction: listing.isAuction,
      });
    }
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => router.push({ pathname: "/item/[id]", params: { id: listing.id } })}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        style={styles.card}
      >
        <Image source={{ uri: listing.image }} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{listing.category.toUpperCase()}</Text>
            </View>
            {listing.isHot && (
              <View style={styles.hotBadge}>
                <Text style={styles.hotText}>HOT</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{listing.title}</Text>
          <Text style={styles.cardCondition}>{listing.condition} · {listing.location}</Text>

          <View style={styles.timerRow}>
            <CountdownTimer timeLeft={listing.timeLeft || "0h 0m"} />
            <Text style={styles.bidsText}>
              <Text style={styles.bidsCount}>{listing.bids}</Text> bids
            </Text>
          </View>

          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.priceLabel}>Current Bid</Text>
              <Text style={styles.price}>${listing.price.toLocaleString()}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={handleWatch} style={styles.watchBtn}>
                <Feather
                  name="heart"
                  size={18}
                  color={watched ? Colors.danger : Colors.textSecondary}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.push({ pathname: "/item/[id]", params: { id: listing.id } });
                }}
                style={styles.bidBtn}
              >
                <Ionicons name="hammer-outline" size={14} color="#fff" />
                <Text style={styles.bidBtnText}>Bid Now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  listHeader: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.danger + "20",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.danger + "40",
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.danger,
  },
  liveText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.danger,
    letterSpacing: 0.5,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  filtersRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingRight: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.darkCard,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: Colors.primary + "20",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  categoryText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    letterSpacing: 1,
  },
  hotBadge: {
    backgroundColor: Colors.danger,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hotText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    lineHeight: 23,
  },
  cardCondition: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.darkCardAlt,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bidsText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  bidsCount: {
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  price: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  watchBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.darkCardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bidBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  bidBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
