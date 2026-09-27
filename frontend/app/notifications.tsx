import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { StackHeader } from "@/src/components/header";
import { EmptyState, Loading, Txt } from "@/src/components/ui";
import { timeAgo } from "@/src/format";
import { C, R, S, T } from "@/src/theme";

const ICON: Record<string, any> = {
  order: "receipt", new_order: "notifications", announcement: "megaphone",
  account: "person-circle", offer: "pricetag",
};

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const r = await api.get("/notifications"); setRows(r.notifications || []); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); api.post("/notifications/read", {}).catch(() => {}); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title="Notifications" />
      {loading ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon="notifications-outline" title="No notifications"
          subtitle="Order updates and offers will appear here." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.sm }}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`notification-${item.id}`}>
              <View style={styles.icon}><Ionicons name={ICON[item.type] || "notifications"} size={18} color={C.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Txt weight="semibold" numberOfLines={1}>{item.title}</Txt>
                <Txt size={T.sm} color={C.onSurfaceTertiary}>{item.body}</Txt>
                <Txt size={T.sm} color={C.muted} style={{ marginTop: 2 }}>{timeAgo(item.created_at)}</Txt>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  icon: { width: 38, height: 38, borderRadius: R.pill, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
});
