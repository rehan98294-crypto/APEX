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
import { TickProvider } from "@/context/TickContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "auth";
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
