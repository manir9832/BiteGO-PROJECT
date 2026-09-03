// import { Stack } from "expo-router";
// import * as SplashScreen from "expo-splash-screen";
// import { useEffect } from "react";
// import { LogBox, View } from "react-native";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import { KeyboardProvider } from "react-native-keyboard-controller";
// import { useFonts } from "expo-font";

// import { useIconFonts } from "@/src/hooks/use-icon-fonts";
// import { AuthProvider } from "@/src/context/auth";
// import { CartProvider } from "@/src/context/cart";
// import { LocationProvider } from "@/src/context/location";
// import { ToastProvider } from "@/src/context/toast";
// import { C } from "@/src/theme";
// import { CartConflictModal } from "@/src/components/overlays";

// LogBox.ignoreAllLogs(true);
// SplashScreen.preventAutoHideAsync();

// export default function RootLayout() {
//   const [iconsLoaded, iconErr] = useIconFonts();
//   const [fontsLoaded, fontErr] = useFonts({
//     "PlusJakartaSans-Regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
//     "PlusJakartaSans-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
//     "PlusJakartaSans-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
//   });

//   const ready = (iconsLoaded || iconErr) && (fontsLoaded || fontErr);

//   useEffect(() => {
//     if (ready) SplashScreen.hideAsync();
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
//                     <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.surface } }} />
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



























// import { Stack } from "expo-router";
// import * as SplashScreen from "expo-splash-screen";
// import { useEffect } from "react";
// import { LogBox, View } from "react-native";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import { KeyboardProvider } from "react-native-keyboard-controller";
// import { useFonts } from "expo-font";

// import { useIconFonts } from "@/src/hooks/use-icon-fonts";
// import { AuthProvider } from "@/src/context/auth";
// import { CartProvider } from "@/src/context/cart";
// import { LocationProvider } from "@/src/context/location";
// import { ToastProvider } from "@/src/context/toast";
// import { C } from "@/src/theme";
// import { CartConflictModal } from "@/src/components/overlays";

// LogBox.ignoreAllLogs(true);
// SplashScreen.preventAutoHideAsync();

// export default function RootLayout() {
//   const [iconsLoaded, iconErr] = useIconFonts();
//   const [fontsLoaded, fontErr] = useFonts({
//     "PlusJakartaSans-Regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
//     "PlusJakartaSans-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
//     "PlusJakartaSans-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
//   });

//   const ready = (iconsLoaded || iconErr) && (fontsLoaded || fontErr);

//   useEffect(() => {
//     if (ready) SplashScreen.hideAsync();
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
//                     {/* ✅ এখানে সব স্ক্রিন ও ফোল্ডার ডিক্লেয়ার করা হলো */}
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
// import { api } from "@/src/api"; // আপনার এপিআই ক্লায়েন্ট পাথ চেক করে নেবেন

// LogBox.ignoreAllLogs(true);
// SplashScreen.preventAutoHideAsync();

// // নোটিফিকেশন হ্যান্ডলার সেটআপ (অ্যাপ ওপেন থাকা অবস্থায় সাউন্ড ও পপ-আপ দেখানোর জন্য)
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
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
//       registerForPushTokenAsync(); // অ্যাপ লোড হলেই পুশ টোকেন রেজিস্টার করবে
//     }
//   }, [ready]);

//   // পুশ টোকেন নেওয়ার ফাংশন
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
//       // এক্সপো পুশ টোকেন নেওয়া
//       const tokenData = await Notifications.getExpoPushTokenAsync();
//       const pushToken = tokenData.data;
//       console.log("Expo Push Token:", pushToken);

//       // ব্যাকএন্ডে টোকেনটি পাঠিয়ে সেভ করা
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
import * as Notifications from "expo-notifications";
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

// নোটিফিকেশন হ্যান্ডলার সেটআপ
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
      
      // অ্যান্ড্রয়েডের জন্য নোটিফিকেশন চ্যানেল সেটআপ
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
  }, [ready]);

  // পুশ টোকেন নেওয়ার নিরাপদ ফাংশন
  async function registerForPushTokenAsync() {
    try {
      if (!Device.isDevice) {
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenData.data;

      await api.post('/users/push-token', { push_token: pushToken });
    } catch (error) {
      console.log("Push notification token error ignored:", error);
    }
  }

  // ফন্ট বা আইকন লোড না হওয়া পর্যন্ত স্প্ল্যাশ স্ক্রিন হোল্ড করে রাখবে
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