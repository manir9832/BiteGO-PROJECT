


// import { Platform } from "react-native";
// import { Tabs } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";
// import { C, F } from "@/src/theme";

// export default function RestaurantLayout() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: C.brandPrimary,
//         tabBarInactiveTintColor: C.muted,
//         tabBarStyle: { backgroundColor: C.surfaceSecondary, borderTopColor: C.border, ...(Platform.OS === "web" ? { height: 64 } : {}) },
//         tabBarItemStyle: { alignSelf: "center" },
//         tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11 },
//       }}>
//       <Tabs.Screen name="index" options={{ title: "Orders", tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} /> }} />
//       <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: ({ color, size }) => <Ionicons name="fast-food" size={size} color={color} /> }} />
//       <Tabs.Screen name="earnings" options={{ title: "Earnings", tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} />
//       <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} /> }} />
      
//       {/* Hidden screens jate tab bar a na deykhay ebong crash na kore */}
//       <Tabs.Screen name="register" options={{ href: null, tabBarStyle: { display: 'none' } }} />
//       <Tabs.Screen name="menu-edit" options={{ href: null, tabBarStyle: { display: 'none' } }} />
//       <Tabs.Screen name="order/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
//     </Tabs>
//   );
// }






































import { useEffect } from "react";
import { Platform } from "react-native";

import { Tabs } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

import { Ionicons } from "@expo/vector-icons";

import { C, F } from "@/src/theme";
import { api } from "@/src/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RestaurantLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brandPrimary,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: C.surfaceSecondary,
          borderTopColor: C.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: {
          alignSelf: "center",
        },
        tabBarLabelStyle: {
          fontFamily: F.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="receipt"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="fast-food"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="wallet"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="storefront"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="register"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="menu-edit"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="order/[id]"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}

async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === "web") {
      return;
    }

    if (!Device.isDevice) {
      console.log(
        "[PUSH] Push notifications require a physical device."
      );
      return;
    }

    // Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "BiteGo Orders",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        sound: "default",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    // Check notification permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log(
        "[PUSH] Notification permission was not granted."
      );
      return;
    }

    // Get Expo project ID
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log("[PUSH] EAS projectId not found.");
      return;
    }

    // Get Expo Push Token
    const tokenResponse =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    const pushToken = tokenResponse.data;

    console.log("[PUSH] Expo token:", pushToken);

    if (!pushToken) {
      console.log("[PUSH] No Expo push token received.");
      return;
    }

    // Save token to BiteGo backend
    await api.post("/users/push-token", {
      push_token: pushToken,
    });

    console.log(
      "[PUSH] Restaurant push token saved successfully."
    );
  } catch (error) {
    console.log("[PUSH] Registration error:", error);
  }
}