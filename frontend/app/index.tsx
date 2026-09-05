// import { Redirect } from "expo-router";
// import { View } from "react-native";
// import { useAuth } from "@/src/context/auth";
// import { Loading } from "@/src/components/ui";
// import { C } from "@/src/theme";

// export default function Index() {
//   const { user, booting } = useAuth();

//   if (booting) {
//     return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;
//   }
//   if (!user) return <Redirect href="/(auth)/login" />;
//   if (user.role === "restaurant") return <Redirect href="/(restaurant)" />;
//   if (user.role === "delivery") return <Redirect href="/(delivery)" />;
//   if (user.role === "admin") return <Redirect href="/(admin)" />;
//   if (!user.name) return <Redirect href="/(auth)/complete-profile" />;
//   return <Redirect href="/(tabs)" />;
// }




















import { useEffect } from "react";
import { View } from "react-native";
import { useRouter, useRootNavigationState } from "expo-router";
import { useAuth } from "@/src/context/auth";
import { Loading } from "@/src/components/ui";
import { C } from "@/src/theme";

export default function Index() {
  const { user, booting } = useAuth();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // নেভিগেশন স্টেট মাউন্ট না হওয়া পর্যন্ত এবং Auth লোড শেষ না হওয়া পর্যন্ত রিডাইরেক্ট হবে না
    if (!navigationState?.key || booting) return;

    if (!user) {
      router.replace("/(auth)/login");
    } else if (user.role === "delivery") {
      router.replace("/(delivery)/"); // 👈 ট্রেইলিং স্ল্যাশ (/) দেওয়া জরুরি
    } else if (user.role === "restaurant") {
      router.replace("/(restaurant)/");
    // } else if (user.role === "admin") {
    //   router.replace("/(admin)/");
    } else if (!user.name) {
      router.replace("/(auth)/complete-profile");
    } else {
      router.replace("/(tabs)/");
    }
  }, [user, booting, navigationState?.key]);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" }}>
      <Loading />
    </View>
  );
}