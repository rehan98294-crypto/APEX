import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import {
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
  const bottomPad = Platform.OS === "web" ? 10 : insets.bottom;

  return (
    <View style={[styles.barWrapper, { paddingBottom: bottomPad }]}>
      <View style={styles.separator} />
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

const styles = StyleSheet.create({
  barWrapper: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -3 },
    elevation: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E4E8F0",
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 8,
    paddingHorizontal: 0,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingBottom: 2,
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 46,
  },
  activeDot: {
    position: "absolute",
    top: -8,
    width: 20,
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
