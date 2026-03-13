import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
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
import { LISTINGS } from "@/data/listings";

const { width } = Dimensions.get("window");

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [bidAmount, setBidAmount] = useState(0);
  const [bidPlaced, setBidPlaced] = useState(false);

  const listing = LISTINGS.find((l) => l.id === id);
  const watched = listing ? isWatched(listing.id) : false;

  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!listing) {
    return (
      <View style={styles.notFound}>
        <Feather name="alert-circle" size={40} color={Colors.textMuted} />
        <Text style={styles.notFoundText}>Item not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

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

  const handleBidOrBuy = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBidPlaced(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      >
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: listing.image }} style={styles.image} />
          <LinearGradient
            colors={["rgba(10,15,20,0.6)", "transparent", "transparent", "rgba(10,15,20,0.4)"]}
            locations={[0, 0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Back and Watch buttons */}
          <View style={[styles.imageOverlay, { top: insets.top + 8 }]}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn}>
              <Feather name="arrow-left" size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={handleWatch} style={styles.iconBtn}>
              <Feather name="heart" size={20} color={watched ? Colors.danger : "#fff"} />
            </Pressable>
          </View>
          {/* Badges */}
          <View style={styles.imageBadges}>
            {listing.isFeatured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>FEATURED</Text>
              </View>
            )}
            {listing.isAuction && (
              <View style={styles.auctionBadge}>
                <Ionicons name="hammer-outline" size={12} color={Colors.gold} />
                <Text style={styles.auctionText}>LIVE AUCTION</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Category + Condition */}
          <View style={styles.topRow}>
            <Text style={styles.category}>{listing.category.toUpperCase()}</Text>
            <View style={styles.conditionBadge}>
              <Feather name="check-circle" size={12} color={Colors.success} />
              <Text style={styles.conditionText}>{listing.condition}</Text>
            </View>
          </View>

          <Text style={styles.title}>{listing.title}</Text>

          {/* Countdown for auctions */}
          {listing.isAuction && listing.timeLeft && (
            <View style={styles.timerCard}>
              <View style={styles.timerHeader}>
                <View style={styles.liveRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Auction ends in</Text>
                </View>
                <Text style={styles.bidsCount}>{listing.bids} bids placed</Text>
              </View>
              <CountdownTimer timeLeft={listing.timeLeft} size="large" />
            </View>
          )}

          {/* Price */}
          <View style={styles.priceSection}>
            <View>
              <Text style={styles.priceLabel}>
                {listing.isAuction ? "Current Bid" : "Buy Now Price"}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>${listing.price.toLocaleString()}</Text>
                {listing.originalPrice && (
                  <Text style={styles.originalPrice}>
                    ${listing.originalPrice.toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
            {!listing.isAuction && (
              <View style={styles.shippingBadge}>
                <Feather name="package" size={12} color={Colors.success} />
                <Text style={styles.shippingText}>Free Shipping</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            {listing.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>

          {/* Seller */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerInitial}>
                {listing.seller.charAt(0)}
              </Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{listing.seller}</Text>
              <View style={styles.sellerRatingRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Feather
                    key={i}
                    name="star"
                    size={12}
                    color={i <= Math.round(listing.sellerRating) ? Colors.gold : Colors.border}
                  />
                ))}
                <Text style={styles.sellerRatingText}>{listing.sellerRating}</Text>
              </View>
            </View>
            <View style={styles.sellerRight}>
              <Feather name="map-pin" size={13} color={Colors.textMuted} />
              <Text style={styles.locationText}>{listing.location}</Text>
            </View>
          </View>

          {/* Details grid */}
          <View style={styles.detailsGrid}>
            {[
              { label: "Condition", value: listing.condition },
              { label: "Category", value: listing.category },
              { label: "Location", value: listing.location },
              { label: "Seller Rating", value: `${listing.sellerRating}/5.0` },
            ].map((d) => (
              <View key={d.label} style={styles.detailItem}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: bottomPad + 16 }]}>
        {bidPlaced ? (
          <View style={styles.successBar}>
            <Feather name="check-circle" size={20} color={Colors.success} />
            <Text style={styles.successText}>
              {listing.isAuction ? "Bid placed successfully!" : "Added to cart!"}
            </Text>
          </View>
        ) : (
          <View style={styles.bottomActions}>
            <Pressable onPress={handleWatch} style={styles.watchBtnBottom}>
              <Feather name="heart" size={22} color={watched ? Colors.danger : Colors.textSecondary} />
            </Pressable>
            <Animated.View style={[ctaStyle, { flex: 1 }]}>
              <Pressable
                onPress={handleBidOrBuy}
                onPressIn={() => { ctaScale.value = withSpring(0.96, { damping: 12 }); }}
                onPressOut={() => { ctaScale.value = withSpring(1, { damping: 12 }); }}
                style={styles.ctaBtn}
              >
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaBtnGradient}
                >
                  {listing.isAuction ? (
                    <>
                      <Ionicons name="hammer-outline" size={18} color="#fff" />
                      <Text style={styles.ctaBtnText}>Place Bid</Text>
                    </>
                  ) : (
                    <>
                      <Feather name="shopping-bag" size={18} color="#fff" />
                      <Text style={styles.ctaBtnText}>Buy Now</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  imageContainer: {
    width,
    height: width * 1.1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  imageBadges: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    gap: 8,
  },
  featuredBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  auctionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.gold + "60",
  },
  auctionText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  category: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  conditionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.success + "15",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.success + "30",
  },
  conditionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  timerCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  timerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  liveText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  bidsCount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  price: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  originalPrice: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  shippingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.success + "15",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.success + "30",
  },
  shippingText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.darkCard,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  sellerCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerInitial: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  sellerInfo: {
    flex: 1,
    gap: 4,
  },
  sellerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  sellerRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sellerRatingText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
    marginLeft: 4,
  },
  sellerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  detailsGrid: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailItem: {
    width: "50%",
    padding: 12,
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    textTransform: "capitalize",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark + "F0",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bottomActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  watchBtnBottom: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtn: {
    borderRadius: 16,
    overflow: "hidden",
    height: 52,
  },
  ctaBtnGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  successBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    backgroundColor: Colors.success + "15",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.success + "40",
  },
  successText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark,
    gap: 12,
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  backLink: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
});
