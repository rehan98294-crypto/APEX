import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width } = Dimensions.get("window");
const CARD_W = (width - 44) / 2;

function ShimmerBox({ style }: { style?: object }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View style={[{ backgroundColor: "#E2E8EF", opacity }, style]} />
  );
}

export function NFTSkeletonCard() {
  return (
    <View style={s.card}>
      <ShimmerBox style={s.img} />
      <View style={s.body}>
        <ShimmerBox style={s.nameLine} />
        <ShimmerBox style={s.priceLine} />
      </View>
    </View>
  );
}

export function NFTSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <View style={s.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <NFTSkeletonCard key={i} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  img: { width: "100%", height: 150, borderRadius: 0 },
  body: { padding: 10, gap: 8 },
  nameLine: { height: 12, borderRadius: 6, width: "75%" },
  priceLine: { height: 10, borderRadius: 5, width: "45%" },
});
