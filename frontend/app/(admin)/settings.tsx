import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { api } from "@/src/api";
import { Button, Card, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

const numInput = { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: S.md, height: 44, fontFamily: F.medium, fontSize: T.base, color: C.onSurface, minWidth: 90, textAlign: "center" } as const;

export default function AdminSettings() {
  const toast = useToast();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api.get("/admin/settings"); setS(r.settings); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }));
  const num = (v: any) => { const n = parseFloat(String(v)); return isNaN(n) ? 0 : n; };

  const setSlab = (i: number, field: string, v: string) => {
    setS((p: any) => {
      const slabs = [...p.delivery_partner_earning_slabs];
      slabs[i] = { ...slabs[i], [field]: num(v) };
      return { ...p, delivery_partner_earning_slabs: slabs };
    });
  };
  const addSlab = () => setS((p: any) => ({ ...p, delivery_partner_earning_slabs: [...p.delivery_partner_earning_slabs, { km: p.delivery_partner_earning_slabs.length + 1, earning: 0 }] }));
  const removeSlab = (i: number) => setS((p: any) => ({ ...p, delivery_partner_earning_slabs: p.delivery_partner_earning_slabs.filter((_: any, idx: number) => idx !== i) }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        platform_charge: num(s.platform_charge),
        restaurant_commission_pct: num(s.restaurant_commission_pct),
        restaurant_fixed_fee: num(s.restaurant_fixed_fee),
        delivery_base_first_km: num(s.delivery_base_first_km),
        delivery_additional_per_km: num(s.delivery_additional_per_km),
        delivery_partner_earning_slabs: s.delivery_partner_earning_slabs.map((x: any) => ({ km: num(x.km), earning: num(x.earning) })),
        max_service_radius_km: num(s.max_service_radius_km),
        priority_radius_km: num(s.priority_radius_km),
        ordering_enabled: !!s.ordering_enabled,
        helpline: String(s.helpline || ""),
      });
      toast.show("Settings saved. Applies to future orders.", "success");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  };

  if (loading || !s) return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;

  const field = (label: string, key: string, prefix?: string) => (
    <View style={styles.fieldRow}>
      <Txt style={{ flex: 1 }} color={C.onSurfaceTertiary}>{label}</Txt>
      <View style={styles.inputWrap}>
        {prefix && <Txt color={C.muted}>{prefix}</Txt>}
        <TextInput value={String(s[key])} onChangeText={(v) => set(key, v)} keyboardType="numeric" style={numInput} testID={`setting-${key}`} />
      </View>
    </View>
  );

  return (
    <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ padding: S.lg, paddingBottom: S["3xl"] }} bottomOffset={20} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <Txt weight="semibold" size={T.lg}>General</Txt>
        {field("Platform Charge", "platform_charge", "₹")}
        {field("Restaurant Commission", "restaurant_commission_pct", "%")}
        {field("Restaurant Fixed Fee", "restaurant_fixed_fee", "₹")}
        <View style={styles.fieldRow}>
          <Txt style={{ flex: 1 }} color={C.onSurfaceTertiary}>Ordering Enabled</Txt>
          <Switch value={!!s.ordering_enabled} onValueChange={(v) => set("ordering_enabled", v)} trackColor={{ true: C.brandPrimary }} testID="setting-ordering" />
        </View>
      </Card>

      <Card style={[styles.card, styles.cardBrand]}>
        <View style={styles.secHead}><Ionicons name="person" size={18} color={C.brandPrimary} /><Txt weight="semibold" size={T.lg}>Customer Delivery Charge</Txt></View>
        <Txt size={T.sm} color={C.muted} style={{ marginBottom: S.sm }}>What the customer pays. First km + each additional started km.</Txt>
        {field("Base charge (first 1 KM)", "delivery_base_first_km", "₹")}
        {field("Each additional started KM", "delivery_additional_per_km", "₹")}
      </Card>

      <Card style={[styles.card, styles.cardBrand]}>
        <View style={styles.secHead}><Ionicons name="bicycle" size={18} color={C.brandPrimary} /><Txt weight="semibold" size={T.lg}>Delivery Partner Earning</Txt></View>
        <Txt size={T.sm} color={C.muted} style={{ marginBottom: S.sm }}>Independent from customer charge — what the partner earns per distance slab.</Txt>
        {s.delivery_partner_earning_slabs.map((slab: any, i: number) => (
          <View key={i} style={styles.slabRow} testID={`slab-${i}`}>
            <View style={styles.slabField}><Txt size={T.sm} color={C.muted}>KM</Txt><TextInput value={String(slab.km)} onChangeText={(v) => setSlab(i, "km", v)} keyboardType="numeric" style={numInput} testID={`slab-km-${i}`} /></View>
            <View style={styles.slabField}><Txt size={T.sm} color={C.muted}>₹ Earn</Txt><TextInput value={String(slab.earning)} onChangeText={(v) => setSlab(i, "earning", v)} keyboardType="numeric" style={numInput} testID={`slab-earn-${i}`} /></View>
            <Pressable onPress={() => removeSlab(i)} hitSlop={8} testID={`slab-remove-${i}`}><Ionicons name="trash-outline" size={20} color={C.error} /></Pressable>
          </View>
        ))}
        <Button label="Add slab" variant="secondary" icon="add" onPress={addSlab} style={{ marginTop: S.md, height: 42 }} testID="add-slab" />
      </Card>

      <Card style={styles.card}>
        <Txt weight="semibold" size={T.lg}>Service Radius & Support</Txt>
        {field("Max Service Radius", "max_service_radius_km", "km")}
        {field("Restaurant Priority Radius", "priority_radius_km", "km")}
        <View style={styles.fieldRow}>
          <Txt style={{ flex: 1 }} color={C.onSurfaceTertiary}>Helpline</Txt>
          <TextInput value={String(s.helpline || "")} onChangeText={(v) => set("helpline", v)} style={[numInput, { minWidth: 140 }]} testID="setting-helpline" />
        </View>
      </Card>

      <Button label="Save Settings" onPress={save} loading={saving} style={{ marginTop: S.md }} testID="save-settings-button" />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: S.lg, marginBottom: S.md, gap: S.xs },
  cardBrand: { borderColor: C.brandSecondary, borderWidth: 1.5 },
  secHead: { flexDirection: "row", alignItems: "center", gap: S.sm },
  fieldRow: { flexDirection: "row", alignItems: "center", paddingVertical: S.sm, gap: S.md },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: S.xs },
  slabRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.sm },
  slabField: { flexDirection: "row", alignItems: "center", gap: S.sm },
});
