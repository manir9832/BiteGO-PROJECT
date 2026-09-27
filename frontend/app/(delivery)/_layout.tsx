// import { Platform } from "react-native";
// import { Tabs } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";
// import { C, F } from "@/src/theme";

// export default function DeliveryLayout() {
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
//       <Tabs.Screen name="index" options={{ title: "Deliveries", tabBarIcon: ({ color, size }) => <Ionicons name="bicycle" size={size} color={color} /> }} />
//       <Tabs.Screen name="earnings" options={{ title: "Earnings", tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} />
//       <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
//       <Tabs.Screen name="register" options={{ href: null }} />
//     </Tabs>
//   );
// }



















import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C, F } from "@/src/theme";

export default function DeliveryLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brandPrimary,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { 
          backgroundColor: C.surfaceSecondary, 
          borderTopColor: C.border, 
          ...(Platform.OS === "web" ? { height: 64 } : {}) 
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11 },
      }}>
      <Tabs.Screen 
        name="index" 
        options={{ title: "Deliveries", tabBarIcon: ({ color, size }) => <Ionicons name="bicycle" size={size} color={color} /> }} 
      />
      <Tabs.Screen 
        name="earnings" 
        options={{ title: "Earnings", tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} 
      />
      
      {/* register রুট চালু থাকবে কিন্তু নিচের ট্যাব বার থেকে হাইড করা হলো */}
      <Tabs.Screen 
        name="register" 
        options={{ 
          title: "Register",
          tabBarItemStyle: { display: "none" }
        }} 
      />
    </Tabs>
  );
}