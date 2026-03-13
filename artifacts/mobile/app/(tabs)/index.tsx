import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ListingCard } from "@/components/ListingCard";
import Colors from "@/constants/colors";
import { CATEGORIES, FEATURED_LISTINGS, HOT_AUCTIONS, LISTINGS } from "@/data/listings";

const { width } = Dimensions.get("window");
const HERO_HEIGHT = 260;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const scrollY = useSharedValue(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    backgroundColor:
      scrollY.value > 40 ? Colors.dark + "F0" : "transparent",
    borderBottomWidth: scrollY.value > 40 ? 1 : 0,
    borderBottomColor: Colors.border,
  }));

  const filteredListings =
    selectedCategory === "all"
      ? LISTINGS
      : LISTINGS.filter((l) => l.category === selectedCategory);

  const handleCategoryPress = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedCategory(id);
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.header,
          headerStyle,
          { paddingTop: topPad, paddingBottom: 12 },
        ]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerGreeting}>Good morning</Text>
            <Text style={styles.headerTitle}>Discover Treasures</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/search")}
            style={styles.headerSearch}
          >
            <Feather name="search" size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </Animated.View>

      <AnimatedFlatList
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Hero Featured Listing */}
            <FeaturedHero />

            {/* Hot Auctions Row */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.hotDot} />
                  <Text style={styles.sectionTitle}>Hot Auctions</Text>
                </View>
                <Pressable onPress={() => router.push("/(tabs)/auctions")}>
                  <Text style={styles.seeAll}>See All</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {HOT_AUCTIONS.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    style={{ marginRight: 12 }}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Browse by Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesRow}
                style={{ marginTop: 12 }}
              >
                {CATEGORIES.map((cat) => (
                  <CategoryPill
                    key={cat.id}
                    category={cat}
                    selected={selectedCategory === cat.id}
                    onPress={() => handleCategoryPress(cat.id)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedCategory === "all"
                    ? "All Listings"
                    : CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                </Text>
                <Text style={styles.countText}>{filteredListings.length} items</Text>
              </View>
            </View>
          </View>
        }
        data={filteredListings}
        keyExtractor={(item: any) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: topPad + 60 },
        ]}
        renderItem={({ item }: { item: any }) => (
          <ListingCard listing={item} />
        )}
        scrollEnabled={!!filteredListings.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="package" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No listings in this category</Text>
          </View>
        }
      />
    </View>
  );
}

function FeaturedHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: any) => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  };

  return (
    <View style={styles.heroContainer}>
      <FlatList
        ref={flatListRef}
        data={FEATURED_LISTINGS}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/item/[id]", params: { id: item.id } })
            }
            style={styles.heroSlide}
          >
            <Image source={{ uri: item.image }} style={styles.heroImage} />
            <LinearGradient
              colors={["transparent", "rgba(10,15,20,0.95)"]}
              style={styles.heroGradient}
            />
            <View style={styles.heroContent}>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>FEATURED</Text>
              </View>
              <Text style={styles.heroCategory}>
                {item.category.toUpperCase()}
              </Text>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.heroPrice}>
                ${item.price.toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <View style={styles.heroDots}>
        {FEATURED_LISTINGS.map((_, idx) => (
          <View
            key={idx}
            style={[styles.dot, idx === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

interface CategoryPillProps {
  category: { id: string; label: string; icon: string };
  selected: boolean;
  onPress: () => void;
}

function CategoryPill({ category, selected, onPress }: CategoryPillProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94, { damping: 12 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
        style={[styles.pill, selected && styles.pillSelected]}
      >
        <Feather
          name={category.icon as any}
          size={14}
          color={selected ? "#fff" : Colors.textSecondary}
        />
        <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
          {category.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
  },
  headerGreeting: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  headerSearch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  heroContainer: {
    height: HERO_HEIGHT,
    marginBottom: 8,
  },
  heroSlide: {
    width,
    height: HERO_HEIGHT,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  featuredBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  featuredText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  heroCategory: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    lineHeight: 26,
    marginVertical: 4,
  },
  heroPrice: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.goldLight,
  },
  heroDots: {
    position: "absolute",
    bottom: 12,
    right: 16,
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    width: 14,
    backgroundColor: Colors.primary,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  horizontalList: {
    paddingRight: 16,
  },
  categoriesRow: {
    gap: 8,
    paddingRight: 16,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  pillTextSelected: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
});
