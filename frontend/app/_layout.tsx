
import { Stack } from "expo-router";

import * as SplashScreen from "expo-splash-screen";

import { useEffect, useState } from "react";

import { LogBox, View, Platform, Image } from "react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { KeyboardProvider } from "react-native-keyboard-controller";

import { useFonts } from "expo-font";

import Constants, { ExecutionEnvironment } from "expo-constants";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";

import { AuthProvider } from "@/src/context/auth";

import { CartProvider } from "@/src/context/cart";

import { LocationProvider } from "@/src/context/location";

import { ToastProvider } from "@/src/context/toast";

import { C } from "@/src/theme";

import { CartConflictModal } from "@/src/components/overlays";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

// Safe check to see if we are running inside Expo Go
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Conditional import for Notifications to prevent Expo Go crashes
let Notifications: any = null;

if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log("Notifications module not available", e);
  }
}

export default function RootLayout() {
  const [iconsLoaded, iconErr] = useIconFonts();

  const [fontsLoaded, fontErr] = useFonts({
    "PlusJakartaSans-Regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
  });

  const [showAppSplash, setShowAppSplash] = useState(false);

  const ready =
    (iconsLoaded || iconErr) && (fontsLoaded || fontErr);

  useEffect(() => {
    if (!ready) return;

    // Hide native splash and immediately show
    // the full-screen KhauGo splash poster.
    SplashScreen.hideAsync();

    setShowAppSplash(true);

    const timer = setTimeout(() => {
      setShowAppSplash(false);
    }, 1000);

    // Notification channel
    if (!isExpoGo && Notifications) {
      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "Order Alerts",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 500, 500],
          lightColor: "#FF231F7C",
          sound: "default",
        });
      }
    }

    return () => clearTimeout(timer);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: C.surface }}
    >
      <SafeAreaProvider>
        <KeyboardProvider>
          <ToastProvider>
            <AuthProvider>
              <LocationProvider>
                <CartProvider>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: C.surface,
                    }}
                  >
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: {
                          backgroundColor: C.surface,
                        },
                      }}
                    >
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(delivery)" />
                      <Stack.Screen name="(auth)" />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="(restaurant)" />
                      <Stack.Screen name="(admin)" />
                    </Stack>

                    <CartConflictModal />

                    {/* Full-screen KhauGo splash poster */}
                    {showAppSplash && (
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 9999,
                          backgroundColor: "#ffffff",
                        }}
                      >
                        <Image
                          source={require("../assets/images/splash.png")}
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                  </View>
                </CartProvider>
              </LocationProvider>
            </AuthProvider>
          </ToastProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}











