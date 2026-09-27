import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { StackHeader } from "@/src/components/header";
import { Badge, Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { C, R, S, T } from "@/src/theme";

export default function Addresses() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const r = await api.get("/addresses"); setRows(r.addresses || []); }
    catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = async (id: string) => {
    try { await api.del(`/addresses/${id}`); toast.show("Address removed", "success"); load(); }
    catch (e: any) { toast.show(e.message, "error"); }
  };

  return (
    <View style={styles.root}>
      <StackHeader title="Saved Addresses" />
      {loading ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon="location-outline" title="No saved addresses"
          subtitle="Add an address to speed up checkout."
          action={<Button label="Add Address" icon="add" onPress={() => router.push("/address-edit")} />} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + 90, gap: S.md }}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`address-row-${item.id}`}>
              <View style={styles.cardTop}>
                <Ionicons name="location" size={18} color={C.brandPrimary} />
                <Txt weight="semibold" style={{ flex: 1 }}>{item.label}</Txt>
                {item.is_default && <Badge label="Default" />}
              </View>
              <Txt size={T.sm} color={C.muted} style={{ marginTop: 4 }}>{item.line}</Txt>
              <View style={styles.actions}>
                <Pressable onPress={() => router.push({ pathname: "/address-edit", params: { id: item.id } })} testID={`edit-address-${item.id}`}>
                  <Txt weight="semibold" color={C.brandPrimary} size={T.sm}>Edit</Txt>
                </Pressable>
                <Pressable onPress={() => remove(item.id)} testID={`delete-address-${item.id}`}>
                  <Txt weight="semibold" color={C.error} size={T.sm}>Delete</Txt>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
      <View style={[styles.fab, { bottom: insets.bottom + S.lg }]}>
        <Button label="Add New Address" icon="add" onPress={() => router.push("/address-edit")} testID="add-address-button" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  card: { backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: S.sm },
  actions: { flexDirection: "row", gap: S.xl, marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
  fab: { position: "absolute", left: S.lg, right: S.lg },
});
