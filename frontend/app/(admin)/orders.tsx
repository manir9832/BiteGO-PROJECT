import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { api } from "@/src/api";
import { Badge, EmptyState, Loading, Txt } from "@/src/components/ui";
import { fmtDateTime, money } from "@/src/format";
import { C, ORDER_STATUS_LABELS, R, S, T } from "@/src/theme";

const FILTERS = ["all", "PLACED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export default function AdminOrders() {
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f: string) => {
    setLoading(true);
    try { const r = await api.get("/admin/orders", { status: f === "all" ? undefined : f }); setRows(r.orders || []); }
    catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(filter); }, [load, filter]));

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]} testID={`ofilter-${f}`}>
                <Txt size={T.sm} weight="medium" color={filter === f ? C.onBrandPrimary : C.onSurface}>{f === "all" ? "All" : ORDER_STATUS_LABELS[f] || f}</Txt>
              </Pressable>
            ))}
          </View>
        }
        contentContainerStyle={{ padding: S.lg, paddingBottom: S["3xl"], gap: S.md }}
        ListEmptyComponent={loading ? <Loading /> : <EmptyState icon="receipt-outline" title="No orders" subtitle="Orders will appear here." />}
        renderItem={({ item }) => {
          const open = expanded === item.id;
          return (
            <Pressable style={styles.card} onPress={() => setExpanded(open ? null : item.id)} testID={`admin-order-${item.id}`}>
              <View style={styles.top}>
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold">#{item.id.slice(-6).toUpperCase()}</Txt>
                  <Txt size={T.sm} color={C.muted}>{item.restaurant_name} · {fmtDateTime(item.created_at)}</Txt>
                </View>
                <Badge label={ORDER_STATUS_LABELS[item.status]} />
              </View>
              <View style={styles.moneyRow}>
                <Txt size={T.sm} color={C.muted}>Total {money(item.customer_total)}</Txt>
                <Txt size={T.sm} color={C.muted}>{item.distance_km?.toFixed?.(1)} km</Txt>
              </View>
              {open && (
                <View style={styles.detail}>
                  <Row l="Customer" v={`${item.customer_name || "-"} (+91 ${item.customer_phone || "-"})`} />
                  <Row l="Delivery Partner" v={item.delivery_partner_name || "Not assigned"} />
                  <Row l="Items" v={item.items.map((i: any) => `${i.quantity}× ${i.name}`).join(", ")} />
                  <View style={styles.divider} />
                  <Row l="Food Subtotal" v={money(item.food_subtotal)} />
                  <Row l="Platform Charge" v={money(item.platform_charge)} />
                  <Row l="Customer Delivery Charge" v={money(item.customer_delivery_charge)} />
                  <Row l="Delivery Partner Earning" v={money(item.delivery_partner_earning)} highlight />
                  <Row l="BiteGo Delivery Margin" v={money(item.bitego_delivery_margin)} />
                  <Row l="Restaurant Commission" v={money(item.restaurant_commission_amount)} />
                  <Row l="Restaurant Net Payable" v={money(item.restaurant_net_payable)} />
                  <View style={styles.divider} />
                  <Txt weight="medium" size={T.sm} style={{ marginBottom: 4 }}>Timeline</Txt>
                  {(item.timeline || []).map((t: any, i: number) => (
                    <Txt key={i} size={T.sm} color={C.muted}>• {ORDER_STATUS_LABELS[t.status] || t.status} — {fmtDateTime(t.at)} ({t.by})</Txt>
                  ))}
                  {item.cancellation_reason && <Txt size={T.sm} color={C.error} style={{ marginTop: 4 }}>Reason: {item.cancellation_reason}</Txt>}
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
const Row = ({ l, v, highlight }: { l: string; v: string; highlight?: boolean }) => (
  <View style={styles.dRow}><Txt size={T.sm} color={C.onSurfaceTertiary} style={{ flex: 1 }}>{l}</Txt><Txt size={T.sm} weight="medium" color={highlight ? C.brandPrimary : C.onSurface} style={{ flex: 1, textAlign: "right" }}>{v}</Txt></View>
);
const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.md },
  chip: { height: 34, paddingHorizontal: S.md, borderRadius: R.pill, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
  card: { backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  top: { flexDirection: "row", alignItems: "flex-start", gap: S.sm },
  moneyRow: { flexDirection: "row", justifyContent: "space-between", marginTop: S.sm },
  detail: { marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
  dRow: { flexDirection: "row", paddingVertical: 3, gap: S.md },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: S.sm },
});
