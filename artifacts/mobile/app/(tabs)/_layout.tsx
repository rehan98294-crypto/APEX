import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  { name: "index",   icon: "home",         label: "Home"     },
  { name: "reserve", icon: "bookmark",     label: "Reserve"  },
  { name: "earn",    icon: "package",      label: "Assets"   },
  { name: "profile", icon: "user",         label: "My"       },
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
      {isFocused && (
        <LinearGradient
          colors={["#5CBFFE", "#2BD9A8", "#FFB08A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
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
      <Tabs.Screen name="reserve" />
      <Tabs.Screen name="earn" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const BAR_WIDTH = SCREEN_WIDTH * 0.92;

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
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
    borderWidth: 0,
    gap: 0,
    marginBottom: 16,
  },
  activeTab: {
    flex: 1.2,
    backgroundColor: "transparent",
    overflow: "hidden",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
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
