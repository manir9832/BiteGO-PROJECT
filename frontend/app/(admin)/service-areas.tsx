import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { api } from "@/src/api";
import AppMap from "@/src/components/AppMap";
import { Badge, Button, Card, EmptyState, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, shadow, T } from "@/src/theme";

const inp = { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: S.md, height: 48, fontFamily: F.medium, fontSize: T.base, color: C.onSurface } as const;
const EMPTY = { name: "", lat: "22.5726", lng: "88.3639", radius_km: "10", priority_radius_km: "5", active: true };

export default function AdminServiceAreas() {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api.get("/admin/service-areas"); setRows(r.areas || []); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => { setEditId(null); setForm(EMPTY); setModal(true); };
  const openEdit = (a: any) => { setEditId(a.id); setForm({ name: a.name, lat: String(a.lat), lng: String(a.lng), radius_km: String(a.radius_km), priority_radius_km: String(a.priority_radius_km), active: a.active }); setModal(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.show("Enter area name", "error"); return; }
    setSaving(true);
    const body = { name: form.name.trim(), lat: parseFloat(form.lat), lng: parseFloat(form.lng), radius_km: parseFloat(form.radius_km), priority_radius_km: parseFloat(form.priority_radius_km), active: form.active };
    try {
      if (editId) await api.put(`/admin/service-areas/${editId}`, body);
      else await api.post("/admin/service-areas", body);
      toast.show("Service area saved", "success"); setModal(false); load();
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (a: any) => {
    try { await api.put(`/admin/service-areas/${a.id}`, { name: a.name, lat: a.lat, lng: a.lng, radius_km: a.radius_km, priority_radius_km: a.priority_radius_km, active: !a.active }); load(); }
    catch (e: any) { toast.show(e.message, "error"); }
  };
  const remove = async (id: string) => {
    try { await api.del(`/admin/service-areas/${id}`); toast.show("Area deactivated (history preserved)", "success"); load(); }
    catch (e: any) { toast.show(e.message, "error"); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={styles.head}>
        <Txt weight="semibold" size={T["2xl"]}>Service Areas</Txt>
        <Button label="Add Area" icon="add" onPress={openNew} style={{ height: 42, paddingHorizontal: S.lg }} testID="add-area-button" />
      </View>
      {loading ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon="map-outline" title="No service areas" subtitle="Add a service area to start operating in a location."
          action={<Button label="Add Area" icon="add" onPress={openNew} />} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: S["3xl"], gap: S.md }}>
          <View style={styles.overviewMap} testID="areas-overview-map">
            <AppMap
              style={{ height: 300 }}
              markers={rows.filter((a) => a.active).map((a) => ({ lat: a.lat, lng: a.lng, title: a.name, color: C.brandPrimary }))}
              circles={rows.filter((a) => a.active).map((a) => ({ lat: a.lat, lng: a.lng, radiusKm: a.radius_km, color: C.brandPrimary }))}
            />
          </View>
          {rows.map((a) => (
            <Card key={a.id} style={styles.card} testID={`area-${a.id}`}>
              <View style={styles.top}>
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold">{a.name}</Txt>
                  <Txt size={T.sm} color={C.muted}>{a.lat?.toFixed(4)}, {a.lng?.toFixed(4)} · {a.radius_km}km radius · {a.priority_radius_km}km priority</Txt>
                </View>
                <Badge label={a.active ? "ACTIVE" : "INACTIVE"} color={a.active ? "#E7F0E9" : C.surfaceTertiary} textColor={a.active ? C.success : C.muted} />
              </View>
              <View style={styles.actions}>
                <View style={styles.toggleRow}><Txt size={T.sm} color={C.muted}>Active</Txt><Switch value={a.active} onValueChange={() => toggleActive(a)} trackColor={{ true: C.brandPrimary }} testID={`area-toggle-${a.id}`} /></View>
                <Pressable onPress={() => openEdit(a)} testID={`edit-area-${a.id}`}><Txt weight="semibold" color={C.brandPrimary} size={T.sm}>Edit</Txt></Pressable>
                <Pressable onPress={() => remove(a.id)} testID={`remove-area-${a.id}`}><Txt weight="semibold" color={C.error} size={T.sm}>Remove</Txt></Pressable>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet} testID="area-form">
            <Txt weight="semibold" size={T.xl} style={{ marginBottom: S.md }}>{editId ? "Edit Area" : "New Service Area"}</Txt>
            <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Area name" placeholderTextColor={C.muted} style={inp} testID="area-name" />
            <Txt size={T.sm} color={C.muted} style={{ marginTop: S.sm }}>Tap the map to set the area center</Txt>
            <View style={styles.modalMap} testID="area-picker-map">
              <AppMap
                style={{ height: 220 }}
                onPress={({ lat, lng }) => setForm((f: any) => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
                markers={form.lat && form.lng ? [{ lat: parseFloat(form.lat), lng: parseFloat(form.lng), title: form.name || "Center", color: C.brandPrimary }] : []}
                circles={form.lat && form.lng && form.radius_km ? [{ lat: parseFloat(form.lat), lng: parseFloat(form.lng), radiusKm: parseFloat(form.radius_km) || 0, color: C.brandPrimary }] : []}
                fitToMarkers={false}
              />
            </View>
            <View style={{ flexDirection: "row", gap: S.md, marginTop: S.sm }}>
              <TextInput value={form.lat} onChangeText={(v) => setForm({ ...form, lat: v })} keyboardType="numeric" placeholder="Latitude" placeholderTextColor={C.muted} style={[inp, { flex: 1 }]} testID="area-lat" />
              <TextInput value={form.lng} onChangeText={(v) => setForm({ ...form, lng: v })} keyboardType="numeric" placeholder="Longitude" placeholderTextColor={C.muted} style={[inp, { flex: 1 }]} testID="area-lng" />
            </View>
            <View style={{ flexDirection: "row", gap: S.md, marginTop: S.sm }}>
              <TextInput value={form.radius_km} onChangeText={(v) => setForm({ ...form, radius_km: v })} keyboardType="numeric" placeholder="Radius km" placeholderTextColor={C.muted} style={[inp, { flex: 1 }]} testID="area-radius" />
              <TextInput value={form.priority_radius_km} onChangeText={(v) => setForm({ ...form, priority_radius_km: v })} keyboardType="numeric" placeholder="Priority km" placeholderTextColor={C.muted} style={[inp, { flex: 1 }]} testID="area-priority" />
            </View>
            <View style={styles.toggleRow2}><Txt weight="medium">Active</Txt><Switch value={form.active} onValueChange={(v) => setForm({ ...form, active: v })} trackColor={{ true: C.brandPrimary }} /></View>
            <View style={{ flexDirection: "row", gap: S.md, marginTop: S.md }}>
              <Button label="Cancel" variant="ghost" onPress={() => setModal(false)} style={{ flex: 1 }} />
              <Button label="Save" onPress={save} loading={saving} style={{ flex: 1 }} testID="save-area-button" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: S.lg },
  overviewMap: { borderRadius: R.lg, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  modalMap: { borderRadius: R.md, overflow: "hidden", borderWidth: 1, borderColor: C.border, marginTop: S.sm },
  card: { padding: S.lg },
  top: { flexDirection: "row", alignItems: "flex-start", gap: S.sm },
  actions: { flexDirection: "row", alignItems: "center", gap: S.xl, marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginRight: "auto" },
  backdrop: { flex: 1, backgroundColor: "rgba(28,25,23,0.55)", alignItems: "center", justifyContent: "center", padding: S.lg },
  sheet: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, padding: S.xl, width: "100%", maxWidth: 460, ...shadow },
  toggleRow2: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: S.md },
});
