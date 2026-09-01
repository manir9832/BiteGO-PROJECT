import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Card, EmptyState, Loading, Txt } from "@/src/components/ui";
import { fmtDateTime, money } from "@/src/format";
import { C, R, S, T } from "@/src/theme";

export default function DeliveryEarnings() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await api.get("/delivery/earnings")); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top + S.md }}>
      <Txt weight="semibold" size={T["2xl"]} style={{ paddingHorizontal: S.lg }}>Earnings</Txt>
      <View style={styles.grid}>
        <Card style={styles.stat}><Txt weight="semibold" size={T.xl} color={C.success}>{money(data?.today_earnings)}</Txt><Txt size={T.sm} color={C.muted}>Today's Earnings</Txt></Card>
        <Card style={styles.stat}><Txt weight="semibold" size={T.xl}>{data?.today_deliveries ?? 0}</Txt><Txt size={T.sm} color={C.muted}>Today's Deliveries</Txt></Card>
        <Card style={styles.stat}><Txt weight="semibold" size={T.xl}>{money(data?.total_earnings)}</Txt><Txt size={T.sm} color={C.muted}>Total Earnings</Txt></Card>
        <Card style={styles.stat}><Txt weight="semibold" size={T.xl}>{data?.total_deliveries ?? 0}</Txt><Txt size={T.sm} color={C.muted}>Total Deliveries</Txt></Card>
      </View>
      <Txt weight="semibold" size={T.lg} style={{ paddingHorizontal: S.lg, marginTop: S.lg, marginBottom: S.sm }}>Delivery History</Txt>
      {(!data?.history || data.history.length === 0) ? (
        <EmptyState icon="bicycle-outline" title="No deliveries yet" subtitle="Completed deliveries and earnings will show here." />
      ) : (
        <FlatList
          data={data.history}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.sm }}
          renderItem={({ item }) => (
            <View style={styles.hist}>
              <View style={styles.histIcon}><Ionicons name="checkmark-done" size={16} color={C.success} /></View>
              <View style={{ flex: 1 }}>
                <Txt weight="medium">#{item.id.slice(-6).toUpperCase()}</Txt>
                <Txt size={T.sm} color={C.muted}>{fmtDateTime(item.delivered_at || item.created_at)}</Txt>
              </View>
              <Txt weight="semibold" color={C.success}>{money(item.earning)}</Txt>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.md, padding: S.lg },
  stat: { width: "47%", flexGrow: 1, padding: S.lg, gap: 2 },
  hist: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md },
  histIcon: { width: 34, height: 34, borderRadius: R.pill, backgroundColor: "#E7F0E9", alignItems: "center", justifyContent: "center" },
});
