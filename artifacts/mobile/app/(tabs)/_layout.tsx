import { Feather } from "@expo/vector-icons";
import { BottomTabBarProps, Tabs } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const TABS = [
  { name: "index", icon: "grid" },
  { name: "earn", icon: "dollar-sign" },
  { name: "reserve", icon: "bookmark" },
  { name: "profile", icon: "user" },
] as const;

function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 16 : Math.max(insets.bottom, 16);

  return (
    <View style={[styles.barWrapper, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {TABS.map((tab, idx) => {
          const isFocused = state.index === idx;
          return (
            <PillTabButton
              key={tab.name}
              icon={tab.icon}
              isFocused={isFocused}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: state.routes[idx]?.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(tab.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function PillTabButton({
  icon,
  isFocused,
  onPress,
}: {
  icon: string;
  isFocused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.88, { damping: 14, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 300 });
      }}
      style={styles.tabBtn}
    >
      <Animated.View
        style={[
          styles.iconCircle,
          animStyle,
          isFocused && styles.iconCircleActive,
        ]}
      >
        <Feather
          name={icon as any}
          size={20}
          color={isFocused ? Colors.primary : Colors.textMuted}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="earn" />
      <Tabs.Screen name="reserve" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F6FA",
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: "88%",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#DCDCDC",
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  iconCircleActive: {
    backgroundColor: "#FFFFFF",
    borderColor: Colors.primary,
    borderStyle: "solid",
    shadowColor: Colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
});
