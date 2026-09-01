// import { useCallback, useState } from "react";
// import { FlatList, Pressable, StyleSheet, View } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect, useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import { Badge, EmptyState, Loading, Txt } from "@/src/components/ui";
// import { useCart } from "@/src/context/cart";
// import { useToast } from "@/src/context/toast";
// import { fmtDateTime, money } from "@/src/format";
// import { C, F, ORDER_STATUS_LABELS, R, S, T } from "@/src/theme";

// const TABS = [
//   { key: "active", label: "Active" },
//   { key: "completed", label: "Completed" },
//   { key: "cancelled", label: "Cancelled" },
// ];

// const statusColor = (s: string) => {
//   if (s === "DELIVERED") return { bg: "#E7F0E9", fg: C.success };
//   if (s === "CANCELLED" || s === "REJECTED") return { bg: "#FBEBEA", fg: C.error };
//   return { bg: C.brandTertiary, fg: C.onBrandTertiary };
// };

// export default function Orders() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
//   const { clearCart, setQty } = useCart();
//   const [tab, setTab] = useState("active");
//   const [orders, setOrders] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   const load = useCallback(async (kind: string) => {
//     setLoading(true);
//     try {
//       const r = await api.get("/orders", { kind });
//       setOrders(r.orders || []);
//     } catch { setOrders([]); }
//     finally { setLoading(false); }
//   }, []);

//   useFocusEffect(useCallback(() => { load(tab); }, [load, tab]));

//   const reorder = async (id: string) => {
//     try {
//       const r = await api.post(`/orders/${id}/reorder`);
//       if (!r.is_open) { toast.show("Restaurant is currently closed", "error"); return; }
//       if (r.items.length === 0) { toast.show("Items no longer available", "error"); return; }
//       clearCart();
//       r.items.forEach((it: any) =>
//         setQty({ id: it.food_id, name: it.name, price: it.price, image: it.image },
//           { id: r.restaurant_id, name: r.restaurant_name }, it.quantity));
//       if (r.unavailable?.length) toast.show(`${r.unavailable.length} item(s) unavailable and skipped`, "info");
//       router.push("/cart");
//     } catch (e: any) { toast.show(e.message, "error"); }
//   };

//   return (
//     <View style={[styles.root, { paddingTop: insets.top + S.md }]}>
//       <Txt weight="semibold" size={T["2xl"]} style={{ paddingHorizontal: S.lg }}>Your Orders</Txt>
//       <View style={styles.tabs}>
//         {TABS.map((t) => (
//           <Pressable key={t.key} onPress={() => setTab(t.key)}
//             style={[styles.tab, tab === t.key && styles.tabActive]} testID={`orders-tab-${t.key}`}>
//             <Txt weight={tab === t.key ? "semibold" : "medium"}
//               color={tab === t.key ? C.onBrandPrimary : C.onSurface} size={T.sm}>{t.label}</Txt>
//           </Pressable>
//         ))}
//       </View>

//       {loading ? <Loading /> : orders.length === 0 ? (
//         <EmptyState icon="receipt-outline" title={`No ${tab} orders`}
//           subtitle="When you place an order, it'll show up here." />
//       ) : (
//         <FlatList
//           data={orders}
//           keyExtractor={(o) => o.id}
//           contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.md }}
//           renderItem={({ item }) => {
//             const col = statusColor(item.status);
//             const itemsText = item.items.map((i: any) => `${i.quantity}× ${i.name}`).join(", ");
//             return (
//               <Pressable style={styles.card} onPress={() => router.push(`/order/${item.id}`)} testID={`order-card-${item.id}`}>
//                 <View style={styles.cardTop}>
//                   <View style={{ flex: 1 }}>
//                     <Txt weight="semibold" numberOfLines={1}>{item.restaurant_name}</Txt>
//                     <Txt size={T.sm} color={C.muted}>{fmtDateTime(item.created_at)}</Txt>
//                   </View>
//                   <Badge label={ORDER_STATUS_LABELS[item.status] || item.status} color={col.bg} textColor={col.fg} />
//                 </View>
//                 <Txt size={T.sm} color={C.onSurfaceTertiary} numberOfLines={2} style={{ marginTop: S.sm }}>{itemsText}</Txt>
//                 <View style={styles.cardBottom}>
//                   <Txt weight="semibold">{money(item.customer_total)}</Txt>
//                   {(item.status === "DELIVERED" || item.status === "CANCELLED" || item.status === "REJECTED") && (
//                     <Pressable style={styles.reorder} onPress={() => reorder(item.id)} testID={`reorder-${item.id}`}>
//                       <Ionicons name="repeat" size={16} color={C.brandPrimary} />
//                       <Txt weight="semibold" color={C.brandPrimary} size={T.sm}>Reorder</Txt>
//                     </Pressable>
//                   )}
//                 </View>
//               </Pressable>
//             );
//           }}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: C.surface },
//   tabs: { flexDirection: "row", gap: S.sm, padding: S.lg },
//   tab: { flex: 1, height: 40, borderRadius: R.pill, alignItems: "center", justifyContent: "center", backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border },
//   tabActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
//   card: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
//   cardTop: { flexDirection: "row", alignItems: "flex-start", gap: S.sm },
//   cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
//   reorder: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: S.xs, paddingHorizontal: S.md, borderRadius: R.pill, backgroundColor: C.brandTertiary },
// });

























// import { useCallback, useState } from "react";
// import { FlatList, Pressable, StyleSheet, View } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect, useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import { Badge, EmptyState, Loading, Txt } from "@/src/components/ui";
// import { useCart } from "@/src/context/cart";
// import { useToast } from "@/src/context/toast";
// import { fmtDateTime, money } from "@/src/format";
// import { C, F, ORDER_STATUS_LABELS, R, S, T } from "@/src/theme";

// const TABS = [
//   { key: "active", label: "Active" },
//   { key: "completed", label: "Completed" },
//   { key: "cancelled", label: "Cancelled" },
// ];

// const statusColor = (s: string) => {
//   if (s === "DELIVERED") return { bg: "#E7F0E9", fg: C.success };
//   if (s === "CANCELLED" || s === "REJECTED") return { bg: "#FBEBEA", fg: C.error };
//   return { bg: C.brandTertiary, fg: C.onBrandTertiary };
// };

// export default function Orders() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
//   const { clearCart, setQty } = useCart();
//   const [tab, setTab] = useState("active");
//   const [orders, setOrders] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   const load = useCallback(async (kind: string) => {
//     setLoading(true);
//     try {
//       const r = await api.get("/orders", { kind });
//       setOrders(r.orders || []);
//     } catch { 
//       setOrders([]); 
//     } finally { 
//       setLoading(false); 
//     }
//   }, []);

//   useFocusEffect(useCallback(() => { load(tab); }, [load, tab]));

//   const reorder = async (id: string, e: any) => {
//     e.stopPropagation(); // কার্ডের ক্লিক ইভেন্টকে থামানোর জন্য
//     try {
//       const r = await api.post(`/orders/${id}/reorder`);
//       if (!r.is_open) { toast.show("Restaurant is currently closed", "error"); return; }
//       if (r.items.length === 0) { toast.show("Items no longer available", "error"); return; }
//       clearCart();
//       r.items.forEach((it: any) =>
//         setQty({ id: it.food_id, name: it.name, price: it.price, image: it.image },
//           { id: r.restaurant_id, name: r.restaurant_name }, it.quantity));
//       if (r.unavailable?.length) toast.show(`${r.unavailable.length} item(s) unavailable and skipped`, "info");
//       router.push("/cart");
//     } catch (e: any) { toast.show(e.message, "error"); }
//   };

//   return (
//     <View style={[styles.root, { paddingTop: insets.top + S.md }]}>
//       <Txt weight="semibold" size={T["2xl"]} style={{ paddingHorizontal: S.lg }}>Your Orders</Txt>
//       <View style={styles.tabs}>
//         {TABS.map((t) => (
//           <Pressable key={t.key} onPress={() => setTab(t.key)}
//             style={[styles.tab, tab === t.key && styles.tabActive]} testID={`orders-tab-${t.key}`}>
//             <Txt weight={tab === t.key ? "semibold" : "medium"}
//               color={tab === t.key ? C.onBrandPrimary : C.onSurface} size={T.sm}>{t.label}</Txt>
//           </Pressable>
//         ))}
//       </View>

//       {loading ? <Loading /> : orders.length === 0 ? (
//         <EmptyState icon="receipt-outline" title={`No ${tab} orders`}
//           subtitle="When you place an order, it'll show up here." />
//       ) : (
//         <FlatList
//           data={orders}
//           keyExtractor={(o) => o.id}
//           contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.md }}
//           renderItem={({ item }) => {
//             const col = statusColor(item.status);
//             const itemsText = item.items.map((i: any) => `${i.quantity}× ${i.name}`).join(", ");
//             return (
//               <Pressable 
//                 style={styles.card} 
//                 onPress={() => router.push(`/(tabs)/order/${item.id}`)} /* ✅ সঠিক পাথ দেওয়া হলো */
//                 testID={`order-card-${item.id}`}
//               >
//                 <View style={styles.cardTop}>
//                   <View style={{ flex: 1 }}>
//                     <Txt weight="semibold" numberOfLines={1}>{item.restaurant_name}</Txt>
//                     <Txt size={T.sm} color={C.muted}>{fmtDateTime(item.created_at)}</Txt>
//                   </View>
//                   <Badge label={ORDER_STATUS_LABELS[item.status] || item.status} color={col.bg} textColor={col.fg} />
//                 </View>
//                 <Txt size={T.sm} color={C.onSurfaceTertiary} numberOfLines={2} style={{ marginTop: S.sm }}>{itemsText}</Txt>
//                 <View style={styles.cardBottom}>
//                   <Txt weight="semibold">{money(item.customer_total)}</Txt>
//                   {(item.status === "DELIVERED" || item.status === "CANCELLED" || item.status === "REJECTED") && (
//                     <Pressable style={styles.reorder} onPress={(e) => reorder(item.id, e)} testID={`reorder-${item.id}`}>
//                       <Ionicons name="repeat" size={16} color={C.brandPrimary} />
//                       <Txt weight="semibold" color={C.brandPrimary} size={T.sm}>Reorder</Txt>
//                     </Pressable>
//                   )}
//                 </View>
//               </Pressable>
//             );
//           }}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: C.surface },
//   tabs: { flexDirection: "row", gap: S.sm, padding: S.lg },
//   tab: { flex: 1, height: 40, borderRadius: R.pill, alignItems: "center", justifyContent: "center", backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border },
//   tabActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
//   card: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
//   cardTop: { flexDirection: "row", alignItems: "flex-start", gap: S.sm },
//   cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
//   reorder: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: S.xs, paddingHorizontal: S.md, borderRadius: R.pill, backgroundColor: C.brandTertiary },
// });



























// import { useCallback, useState } from "react";
// import { FlatList, Pressable, StyleSheet, View } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect, useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import { Badge, EmptyState, Loading, Txt } from "@/src/components/ui";
// import { useCart } from "@/src/context/cart";
// import { useToast } from "@/src/context/toast";
// import { fmtDateTime, money } from "@/src/format";
// import { C, F, ORDER_STATUS_LABELS, R, S, T } from "@/src/theme";

// const TABS = [
//   { key: "active", label: "Active" },
//   { key: "completed", label: "Completed" },
//   { key: "cancelled", label: "Cancelled" },
// ];

// const statusColor = (s: string) => {
//   if (s === "DELIVERED") return { bg: "#E7F0E9", fg: C.success };
//   if (s === "CANCELLED" || s === "REJECTED") return { bg: "#FBEBEA", fg: C.error };
//   return { bg: C.brandTertiary, fg: C.onBrandTertiary };
// };

// export default function Orders() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
//   const { clearCart, setQty } = useCart();
//   const [tab, setTab] = useState("active");
//   const [orders, setOrders] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   const load = useCallback(async (kind: string) => {
//     setLoading(true);
//     try {
//       const r = await api.get("/orders", { kind });
//       setOrders(r.orders || []);
//     } catch { 
//       setOrders([]); 
//     } finally { 
//       setLoading(false); 
//     }
//   }, []);

//   useFocusEffect(useCallback(() => { load(tab); }, [load, tab]));

//   const reorder = async (id: string, e: any) => {
//     e.stopPropagation(); // কার্ডের ক্লিক ইভেন্টকে থামানোর জন্য
//     try {
//       const r = await api.post(`/orders/${id}/reorder`);
//       if (!r.is_open) { toast.show("Restaurant is currently closed", "error"); return; }
//       if (r.items.length === 0) { toast.show("Items no longer available", "error"); return; }
//       clearCart();
//       r.items.forEach((it: any) =>
//         setQty({ id: it.food_id, name: it.name, price: it.price, image: it.image },
//           { id: r.restaurant_id, name: r.restaurant_name }, it.quantity));
//       if (r.unavailable?.length) toast.show(`${r.unavailable.length} item(s) unavailable and skipped`, "info");
//       router.push("/cart");
//     } catch (e: any) { toast.show(e.message, "error"); }
//   };

//   return (
//     <View style={[styles.root, { paddingTop: insets.top + S.md }]}>
//       <Txt weight="semibold" size={T["2xl"]} style={{ paddingHorizontal: S.lg }}>Your Orders</Txt>
//       <View style={styles.tabs}>
//         {TABS.map((t) => (
//           <Pressable key={t.key} onPress={() => setTab(t.key)}
//             style={[styles.tab, tab === t.key && styles.tabActive]} testID={`orders-tab-${t.key}`}>
//             <Txt weight={tab === t.key ? "semibold" : "medium"}
//               color={tab === t.key ? C.onBrandPrimary : C.onSurface} size={T.sm}>{t.label}</Txt>
//           </Pressable>
//         ))}
//       </View>

//       {loading ? <Loading /> : orders.length === 0 ? (
//         <EmptyState icon="receipt-outline" title={`No ${tab} orders`}
//           subtitle="When you place an order, it'll show up here." />
//       ) : (
//         <FlatList
//           data={orders}
//           keyExtractor={(o) => o.id}
//           contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.md }}
//           renderItem={({ item }) => {
//             const col = statusColor(item.status);
//             const itemsText = item.items.map((i: any) => `${i.quantity}× ${i.name}`).join(", ");
//             return (
//               <Pressable 
//                 style={styles.card} 
//                 onPress={() => router.push(`/(tabs)/orders/${item.id}`)} /* ✅ সঠিক পাথ (orders) দেওয়া হলো */
//                 testID={`order-card-${item.id}`}
//               >
//                 <View style={styles.cardTop}>
//                   <View style={{ flex: 1 }}>
//                     <Txt weight="semibold" numberOfLines={1}>{item.restaurant_name}</Txt>
//                     <Txt size={T.sm} color={C.muted}>{fmtDateTime(item.created_at)}</Txt>
//                   </View>
//                   <Badge label={ORDER_STATUS_LABELS[item.status] || item.status} color={col.bg} textColor={col.fg} />
//                 </View>
//                 <Txt size={T.sm} color={C.onSurfaceTertiary} numberOfLines={2} style={{ marginTop: S.sm }}>{itemsText}</Txt>
//                 <View style={styles.cardBottom}>
//                   <Txt weight="semibold">{money(item.customer_total)}</Txt>
//                   {(item.status === "DELIVERED" || item.status === "CANCELLED" || item.status === "REJECTED") && (
//                     <Pressable style={styles.reorder} onPress={(e) => reorder(item.id, e)} testID={`reorder-${item.id}`}>
//                       <Ionicons name="repeat" size={16} color={C.brandPrimary} />
//                       <Txt weight="semibold" color={C.brandPrimary} size={T.sm}>Reorder</Txt>
//                     </Pressable>
//                   )}
//                 </View>
//               </Pressable>
//             );
//           }}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: C.surface },
//   tabs: { flexDirection: "row", gap: S.sm, padding: S.lg },
//   tab: { flex: 1, height: 40, borderRadius: R.pill, alignItems: "center", justifyContent: "center", backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border },
//   tabActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
//   card: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
//   cardTop: { flexDirection: "row", alignItems: "flex-start", gap: S.sm },
//   cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
//   reorder: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: S.xs, paddingHorizontal: S.md, borderRadius: R.pill, backgroundColor: C.brandTertiary },
// });





























import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Badge, EmptyState, Loading, Txt } from "@/src/components/ui";
import { useCart } from "@/src/context/cart";
import { useToast } from "@/src/context/toast";
import { fmtDateTime, money } from "@/src/format";
import { C, F, ORDER_STATUS_LABELS, R, S, T } from "@/src/theme";

const TABS = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const statusColor = (s: string) => {
  if (s === "DELIVERED") return { bg: "#E7F0E9", fg: C.success };
  if (s === "CANCELLED" || s === "REJECTED") return { bg: "#FBEBEA", fg: C.error };
  return { bg: C.brandTertiary, fg: C.onBrandTertiary };
};

export default function Orders() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { clearCart, setQty } = useCart();
  const [tab, setTab] = useState("active");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (kind: string) => {
    setLoading(true);
    try {
      const r = await api.get("/orders", { kind });
      setOrders(r.orders || []);
    } catch { 
      setOrders([]); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useFocusEffect(useCallback(() => { load(tab); }, [load, tab]));

  const reorder = async (id: string, e: any) => {
    e.stopPropagation(); // কার্ডের ক্লিক ইভেন্টকে থামানোর জন্য
    try {
      const r = await api.post(`/orders/${id}/reorder`);
      if (!r.is_open) { toast.show("Restaurant is currently closed", "error"); return; }
      if (r.items.length === 0) { toast.show("Items no longer available", "error"); return; }
      clearCart();
      r.items.forEach((it: any) =>
        setQty({ id: it.food_id, name: it.name, price: it.price, image: it.image },
          { id: r.restaurant_id, name: r.restaurant_name }, it.quantity));
      if (r.unavailable?.length) toast.show(`${r.unavailable.length} item(s) unavailable and skipped`, "info");
      router.push("/cart");
    } catch (e: any) { toast.show(e.message, "error"); }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + S.md }]}>
      <Txt weight="semibold" size={T["2xl"]} style={{ paddingHorizontal: S.lg }}>Your Orders</Txt>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]} testID={`orders-tab-${t.key}`}>
            <Txt weight={tab === t.key ? "semibold" : "medium"}
              color={tab === t.key ? C.onBrandPrimary : C.onSurface} size={T.sm}>{t.label}</Txt>
          </Pressable>
        ))}
      </View>

      {loading ? <Loading /> : orders.length === 0 ? (
        <EmptyState icon="receipt-outline" title={`No ${tab} orders`}
          subtitle="When you place an order, it'll show up here." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.md }}
          renderItem={({ item }) => {
            const col = statusColor(item.status);
            const itemsText = item.items.map((i: any) => `${i.quantity}× ${i.name}`).join(", ");
            return (
              <Pressable 
                style={styles.card} 
                onPress={() => router.push(`/(tabs)/order/${item.id}`)} /* ✅ আপনার ফোল্ডার স্ট্রাকচারের (order) সাথে মিল রেখে পাথ দেওয়া হলো */
                testID={`order-card-${item.id}`}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Txt weight="semibold" numberOfLines={1}>{item.restaurant_name}</Txt>
                    <Txt size={T.sm} color={C.muted}>{fmtDateTime(item.created_at)}</Txt>
                  </View>
                  <Badge label={ORDER_STATUS_LABELS[item.status] || item.status} color={col.bg} textColor={col.fg} />
                </View>
                <Txt size={T.sm} color={C.onSurfaceTertiary} numberOfLines={2} style={{ marginTop: S.sm }}>{itemsText}</Txt>
                <View style={styles.cardBottom}>
                  <Txt weight="semibold">{money(item.customer_total)}</Txt>
                  {(item.status === "DELIVERED" || item.status === "CANCELLED" || item.status === "REJECTED") && (
                    <Pressable style={styles.reorder} onPress={(e) => reorder(item.id, e)} testID={`reorder-${item.id}`}>
                      <Ionicons name="repeat" size={16} color={C.brandPrimary} />
                      <Txt weight="semibold" color={C.brandPrimary} size={T.sm}>Reorder</Txt>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  tabs: { flexDirection: "row", gap: S.sm, padding: S.lg },
  tab: { flex: 1, height: 40, borderRadius: R.pill, alignItems: "center", justifyContent: "center", backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
  card: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: S.sm },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
  reorder: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: S.xs, paddingHorizontal: S.md, borderRadius: R.pill, backgroundColor: C.brandTertiary },
});