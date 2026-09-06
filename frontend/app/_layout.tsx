
// import { Stack } from "expo-router";
// import * as SplashScreen from "expo-splash-screen";
// import { useEffect } from "react";
// import { LogBox, View, Platform } from "react-native";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import { KeyboardProvider } from "react-native-keyboard-controller";
// import { useFonts } from "expo-font";
// import * as Notifications from "expo-notifications";
// import * as Device from "expo-device";

// import { useIconFonts } from "@/src/hooks/use-icon-fonts";
// import { AuthProvider } from "@/src/context/auth";
// import { CartProvider } from "@/src/context/cart";
// import { LocationProvider } from "@/src/context/location";
// import { ToastProvider } from "@/src/context/toast";
// import { C } from "@/src/theme";
// import { CartConflictModal } from "@/src/components/overlays";
// import { api } from "@/src/api";

// LogBox.ignoreAllLogs(true);
// SplashScreen.preventAutoHideAsync();

// // নোটিফিকেশন হ্যান্ডলার সেটআপ
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true, // সাউন্ড বাজানোর জন্য এটি true রাখা হয়েছে
//     shouldSetBadge: false,
//   }),
// });

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
      
//       // অ্যান্ড্রয়েডের জন্য নোটিফিকেশন চ্যানেল সেটআপ (সাউন্ড সহ)
//       if (Platform.OS === 'android') {
//         Notifications.setNotificationChannelAsync('default', {
//           name: 'default',
//           importance: Notifications.AndroidImportance.MAX, // ম্যাক্সিমাম ইম্পর্টেন্স যাতে লক স্ক্রিন ও সাউন্ড ঠিকমতো বাজে
//           vibrationPattern: [0, 250, 250, 250],
//           lightColor: '#FF231F7C',
//           sound: 'default', // ডিফল্ট সাউন্ড নিশ্চিত করা
//         });
//       }

//       registerForPushTokenAsync();
//     }
//   }, [ready]);

//   // পুশ টোকেন নেওয়ার ফাংশন
//   async function registerForPushTokenAsync() {
//     if (!Device.isDevice) {
//       console.log("Must use physical device for Push Notifications");
//       return;
//     }

//     const { status: existingStatus } = await Notifications.getPermissionsAsync();
//     let finalStatus = existingStatus;

//     if (existingStatus !== 'granted') {
//       const { status } = await Notifications.requestPermissionsAsync();
//       finalStatus = status;
//     }

//     if (finalStatus !== 'granted') {
//       console.log("Failed to get push token for push notification!");
//       return;
//     }

//     try {
//       const tokenData = await Notifications.getExpoPushTokenAsync();
//       const pushToken = tokenData.data;
//       console.log("Expo Push Token:", pushToken);

//       await api.post('/users/push-token', { push_token: pushToken });
//     } catch (error) {
//       console.log("Error getting or saving push token:", error);
//     }
//   }

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
import * as Device from "expo-device";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/context/auth";
import { CartProvider } from "@/src/context/cart";
import { LocationProvider } from "@/src/context/location";
import { ToastProvider } from "@/src/context/toast";
import { C } from "@/src/theme";
import { CartConflictModal } from "@/src/components/overlays";
import { api } from "@/src/api";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

// Safe check to see if we are running inside Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Conditional import for Notifications to prevent Expo Go crashes
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
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

  const ready = (iconsLoaded || iconErr) && (fontsLoaded || fontErr);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
      
      if (!isExpoGo && Notifications) {
        if (Platform.OS === 'android') {
          Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default',
          });
        }
        registerForPushTokenAsync();
      }
    }
  }, [ready]);

  async function registerForPushTokenAsync() {
    if (isExpoGo || !Notifications) return;
    
    if (!Device.isDevice) {
      console.log("Must use physical device for Push Notifications");
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log("Failed to get push token for push notification!");
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenData.data;
      console.log("Expo Push Token:", pushToken);

      await api.post('/users/push-token', { push_token: pushToken });
    } catch (error) {
      console.log("Error getting or saving push token:", error);
    }
  }

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.surface }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ToastProvider>
            <AuthProvider>
              <LocationProvider>
                <CartProvider>
                  <View style={{ flex: 1, backgroundColor: C.surface }}>
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.surface } }}>
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



