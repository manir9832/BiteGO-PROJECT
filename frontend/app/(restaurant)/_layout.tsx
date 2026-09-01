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
//       <Tabs.Screen name="register" options={{ href: null }} />
//       <Tabs.Screen name="menu-edit" options={{ href: null }} />
//       <Tabs.Screen name="order/[id]" options={{ href: null }} />
//     </Tabs>
//   );
// }





























import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C, F } from "@/src/theme";

export default function RestaurantLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brandPrimary,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.surfaceSecondary, borderTopColor: C.border, ...(Platform.OS === "web" ? { height: 64 } : {}) },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: "Orders", tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} /> }} />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: ({ color, size }) => <Ionicons name="fast-food" size={size} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: "Earnings", tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} /> }} />
      
      {/* Hidden screens jate tab bar a na deykhay ebong crash na kore */}
      <Tabs.Screen name="register" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="menu-edit" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="order/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
