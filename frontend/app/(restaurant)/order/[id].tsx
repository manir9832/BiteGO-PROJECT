import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import AppMap from "@/src/components/AppMap";
import { StackHeader } from "@/src/components/header";
import { Badge, Button, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { fmtDateTime, money } from "@/src/format";
import { decodePolyline } from "@/src/utils/polyline";
import { C, ORDER_STATUS_LABELS, R, S, T } from "@/src/theme";

export default function RestaurantOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [o, setO] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const r = await api.get(`/orders/${id}`); setO(r.order); }
    catch {} finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (action: string) => {
    try { await api.post(`/restaurant/orders/${id}/${action}`, {}); toast.show(`Order ${action}`, "success"); load(); }
    catch (e: any) { toast.show(e.message, "error"); }
  };

  if (loading || !o) return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;

  const next: any = { PLACED: [["reject", "Reject", "ghost"], ["accept", "Accept", "primary"]], ACCEPTED: [["preparing", "Start Preparing", "primary"]], PREPARING: [["ready", "Mark Ready", "primary"]] }[o.status];

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title={`#${o.id.slice(-6).toUpperCase()}`} right={<Badge label={ORDER_STATUS_LABELS[o.status]} />} />
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
        <Txt size={T.sm} color={C.muted}>{fmtDateTime(o.created_at)}</Txt>
        <View style={styles.block}>
          {o.items.map((it: any, i: number) => (
            <View key={i} style={styles.itemRow}><Txt style={{ flex: 1 }}>{it.quantity}× {it.name}</Txt><Txt weight="medium">{money(it.price * it.quantity)}</Txt></View>
          ))}
          <View style={styles.divider} />
          <Row label="Item Total" value={money(o.food_subtotal)} />
          <Row label="Platform Charge" value={money(o.platform_charge)} />
          <Row label="Delivery Charge" value={money(o.customer_delivery_charge)} />
          <View style={styles.total}><Txt weight="semibold">Order Total (COD)</Txt><Txt weight="semibold">{money(o.customer_total)}</Txt></View>
        </View>

        <View style={styles.block}>
          <Txt weight="semibold" style={{ marginBottom: S.sm }}>Delivery To</Txt>
          <View style={styles.addr}><Ionicons name="location-outline" size={16} color={C.muted} /><Txt color={C.onSurfaceTertiary} style={{ flex: 1 }}>{o.address?.label} · {o.address?.line}</Txt></View>
          {o.delivery_partner_name && <View style={styles.addr}><Ionicons name="bicycle-outline" size={16} color={C.muted} /><Txt color={C.onSurfaceTertiary}>{o.delivery_partner_name}</Txt></View>}
          {o.restaurant_lat != null && o.address?.lat != null && (
            <View style={styles.map} testID="restaurant-order-map">
              <AppMap
                style={{ height: 180 }}
                markers={[
                  { lat: o.restaurant_lat, lng: o.restaurant_lng, title: "You", color: C.brandPrimary },
                  { lat: o.address.lat, lng: o.address.lng, title: "Customer", color: "red" },
                  ...(o.partner_location ? [{ lat: o.partner_location.lat, lng: o.partner_location.lng, title: o.delivery_partner_name || "Partner", color: "green" as const }] : []),
                ]}
                polyline={decodePolyline(o.route_polyline)}
              />
            </View>
          )}
        </View>

        {next && (
          <View style={{ flexDirection: "row", gap: S.md, marginTop: S.md }}>
            {next.map(([a, label, v]: any) => (
              <Button key={a} label={label} variant={v} onPress={() => act(a)} style={{ flex: 1 }} testID={`raction-${a}`} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.itemRow}><Txt color={C.onSurfaceTertiary}>{label}</Txt><Txt weight="medium">{value}</Txt></View>
);
const styles = StyleSheet.create({
  block: { backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginTop: S.md },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: S.xs },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: S.sm },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: S.sm, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
  addr: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: 4 },
  map: { borderRadius: R.md, overflow: "hidden", borderWidth: 1, borderColor: C.border, marginTop: S.sm },
});
