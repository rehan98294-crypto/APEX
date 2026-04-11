import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import Colors from "@/constants/colors";
import { BalanceProvider } from "@/context/BalanceContext";
import { OrderProvider } from "@/context/OrderContext";
import { StakeProvider } from "@/context/StakeContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { TickItem, TickProvider, useTick } from "@/context/TickContext";
import { useShopItems } from "@/hooks/useShopItems";
import { API_BASE } from "@/lib/authApi";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Syncs the TickContext from DB on app startup so Profile always shows correct ticks
function TickStartupSync() {
  const { user } = useAuth();
  const { syncFromDB } = useTick();
  const { badgeTicks, circleTicks } = useShopItems();

  useEffect(() => {
    if (!user?.id) return;
    const allTicks = [...badgeTicks, ...circleTicks];
    if (allTicks.length === 0) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/user-items?userId=${encodeURIComponent(user.id)}`);
        if (!res.ok) return;
        const data = await res.json();
        const items: any[] = data.userItems ?? [];
        const ownedIds: string[] = items.map((r) => r.item_id);
        const activeBadge: string | null = items.find((r) => r.is_active && r.item?.zone === "badge")?.item_id ?? null;
        const activeCircle: string | null = items.find((r) => r.is_active && r.item?.zone === "circle")?.item_id ?? null;
        const tickLookup = new Map<string, TickItem>(allTicks.map((t) => [t.id, t]));
        syncFromDB(ownedIds, activeBadge, activeCircle, tickLookup);
      } catch (e) {
        // non-critical, silent fail
      }
    })();
  }, [user?.id, badgeTicks.length, circleTicks.length]);

  return null;
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "auth";
    const inGoogleVerif = segments[0] === "google-verification";
    if (!user && !inAuth) {
      router.replace("/auth/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)/");
    }
  }, [user, loading, segments]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="subscriptions" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="shop" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="airdrop" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="google-verification" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen
        name="nft/[id]"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerBackTitle: "",
          headerTitle: "",
          headerTintColor: Colors.dark,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.offWhite }}>
            <AuthProvider>
              <BalanceProvider>
                <SubscriptionProvider>
                  <TickProvider>
                    <TickStartupSync />
                  <StakeProvider>
                    <OrderProvider>
                      <WatchlistProvider>
                        <KeyboardProvider>
                          <RootLayoutNav />
                        </KeyboardProvider>
                      </WatchlistProvider>
                    </OrderProvider>
                  </StakeProvider>
                  </TickProvider>
                </SubscriptionProvider>
              </BalanceProvider>
            </AuthProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
