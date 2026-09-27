import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { api } from "@/src/api";
import { Badge, Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { C, R, S, T } from "@/src/theme";

const FILTERS = ["all", "pending", "approved", "suspended", "rejected"];
const col: Record<string, any> = { approved: { bg: "#E7F0E9", fg: C.success }, pending: { bg: C.brandTertiary, fg: C.onBrandTertiary }, suspended: { bg: "#FBEBEA", fg: C.error }, rejected: { bg: "#FBEBEA", fg: C.error } };

export default function AdminPartners() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f: string) => {
    setLoading(true);
    try { const r = await api.get("/admin/delivery-partners", { status: f === "all" ? undefined : f }); setRows(r.partners || []); }
    catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(filter); }, [load, filter]));

  const act = async (id: string, action: string) => {
    try { await api.post(`/admin/delivery-partners/${id}/${action}`, {}); toast.show(`Partner ${action}d`, "success"); load(filter); }
    catch (e: any) { toast.show(e.message, "error"); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]} testID={`pfilter-${f}`}>
            <Txt size={T.sm} weight="medium" color={filter === f ? C.onBrandPrimary : C.onSurface}>{f[0].toUpperCase() + f.slice(1)}</Txt>
          </Pressable>
        ))}
      </View>
      {loading ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon="bicycle-outline" title="No delivery partners" subtitle="Partner registrations will appear here." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: S.lg, paddingBottom: S["3xl"], gap: S.md }}
          renderItem={({ item }) => {
            const c = col[item.status] || col.pending;
            return (
              <View style={styles.card} testID={`admin-partner-${item.id}`}>
                <View style={styles.top}>
                  <View style={{ flex: 1 }}>
                    <Txt weight="semibold">{item.name}</Txt>
                    <Txt size={T.sm} color={C.muted}>+91 {item.phone} · {item.vehicle}</Txt>
                  </View>
                  {item.online && <Ionicons name="ellipse" size={10} color={C.success} style={{ marginRight: 4 }} />}
                  <Badge label={(item.status || "").toUpperCase()} color={c.bg} textColor={c.fg} />
                </View>
                <View style={styles.actions}>
                  {item.status !== "approved" && <Button label="Approve" onPress={() => act(item.id, "approve")} style={styles.aBtn} testID={`approve-p-${item.id}`} />}
                  {item.status === "pending" && <Button label="Reject" variant="ghost" onPress={() => act(item.id, "reject")} style={styles.aBtn} testID={`reject-p-${item.id}`} />}
                  {item.status === "approved" && <Button label="Suspend" variant="ghost" onPress={() => act(item.id, "suspend")} style={styles.aBtn} testID={`suspend-p-${item.id}`} />}
                  {item.status === "suspended" && <Button label="Re-activate" onPress={() => act(item.id, "approve")} style={styles.aBtn} />}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, padding: S.lg, paddingBottom: 0 },
  chip: { height: 34, paddingHorizontal: S.md, borderRadius: R.pill, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
  card: { backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  top: { flexDirection: "row", alignItems: "center", gap: S.sm },
  actions: { flexDirection: "row", gap: S.sm, marginTop: S.md },
  aBtn: { flex: 1, height: 42 },
});
