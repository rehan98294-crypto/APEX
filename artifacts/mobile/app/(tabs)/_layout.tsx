import { Feather } from "@expo/vector-icons";
import { BottomTabBarProps, Tabs } from "expo-router";
import React from "react";
import {
  Dimensions,
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

import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TABS = [
  { name: "index",   icon: "grid",         label: "Explore"  },
  { name: "earn",    icon: "dollar-sign",  label: "Earn"     },
  { name: "reserve", icon: "bookmark",     label: "Reserve"  },
  { name: "profile", icon: "user",         label: "Profile"  },
] as const;

function PillTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 14 : Math.max(insets.bottom, 12);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {TABS.map((tab, idx) => {
          const isFocused = state.index === idx;
          return (
            <TabItem
              key={tab.name}
              icon={tab.icon}
              label={tab.label}
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

function TabItem({
  icon,
  label,
  isFocused,
  onPress,
}: {
  icon: string;
  label: string;
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
      onPressIn={() => { scale.value = withSpring(0.9, { damping: 14, stiffness: 280 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 280 }); }}
      style={isFocused ? styles.activeTab : styles.inactiveTab}
    >
      <Animated.View style={[styles.tabInner, animStyle]}>
        <Feather
          name={icon as any}
          size={18}
          color={isFocused ? "#fff" : Colors.textMuted}
        />
        {isFocused && (
          <Text style={styles.activeLabel}>{label}</Text>
        )}
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

const BAR_WIDTH = SCREEN_WIDTH * 0.96;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    width: BAR_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    gap: 4,
  },
  activeTab: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 12,
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
