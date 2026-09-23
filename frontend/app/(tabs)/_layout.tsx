// import { Platform } from "react-native";
// import { Tabs } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";
// import { C, F } from "@/src/theme";

// const isIOS26 = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

// function ClassicTabs() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: C.brandPrimary,
//         tabBarInactiveTintColor: C.muted,
//         tabBarStyle: {
//           backgroundColor: C.surfaceSecondary,
//           borderTopColor: C.border,
//           ...(Platform.OS === "web" ? { height: 64 } : {}),
//         },
//         tabBarItemStyle: { alignSelf: "center" },
//         tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11 },
//       }}>
//       <Tabs.Screen name="index" options={{
//         title: "Home",
//         tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
//       }} />
//       <Tabs.Screen name="search" options={{
//         title: "Search",
//         tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
//       }} />
//       <Tabs.Screen name="orders" options={{
//         title: "Orders",
//         tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
//       }} />
//       <Tabs.Screen name="profile" options={{
//         title: "Profile",
//         tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
//       }} />
      
//       {/* ১. এখানে order/[id] যুক্ত করে href: null করে দিন যাতে ট্যাব বারে না দেখায় */}
//       <Tabs.Screen name="order/[id]" options={{ href: null }} />
//     </Tabs>
//   );
// }

// export default function TabsLayout() {
//   if (isIOS26) {
//     const { NativeTabs, Icon, Label } = require("expo-router/unstable-native-tabs");
//     return (
//       <NativeTabs>
//         <NativeTabs.Trigger name="index"><Icon sf="house.fill" /><Label>Home</Label></NativeTabs.Trigger>
//         <NativeTabs.Trigger name="search"><Icon sf="magnifyingglass" /><Label>Search</Label></NativeTabs.Trigger>
//         <NativeTabs.Trigger name="orders"><Icon sf="doc.text.fill" /><Label>Orders</Label></NativeTabs.Trigger>
//         <NativeTabs.Trigger name="profile"><Icon sf="person.fill" /><Label>Profile</Label></NativeTabs.Trigger>
        
//         {/* ২. নেটিভ ট্যাবের ক্ষেত্রেও order/[id] কে হাইড বা বাদ রাখুন */}
//       </NativeTabs>
//     );
//   }
//   return <ClassicTabs />;
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

const isIOS26 =
  Platform.OS === "ios" &&
  parseInt(String(Platform.Version), 10) >= 26;

function ClassicTabs() {
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
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: {
          fontFamily: F.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="search"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
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
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="order/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  if (isIOS26) {
    const {
      NativeTabs,
      Icon,
      Label,
    } = require("expo-router/unstable-native-tabs");

    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Icon sf="house.fill" />
          <Label>Home</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="search">
          <Icon sf="magnifyingglass" />
          <Label>Search</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="orders">
          <Icon sf="doc.text.fill" />
          <Label>Orders</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <Icon sf="person.fill" />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return <ClassicTabs />;
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
      await Notifications.setNotificationChannelAsync(
        "default",
        {
          name: "BiteGo Orders",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          sound: "default",
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        }
      );
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
      console.log(
        "[PUSH] EAS projectId not found."
      );
      return;
    }

    // Get Expo Push Token
    const tokenResponse =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    const pushToken = tokenResponse.data;

    console.log(
      "[PUSH] Customer Expo token:",
      pushToken
    );

    if (!pushToken) {
      console.log(
        "[PUSH] No Expo push token received."
      );
      return;
    }

    // Save token to BiteGo backend
    await api.post("/users/push-token", {
      push_token: pushToken,
    });

    console.log(
      "[PUSH] Customer push token saved successfully."
    );
  } catch (error) {
    console.log(
      "[PUSH] Customer registration error:",
      error
    );
  }
}
