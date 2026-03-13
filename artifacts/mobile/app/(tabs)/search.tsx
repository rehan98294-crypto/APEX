import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ListingCardWide } from "@/components/ListingCard";
import Colors from "@/constants/colors";
import { LISTINGS } from "@/data/listings";

const TRENDING = ["Rolex", "Birkin", "Pokemon Cards", "Apple Vision", "Vintage Camera"];
const RECENT_SEARCHES = ["Diamond Ring", "Leica M3", "Patek Philippe"];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const results = query.length > 0
    ? LISTINGS.filter(
        (l) =>
          l.title.toLowerCase().includes(query.toLowerCase()) ||
          l.category.toLowerCase().includes(query.toLowerCase()) ||
          l.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      {/* Search Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, focused && styles.searchBarFocused]}>
            <Feather name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search treasures..."
              placeholderTextColor={Colors.textMuted}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <Feather name="x" size={16} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {query.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={styles.emptyState}>
              {/* Recent Searches */}
              {RECENT_SEARCHES.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent</Text>
                    <Pressable>
                      <Text style={styles.clearText}>Clear</Text>
                    </Pressable>
                  </View>
                  {RECENT_SEARCHES.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setQuery(s);
                      }}
                      style={styles.recentRow}
                    >
                      <Feather name="clock" size={15} color={Colors.textMuted} />
                      <Text style={styles.recentText}>{s}</Text>
                      <Feather name="arrow-up-left" size={15} color={Colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Trending */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending Now</Text>
                <View style={styles.trendingWrap}>
                  {TRENDING.map((t, idx) => (
                    <Pressable
                      key={t}
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setQuery(t);
                      }}
                      style={styles.trendingPill}
                    >
                      <Text style={styles.trendingRank}>#{idx + 1}</Text>
                      <Text style={styles.trendingText}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          }
          keyExtractor={(_, i) => i.toString()}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
            </Text>
          }
          renderItem={({ item }) => <ListingCardWide listing={item} />}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Feather name="search" size={36} color={Colors.textMuted} />
              <Text style={styles.noResultsTitle}>No results found</Text>
              <Text style={styles.noResultsSub}>
                Try searching for something else
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchBarFocused: {
    borderColor: Colors.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textPrimary,
  },
  emptyState: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  clearText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textPrimary,
  },
  trendingWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  trendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.darkCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trendingRank: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  trendingText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  resultsCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 14,
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  noResultsTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  noResultsSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
});
