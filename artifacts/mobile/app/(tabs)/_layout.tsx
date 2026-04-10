import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
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

const ACTIVE_COLOR  = "#5CBFFE";
const INACTIVE_COLOR = "#A0A9B8";

const TABS = [
  { name: "stake",   icon: "bar-chart-2", label: "Stake"   },
  { name: "index",   icon: "home",        label: "Home"    },
  { name: "reserve", icon: "bookmark",    label: "Reserve" },
  { name: "earn",    icon: "package",     label: "Assets"  },
  { name: "profile", icon: "user",        label: "My"      },
] as const;

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
      onPressIn={() => { scale.value = withSpring(0.88, { damping: 16, stiffness: 320 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 16, stiffness: 320 }); }}
      style={styles.tabBtn}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabInner, animStyle]}>
        {isFocused && <View style={styles.activeDot} />}
        <Feather
          name={icon as any}
          size={22}
          color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
        <Text style={[styles.tabLabel, isFocused ? styles.tabLabelActive : styles.tabLabelInactive]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function AppTabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 14 : Math.max(insets.bottom, 12);

  return (
    <View style={[styles.barWrapper, { paddingBottom: bottomPad }]} pointerEvents="box-none">
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

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar state={props.state} navigation={props.navigation} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="stake" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="reserve" />
      <Tabs.Screen name="earn" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const BAR_WIDTH = Math.round(Dimensions.get("window").width * 0.92);

const styles = StyleSheet.create({
  barWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    width: BAR_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingHorizontal: 6,
    paddingVertical: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 44,
  },
  activeDot: {
    position: "absolute",
    top: -6,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACTIVE_COLOR,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: ACTIVE_COLOR,
  },
  tabLabelInactive: {
    color: INACTIVE_COLOR,
  },
});
