import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Card, Loading, Txt } from "@/src/components/ui";
import { money } from "@/src/format";
import { C, R, S, T } from "@/src/theme";

export default function RestaurantEarnings() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [e, d] = await Promise.all([api.get("/restaurant/earnings"), api.get("/restaurant/dashboard")]);
      setData(e); setDash(d);
    } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;

  const stat = (label: string, value: string, icon: any) => (
    <Card style={styles.stat}>
      <View style={styles.statIcon}><Ionicons name={icon} size={18} color={C.brandPrimary} /></View>
      <Txt weight="semibold" size={T.xl}>{value}</Txt>
      <Txt size={T.sm} color={C.muted}>{label}</Txt>
    </Card>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ paddingTop: insets.top + S.md, padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
      <Txt weight="semibold" size={T["2xl"]} style={{ marginBottom: S.lg }}>Earnings</Txt>
      <View style={styles.grid}>
        {stat("Today's Orders", String(dash?.today?.orders ?? 0), "receipt")}
        {stat("Today's Sales", money(dash?.today?.gross_sales), "cash")}
        {stat("Today's Net", money(dash?.today?.net_earning), "trending-up")}
        {stat("Completed", String(data?.orders ?? 0), "checkmark-done")}
      </View>

      <Txt weight="semibold" size={T.lg} style={{ marginTop: S.xl, marginBottom: S.sm }}>All-time Summary</Txt>
      <Card style={styles.summary}>
        <Row label="Gross Sales" value={money(data?.gross_sales)} />
        <Row label="Platform Commission" value={`- ${money(data?.commission)}`} />
        <Row label="Fixed Fee" value={`- ${money(data?.fixed_fee)}`} />
        <View style={styles.total}><Txt weight="semibold" size={T.lg}>Net Earning</Txt><Txt weight="semibold" size={T.lg} color={C.success}>{money(data?.net_earning)}</Txt></View>
      </Card>
    </ScrollView>
  );
}
const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}><Txt color={C.onSurfaceTertiary}>{label}</Txt><Txt weight="medium">{value}</Txt></View>
);
const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.md },
  stat: { width: "47%", flexGrow: 1, padding: S.lg, gap: 2 },
  statIcon: { width: 36, height: 36, borderRadius: R.pill, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: S.sm },
  summary: { padding: S.lg },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: S.xs },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: S.sm, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
});
