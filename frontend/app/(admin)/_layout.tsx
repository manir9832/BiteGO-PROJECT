// import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { Slot, usePathname, useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { Txt } from "@/src/components/ui";
// import { C, F, R, S, T } from "@/src/theme";

// const NAV = [
//   { label: "Dashboard", icon: "grid", path: "/(admin)" },
//   { label: "Restaurants", icon: "storefront", path: "/(admin)/restaurants" },
//   { label: "Partners", icon: "bicycle", path: "/(admin)/partners" },
//   { label: "Customers", icon: "people", path: "/(admin)/customers" },
//   { label: "Orders", icon: "receipt", path: "/(admin)/orders" },
//   { label: "Settings", icon: "options", path: "/(admin)/settings" },
//   { label: "Service Areas", icon: "map", path: "/(admin)/service-areas" },
//   { label: "Settlements", icon: "cash", path: "/(admin)/settlements" },
// ];

// export default function AdminLayout() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const pathname = usePathname();
//   const isActive = (p: string) => (p === "/(admin)" ? pathname === "/" || pathname.endsWith("/(admin)") || pathname === "/(admin)" : pathname.includes(p.replace("/(admin)", "")));

//   return (
//     <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
//       <View style={styles.topbar}>
//         <View style={styles.brand}>
//           <View style={styles.logo}><Ionicons name="restaurant" size={18} color={C.onBrandPrimary} /></View>
//           <Txt weight="semibold" size={T.lg}>BiteGo Admin</Txt>
//         </View>
//       </View>
//       <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navWrap} contentContainerStyle={styles.nav}>
//         {NAV.map((n) => {
//           const active = isActive(n.path);
//           return (
//             <Pressable key={n.path} onPress={() => router.push(n.path as any)} style={[styles.navItem, active && styles.navActive]} testID={`admin-nav-${n.label.replace(/\s+/g, "-").toLowerCase()}`}>
//               <Ionicons name={n.icon as any} size={16} color={active ? C.onBrandPrimary : C.onSurface} />
//               <Txt weight="medium" size={T.sm} color={active ? C.onBrandPrimary : C.onSurface}>{n.label}</Txt>
//             </Pressable>
//           );
//         })}
//       </ScrollView>
//       <View style={{ flex: 1 }}><Slot /></View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surfaceSecondary },
//   brand: { flexDirection: "row", alignItems: "center", gap: S.sm },
//   logo: { width: 32, height: 32, borderRadius: R.sm, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
//   navWrap: { maxHeight: 60, backgroundColor: C.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: C.border },
//   nav: { gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.sm, alignItems: "center" },
//   navItem: { flexDirection: "row", alignItems: "center", gap: S.xs, height: 38, paddingHorizontal: S.md, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, flexShrink: 0 },
//   navActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
// });
























import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Slot, usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "@/src/components/ui";
import { C, F, R, S, T } from "@/src/theme";

const NAV = [
  { label: "Dashboard", icon: "grid", path: "/(admin)" },
  { label: "Restaurants", icon: "storefront", path: "/(admin)/restaurants" },
  { label: "Partners", icon: "bicycle", path: "/(admin)/partners" },
  { label: "Customers", icon: "people", path: "/(admin)/customers" },
  { label: "Orders", icon: "receipt", path: "/(admin)/orders" },
  { label: "Broadcast", icon: "megaphone", path: "/(admin)/broadcast" },
  { label: "Settings", icon: "options", path: "/(admin)/settings" },
  { label: "Service Areas", icon: "map", path: "/(admin)/service-areas" },
  { label: "Settlements", icon: "cash", path: "/(admin)/settlements" },
];

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const isActive = (p: string) => (p === "/(admin)" ? pathname === "/" || pathname.endsWith("/(admin)") || pathname === "/(admin)" : pathname.includes(p.replace("/(admin)", "")));

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
      <View style={styles.topbar}>
        <View style={styles.brand}>
          <View style={styles.logo}><Ionicons name="restaurant" size={18} color={C.onBrandPrimary} /></View>
          <Txt weight="semibold" size={T.lg}>BiteGo Admin</Txt>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navWrap} contentContainerStyle={styles.nav}>
        {NAV.map((n) => {
          const active = isActive(n.path);
          return (
            <Pressable key={n.path} onPress={() => router.push(n.path as any)} style={[styles.navItem, active && styles.navActive]} testID={`admin-nav-${n.label.replace(/\s+/g, "-").toLowerCase()}`}>
              <Ionicons name={n.icon as any} size={16} color={active ? C.onBrandPrimary : C.onSurface} />
              <Txt weight="medium" size={T.sm} color={active ? C.onBrandPrimary : C.onSurface}>{n.label}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ flex: 1 }}><Slot /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surfaceSecondary },
  brand: { flexDirection: "row", alignItems: "center", gap: S.sm },
  logo: { width: 32, height: 32, borderRadius: R.sm, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
  navWrap: { maxHeight: 60, backgroundColor: C.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: C.border },
  nav: { gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.sm, alignItems: "center" },
  navItem: { flexDirection: "row", alignItems: "center", gap: S.xs, height: 38, paddingHorizontal: S.md, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, flexShrink: 0 },
  navActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
});