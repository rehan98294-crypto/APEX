import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
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

import Colors from "@/constants/colors";
import { useWatchlist } from "@/context/WatchlistContext";
import { Listing } from "@/data/listings";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface ListingCardProps {
  listing: Listing;
  style?: object;
}

export function ListingCard({ listing, style }: ListingCardProps) {
  const { isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const watched = isWatched(listing.id);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/item/[id]", params: { id: listing.id } });
  };

  const handleWatchPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
    <Animated.View style={[animatedStyle, { width: CARD_WIDTH }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        style={styles.card}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: listing.image }} style={styles.image} />
          <View style={styles.badges}>
            {listing.isAuction && (
              <View style={styles.auctionBadge}>
                <Ionicons name="hammer-outline" size={10} color={Colors.gold} />
                <Text style={styles.auctionText}>LIVE</Text>
              </View>
            )}
            {listing.isHot && (
              <View style={styles.hotBadge}>
                <Text style={styles.hotText}>HOT</Text>
              </View>
            )}
          </View>
          <Pressable onPress={handleWatchPress} style={styles.heartBtn}>
            <Feather
              name="heart"
              size={16}
              color={watched ? Colors.danger : Colors.textSecondary}
              style={watched ? { opacity: 1 } : { opacity: 0.9 }}
            />
          </Pressable>
          {listing.originalPrice && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                -{Math.round((1 - listing.price / listing.originalPrice) * 100)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.category}>{listing.category.toUpperCase()}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {listing.title}
          </Text>

          {listing.isAuction && listing.timeLeft ? (
            <View style={styles.auctionRow}>
              <View style={styles.timerRow}>
                <Feather name="clock" size={11} color={Colors.gold} />
                <Text style={styles.timerText}>{listing.timeLeft}</Text>
              </View>
              <Text style={styles.bidsText}>{listing.bids} bids</Text>
            </View>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={styles.price}>${listing.price.toLocaleString()}</Text>
            {listing.originalPrice && (
              <Text style={styles.originalPrice}>
                ${listing.originalPrice.toLocaleString()}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ListingCardWide({ listing }: { listing: Listing }) {
  const { isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const watched = isWatched(listing.id);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/item/[id]", params: { id: listing.id } });
  };

  const handleWatchPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        style={styles.wideCard}
      >
        <Image source={{ uri: listing.image }} style={styles.wideImage} />
        <View style={styles.wideInfo}>
          <View style={styles.wideBadgeRow}>
            {listing.isAuction && (
              <View style={styles.auctionBadge}>
                <Ionicons name="hammer-outline" size={10} color={Colors.gold} />
                <Text style={styles.auctionText}>LIVE</Text>
              </View>
            )}
            {listing.isHot && (
              <View style={styles.hotBadge}>
                <Text style={styles.hotText}>HOT</Text>
              </View>
            )}
          </View>
          <Text style={styles.wideCategory}>{listing.category.toUpperCase()}</Text>
          <Text style={styles.wideTitle} numberOfLines={2}>{listing.title}</Text>
          <View style={styles.wideBottom}>
            <Text style={styles.widePrice}>${listing.price.toLocaleString()}</Text>
            {listing.isAuction && listing.timeLeft && (
              <View style={styles.timerRow}>
                <Feather name="clock" size={12} color={Colors.gold} />
                <Text style={styles.timerText}>{listing.timeLeft}</Text>
              </View>
            )}
          </View>
          <View style={styles.sellerRow}>
            <Feather name="user" size={11} color={Colors.textMuted} />
            <Text style={styles.sellerText}>{listing.seller}</Text>
            <Feather name="star" size={11} color={Colors.gold} />
            <Text style={styles.ratingText}>{listing.sellerRating}</Text>
          </View>
        </View>
        <Pressable onPress={handleWatchPress} style={styles.wideHeartBtn}>
          <Feather
            name="heart"
            size={18}
            color={watched ? Colors.danger : Colors.textSecondary}
          />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageContainer: {
    position: "relative",
    height: CARD_WIDTH * 1.1,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  badges: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    gap: 4,
  },
  auctionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.gold + "60",
  },
  auctionText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  hotBadge: {
    backgroundColor: "#E53E3E",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  hotText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  discountBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  discountText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  info: {
    padding: 12,
    gap: 4,
  },
  category: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  auctionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  timerText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
  },
  bidsText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  // Wide card
  wideCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.border,
    height: 120,
  },
  wideImage: {
    width: 110,
    height: "100%",
    resizeMode: "cover",
  },
  wideInfo: {
    flex: 1,
    padding: 12,
    gap: 3,
  },
  wideBadgeRow: {
    flexDirection: "row",
    gap: 4,
  },
  wideCategory: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    letterSpacing: 1,
    marginTop: 2,
  },
  wideTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    lineHeight: 19,
  },
  wideBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  widePrice: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sellerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    flex: 1,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
  },
  wideHeartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
  },
});
