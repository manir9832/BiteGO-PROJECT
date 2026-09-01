import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { api } from "@/src/api";
import { Card, EmptyState, Loading, Txt } from "@/src/components/ui";
import { money } from "@/src/format";
import { C, R, S, T } from "@/src/theme";

export default function AdminSettlements() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setD(await api.get("/admin/settlements/today")); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;
  const sum = d?.summary || {};

  const stat = (label: string, value: string, tint = C.brandPrimary) => (
    <Card style={styles.stat}><Txt weight="semibold" size={T.lg} color={tint}>{value}</Txt><Txt size={T.sm} color={C.muted}>{label}</Txt></Card>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ padding: S.lg, paddingBottom: S["3xl"] }}>
      <Txt weight="semibold" size={T["2xl"]} style={{ marginBottom: S.sm }}>Today's Settlement</Txt>
      <View style={styles.grid}>
        {stat("Seller Payable", money(sum.total_seller_payable))}
        {stat("Partner Payable", money(sum.total_partner_payable))}
        {stat("Platform Revenue", money(sum.total_platform_revenue), C.success)}
        {stat("Completed Orders", String(sum.total_completed_orders ?? 0), C.info)}
        {stat("Total Paid", money(sum.total_paid), C.success)}
        {stat("Total Remaining", money(sum.total_remaining), C.warning)}
      </View>

      <View style={styles.secHead}><Ionicons name="storefront" size={18} color={C.brandPrimary} /><Txt weight="semibold" size={T.lg}>Restaurant-wise</Txt></View>
      {(!d?.restaurants || d.restaurants.length === 0) ? (
        <Card style={styles.empty}><Txt color={C.muted}>No completed orders today.</Txt></Card>
      ) : d.restaurants.map((r: any) => (
        <Card key={r.restaurant_id} style={styles.card} testID={`settle-rest-${r.restaurant_id}`}>
          <View style={styles.top}><Txt weight="semibold" style={{ flex: 1 }}>{r.name}</Txt><Txt size={T.sm} color={C.muted}>{r.orders} orders</Txt></View>
          <Row l="Gross Sales" v={money(r.gross)} />
          <Row l="Food Subtotal" v={money(r.food_subtotal)} />
          <Row l="Platform Charge" v={money(r.platform_charge)} />
          <Row l="Commission" v={money(r.commission)} />
          <Row l="Fixed Fee" v={money(r.fixed_fee)} />
          <View style={styles.divider} />
          <Row l="Net Payable" v={money(r.net_payable)} bold />
          <Row l="Paid" v={money(r.paid)} />
          <Row l="Remaining" v={money(r.remaining)} tint={C.warning} bold />
        </Card>
      ))}

      <View style={styles.secHead}><Ionicons name="bicycle" size={18} color={C.brandPrimary} /><Txt weight="semibold" size={T.lg}>Delivery Partner-wise</Txt></View>
      {(!d?.partners || d.partners.length === 0) ? (
        <Card style={styles.empty}><Txt color={C.muted}>No completed deliveries today.</Txt></Card>
      ) : d.partners.map((p: any) => (
        <Card key={p.partner_id} style={styles.card} testID={`settle-partner-${p.partner_id}`}>
          <View style={styles.top}><Txt weight="semibold" style={{ flex: 1 }}>{p.name}</Txt><Txt size={T.sm} color={C.muted}>{p.deliveries} deliveries</Txt></View>
          <Row l="Delivery Earnings" v={money(p.earnings)} bold />
          <Row l="Paid" v={money(p.paid)} />
          <Row l="Remaining" v={money(p.remaining)} tint={C.warning} bold />
        </Card>
      ))}
    </ScrollView>
  );
}
const Row = ({ l, v, bold, tint }: { l: string; v: string; bold?: boolean; tint?: string }) => (
  <View style={styles.row}><Txt size={T.sm} color={C.onSurfaceTertiary}>{l}</Txt><Txt size={T.sm} weight={bold ? "semibold" : "medium"} color={tint || C.onSurface}>{v}</Txt></View>
);
const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.md },
  stat: { width: "47%", flexGrow: 1, minWidth: 150, padding: S.lg, gap: 2 },
  secHead: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.xl, marginBottom: S.sm },
  card: { padding: S.lg, marginBottom: S.md },
  empty: { padding: S.lg },
  top: { flexDirection: "row", alignItems: "center", marginBottom: S.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: S.sm },
});
