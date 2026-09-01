import React, { useEffect } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "@expo-google-fonts/geist/useFonts";
import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { Geist_700Bold } from "@expo-google-fonts/geist/700Bold";
import { initApi } from "@/config/api";
import { queryClient } from "@/config/query-client";
import { ToastProvider } from "@/components/shared";
import { useAuthGuard, useAuthStore } from "@/features/auth";
import { canAccessMobileWorkspace } from "@/features/auth/mobile-access";
import { APP_ROLES } from '@urbanmind/shared-types';

SplashScreen.preventAutoHideAsync();

// Ensure API is configured before any child component or data fetch runs.
initApi();

function RootNavigation() {
  useAuthGuard();
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  if (!hasHydrated) return <ActivityIndicator style={{ flex: 1 }} accessibilityLabel="Đang khôi phục phiên đăng nhập" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="unsupported-role" />
      <Stack.Protected guard={canAccessMobileWorkspace(user, APP_ROLES.SERVICE_USER)}>
        <Stack.Screen name="(resident)" />
      </Stack.Protected>
      <Stack.Protected guard={canAccessMobileWorkspace(user, APP_ROLES.SYSTEM_STAFF)}>
        <Stack.Screen name="(staff)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Geist-Regular": Geist_400Regular,
    "Geist-Medium": Geist_500Medium,
    "Geist-SemiBold": Geist_600SemiBold,
    "Geist-Bold": Geist_700Bold,
  });

  useEffect(() => {
    console.log("[RootLayout] initApi");
    initApi();
  }, []);

  useEffect(() => {
    console.log("[RootLayout] fontsLoaded", fontsLoaded);
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    console.log("[RootLayout] waiting for fonts to load");
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
          Đang khởi động UrbanMind...
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider
          statusBarTranslucent
          navigationBarTranslucent
          preserveEdgeToEdge
        >
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <RootNavigation />
            </ToastProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
