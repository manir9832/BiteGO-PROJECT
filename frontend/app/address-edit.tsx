import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { StackHeader } from "@/src/components/header";
import { Button, Card, Txt } from "@/src/components/ui";
import { useLocation } from "@/src/context/location";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

const LABELS = ["Home", "Work", "Other"];

export default function AddressEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { loc, detect } = useLocation();
  const [label, setLabel] = useState("Home");
  const [line, setLine] = useState("");
  const [coords, setCoords] = useState({ lat: loc.lat, lng: loc.lng });
  const [isDefault, setIsDefault] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await api.get("/addresses");
        const a = (r.addresses || []).find((x: any) => x.id === id);
        if (a) { setLabel(a.label); setLine(a.line); setCoords({ lat: a.lat, lng: a.lng }); setIsDefault(a.is_default); }
      } catch {}
    })();
  }, [id]);

  const useCurrent = async () => {
    setDetecting(true);
    const l = await detect();
    if (l) { setCoords({ lat: l.lat, lng: l.lng }); if (!line) setLine(l.address); toast.show("Location set", "success"); }
    else toast.show("Enable location permission", "error");
    setDetecting(false);
  };

  const save = async () => {
    if (line.trim().length < 4) { toast.show("Enter a complete address", "error"); return; }
    setSaving(true);
    const body = { label, line: line.trim(), lat: coords.lat, lng: coords.lng, is_default: isDefault };
    try {
      if (id) await api.put(`/addresses/${id}`, body);
      else await api.post("/addresses", body);
      toast.show("Address saved", "success");
      router.back();
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.root}>
      <StackHeader title={id ? "Edit Address" : "Add Address"} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }} bottomOffset={20} keyboardShouldPersistTaps="handled">
        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.lbl}>ADDRESS TYPE</Txt>
        <View style={styles.chips}>
          {LABELS.map((l) => (
            <Pressable key={l} onPress={() => setLabel(l)} style={[styles.chip, label === l && styles.chipActive]} testID={`label-${l}`}>
              <Txt weight="medium" size={T.sm} color={label === l ? C.onBrandPrimary : C.onSurface}>{l}</Txt>
            </Pressable>
          ))}
        </View>

        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.lbl}>FULL ADDRESS</Txt>
        <TextInput testID="address-line-input" value={line} onChangeText={setLine} multiline
          placeholder="House / Flat, Street, Area, Landmark" placeholderTextColor={C.muted}
          style={[styles.input, { height: 90, textAlignVertical: "top", paddingTop: S.md }]} />

        <Card style={styles.locCard}>
          <Ionicons name="navigate-circle" size={22} color={C.brandPrimary} />
          <View style={{ flex: 1 }}>
            <Txt weight="medium" size={T.sm}>Pin location</Txt>
            <Txt size={T.sm} color={C.muted}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</Txt>
          </View>
          <Button label={detecting ? "" : "Use current"} loading={detecting} onPress={useCurrent} variant="secondary" style={{ height: 40, paddingHorizontal: S.md }} testID="use-current-location" />
        </Card>

        <Pressable style={styles.defRow} onPress={() => setIsDefault((v) => !v)} testID="set-default-toggle">
          <Ionicons name={isDefault ? "checkbox" : "square-outline"} size={22} color={isDefault ? C.brandPrimary : C.muted} />
          <Txt weight="medium">Set as default address</Txt>
        </Pressable>

        <Button label="Save Address" onPress={save} loading={saving} style={{ marginTop: S.xl }} testID="save-address-button" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  lbl: { marginBottom: S.sm, marginTop: S.md },
  chips: { flexDirection: "row", gap: S.sm },
  chip: { paddingHorizontal: S.lg, height: 40, borderRadius: R.pill, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
  input: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, fontFamily: F.medium, fontSize: T.lg, color: C.onSurface },
  locCard: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, marginTop: S.lg },
  defRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.lg },
});
