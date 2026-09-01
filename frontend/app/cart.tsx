// import { useCallback, useEffect, useMemo, useState } from "react";
// import { Pressable, ScrollView, StyleSheet, View } from "react-native";
// import { Image } from "expo-image";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect, useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import { Button, EmptyState, Stepper, Txt } from "@/src/components/ui";
// import { useCart } from "@/src/context/cart";
// import { useToast } from "@/src/context/toast";
// import { genId, money } from "@/src/format";
// import { C, F, R, S, shadow, T } from "@/src/theme";

// export default function Cart() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
//   const { cart, count, subtotal, addItem, decItem, clearCart } = useCart();
//   const [addresses, setAddresses] = useState<any[]>([]);
//   const [selected, setSelected] = useState<string | null>(null);
//   const [quote, setQuote] = useState<any>(null);
//   const [placing, setPlacing] = useState(false);
//   const [orderKey, setOrderKey] = useState(genId());

//   const rest = useMemo(() => ({ id: cart.restaurant_id!, name: cart.restaurant_name! }), [cart]);

//   const loadAddresses = useCallback(async () => {
//     try {
//       const r = await api.get("/addresses");
//       setAddresses(r.addresses || []);
//       const def = (r.addresses || []).find((a: any) => a.is_default) || r.addresses?.[0];
//       setSelected((prev) => prev || def?.id || null);
//     } catch {}
//   }, []);

//   useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));

//   useEffect(() => {
//     if (count === 0 || !selected || !cart.restaurant_id) { setQuote(null); return; }
//     let cancel = false;
//     (async () => {
//       try {
//         const r = await api.post("/orders/quote", {
//           restaurant_id: cart.restaurant_id,
//           items: cart.lines.map((l) => ({ food_id: l.food_id, quantity: l.quantity })),
//           address_id: selected, client_order_id: "quote",
//         });
//         if (!cancel) setQuote(r);
//       } catch (e: any) { if (!cancel) { setQuote(null); } }
//     })();
//     return () => { cancel = true; };
//   }, [cart.lines, selected, count]);

//   const place = async () => {
//     if (!selected) { toast.show("Select a delivery address", "error"); return; }
//     if (quote && !quote.serviceable) { toast.show("Address is outside the service area", "error"); return; }
//     setPlacing(true);
//     try {
//       const r = await api.post("/orders", {
//         restaurant_id: cart.restaurant_id,
//         items: cart.lines.map((l) => ({ food_id: l.food_id, quantity: l.quantity })),
//         address_id: selected, payment_method: "COD", client_order_id: orderKey,
//       });
//       clearCart();
//       setOrderKey(genId());
//       router.replace(`/order/${r.order.id}`);
//     } catch (e: any) { toast.show(e.message, "error"); }
//     finally { setPlacing(false); }
//   };

//   if (count === 0) {
//     return (
//       <View style={styles.root}>
//         <Header insets={insets} onBack={() => router.back()} />
//         <EmptyState image="https://images.unsplash.com/photo-1567934124115-2eca8953796b?w=400"
//           title="Your cart is feeling light"
//           subtitle="Add some delicious items to get started."
//           action={<Button label="Browse restaurants" onPress={() => router.replace("/(tabs)")} />} />
//       </View>
//     );
//   }

//   const totals = quote?.totals;

//   return (
//     <View style={styles.root}>
//       <Header insets={insets} onBack={() => router.back()} />
//       <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
//         <View style={styles.restCard}>
//           <Ionicons name="storefront" size={20} color={C.brandPrimary} />
//           <Txt weight="semibold" size={T.lg} style={{ flex: 1 }} numberOfLines={1}>{cart.restaurant_name}</Txt>
//         </View>

//         <View style={styles.block}>
//           {cart.lines.map((l) => (
//             <View key={l.food_id} style={styles.item} testID={`cart-item-${l.food_id}`}>
//               <Image source={{ uri: l.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200" }} style={styles.itemImg} contentFit="cover" />
//               <View style={{ flex: 1 }}>
//                 <Txt weight="medium" numberOfLines={1}>{l.name}</Txt>
//                 <Txt size={T.sm} color={C.muted}>{money(l.price)}</Txt>
//               </View>
//               <Stepper qty={l.quantity} onInc={() => addItem({ id: l.food_id, name: l.name, price: l.price, image: l.image }, rest)} onDec={() => decItem(l.food_id)} testID={`cart-stepper-${l.food_id}`} />
//             </View>
//           ))}
//         </View>

//         <Txt weight="semibold" size={T.lg} style={styles.secTitle}>Delivery Address</Txt>
//         <View style={styles.block}>
//           {addresses.length === 0 ? (
//             <Pressable style={styles.addAddr} onPress={() => router.push("/address-edit")} testID="add-address-cta">
//               <Ionicons name="add-circle-outline" size={20} color={C.brandPrimary} />
//               <Txt weight="medium" color={C.brandPrimary}>Add a delivery address</Txt>
//             </Pressable>
//           ) : addresses.map((a) => (
//             <Pressable key={a.id} style={styles.addr} onPress={() => setSelected(a.id)} testID={`address-${a.id}`}>
//               <Ionicons name={selected === a.id ? "radio-button-on" : "radio-button-off"} size={20} color={selected === a.id ? C.brandPrimary : C.muted} />
//               <View style={{ flex: 1 }}>
//                 <Txt weight="medium">{a.label}</Txt>
//                 <Txt size={T.sm} color={C.muted} numberOfLines={1}>{a.line}</Txt>
//               </View>
//             </Pressable>
//           ))}
//           {addresses.length > 0 && (
//             <Pressable style={styles.addAddr} onPress={() => router.push("/address-edit")} testID="add-address-cta">
//               <Ionicons name="add" size={18} color={C.brandPrimary} />
//               <Txt weight="medium" color={C.brandPrimary} size={T.sm}>Add new address</Txt>
//             </Pressable>
//           )}
//         </View>

//         <Txt weight="semibold" size={T.lg} style={styles.secTitle}>Bill Details</Txt>
//         <View style={styles.block}>
//           <BillRow label="Item Total" value={money(subtotal)} />
//           <BillRow label="Platform Charge" value={money(totals?.platform_charge)} />
//           <BillRow label="Delivery Charge" value={money(totals?.customer_delivery_charge)} />
//           <View style={styles.billTotal}>
//             <Txt weight="semibold" size={T.lg}>To Pay</Txt>
//             <Txt weight="semibold" size={T.lg}>{money(totals?.customer_total ?? subtotal)}</Txt>
//           </View>
//         </View>

//         <View style={[styles.block, styles.cod]}>
//           <Ionicons name="cash-outline" size={22} color={C.success} />
//           <View style={{ flex: 1 }}>
//             <Txt weight="medium">Cash on Delivery</Txt>
//             <Txt size={T.sm} color={C.muted}>Pay when your order arrives</Txt>
//           </View>
//           <Ionicons name="checkmark-circle" size={20} color={C.success} />
//         </View>
//       </ScrollView>

//       <View style={[styles.bottomBar, { paddingBottom: insets.bottom + S.md }]}>
//         <View>
//           <Txt size={T.sm} color={C.muted}>Total</Txt>
//           <Txt weight="semibold" size={T.xl}>{money(totals?.customer_total ?? subtotal)}</Txt>
//         </View>
//         <Button label="Place Order" onPress={place} loading={placing}
//           style={{ flex: 1, marginLeft: S.lg }} testID="place-order-button" />
//       </View>
//     </View>
//   );
// }

// function Header({ insets, onBack }: { insets: any; onBack: () => void }) {
//   return (
//     <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
//       <Pressable onPress={onBack} hitSlop={10} testID="cart-back"><Ionicons name="chevron-back" size={24} color={C.onSurface} /></Pressable>
//       <Txt weight="semibold" size={T.xl}>Your Cart</Txt>
//       <View style={{ width: 24 }} />
//     </View>
//   );
// }

// function BillRow({ label, value }: { label: string; value?: string }) {
//   return (
//     <View style={styles.billRow}>
//       <Txt color={C.onSurfaceTertiary}>{label}</Txt>
//       <Txt weight="medium">{value ?? "—"}</Txt>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: C.surface },
//   header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surfaceSecondary },
//   restCard: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
//   block: { backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginTop: S.md },
//   item: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.sm },
//   itemImg: { width: 48, height: 48, borderRadius: R.sm },
//   secTitle: { marginTop: S.xl },
//   addr: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.divider },
//   addAddr: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingTop: S.md },
//   billRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: S.xs },
//   billTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: S.sm, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
//   cod: { flexDirection: "row", alignItems: "center", gap: S.md },
//   bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceSecondary, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: S.lg, paddingTop: S.md, ...shadow },
// });











// import { useCallback, useEffect, useMemo, useState } from "react";
// import { Pressable, ScrollView, StyleSheet, View } from "react-native";
// import { Image } from "expo-image";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect, useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import { Button, EmptyState, Stepper, Txt } from "@/src/components/ui";
// import { useCart } from "@/src/context/cart";
// import { useToast } from "@/src/context/toast";
// import { genId, money } from "@/src/format";
// import { C, F, R, S, shadow, T } from "@/src/theme";

// export default function Cart() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
//   const { cart, count, subtotal, addItem, decItem, clearCart } = useCart();
//   const [addresses, setAddresses] = useState<any[]>([]);
//   const [selected, setSelected] = useState<string | null>(null);
//   const [quote, setQuote] = useState<any>(null);
//   const [placing, setPlacing] = useState(false);
//   const [orderKey, setOrderKey] = useState(genId());

//   const rest = useMemo(() => ({ id: cart.restaurant_id!, name: cart.restaurant_name! }), [cart]);

//   const loadAddresses = useCallback(async () => {
//     try {
//       const r = await api.get("/addresses");
//       setAddresses(r.addresses || []);
//       const def = (r.addresses || []).find((a: any) => a.is_default) || r.addresses?.[0];
//       setSelected((prev) => prev || def?.id || null);
//     } catch {}
//   }, []);

//   useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));

//   useEffect(() => {
//     if (count === 0 || !selected || !cart.restaurant_id) { setQuote(null); return; }
//     let cancel = false;
//     (async () => {
//       try {
//         const r = await api.post("/orders/quote", {
//           restaurant_id: cart.restaurant_id,
//           items: cart.lines.map((l) => ({ food_id: l.food_id, quantity: l.quantity })),
//           address_id: selected, client_order_id: "quote",
//         });
//         if (!cancel) setQuote(r);
//       } catch (e: any) { if (!cancel) { setQuote(null); } }
//     })();
//     return () => { cancel = true; };
//   }, [cart.lines, selected, count]);

//   const place = async () => {
//     if (!selected) { toast.show("Select a delivery address", "error"); return; }
//     if (quote && !quote.serviceable) { toast.show("Address is outside the service area", "error"); return; }
//     setPlacing(true);
//     try {
//       const r = await api.post("/orders", {
//         restaurant_id: cart.restaurant_id,
//         items: cart.lines.map((l) => ({ food_id: l.food_id, quantity: l.quantity })),
//         address_id: selected, payment_method: "COD", client_order_id: orderKey,
//       });
//       clearCart();
//       setOrderKey(genId());
//       // ✅ Explicit Path set for Customer Order Route to fix routing conflict
//       router.replace(`/(tabs)/orders/${r.order.id}` as any);
//     } catch (e: any) { toast.show(e.message, "error"); }
//     finally { setPlacing(false); }
//   };

//   if (count === 0) {
//     return (
//       <View style={styles.root}>
//         <Header insets={insets} onBack={() => router.back()} />
//         <EmptyState image="https://images.unsplash.com/photo-1567934124115-2eca8953796b?w=400"
//           title="Your cart is feeling light"
//           subtitle="Add some delicious items to get started."
//           action={<Button label="Browse restaurants" onPress={() => router.replace("/(tabs)")} />} />
//       </View>
//     );
//   }

//   const totals = quote?.totals;

//   return (
//     <View style={styles.root}>
//       <Header insets={insets} onBack={() => router.back()} />
//       <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
//         <View style={styles.restCard}>
//           <Ionicons name="storefront" size={20} color={C.brandPrimary} />
//           <Txt weight="semibold" size={T.lg} style={{ flex: 1 }} numberOfLines={1}>{cart.restaurant_name}</Txt>
//         </View>

//         <View style={styles.block}>
//           {cart.lines.map((l) => (
//             <View key={l.food_id} style={styles.item} testID={`cart-item-${l.food_id}`}>
//               <Image source={{ uri: l.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200" }} style={styles.itemImg} contentFit="cover" />
//               <View style={{ flex: 1 }}>
//                 <Txt weight="medium" numberOfLines={1}>{l.name}</Txt>
//                 <Txt size={T.sm} color={C.muted}>{money(l.price)}</Txt>
//               </View>
//               <Stepper qty={l.quantity} onInc={() => addItem({ id: l.food_id, name: l.name, price: l.price, image: l.image }, rest)} onDec={() => decItem(l.food_id)} testID={`cart-stepper-${l.food_id}`} />
//             </View>
//           ))}
//         </View>

//         <Txt weight="semibold" size={T.lg} style={styles.secTitle}>Delivery Address</Txt>
//         <View style={styles.block}>
//           {addresses.length === 0 ? (
//             <Pressable style={styles.addAddr} onPress={() => router.push("/address-edit")} testID="add-address-cta">
//               <Ionicons name="add-circle-outline" size={20} color={C.brandPrimary} />
//               <Txt weight="medium" color={C.brandPrimary}>Add a delivery address</Txt>
//             </Pressable>
//           ) : addresses.map((a) => (
//             <Pressable key={a.id} style={styles.addr} onPress={() => setSelected(a.id)} testID={`address-${a.id}`}>
//               <Ionicons name={selected === a.id ? "radio-button-on" : "radio-button-off"} size={20} color={selected === a.id ? C.brandPrimary : C.muted} />
//               <View style={{ flex: 1 }}>
//                 <Txt weight="medium">{a.label}</Txt>
//                 <Txt size={T.sm} color={C.muted} numberOfLines={1}>{a.line}</Txt>
//               </View>
//             </Pressable>
//           ))}
//           {addresses.length > 0 && (
//             <Pressable style={styles.addAddr} onPress={() => router.push("/address-edit")} testID="add-address-cta">
//               <Ionicons name="add" size={18} color={C.brandPrimary} />
//               <Txt weight="medium" color={C.brandPrimary} size={T.sm}>Add new address</Txt>
//             </Pressable>
//           )}
//         </View>

//         <Txt weight="semibold" size={T.lg} style={styles.secTitle}>Bill Details</Txt>
//         <View style={styles.block}>
//           <BillRow label="Item Total" value={money(subtotal)} />
//           <BillRow label="Platform Charge" value={money(totals?.platform_charge)} />
//           <BillRow label="Delivery Charge" value={money(totals?.customer_delivery_charge)} />
//           <View style={styles.billTotal}>
//             <Txt weight="semibold" size={T.lg}>To Pay</Txt>
//             <Txt weight="semibold" size={T.lg}>{money(totals?.customer_total ?? subtotal)}</Txt>
//           </View>
//         </View>

//         <View style={[styles.block, styles.cod]}>
//           <Ionicons name="cash-outline" size={22} color={C.success} />
//           <View style={{ flex: 1 }}>
//             <Txt weight="medium">Cash on Delivery</Txt>
//             <Txt size={T.sm} color={C.muted}>Pay when your order arrives</Txt>
//           </View>
//           <Ionicons name="checkmark-circle" size={20} color={C.success} />
//         </View>
//       </ScrollView>

//       <View style={[styles.bottomBar, { paddingBottom: insets.bottom + S.md }]}>
//         <View>
//           <Txt size={T.sm} color={C.muted}>Total</Txt>
//           <Txt weight="semibold" size={T.xl}>{money(totals?.customer_total ?? subtotal)}</Txt>
//         </View>
//         <Button label="Place Order" onPress={place} loading={placing}
//           style={{ flex: 1, marginLeft: S.lg }} testID="place-order-button" />
//       </View>
//     );
// }

// function Header({ insets, onBack }: { insets: any; onBack: () => void }) {
//   return (
//     <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
//       <Pressable onPress={onBack} hitSlop={10} testID="cart-back"><Ionicons name="chevron-back" size={24} color={C.onSurface} /></Pressable>
//       <Txt weight="semibold" size={T.xl}>Your Cart</Txt>
//       <View style={{ width: 24 }} />
//     </View>
//   );
// }

// function BillRow({ label, value }: { label: string; value?: string }) {
//   return (
//     <View style={styles.billRow}>
//       <Txt color={C.onSurfaceTertiary}>{label}</Txt>
//       <Txt weight="medium">{value ?? "—"}</Txt>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: C.surface },
//   header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surfaceSecondary },
//   restCard: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
//   block: { backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginTop: S.md },
//   item: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.sm },
//   itemImg: { width: 48, height: 48, borderRadius: R.sm },
//   secTitle: { marginTop: S.xl },
//   addr: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.divider },
//   addAddr: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingTop: S.md },
//   billRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: S.xs },
//   billTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: S.sm, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
//   cod: { flexDirection: "row", alignItems: "center", gap: S.md },
//   bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceSecondary, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: S.lg, paddingTop: S.md, ...shadow },
// });
























import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Button, EmptyState, Stepper, Txt } from "@/src/components/ui";
import { useCart } from "@/src/context/cart";
import { useToast } from "@/src/context/toast";
import { genId, money } from "@/src/format";
import { C, F, R, S, shadow, T } from "@/src/theme";

export default function Cart() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { cart, count, subtotal, addItem, decItem, clearCart } = useCart();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [placing, setPlacing] = useState(false);
  const [orderKey, setOrderKey] = useState(genId());

  const rest = useMemo(() => ({ id: cart.restaurant_id!, name: cart.restaurant_name! }), [cart]);

  const loadAddresses = useCallback(async () => {
    try {
      const r = await api.get("/addresses");
      setAddresses(r.addresses || []);
      const def = (r.addresses || []).find((a: any) => a.is_default) || r.addresses?.[0];
      setSelected((prev) => prev || def?.id || null);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));

  useEffect(() => {
    if (count === 0 || !selected || !cart.restaurant_id) { setQuote(null); return; }
    let cancel = false;
    (async () => {
      try {
        const r = await api.post("/orders/quote", {
          restaurant_id: cart.restaurant_id,
          items: cart.lines.map((l) => ({ food_id: l.food_id, quantity: l.quantity })),
          address_id: selected, client_order_id: "quote",
        });
        if (!cancel) setQuote(r);
      } catch (e: any) { if (!cancel) { setQuote(null); } }
    })();
    return () => { cancel = true; };
  }, [cart.lines, selected, count]);

  const place = async () => {
    if (!selected) { toast.show("Select a delivery address", "error"); return; }
    if (quote && !quote.serviceable) { toast.show("Address is outside the service area", "error"); return; }
    setPlacing(true);
    try {
      await api.post("/orders", {
        restaurant_id: cart.restaurant_id,
        items: cart.lines.map((l) => ({ food_id: l.food_id, quantity: l.quantity })),
        address_id: selected, payment_method: "COD", client_order_id: orderKey,
      });
      clearCart();
      setOrderKey(genId());
      // 🟢 Redirecting directly to Customer Orders tab to prevent loading Restaurant View
      router.replace("/(tabs)/orders");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setPlacing(false); }
  };

  if (count === 0) {
    return (
      <View style={styles.root}>
        <Header insets={insets} onBack={() => router.back()} />
        <EmptyState 
          image="https://images.unsplash.com/photo-1567934124115-2eca8953796b?w=400"
          title="Your cart is feeling light"
          subtitle="Add some delicious items to get started."
          action={<Button label="Browse restaurants" onPress={() => router.replace("/(tabs)")} />} 
        />
      </View>
    );
  }

  const totals = quote?.totals;

  return (
    <View style={styles.root}>
      <Header insets={insets} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <View style={styles.restCard}>
          <Ionicons name="storefront" size={20} color={C.brandPrimary} />
          <Txt weight="semibold" size={T.lg} style={{ flex: 1 }} numberOfLines={1}>{cart.restaurant_name}</Txt>
        </View>

        <View style={styles.block}>
          {cart.lines.map((l) => (
            <View key={l.food_id} style={styles.item} testID={`cart-item-${l.food_id}`}>
              <Image source={{ uri: l.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200" }} style={styles.itemImg} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Txt weight="medium" numberOfLines={1}>{l.name}</Txt>
                <Txt size={T.sm} color={C.muted}>{money(l.price)}</Txt>
              </View>
              <Stepper qty={l.quantity} onInc={() => addItem({ id: l.food_id, name: l.name, price: l.price, image: l.image }, rest)} onDec={() => decItem(l.food_id)} testID={`cart-stepper-${l.food_id}`} />
            </View>
          ))}
        </View>

        <Txt weight="semibold" size={T.lg} style={styles.secTitle}>Delivery Address</Txt>
        <View style={styles.block}>
          {addresses.length === 0 ? (
            <Pressable style={styles.addAddr} onPress={() => router.push("/address-edit")} testID="add-address-cta">
              <Ionicons name="add-circle-outline" size={20} color={C.brandPrimary} />
              <Txt weight="medium" color={C.brandPrimary}>Add a delivery address</Txt>
            </Pressable>
          ) : addresses.map((a) => (
            <Pressable key={a.id} style={styles.addr} onPress={() => setSelected(a.id)} testID={`address-${a.id}`}>
              <Ionicons name={selected === a.id ? "radio-button-on" : "radio-button-off"} size={20} color={selected === a.id ? C.brandPrimary : C.muted} />
              <View style={{ flex: 1 }}>
                <Txt weight="medium">{a.label}</Txt>
                <Txt size={T.sm} color={C.muted} numberOfLines={1}>{a.line}</Txt>
              </View>
            </Pressable>
          ))}
          {addresses.length > 0 && (
            <Pressable style={styles.addAddr} onPress={() => router.push("/address-edit")} testID="add-address-cta">
              <Ionicons name="add" size={18} color={C.brandPrimary} />
              <Txt weight="medium" color={C.brandPrimary} size={T.sm}>Add new address</Txt>
            </Pressable>
          )}
        </View>

        <Txt weight="semibold" size={T.lg} style={styles.secTitle}>Bill Details</Txt>
        <View style={styles.block}>
          <BillRow label="Item Total" value={money(subtotal)} />
          <BillRow label="Platform Charge" value={money(totals?.platform_charge)} />
          <BillRow label="Delivery Charge" value={money(totals?.customer_delivery_charge)} />
          <View style={styles.billTotal}>
            <Txt weight="semibold" size={T.lg}>To Pay</Txt>
            <Txt weight="semibold" size={T.lg}>{money(totals?.customer_total ?? subtotal)}</Txt>
          </View>
        </View>

        <View style={[styles.block, styles.cod]}>
          <Ionicons name="cash-outline" size={22} color={C.success} />
          <View style={{ flex: 1 }}>
            <Txt weight="medium">Cash on Delivery</Txt>
            <Txt size={T.sm} color={C.muted}>Pay when your order arrives</Txt>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={C.success} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + S.md }]}>
        <View>
          <Txt size={T.sm} color={C.muted}>Total</Txt>
          <Txt weight="semibold" size={T.xl}>{money(totals?.customer_total ?? subtotal)}</Txt>
        </View>
        <Button 
          label="Place Order" 
          onPress={place} 
          loading={placing}
          style={{ flex: 1, marginLeft: S.lg }} 
          testID="place-order-button" 
        />
      </View>
    </View>
  );
}

function Header({ insets, onBack }: { insets: any; onBack: () => void }) {
  return (
    <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
      <Pressable onPress={onBack} hitSlop={10} testID="cart-back">
        <Ionicons name="chevron-back" size={24} color={C.onSurface} />
      </Pressable>
      <Txt weight="semibold" size={T.xl}>Your Cart</Txt>
      <View style={{ width: 24 }} />
    </View>
  );
}

function BillRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.billRow}>
      <Txt color={C.onSurfaceTertiary}>{label}</Txt>
      <Txt weight="medium">{value ?? "—"}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surfaceSecondary },
  restCard: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  block: { backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginTop: S.md },
  item: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.sm },
  itemImg: { width: 48, height: 48, borderRadius: R.sm },
  secTitle: { marginTop: S.xl },
  addr: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.divider },
  addAddr: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingTop: S.md },
  billRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: S.xs },
  billTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: S.sm, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
  cod: { flexDirection: "row", alignItems: "center", gap: S.md },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceSecondary, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: S.lg, paddingTop: S.md, ...shadow },
});