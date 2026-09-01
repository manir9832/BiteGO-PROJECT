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
//       </NativeTabs>
//     );
//   }
//   return <ClassicTabs />;
// }

















import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C, F } from "@/src/theme";

const isIOS26 = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

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
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{
        title: "Home",
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="search" options={{
        title: "Search",
        tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
      }} />
      <Tabs.Screen name="orders" options={{
        title: "Orders",
        tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: "Profile",
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
      
      {/* ১. এখানে order/[id] যুক্ত করে href: null করে দিন যাতে ট্যাব বারে না দেখায় */}
      <Tabs.Screen name="order/[id]" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabsLayout() {
  if (isIOS26) {
    const { NativeTabs, Icon, Label } = require("expo-router/unstable-native-tabs");
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index"><Icon sf="house.fill" /><Label>Home</Label></NativeTabs.Trigger>
        <NativeTabs.Trigger name="search"><Icon sf="magnifyingglass" /><Label>Search</Label></NativeTabs.Trigger>
        <NativeTabs.Trigger name="orders"><Icon sf="doc.text.fill" /><Label>Orders</Label></NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile"><Icon sf="person.fill" /><Label>Profile</Label></NativeTabs.Trigger>
        
        {/* ২. নেটিভ ট্যাবের ক্ষেত্রেও order/[id] কে হাইড বা বাদ রাখুন */}
      </NativeTabs>
    );
  }
  return <ClassicTabs />;
}
