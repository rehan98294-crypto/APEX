import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
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
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountdownTimer } from "@/components/CountdownTimer";
import Colors from "@/constants/colors";
import { useWatchlist, WatchlistItem } from "@/context/WatchlistContext";

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const { watchlist, removeFromWatchlist } = useWatchlist();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <FlatList
        data={watchlist}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Watchlist</Text>
            {watchlist.length > 0 && (
              <Text style={styles.countText}>{watchlist.length} saved</Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <WatchlistCard
            item={item}
            index={index}
            onRemove={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              removeFromWatchlist(item.id);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="heart" size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No saved items</Text>
            <Text style={styles.emptySub}>
              Heart any listing to save it here for later
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/index")}
              style={styles.browseBtn}
            >
              <Text style={styles.browseBtnText}>Browse Listings</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

interface WatchlistCardProps {
  item: WatchlistItem;
  index: number;
  onRemove: () => void;
}

function WatchlistCard({ item, index, onRemove }: WatchlistCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
      <Animated.View style={animStyle}>
        <Pressable
          onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id } })}
          onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
          style={styles.card}
        >
          <Image source={{ uri: item.image }} style={styles.cardImage} />
          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <Text style={styles.category}>{item.category.toUpperCase()}</Text>
              {item.isAuction && (
                <View style={styles.auctionBadge}>
                  <Text style={styles.auctionText}>AUCTION</Text>
                </View>
              )}
            </View>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.priceLabel}>
                  {item.isAuction ? "Current Bid" : "Price"}
                </Text>
                <Text style={styles.price}>${item.price.toLocaleString()}</Text>
              </View>
              {item.isAuction && item.timeLeft && (
                <CountdownTimer timeLeft={item.timeLeft} />
              )}
            </View>
          </View>
          <Pressable onPress={onRemove} style={styles.removeBtn}>
            <Feather name="x" size={16} color={Colors.textMuted} />
          </Pressable>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  countText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.border,
    height: 120,
  },
  cardImage: {
    width: 110,
    height: "100%",
    resizeMode: "cover",
  },
  cardContent: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  category: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    letterSpacing: 1,
  },
  auctionBadge: {
    backgroundColor: Colors.gold + "20",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.gold + "40",
  },
  auctionText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    lineHeight: 19,
    flex: 1,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  price: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.darkCardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  browseBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  browseBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
