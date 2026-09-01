// import { useCallback, useEffect, useRef, useState } from "react";
// import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
// import * as Location from "expo-location";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect, useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import AppMap from "@/src/components/AppMap";
// import { Badge, Button, Card, EmptyState, Loading, Txt } from "@/src/components/ui";
// import { useToast } from "@/src/context/toast";
// import { money } from "@/src/format";
// import { decodePolyline } from "@/src/utils/polyline";
// import { C, ORDER_STATUS_LABELS, R, S, shadow, T } from "@/src/theme";

// export default function DeliveryHome() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
//   const [partner, setPartner] = useState<any>(null);
//   const [requests, setRequests] = useState<any[]>([]);
//   const [active, setActive] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [checking, setChecking] = useState(true);
//   const locTimer = useRef<any>(null);

//   const check = useCallback(async () => {
//     try {
//       const me = await api.get("/delivery/me");
//       if (!me.registered) { router.replace("/(delivery)/register"); return null; }
//       setPartner(me.partner);
//       return me.partner;
//     } catch { return null; }
//     finally { setChecking(false); }
//   }, []);

//   const refresh = useCallback(async () => {
//     try {
//       const [rq, ac] = await Promise.all([
//         api.get("/delivery/requests").catch(() => ({ requests: [] })),
//         api.get("/delivery/active").catch(() => ({ orders: [] })),
//       ]);
//       setRequests(rq.requests || []);
//       setActive(ac.orders || []);
//     } catch {} finally { setLoading(false); }
//   }, []);

//   useFocusEffect(useCallback(() => { (async () => { const p = await check(); if (p) refresh(); })(); }, [check, refresh]));

//   useEffect(() => {
//     const t = setInterval(() => { if (partner?.status === "approved" && partner?.online) refresh(); }, 6000);
//     return () => clearInterval(t);
//   }, [partner, refresh]);

//   // Live location updates while there is an active delivery
//   useEffect(() => {
//     if (active.length === 0) { if (locTimer.current) clearInterval(locTimer.current); return; }
//     const send = async () => {
//       try {
//         const perm = await Location.getForegroundPermissionsAsync();
//         if (perm.status !== "granted") return;
//         const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
//         active.forEach((o) => api.post(`/delivery/orders/${o.id}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {}));
//       } catch {}
//     };
//     send();
//     locTimer.current = setInterval(send, 15000);
//     return () => locTimer.current && clearInterval(locTimer.current);
//   }, [active]);

//   const toggleOnline = async (val: boolean) => {
//     if (val) {
//       const perm = await Location.requestForegroundPermissionsAsync();
//       if (perm.status !== "granted") { toast.show("Location permission needed to go online", "error"); return; }
//     }
//     try {
//       let coords: any = {};
//       try { const pos = await Location.getCurrentPositionAsync({}); coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; } catch {}
//       const r = await api.post("/delivery/online", { online: val, ...coords });
//       setPartner(r.partner);
//       refresh();
//     } catch (e: any) { toast.show(e.message, "error"); }
//   };

//   const accept = async (id: string) => {
//     try { await api.post(`/delivery/orders/${id}/accept`, {}); toast.show("Delivery assigned to you", "success"); refresh(); }
//     catch (e: any) { toast.show(e.message, "error"); refresh(); }
//   };
//   const act = async (id: string, action: string) => {
//     try { await api.post(`/delivery/orders/${id}/${action}`, {}); toast.show("Updated", "success"); refresh(); }
//     catch (e: any) { toast.show(e.message, "error"); }
//   };
//   const navTo = (lat: number, lng: number) => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);

//   if (checking) return <View style={styles.root}><Loading /></View>;
//   const approved = partner?.status === "approved";

//   return (
//     <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + S.md, padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
//       <View style={styles.header}>
//         <View>
//           <Txt weight="semibold" size={T["2xl"]}>Hi, {partner?.name?.split(" ")[0] || "Partner"}</Txt>
//           <Txt color={C.muted} size={T.sm}>{approved ? (partner?.online ? "You're online" : "You're offline") : "Awaiting approval"}</Txt>
//         </View>
//         {approved && (
//           <View style={[styles.onlinePill, { backgroundColor: partner?.online ? "#E7F0E9" : C.surfaceTertiary }]}>
//             <Txt weight="semibold" size={T.sm} color={partner?.online ? C.success : C.muted}>{partner?.online ? "ONLINE" : "OFFLINE"}</Txt>
//             <Switch value={!!partner?.online} onValueChange={toggleOnline} trackColor={{ true: C.success }} testID="online-toggle" />
//           </View>
//         )}
//       </View>

//       {!approved ? (
//         <Card style={styles.pending}><Ionicons name="time" size={22} color={C.warning} /><Txt style={{ flex: 1 }} color={C.onSurfaceTertiary}>Your account is pending admin approval. You'll receive delivery requests once approved.</Txt></Card>
//       ) : loading ? <Loading /> : (
//         <>
//           {active.length > 0 && (
//             <>
//               <Txt weight="semibold" size={T.lg} style={{ marginTop: S.lg, marginBottom: S.sm }}>Active Delivery</Txt>
//               {active.map((o) => (
//                 <Card key={o.id} style={styles.activeCard} testID={`active-${o.id}`}>
//                   <View style={styles.rowBetween}>
//                     <Txt weight="semibold">#{o.id.slice(-6).toUpperCase()}</Txt>
//                     <Badge label={ORDER_STATUS_LABELS[o.status]} />
//                   </View>
//                   <View style={styles.earn}><Ionicons name="wallet" size={16} color={C.success} /><Txt weight="semibold" color={C.success}>Your earning {money(o.delivery_partner_earning)}</Txt></View>
//                   {o.restaurant_lat != null && o.address?.lat != null && (
//                     <View style={styles.map} testID={`map-${o.id}`}>
//                       <AppMap
//                         style={{ height: 180 }}
//                         markers={[
//                           { lat: o.restaurant_lat, lng: o.restaurant_lng, title: o.restaurant_name, color: C.brandPrimary },
//                           { lat: o.address.lat, lng: o.address.lng, title: "Drop", color: "red" },
//                           ...(o.partner_location ? [{ lat: o.partner_location.lat, lng: o.partner_location.lng, title: "You", color: "green" as const }] : []),
//                         ]}
//                         polyline={decodePolyline(o.route_polyline)}
//                         showsUser
//                       />
//                     </View>
//                   )}
//                   <View style={styles.leg}><Ionicons name="storefront-outline" size={16} color={C.brandPrimary} /><Txt style={{ flex: 1 }} numberOfLines={1}>{o.restaurant_name}</Txt>
//                     <Pressable onPress={() => navTo(o.restaurant_lat, o.restaurant_lng)} testID={`nav-pickup-${o.id}`}><Ionicons name="navigate" size={18} color={C.brandPrimary} /></Pressable></View>
//                   <View style={styles.leg}><Ionicons name="location-outline" size={16} color={C.error} /><Txt style={{ flex: 1 }} numberOfLines={1}>{o.address?.line}</Txt>
//                     <Pressable onPress={() => navTo(o.address?.lat, o.address?.lng)} testID={`nav-drop-${o.id}`}><Ionicons name="navigate" size={18} color={C.brandPrimary} /></Pressable></View>
//                   <View style={{ marginTop: S.md }}>
//                     {o.status === "ASSIGNED" && <Button label="Mark Picked Up" onPress={() => act(o.id, "pickup")} testID={`pickup-${o.id}`} />}
//                     {o.status === "PICKED_UP" && <Button label="Start Delivery" onPress={() => act(o.id, "start")} testID={`start-${o.id}`} />}
//                     {o.status === "OUT_FOR_DELIVERY" && <Button label="Mark Delivered" onPress={() => act(o.id, "deliver")} testID={`deliver-${o.id}`} />}
//                   </View>
//                 </Card>
//               ))}
//             </>
//           )}

//           <Txt weight="semibold" size={T.lg} style={{ marginTop: S.xl, marginBottom: S.sm }}>New Requests</Txt>
//           {!partner?.online ? (
//             <Card style={styles.pending}><Ionicons name="power" size={20} color={C.muted} /><Txt color={C.muted} style={{ flex: 1 }}>Go online to receive delivery requests.</Txt></Card>
//           ) : requests.length === 0 ? (
//             <EmptyState icon="bicycle-outline" title="No requests yet" subtitle="New delivery requests will appear here." />
//           ) : requests.map((o) => (
//             <Card key={o.id} style={styles.reqCard} testID={`request-${o.id}`}>
//               <View style={styles.rowBetween}>
//                 <Txt weight="semibold">#{o.id.slice(-6).toUpperCase()}</Txt>
//                 <Txt weight="semibold" color={C.success}>{money(o.your_earning)}</Txt>
//               </View>
//               <Txt size={T.sm} color={C.muted} numberOfLines={1} style={{ marginTop: 2 }}>{o.restaurant_name} → {o.address?.line}</Txt>
//               <Txt size={T.sm} color={C.muted}>{o.distance_km?.toFixed?.(1)} km</Txt>
//               <Button label="Accept Delivery" onPress={() => accept(o.id)} style={{ marginTop: S.md }} testID={`accept-req-${o.id}`} />
//             </Card>
//           ))}
//         </>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: C.surface },
//   header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
//   onlinePill: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingLeft: S.md, paddingRight: 4, height: 40, borderRadius: R.pill },
//   pending: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg, marginTop: S.lg },
//   activeCard: { padding: S.lg, gap: S.sm, ...shadow },
//   reqCard: { padding: S.lg, marginBottom: S.md },
//   rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
//   earn: { flexDirection: "row", alignItems: "center", gap: S.sm },
//   map: { borderRadius: R.md, overflow: "hidden", borderWidth: 1, borderColor: C.border, marginVertical: S.xs },
//   leg: { flexDirection: "row", alignItems: "center", gap: S.sm },
// });

























// import { useCallback, useEffect, useRef, useState } from "react";
// import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
// import * as Location from "expo-location";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect, useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import AppMap from "@/src/components/AppMap";
// import { Badge, Button, Card, EmptyState, Loading, Txt } from "@/src/components/ui";
// import { useToast } from "@/src/context/toast";
// import { money } from "@/src/format";
// import { decodePolyline } from "@/src/utils/polyline";
// import { C, ORDER_STATUS_LABELS, R, S, shadow, T } from "@/src/theme";

// export default function DeliveryHome() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
//   const [partner, setPartner] = useState<any>(null);
//   const [requests, setRequests] = useState<any[]>([]);
//   const [active, setActive] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [checking, setChecking] = useState(true);
//   const locTimer = useRef<any>(null);

//   const check = useCallback(async () => {
//     try {
//       const me = await api.get("/delivery/me");
//       if (!me.registered) { 
//         router.replace("/(delivery)/register"); 
//         return null; 
//       }
//       setPartner(me.partner);
//       return me.partner;
//     } catch { 
//       return null; 
//     } finally { 
//       setChecking(false); 
//     }
//   }, [router]);

//   const refresh = useCallback(async () => {
//     try {
//       const [rq, ac] = await Promise.all([
//         api.get("/delivery/requests").catch(() => ({ requests: [] })),
//         api.get("/delivery/active").catch(() => ({ orders: [] })),
//       ]);
//       setRequests(rq.requests || []);
//       setActive(ac.orders || []);
//     } catch {} finally { 
//       setLoading(false); 
//     }
//   }, []);

//   useFocusEffect(
//     useCallback(() => { 
//       (async () => { 
//         const p = await check(); 
//         if (p) refresh(); 
//       })(); 
//     }, [check, refresh])
//   );

//   useEffect(() => {
//     const t = setInterval(() => { 
//       if (partner?.status === "approved" && partner?.online) refresh(); 
//     }, 6000);
//     return () => clearInterval(t);
//   }, [partner, refresh]);

//   // Live location updates while there is an active delivery
//   useEffect(() => {
//     if (active.length === 0) { 
//       if (locTimer.current) clearInterval(locTimer.current); 
//       return; 
//     }
//     const send = async () => {
//       try {
//         const perm = await Location.getForegroundPermissionsAsync();
//         if (perm.status !== "granted") return;
//         const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
//         active.forEach((o) => 
//           api.post(`/delivery/orders/${o.id}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {})
//         );
//       } catch {}
//     };
//     send();
//     locTimer.current = setInterval(send, 15000);
//     return () => locTimer.current && clearInterval(locTimer.current);
//   }, [active]);

//   const toggleOnline = async (val: boolean) => {
//     if (val) {
//       const perm = await Location.requestForegroundPermissionsAsync();
//       if (perm.status !== "granted") { 
//         toast.show("Location permission needed to go online", "error"); 
//         return; 
//       }
//     }
//     try {
//       let coords: any = {};
//       try { 
//         const pos = await Location.getCurrentPositionAsync({}); 
//         coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; 
//       } catch {}
//       const r = await api.post("/delivery/online", { online: val, ...coords });
//       setPartner(r.partner);
//       refresh();
//     } catch (e: any) { 
//       toast.show(e.message, "error"); 
//     }
//   };

//   const accept = async (id: string) => {
//     try { 
//       await api.post(`/delivery/orders/${id}/accept`, {}); 
//       toast.show("Delivery assigned to you", "success"); 
//       refresh(); 
//     } catch (e: any) { 
//       toast.show(e.message, "error"); 
//       refresh(); 
//     }
//   };

//   const act = async (id: string, action: string) => {
//     try { 
//       await api.post(`/delivery/orders/${id}/${action}`, {}); 
//       toast.show("Updated", "success"); 
//       refresh(); 
//     } catch (e: any) { 
//       toast.show(e.message, "error"); 
//     }
//   };

//   const navTo = (lat: number, lng: number) => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);

//   if (checking) return <View style={styles.root}><Loading /></View>;
//   const approved = partner?.status === "approved";

//   return (
//     <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + S.md, padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
//       <View style={styles.header}>
//         <View>
//           <Txt weight="semibold" size={T["2xl"]}>Hi, {partner?.name?.split(" ")[0] || "Partner"}</Txt>
//           <Txt color={C.muted} size={T.sm}>{approved ? (partner?.online ? "You're online" : "You're offline") : "Awaiting approval"}</Txt>
//         </View>
//         {approved && (
//           <View style={[styles.onlinePill, { backgroundColor: partner?.online ? "#E7F0E9" : C.surfaceTertiary }]}>
//             <Txt weight="semibold" size={T.sm} color={partner?.online ? C.success : C.muted}>{partner?.online ? "ONLINE" : "OFFLINE"}</Txt>
//             <Switch value={!!partner?.online} onValueChange={toggleOnline} trackColor={{ true: C.success }} testID="online-toggle" />
//           </View>
//         )}
//       </View>

//       {!approved ? (
//         <Card style={styles.pending}><Ionicons name="time" size={22} color={C.warning} /><Txt style={{ flex: 1 }} color={C.onSurfaceTertiary}>Your account is pending admin approval. You'll receive delivery requests once approved.</Txt></Card>
//       ) : loading ? <Loading /> : (
//         <>
//           {active.length > 0 && (
//             <>
//               <Txt weight="semibold" size={T.lg} style={{ marginTop: S.lg, marginBottom: S.sm }}>Active Delivery</Txt>
//               {active.map((o) => (
//                 <Card key={o.id} style={styles.activeCard} testID={`active-${o.id}`}>
//                   <View style={styles.rowBetween}>
//                     <Txt weight="semibold">#{o.id.slice(-6).toUpperCase()}</Txt>
//                     <Badge label={ORDER_STATUS_LABELS[o.status]} />
//                   </View>
//                   <View style={styles.earn}><Ionicons name="wallet" size={16} color={C.success} /><Txt weight="semibold" color={C.success}>Your earning {money(o.delivery_partner_earning)}</Txt></View>
//                   {o.restaurant_lat != null && o.address?.lat != null && (
//                     <View style={styles.map} testID={`map-${o.id}`}>
//                       <AppMap
//                         style={{ height: 180 }}
//                         markers={[
//                           { lat: o.restaurant_lat, lng: o.restaurant_lng, title: o.restaurant_name, color: C.brandPrimary },
//                           { lat: o.address.lat, lng: o.address.lng, title: "Drop", color: "red" },
//                           ...(o.partner_location ? [{ lat: o.partner_location.lat, lng: o.partner_location.lng, title: "You", color: "green" as const }] : []),
//                         ]}
//                         polyline={decodePolyline(o.route_polyline)}
//                         showsUser
//                       />
//                     </View>
//                   )}
//                   <View style={styles.leg}><Ionicons name="storefront-outline" size={16} color={C.brandPrimary} /><Txt style={{ flex: 1 }} numberOfLines={1}>{o.restaurant_name}</Txt>
//                     <Pressable onPress={() => navTo(o.restaurant_lat, o.restaurant_lng)} testID={`nav-pickup-${o.id}`}><Ionicons name="navigate" size={18} color={C.brandPrimary} /></Pressable></View>
//                   <View style={styles.leg}><Ionicons name="location-outline" size={16} color={C.error} /><Txt style={{ flex: 1 }} numberOfLines={1}>{o.address?.line}</Txt>
//                     <Pressable onPress={() => navTo(o.address?.lat, o.address?.lng)} testID={`nav-drop-${o.id}`}><Ionicons name="navigate" size={18} color={C.brandPrimary} /></Pressable></View>
//                   <View style={{ marginTop: S.md }}>
//                     {o.status === "ASSIGNED" && <Button label="Mark Picked Up" onPress={() => act(o.id, "pickup")} testID={`pickup-${o.id}`} />}
//                     {o.status === "PICKED_UP" && <Button label="Start Delivery" onPress={() => act(o.id, "start")} testID={`start-${o.id}`} />}
//                     {o.status === "OUT_FOR_DELIVERY" && <Button label="Mark Delivered" onPress={() => act(o.id, "deliver")} testID={`deliver-${o.id}`} />}
//                   </View>
//                 </Card>
//               ))}
//             </>
//           )}

//           <Txt weight="semibold" size={T.lg} style={{ marginTop: S.xl, marginBottom: S.sm }}>New Requests</Txt>
//           {!partner?.online ? (
//             <Card style={styles.pending}><Ionicons name="power" size={20} color={C.muted} /><Txt color={C.muted} style={{ flex: 1 }}>Go online to receive delivery requests.</Txt></Card>
//           ) : requests.length === 0 ? (
//             <EmptyState icon="bicycle-outline" title="No requests yet" subtitle="New delivery requests will appear here." />
//           ) : requests.map((o) => (
//             <Card key={o.id} style={styles.reqCard} testID={`request-${o.id}`}>
//               <View style={styles.rowBetween}>
//                 <Txt weight="semibold">#{o.id.slice(-6).toUpperCase()}</Txt>
//                 <Txt weight="semibold" color={C.success}>{money(o.your_earning)}</Txt>
//               </View>
//               <Txt size={T.sm} color={C.muted} numberOfLines={1} style={{ marginTop: 2 }}>{o.restaurant_name} → {o.address?.line}</Txt>
//               <Txt size={T.sm} color={C.muted}>{o.distance_km?.toFixed?.(1)} km</Txt>
//               <Button label="Accept Delivery" onPress={() => accept(o.id)} style={{ marginTop: S.md }} testID={`accept-req-${o.id}`} />
//             </Card>
//           ))}
//         </>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: C.surface },
//   header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
//   onlinePill: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingLeft: S.md, paddingRight: 4, height: 40, borderRadius: R.pill },
//   pending: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg, marginTop: S.lg },
//   activeCard: { padding: S.lg, gap: S.sm, ...shadow },
//   reqCard: { padding: S.lg, marginBottom: S.md },
//   rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
//   earn: { flexDirection: "row", alignItems: "center", gap: S.sm },
//   map: { borderRadius: R.md, overflow: "hidden", borderWidth: 1, borderColor: C.border, marginVertical: S.xs },
//   leg: { flexDirection: "row", alignItems: "center", gap: S.sm },
// });




















// import { useCallback, useEffect, useRef, useState } from "react";
// import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
// import * as Location from "expo-location";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect, useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import AppMap from "@/src/components/AppMap";
// import { Badge, Button, Card, EmptyState, Loading, Txt } from "@/src/components/ui";
// import { useToast } from "@/src/context/toast";
// import { money } from "@/src/format";
// import { decodePolyline } from "@/src/utils/polyline";
// import { C, ORDER_STATUS_LABELS, R, S, shadow, T } from "@/src/theme";

// export default function DeliveryHome() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
//   const [partner, setPartner] = useState<any>(null);
//   const [requests, setRequests] = useState<any[]>([]);
//   const [active, setActive] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [checking, setChecking] = useState(true);
//   const locTimer = useRef<any>(null);

//   const check = useCallback(async () => {
//     try {
//       const me = await api.get("/delivery/me");
//       if (!me.registered) { 
//         router.replace("/(delivery)/register"); 
//         return null; 
//       }
//       setPartner(me.partner);
//       return me.partner;
//     } catch { 
//       return null; 
//     } finally { 
//       setChecking(false); 
//     }
//   }, [router]);

//   const refresh = useCallback(async () => {
//     try {
//       const [rq, ac] = await Promise.all([
//         api.get("/delivery/requests").catch(() => ({ requests: [] })),
//         api.get("/delivery/active").catch(() => ({ orders: [] })),
//       ]);
//       setRequests(rq.requests || []);
//       setActive(ac.orders || []);
//     } catch {} finally { 
//       setLoading(false); 
//     }
//   }, []);

//   useFocusEffect(
//     useCallback(() => { 
//       (async () => { 
//         const p = await check(); 
//         if (p) refresh(); 
//       })(); 
//     }, [check, refresh])
//   );

//   useEffect(() => {
//     const t = setInterval(() => { 
//       if (partner?.status === "approved" && partner?.online) refresh(); 
//     }, 6000);
//     return () => clearInterval(t);
//   }, [partner, refresh]);

//   // Live location updates while there is an active delivery
//   useEffect(() => {
//     if (active.length === 0) { 
//       if (locTimer.current) clearInterval(locTimer.current); 
//       return; 
//     }
//     const send = async () => {
//       try {
//         const perm = await Location.getForegroundPermissionsAsync();
//         if (perm.status !== "granted") return;
//         const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
//         active.forEach((o) => 
//           api.post(`/delivery/orders/${o.id}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {})
//         );
//       } catch {}
//     };
//     send();
//     locTimer.current = setInterval(send, 15000);
//     return () => locTimer.current && clearInterval(locTimer.current);
//   }, [active]);

//   const toggleOnline = async (val: boolean) => {
//     if (val) {
//       const perm = await Location.requestForegroundPermissionsAsync();
//       if (perm.status !== "granted") { 
//         toast.show("Location permission needed to go online", "error"); 
//         return; 
//       }
//     }
//     try {
//       let coords: any = {};
//       try { 
//         const pos = await Location.getCurrentPositionAsync({}); 
//         coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; 
//       } catch {}
//       const r = await api.post("/delivery/online", { online: val, ...coords });
//       setPartner(r.partner);
//       refresh();
//     } catch (e: any) { 
//       toast.show(e.message, "error"); 
//     }
//   };

//   const accept = async (id: string) => {
//     try { 
//       await api.post(`/delivery/orders/${id}/accept`, {}); 
//       toast.show("Delivery assigned to you", "success"); 
//       refresh(); 
//     } catch (e: any) { 
//       toast.show(e.message, "error"); 
//       refresh(); 
//     }
//   };

//   const act = async (id: string, action: string) => {
//     try { 
//       await api.post(`/delivery/orders/${id}/${action}`, {}); 
//       toast.show("Updated", "success"); 
//       refresh(); 
//     } catch (e: any) { 
//       toast.show(e.message, "error"); 
//     }
//   };

//   const navTo = (lat: number, lng: number) => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  
//   // কাস্টমারকে ডায়াল প্যাড দিয়ে কল করার ফাংশন
//   const callPhone = (phone?: string) => {
//     if (!phone) {
//       toast.show("Customer phone number not available", "error");
//       return;
//     }
//     Linking.openURL(`tel:${phone}`);
//   };

//   if (checking) return <View style={styles.root}><Loading /></View>;
//   const approved = partner?.status === "approved";

//   return (
//     <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + S.md, padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
//       <View style={styles.header}>
//         <View>
//           <Txt weight="semibold" size={T["2xl"]}>Hi, {partner?.name?.split(" ")[0] || "Partner"}</Txt>
//           <Txt color={C.muted} size={T.sm}>{approved ? (partner?.online ? "You're online" : "You're offline") : "Awaiting approval"}</Txt>
//         </View>
//         {approved && (
//           <View style={[styles.onlinePill, { backgroundColor: partner?.online ? "#E7F0E9" : C.surfaceTertiary }]}>
//             <Txt weight="semibold" size={T.sm} color={partner?.online ? C.success : C.muted}>{partner?.online ? "ONLINE" : "OFFLINE"}</Txt>
//             <Switch value={!!partner?.online} onValueChange={toggleOnline} trackColor={{ true: C.success }} testID="online-toggle" />
//           </View>
//         )}
//       </View>

//       {!approved ? (
//         <Card style={styles.pending}><Ionicons name="time" size={22} color={C.warning} /><Txt style={{ flex: 1 }} color={C.onSurfaceTertiary}>Your account is pending admin approval. You'll receive delivery requests once approved.</Txt></Card>
//       ) : loading ? <Loading /> : (
//         <>
//           {active.length > 0 && (
//             <>
//               <Txt weight="semibold" size={T.lg} style={{ marginTop: S.lg, marginBottom: S.sm }}>Active Delivery</Txt>
//               {active.map((o) => {
//                 const customerPhone = o.customer_phone || o.address?.phone || o.user_phone;
//                 const collectCashAmount = o.customer_total ?? o.payable_amount ?? o.grand_total ?? 0;

//                 return (
//                   <Card key={o.id} style={styles.activeCard} testID={`active-${o.id}`}>
//                     <View style={styles.rowBetween}>
//                       <Txt weight="semibold">#{o.id.slice(-6).toUpperCase()}</Txt>
//                       <Badge label={ORDER_STATUS_LABELS[o.status]} />
//                     </View>
                    
//                     {/* ইয়ার্নিং এবং ক্যাশ বাটন */}
//                     <View style={styles.rowBetween}>
//                       <View style={styles.earn}>
//                         <Ionicons name="wallet" size={16} color={C.success} />
//                         <Txt weight="semibold" color={C.success}>Your earning {money(o.delivery_partner_earning)}</Txt>
//                       </View>

//                       {/* Cash Collect Info */}
//                       <View style={[styles.cashBadge, { backgroundColor: o.payment_method === "COD" ? "#FEE2E2" : "#E0F2FE" }]}>
//                         <Ionicons name={o.payment_method === "COD" ? "cash-outline" : "card-outline"} size={14} color={o.payment_method === "COD" ? C.error : C.brandPrimary} />
//                         <Txt weight="semibold" size={T.xs} color={o.payment_method === "COD" ? C.error : C.brandPrimary}>
//                           {o.payment_method === "COD" ? `Collect: ${money(collectCashAmount)}` : "Paid Online"}
//                         </Txt>
//                       </View>
//                     </View>

//                     {o.restaurant_lat != null && o.address?.lat != null && (
//                       <View style={styles.map} testID={`map-${o.id}`}>
//                         <AppMap
//                           style={{ height: 180 }}
//                           markers={[
//                             { lat: o.restaurant_lat, lng: o.restaurant_lng, title: o.restaurant_name, color: C.brandPrimary },
//                             { lat: o.address.lat, lng: o.address.lng, title: "Drop", color: "red" },
//                             ...(o.partner_location ? [{ lat: o.partner_location.lat, lng: o.partner_location.lng, title: "You", color: "green" as const }] : []),
//                           ]}
//                           polyline={decodePolyline(o.route_polyline)}
//                           showsUser
//                         />
//                       </View>
//                     )}

//                     {/* Pickup Restaurant Info */}
//                     <View style={styles.leg}>
//                       <Ionicons name="storefront-outline" size={16} color={C.brandPrimary} />
//                       <Txt style={{ flex: 1 }} numberOfLines={1}>{o.restaurant_name}</Txt>
//                       <Pressable onPress={() => navTo(o.restaurant_lat, o.restaurant_lng)} testID={`nav-pickup-${o.id}`}>
//                         <Ionicons name="navigate" size={18} color={C.brandPrimary} />
//                       </Pressable>
//                     </View>

//                     {/* Delivery Address & Customer Call Option */}
//                     <View style={styles.leg}>
//                       <Ionicons name="location-outline" size={16} color={C.error} />
//                       <Txt style={{ flex: 1 }} numberOfLines={1}>{o.address?.line}</Txt>
                      
//                       {/* Call Customer Button */}
//                       {customerPhone && (
//                         <Pressable onPress={() => callPhone(customerPhone)} style={styles.callBtn} testID={`call-cust-${o.id}`}>
//                           <Ionicons name="call" size={14} color="#FFF" />
//                           <Txt size={T.xs} weight="semibold" color="#FFF">Call</Txt>
//                         </Pressable>
//                       )}

//                       <Pressable onPress={() => navTo(o.address?.lat, o.address?.lng)} testID={`nav-drop-${o.id}`}>
//                         <Ionicons name="navigate" size={18} color={C.brandPrimary} />
//                       </Pressable>
//                     </View>

//                     <View style={{ marginTop: S.md }}>
//                       {o.status === "ASSIGNED" && <Button label="Mark Picked Up" onPress={() => act(o.id, "pickup")} testID={`pickup-${o.id}`} />}
//                       {o.status === "PICKED_UP" && <Button label="Start Delivery" onPress={() => act(o.id, "start")} testID={`start-${o.id}`} />}
//                       {o.status === "OUT_FOR_DELIVERY" && <Button label="Mark Delivered" onPress={() => act(o.id, "deliver")} testID={`deliver-${o.id}`} />}
//                     </View>
//                   </Card>
//                 );
//               })}
//             </>
//           )}

//           <Txt weight="semibold" size={T.lg} style={{ marginTop: S.xl, marginBottom: S.sm }}>New Requests</Txt>
//           {!partner?.online ? (
//             <Card style={styles.pending}><Ionicons name="power" size={20} color={C.muted} /><Txt color={C.muted} style={{ flex: 1 }}>Go online to receive delivery requests.</Txt></Card>
//           ) : requests.length === 0 ? (
//             <EmptyState icon="bicycle-outline" title="No requests yet" subtitle="New delivery requests will appear here." />
//           ) : requests.map((o) => (
//             <Card key={o.id} style={styles.reqCard} testID={`request-${o.id}`}>
//               <View style={styles.rowBetween}>
//                 <Txt weight="semibold">#{o.id.slice(-6).toUpperCase()}</Txt>
//                 <Txt weight="semibold" color={C.success}>{money(o.your_earning)}</Txt>
//               </View>
//               <Txt size={T.sm} color={C.muted} numberOfLines={1} style={{ marginTop: 2 }}>{o.restaurant_name} → {o.address?.line}</Txt>
//               <Txt size={T.sm} color={C.muted}>{o.distance_km?.toFixed?.(1)} km</Txt>
//               <Button label="Accept Delivery" onPress={() => accept(o.id)} style={{ marginTop: S.md }} testID={`accept-req-${o.id}`} />
//             </Card>
//           ))}
//         </>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: C.surface },
//   header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
//   onlinePill: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingLeft: S.md, paddingRight: 4, height: 40, borderRadius: R.pill },
//   pending: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg, marginTop: S.lg },
//   activeCard: { padding: S.lg, gap: S.sm, ...shadow },
//   reqCard: { padding: S.lg, marginBottom: S.md },
//   rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
//   earn: { flexDirection: "row", alignItems: "center", gap: S.sm },
//   map: { borderRadius: R.md, overflow: "hidden", borderWidth: 1, borderColor: C.border, marginVertical: S.xs },
//   leg: { flexDirection: "row", alignItems: "center", gap: S.sm },
//   cashBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: S.sm, paddingVertical: 4, borderRadius: R.xs },
//   callBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.xs, marginRight: 4 },
// });































// import { useCallback, useEffect, useRef, useState } from "react";
// import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
// import * as Location from "expo-location";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect, useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import AppMap from "@/src/components/AppMap";
// import { Badge, Button, Card, EmptyState, Loading, Txt } from "@/src/components/ui";
// import { useToast } from "@/src/context/toast";
// import { money } from "@/src/format";
// import { decodePolyline } from "@/src/utils/polyline";
// import { C, ORDER_STATUS_LABELS, R, S, shadow, T } from "@/src/theme";

// export default function DeliveryHome() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
//   const [partner, setPartner] = useState<any>(null);
//   const [requests, setRequests] = useState<any[]>([]);
//   const [active, setActive] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [checking, setChecking] = useState(true);
//   const locTimer = useRef<any>(null);

//   const check = useCallback(async () => {
//     try {
//       const me = await api.get("/delivery/me");
//       if (!me.registered) { 
//         router.replace("/(delivery)/register"); 
//         return null; 
//       }
//       setPartner(me.partner);
//       return me.partner;
//     } catch { 
//       return null; 
//     } finally { 
//       setChecking(false); 
//     }
//   }, [router]);

//   const refresh = useCallback(async () => {
//     try {
//       const [rq, ac] = await Promise.all([
//         api.get("/delivery/requests").catch(() => ({ requests: [] })),
//         api.get("/delivery/active").catch(() => ({ orders: [] })),
//       ]);
//       setRequests(rq.requests || []);
//       setActive(ac.orders || []);
//     } catch {} finally { 
//       setLoading(false); 
//     }
//   }, []);

//   useFocusEffect(
//     useCallback(() => { 
//       (async () => { 
//         const p = await check(); 
//         if (p) refresh(); 
//       })(); 
//     }, [check, refresh])
//   );

//   useEffect(() => {
//     const t = setInterval(() => { 
//       if (partner?.status === "approved" && partner?.online) refresh(); 
//     }, 6000);
//     return () => clearInterval(t);
//   }, [partner, refresh]);

//   // Live location tracking
//   useEffect(() => {
//     if (active.length === 0) { 
//       if (locTimer.current) clearInterval(locTimer.current); 
//       return; 
//     }
//     const send = async () => {
//       try {
//         const perm = await Location.getForegroundPermissionsAsync();
//         if (perm.status !== "granted") return;
//         const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
//         active.forEach((o) => 
//           api.post(`/delivery/orders/${o.id}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {})
//         );
//       } catch {}
//     };
//     send();
//     locTimer.current = setInterval(send, 15000);
//     return () => locTimer.current && clearInterval(locTimer.current);
//   }, [active]);

//   const toggleOnline = async (val: boolean) => {
//     if (val) {
//       const perm = await Location.requestForegroundPermissionsAsync();
//       if (perm.status !== "granted") { 
//         toast.show("Location permission needed to go online", "error"); 
//         return; 
//       }
//     }
//     try {
//       let coords: any = {};
//       try { 
//         const pos = await Location.getCurrentPositionAsync({}); 
//         coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; 
//       } catch {}
//       const r = await api.post("/delivery/online", { online: val, ...coords });
//       setPartner(r.partner);
//       refresh();
//     } catch (e: any) { 
//       toast.show(e.message, "error"); 
//     }
//   };

//   const accept = async (id: string) => {
//     try { 
//       await api.post(`/delivery/orders/${id}/accept`, {}); 
//       toast.show("Delivery assigned to you", "success"); 
//       refresh(); 
//     } catch (e: any) { 
//       toast.show(e.message, "error"); 
//       refresh(); 
//     }
//   };

//   const act = async (id: string, action: string) => {
//     try { 
//       await api.post(`/delivery/orders/${id}/${action}`, {}); 
//       toast.show("Updated", "success"); 
//       refresh(); 
//     } catch (e: any) { 
//       toast.show(e.message, "error"); 
//     }
//   };

//   const navTo = (lat?: number, lng?: number) => {
//     if (lat && lng) {
//       Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
//     }
//   };
  
//   const callCustomer = (phone?: string) => {
//     if (!phone) {
//       toast.show("Customer phone number not available", "error");
//       return;
//     }
//     Linking.openURL(`tel:${phone}`);
//   };

//   if (checking) return <View style={styles.root}><Loading /></View>;
//   const approved = partner?.status === "approved";

//   return (
//     <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + S.md, padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
//       <View style={styles.header}>
//         <View>
//           <Txt weight="semibold" size={T["2xl"]}>Hi, {partner?.name?.split(" ")[0] || "Partner"}</Txt>
//           <Txt color={C.muted} size={T.sm}>{approved ? (partner?.online ? "You're online" : "You're offline") : "Awaiting approval"}</Txt>
//         </View>
//         {approved && (
//           <View style={[styles.onlinePill, { backgroundColor: partner?.online ? "#E7F0E9" : C.surfaceTertiary }]}>
//             <Txt weight="semibold" size={T.sm} color={partner?.online ? C.success : C.muted}>{partner?.online ? "ONLINE" : "OFFLINE"}</Txt>
//             <Switch value={!!partner?.online} onValueChange={toggleOnline} trackColor={{ true: C.success }} testID="online-toggle" />
//           </View>
//         )}
//       </View>

//       {!approved ? (
//         <Card style={styles.pending}><Ionicons name="time" size={22} color={C.warning} /><Txt style={{ flex: 1 }} color={C.onSurfaceTertiary}>Your account is pending admin approval.</Txt></Card>
//       ) : loading ? <Loading /> : (
//         <>
//           {active.length > 0 && (
//             <>
//               <Txt weight="semibold" size={T.lg} style={{ marginTop: S.lg, marginBottom: S.sm }}>Active Delivery</Txt>
//               {active.map((o) => {
//                 const customerPhone = o.customer_phone || o.address?.phone || o.user_phone || o.phone;
//                 const collectCashAmount = o.customer_total ?? o.grand_total ?? o.payable_amount ?? o.total_payable ?? 0;
//                 const isCOD = o.payment_method === "COD" || !o.payment_method;

//                 return (
//                   <Card key={o.id} style={styles.activeCard} testID={`active-${o.id}`}>
//                     <View style={styles.rowBetween}>
//                       <Txt weight="semibold">#{o.id.slice(-6).toUpperCase()}</Txt>
//                       <Badge label={ORDER_STATUS_LABELS[o.status] || o.status} />
//                     </View>
                    
//                     {/* Earning and Cash Collection Box */}
//                     <View style={styles.rowBetween}>
//                       <View style={styles.earn}>
//                         <Ionicons name="wallet" size={16} color={C.success} />
//                         <Txt weight="semibold" color={C.success}>Your earning {money(o.delivery_partner_earning || o.your_earning || 0)}</Txt>
//                       </View>

//                       <View style={[styles.cashBadge, { backgroundColor: isCOD ? "#FEE2E2" : "#E0F2FE" }]}>
//                         <Ionicons name={isCOD ? "cash-outline" : "card-outline"} size={14} color={isCOD ? C.error : C.brandPrimary} />
//                         <Txt weight="semibold" size={T.xs} color={isCOD ? C.error : C.brandPrimary}>
//                           {isCOD ? `Collect Cash: ${money(collectCashAmount)}` : "Paid Online"}
//                         </Txt>
//                       </View>
//                     </View>

//                     {o.restaurant_lat != null && o.address?.lat != null && (
//                       <View style={styles.map} testID={`map-${o.id}`}>
//                         <AppMap
//                           style={{ height: 180 }}
//                           markers={[
//                             { lat: o.restaurant_lat, lng: o.restaurant_lng, title: o.restaurant_name, color: C.brandPrimary },
//                             { lat: o.address.lat, lng: o.address.lng, title: "Drop", color: "red" },
//                             ...(o.partner_location ? [{ lat: o.partner_location.lat, lng: o.partner_location.lng, title: "You", color: "green" as const }] : []),
//                           ]}
//                           polyline={decodePolyline(o.route_polyline)}
//                           showsUser
//                         />
//                       </View>
//                     )}

//                     {/* Restaurant details */}
//                     <View style={styles.leg}>
//                       <Ionicons name="storefront-outline" size={16} color={C.brandPrimary} />
//                       <Txt style={{ flex: 1 }} numberOfLines={1}>{o.restaurant_name}</Txt>
//                       <Pressable onPress={() => navTo(o.restaurant_lat, o.restaurant_lng)} testID={`nav-pickup-${o.id}`}>
//                         <Ionicons name="navigate" size={18} color={C.brandPrimary} />
//                       </Pressable>
//                     </View>

//                     {/* Customer details & Direct Call Option */}
//                     <View style={styles.leg}>
//                       <Ionicons name="location-outline" size={16} color={C.error} />
//                       <Txt style={{ flex: 1 }} numberOfLines={1}>{o.address?.address || o.address?.line || "Customer Address"}</Txt>
                      
//                       {customerPhone ? (
//                         <Pressable onPress={() => callCustomer(customerPhone)} style={styles.callBtn} testID={`call-cust-${o.id}`}>
//                           <Ionicons name="call" size={14} color="#FFF" />
//                           <Txt size={T.xs} weight="semibold" color="#FFF">Call ({customerPhone})</Txt>
//                         </Pressable>
//                       ) : null}

//                       <Pressable onPress={() => navTo(o.address?.lat, o.address?.lng)} testID={`nav-drop-${o.id}`}>
//                         <Ionicons name="navigate" size={18} color={C.brandPrimary} />
//                       </Pressable>
//                     </View>

//                     <View style={{ marginTop: S.md }}>
//                       {o.status === "ASSIGNED" && <Button label="Mark Picked Up" onPress={() => act(o.id, "pickup")} testID={`pickup-${o.id}`} />}
//                       {o.status === "PICKED_UP" && <Button label="Start Delivery" onPress={() => act(o.id, "start")} testID={`start-${o.id}`} />}
//                       {o.status === "OUT_FOR_DELIVERY" && <Button label="Mark Delivered" onPress={() => act(o.id, "deliver")} testID={`deliver-${o.id}`} />}
//                     </View>
//                   </Card>
//                 );
//               })}
//             </>
//           )}

//           <Txt weight="semibold" size={T.lg} style={{ marginTop: S.xl, marginBottom: S.sm }}>New Requests</Txt>
//           {!partner?.online ? (
//             <Card style={styles.pending}><Ionicons name="power" size={20} color={C.muted} /><Txt color={C.muted} style={{ flex: 1 }}>Go online to receive delivery requests.</Txt></Card>
//           ) : requests.length === 0 ? (
//             <EmptyState icon="bicycle-outline" title="No requests yet" subtitle="New delivery requests will appear here." />
//           ) : requests.map((o) => (
//             <Card key={o.id} style={styles.reqCard} testID={`request-${o.id}`}>
//               <View style={styles.rowBetween}>
//                 <Txt weight="semibold">#{o.id.slice(-6).toUpperCase()}</Txt>
//                 <Txt weight="semibold" color={C.success}>{money(o.your_earning || 0)}</Txt>
//               </View>
//               <Txt size={T.sm} color={C.muted} numberOfLines={1} style={{ marginTop: 2 }}>{o.restaurant_name} → {o.address?.line || o.address?.address}</Txt>
//               <Button label="Accept Delivery" onPress={() => accept(o.id)} style={{ marginTop: S.md }} testID={`accept-req-${o.id}`} />
//             </Card>
//           ))}
//         </>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: C.surface },
//   header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
//   onlinePill: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingLeft: S.md, paddingRight: 4, height: 40, borderRadius: R.pill },
//   pending: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg, marginTop: S.lg },
//   activeCard: { padding: S.lg, gap: S.sm, ...shadow },
//   reqCard: { padding: S.lg, marginBottom: S.md },
//   rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
//   earn: { flexDirection: "row", alignItems: "center", gap: S.sm },
//   map: { borderRadius: R.md, overflow: "hidden", borderWidth: 1, borderColor: C.border, marginVertical: S.xs },
//   leg: { flexDirection: "row", alignItems: "center", gap: S.sm, marginVertical: 2 },
//   cashBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: S.sm, paddingVertical: 4, borderRadius: R.xs },
//   callBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.xs, marginRight: 4 },
// });
























import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import AppMap from "@/src/components/AppMap";
import { Badge, Button, Card, EmptyState, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { money } from "@/src/format";
import { decodePolyline } from "@/src/utils/polyline";
import { C, ORDER_STATUS_LABELS, R, S, shadow, T } from "@/src/theme";

export default function DeliveryHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [partner, setPartner] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const locTimer = useRef<any>(null);

  const check = useCallback(async () => {
    try {
      const me = await api.get("/delivery/me");
      if (!me.registered) { 
        router.replace("/(delivery)/register"); 
        return null; 
      }
      setPartner(me.partner);
      return me.partner;
    } catch { 
      return null; 
    } finally { 
      setChecking(false); 
    }
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      const [rq, ac] = await Promise.all([
        api.get("/delivery/requests").catch(() => ({ requests: [] })),
        api.get("/delivery/active").catch(() => ({ orders: [] })),
      ]);
      setRequests(rq.requests || []);
      setActive(ac.orders || []);
    } catch {} finally { 
      setLoading(false); 
    }
  }, []);

  useFocusEffect(
    useCallback(() => { 
      (async () => { 
        const p = await check(); 
        if (p) refresh(); 
      })(); 
    }, [check, refresh])
  );

  useEffect(() => {
    const t = setInterval(() => { 
      if (partner?.status === "approved" && partner?.online) refresh(); 
    }, 6000);
    return () => clearInterval(t);
  }, [partner, refresh]);

  // Live location tracking
  useEffect(() => {
    if (active.length === 0) { 
      if (locTimer.current) clearInterval(locTimer.current); 
      return; 
    }
    const send = async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        active.forEach((o) => 
          api.post(`/delivery/orders/${o.id}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {})
        );
      } catch {}
    };
    send();
    locTimer.current = setInterval(send, 15000);
    return () => locTimer.current && clearInterval(locTimer.current);
  }, [active]);

  const toggleOnline = async (val: boolean) => {
    if (val) {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") { 
        toast.show("Location permission needed to go online", "error"); 
        return; 
      }
    }
    try {
      let coords: any = {};
      try { 
        const pos = await Location.getCurrentPositionAsync({}); 
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; 
      } catch {}
      const r = await api.post("/delivery/online", { online: val, ...coords });
      setPartner(r.partner);
      refresh();
    } catch (e: any) { 
      toast.show(e.message, "error"); 
    }
  };

  const accept = async (id: string) => {
    try { 
      await api.post(`/delivery/orders/${id}/accept`, {}); 
      toast.show("Delivery assigned to you", "success"); 
      refresh(); 
    } catch (e: any) { 
      toast.show(e.message, "error"); 
      refresh(); 
    }
  };

  const act = async (id: string, action: string) => {
    try { 
      await api.post(`/delivery/orders/${id}/${action}`, {}); 
      toast.show("Updated", "success"); 
      refresh(); 
    } catch (e: any) { 
      toast.show(e.message, "error"); 
    }
  };

  const navTo = (lat?: number, lng?: number) => {
    if (lat && lng) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    }
  };
  
  const callCustomer = (phone?: string) => {
    if (!phone) {
      toast.show("Customer phone number not available", "error");
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  if (checking) return <View style={styles.root}><Loading /></View>;
  const approved = partner?.status === "approved";

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + S.md, padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
      <View style={styles.header}>
        <View>
          <Txt weight="semibold" size={T["2xl"]}>Hi, {partner?.name?.split(" ")[0] || "Partner"}</Txt>
          <Txt color={C.muted} size={T.sm}>{approved ? (partner?.online ? "You're online" : "You're offline") : "Awaiting approval"}</Txt>
        </View>
        {approved && (
          <View style={[styles.onlinePill, { backgroundColor: partner?.online ? "#E7F0E9" : C.surfaceTertiary }]}>
            <Txt weight="semibold" size={T.sm} color={partner?.online ? C.success : C.muted}>{partner?.online ? "ONLINE" : "OFFLINE"}</Txt>
            <Switch value={!!partner?.online} onValueChange={toggleOnline} trackColor={{ true: C.success }} testID="online-toggle" />
          </View>
        )}
      </View>

      {!approved ? (
        <Card style={styles.pending}><Ionicons name="time" size={22} color={C.warning} /><Txt style={{ flex: 1 }} color={C.onSurfaceTertiary}>Your account is pending admin approval.</Txt></Card>
      ) : loading ? <Loading /> : (
        <>
          {active.length > 0 && (
            <>
              <Txt weight="semibold" size={T.lg} style={{ marginTop: S.lg, marginBottom: S.sm }}>Active Delivery</Txt>
              {active.map((o) => {
                const customerPhone = o.customer_phone || o.address?.phone || o.user_phone || o.phone;
                // ব্র্যাকেট যুক্ত করা হয়েছে যাতে সিনট্যাক্স এরর না আসে
                const collectCashAmount = (o.total || o.grandTotal || o.amount || o.customer_total) ?? o.grand_total ?? o.payable_amount ?? o.total_payable ?? 0;
                const isCOD = o.payment_method === "COD" || !o.payment_method;

                return (
                  <Card key={o.id} style={styles.activeCard} testID={`active-${o.id}`}>
                    <View style={styles.rowBetween}>
                      <Txt weight="semibold">#{o.id.slice(-6).toUpperCase()}</Txt>
                      <Badge label={ORDER_STATUS_LABELS[o.status] || o.status} />
                    </View>
                    
                    {/* Earning and Cash Collection Box */}
                    <View style={styles.rowBetween}>
                      <View style={styles.earn}>
                        <Ionicons name="wallet" size={16} color={C.success} />
                        <Txt weight="semibold" color={C.success}>Your earning {money(o.delivery_partner_earning || o.your_earning || 0)}</Txt>
                      </View>

                      <View style={[styles.cashBadge, { backgroundColor: isCOD ? "#FEE2E2" : "#E0F2FE" }]}>
                        <Ionicons name={isCOD ? "cash-outline" : "card-outline"} size={14} color={isCOD ? C.error : C.brandPrimary} />
                        <Txt weight="semibold" size={T.xs} color={isCOD ? C.error : C.brandPrimary}>
                          {isCOD ? `Collect Cash: ${money(collectCashAmount)}` : "Paid Online"}
                        </Txt>
                      </View>
                    </View>

                    {o.restaurant_lat != null && o.address?.lat != null && (
                      <View style={styles.map} testID={`map-${o.id}`}>
                        <AppMap
                          style={{ height: 180 }}
                          markers={[
                            { lat: o.restaurant_lat, lng: o.restaurant_lng, title: o.restaurant_name, color: C.brandPrimary },
                            { lat: o.address.lat, lng: o.address.lng, title: "Drop", color: "red" },
                            ...(o.partner_location ? [{ lat: o.partner_location.lat, lng: o.partner_location.lng, title: "You", color: "green" as const }] : []),
                          ]}
                          polyline={decodePolyline(o.route_polyline)}
                          showsUser
                        />
                      </View>
                    )}

                    {/* Restaurant details */}
                    <View style={styles.leg}>
                      <Ionicons name="storefront-outline" size={16} color={C.brandPrimary} />
                      <Txt style={{ flex: 1 }} numberOfLines={1}>{o.restaurant_name}</Txt>
                      <Pressable onPress={() => navTo(o.restaurant_lat, o.restaurant_lng)} testID={`nav-pickup-${o.id}`}>
                        <Ionicons name="navigate" size={18} color={C.brandPrimary} />
                      </Pressable>
                    </View>

                    {/* Customer details & Direct Call Option */}
                    <View style={styles.leg}>
                      <Ionicons name="location-outline" size={16} color={C.error} />
                      <Txt style={{ flex: 1 }} numberOfLines={1}>{o.address?.address || o.address?.line || "Customer Address"}</Txt>
                      
                      {customerPhone ? (
                        <Pressable onPress={() => callCustomer(customerPhone)} style={styles.callBtn} testID={`call-cust-${o.id}`}>
                          <Ionicons name="call" size={14} color="#FFF" />
                          <Txt size={T.xs} weight="semibold" color="#FFF">Call ({customerPhone})</Txt>
                        </Pressable>
                      ) : null}

                      <Pressable onPress={() => navTo(o.address?.lat, o.address?.lng)} testID={`nav-drop-${o.id}`}>
                        <Ionicons name="navigate" size={18} color={C.brandPrimary} />
                      </Pressable>
                    </View>

                    <View style={{ marginTop: S.md }}>
                      {o.status === "ASSIGNED" && <Button label="Mark Picked Up" onPress={() => act(o.id, "pickup")} testID={`pickup-${o.id}`} />}
                      {o.status === "PICKED_UP" && <Button label="Start Delivery" onPress={() => act(o.id, "start")} testID={`start-${o.id}`} />}
                      {o.status === "OUT_FOR_DELIVERY" && <Button label="Mark Delivered" onPress={() => act(o.id, "deliver")} testID={`deliver-${o.id}`} />}
                    </View>
                  </Card>
                );
              })}
            </>
          )}

          <Txt weight="semibold" size={T.lg} style={{ marginTop: S.xl, marginBottom: S.sm }}>New Requests</Txt>
          {!partner?.online ? (
            <Card style={styles.pending}><Ionicons name="power" size={20} color={C.muted} /><Txt color={C.muted} style={{ flex: 1 }}>Go online to receive delivery requests.</Txt></Card>
          ) : requests.length === 0 ? (
            <EmptyState icon="bicycle-outline" title="No requests yet" subtitle="New delivery requests will appear here." />
          ) : requests.map((o) => (
            <Card key={o.id} style={styles.reqCard} testID={`request-${o.id}`}>
              <View style={styles.rowBetween}>
                <Txt weight="semibold">#{o.id.slice(-6).toUpperCase()}</Txt>
                <Txt weight="semibold" color={C.success}>{money(o.your_earning || 0)}</Txt>
              </View>
              <Txt size={T.sm} color={C.muted} numberOfLines={1} style={{ marginTop: 2 }}>{o.restaurant_name} → {o.address?.line || o.address?.address}</Txt>
              <Button label="Accept Delivery" onPress={() => accept(o.id)} style={{ marginTop: S.md }} testID={`accept-req-${o.id}`} />
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  onlinePill: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingLeft: S.md, paddingRight: 4, height: 40, borderRadius: R.pill },
  pending: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg, marginTop: S.lg },
  activeCard: { padding: S.lg, gap: S.sm, ...shadow },
  reqCard: { padding: S.lg, marginBottom: S.md },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  earn: { flexDirection: "row", alignItems: "center", gap: S.sm },
  map: { borderRadius: R.md, overflow: "hidden", borderWidth: 1, borderColor: C.border, marginVertical: S.xs },
  leg: { flexDirection: "row", alignItems: "center", gap: S.sm, marginVertical: 2 },
  cashBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: S.sm, paddingVertical: 4, borderRadius: R.xs },
  callBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.xs, marginRight: 4 },
});