import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { api } from "@/src/api";
import { Badge, Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { ImageUpload } from "@/src/components/image-upload";
import { useToast } from "@/src/context/toast";
import { C, R, S, T } from "@/src/theme";

const FILTERS = ["all", "pending", "approved", "suspended", "rejected"];
const col: Record<string, any> = { approved: { bg: "#E7F0E9", fg: C.success }, pending: { bg: C.brandTertiary, fg: C.onBrandTertiary }, suspended: { bg: "#FBEBEA", fg: C.error }, rejected: { bg: "#FBEBEA", fg: C.error } };

export default function AdminRestaurants() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f: string) => {
    setLoading(true);
    try { const r = await api.get("/admin/restaurants", { status: f === "all" ? undefined : f }); setRows(r.restaurants || []); }
    catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(filter); }, [load, filter]));

  const act = async (id: string, action: string) => {
    try { await api.post(`/admin/restaurants/${id}/${action}`, {}); toast.show(`Restaurant ${action}d`, "success"); load(filter); }
    catch (e: any) { toast.show(e.message, "error"); }
  };

  const setBanner = async (id: string, url: string) => {
    try { await api.put(`/admin/restaurants/${id}/media`, { cover: url, image: url }); toast.show("Banner updated", "success"); load(filter); }
    catch (e: any) { toast.show(e.message, "error"); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]} testID={`rfilter-${f}`}>
            <Txt size={T.sm} weight="medium" color={filter === f ? C.onBrandPrimary : C.onSurface}>{f[0].toUpperCase() + f.slice(1)}</Txt>
          </Pressable>
        ))}
      </View>
      {loading ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon="storefront-outline" title="No restaurants" subtitle="Restaurant registrations will appear here." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: S.lg, paddingBottom: S["3xl"], gap: S.md }}
          renderItem={({ item }) => {
            const c = col[item.status] || col.pending;
            return (
              <View style={styles.card} testID={`admin-restaurant-${item.id}`}>
                <ImageUpload variant="banner" value={item.cover || item.image}
                  onChange={(url) => setBanner(item.id, url)} testID={`admin-banner-${item.id}`} />
                <View style={[styles.top, { marginTop: S.md }]}>
                  <View style={{ flex: 1 }}>
                    <Txt weight="semibold" numberOfLines={1}>{item.name}</Txt>
                    <Txt size={T.sm} color={C.muted} numberOfLines={1}>+91 {item.phone} · {item.address}</Txt>
                  </View>
                  <Badge label={(item.status || "").toUpperCase()} color={c.bg} textColor={c.fg} />
                </View>
                <View style={styles.actions}>
                  {item.status !== "approved" && <Button label="Approve" onPress={() => act(item.id, "approve")} style={styles.aBtn} testID={`approve-r-${item.id}`} />}
                  {item.status === "pending" && <Button label="Reject" variant="ghost" onPress={() => act(item.id, "reject")} style={styles.aBtn} testID={`reject-r-${item.id}`} />}
                  {item.status === "approved" && <Button label="Suspend" variant="ghost" onPress={() => act(item.id, "suspend")} style={styles.aBtn} testID={`suspend-r-${item.id}`} />}
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
  top: { flexDirection: "row", alignItems: "flex-start", gap: S.sm },
  actions: { flexDirection: "row", gap: S.sm, marginTop: S.md },
  aBtn: { flex: 1, height: 42 },
});
