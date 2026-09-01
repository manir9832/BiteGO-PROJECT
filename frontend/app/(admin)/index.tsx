import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { api } from "@/src/api";
import { Button, Card, Loading, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { money } from "@/src/format";
import { C, R, S, T } from "@/src/theme";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setD(await api.get("/admin/dashboard")); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;

  const card = (label: string, value: string, icon: any, tint = C.brandPrimary) => (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: tint + "22" }]}><Ionicons name={icon} size={18} color={tint} /></View>
      <Txt weight="semibold" size={T.xl}>{value}</Txt>
      <Txt size={T.sm} color={C.muted}>{label}</Txt>
    </Card>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ padding: S.lg, paddingBottom: S["3xl"] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <View style={styles.head}>
        <Txt weight="semibold" size={T["2xl"]}>Overview</Txt>
        <Button label="Logout" variant="ghost" onPress={logout} style={{ height: 40, paddingHorizontal: S.lg }} testID="admin-logout" />
      </View>

      <Txt weight="medium" size={T.sm} color={C.muted} style={styles.sec}>TODAY</Txt>
      <View style={styles.grid}>
        {card("Orders Today", String(d.today_orders), "receipt", C.brandPrimary)}
        {card("Revenue Today", money(d.today_revenue), "cash", C.success)}
        {card("Platform Revenue", money(d.platform_revenue), "business", C.info)}
        {card("Delivery Margin", money(d.delivery_margin), "trending-up", C.warning)}
      </View>

      <Txt weight="medium" size={T.sm} color={C.muted} style={styles.sec}>PAYABLE TODAY</Txt>
      <View style={styles.grid}>
        {card("Seller Payable", money(d.seller_payable_today), "storefront", C.brandPrimary)}
        {card("Partner Payable", money(d.partner_payable_today), "bicycle", C.brandPrimary)}
      </View>

      <Txt weight="medium" size={T.sm} color={C.muted} style={styles.sec}>PLATFORM</Txt>
      <View style={styles.grid}>
        {card("Customers", String(d.customers), "people", C.info)}
        {card("Restaurants", String(d.restaurants), "storefront", C.info)}
        {card("Pending Restaurants", String(d.restaurants_pending), "hourglass", C.warning)}
        {card("Delivery Partners", String(d.delivery_partners), "bicycle", C.info)}
        {card("Pending Partners", String(d.delivery_pending), "hourglass", C.warning)}
        {card("Active Orders", String(d.orders_active), "flash", C.brandPrimary)}
        {card("Completed", String(d.orders_completed), "checkmark-done", C.success)}
        {card("Cancelled", String(d.orders_cancelled), "close-circle", C.error)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: S.sm },
  sec: { marginTop: S.lg, marginBottom: S.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.md },
  card: { width: "47%", flexGrow: 1, minWidth: 150, padding: S.lg, gap: 2 },
  icon: { width: 36, height: 36, borderRadius: R.pill, alignItems: "center", justifyContent: "center", marginBottom: S.sm },
});
