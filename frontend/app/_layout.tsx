

// import { Stack } from "expo-router";
// import * as SplashScreen from "expo-splash-screen";
// import { useEffect } from "react";
// import { LogBox, View, Platform } from "react-native";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import { KeyboardProvider } from "react-native-keyboard-controller";
// import { useFonts } from "expo-font";
// import Constants, { ExecutionEnvironment } from "expo-constants";

// import { useIconFonts } from "@/src/hooks/use-icon-fonts";
// import { AuthProvider } from "@/src/context/auth";
// import { CartProvider } from "@/src/context/cart";
// import { LocationProvider } from "@/src/context/location";
// import { ToastProvider } from "@/src/context/toast";
// import { C } from "@/src/theme";
// import { CartConflictModal } from "@/src/components/overlays";

// LogBox.ignoreAllLogs(true);
// SplashScreen.preventAutoHideAsync();

// // Safe check to see if we are running inside Expo Go
// const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// // Conditional import for Notifications to prevent Expo Go crashes
// let Notifications: any = null;
// if (!isExpoGo) {
//   try {
//     Notifications = require("expo-notifications");
//     Notifications.setNotificationHandler({
//       handleNotification: async () => ({
//         shouldShowAlert: true,
//         shouldPlaySound: true,    // সাউন্ড বাজানোর জন্য এটি অত্যন্ত জরুরি
//         shouldSetBadge: true,     // ব্যাজ কাউন্ট দেখানোর জন্য true করা হলো
//       }),
//     });
//   } catch (e) {
//     console.log("Notifications module not available", e);
//   }
// }

// export default function RootLayout() {
//   const [iconsLoaded, iconErr] = useIconFonts();
//   const [fontsLoaded, fontErr] = useFonts({
//     "PlusJakartaSans-Regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
//     "PlusJakartaSans-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
//     "PlusJakartaSans-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
//   });

//   const ready = (iconsLoaded || iconErr) && (fontsLoaded || fontErr);

//   useEffect(() => {
//     if (ready) {
//       SplashScreen.hideAsync();
      
//       if (!isExpoGo && Notifications) {
//         if (Platform.OS === 'android') {
//           Notifications.setNotificationChannelAsync('default', {
//             name: 'Order Alerts', // চ্যানেলের ডিসপ্লে নেম
//             importance: Notifications.AndroidImportance.MAX, // স্ক্রিন অফ বা লক থাকলেও পপ-আপ হয়ে উপরে আসবে
//             vibrationPattern: [0, 500, 500, 500], // ভাইব্রেশনের প্যাটার্ন উন্নত করা হলো
//             lightColor: '#FF231F7C',
//             sound: 'default',
//           });
//         }
//       }
//     }
//   }, [ready]);

//   if (!ready) return null;

//   return (
//     <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.surface }}>
//       <SafeAreaProvider>
//         <KeyboardProvider>
//           <ToastProvider>
//             <AuthProvider>
//               <LocationProvider>
//                 <CartProvider>
//                   <View style={{ flex: 1, backgroundColor: C.surface }}>
//                     <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.surface } }}>
//                       <Stack.Screen name="index" />
//                       <Stack.Screen name="(delivery)" />
//                       <Stack.Screen name="(auth)" />
//                       <Stack.Screen name="(tabs)" />
//                       <Stack.Screen name="(restaurant)" />
//                       <Stack.Screen name="(admin)" />
//                     </Stack>
//                     <CartConflictModal />
//                   </View>
//                 </CartProvider>
//               </LocationProvider>
//             </AuthProvider>
//           </ToastProvider>
//         </KeyboardProvider>
//       </SafeAreaProvider>
//     </GestureHandlerRootView>
//   );
// }






























import { Stack } from "expo-router";

import * as SplashScreen from "expo-splash-screen";

import { useEffect } from "react";

import { LogBox, View, Platform } from "react-native";

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

  const ready =
    (iconsLoaded || iconErr) && (fontsLoaded || fontErr);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();

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
    }
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