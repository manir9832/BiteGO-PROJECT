import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Button, Card, Txt } from "@/src/components/ui";
import { useLocation } from "@/src/context/location";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

const VEHICLES = ["bike", "scooter", "cycle"];

export default function DeliveryRegister() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { loc, detect } = useLocation();
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState("bike");
  const [coords, setCoords] = useState({ lat: loc.lat, lng: loc.lng });
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);

  const useCurrent = async () => {
    setDetecting(true);
    const l = await detect();
    if (l) { setCoords({ lat: l.lat, lng: l.lng }); toast.show("Location set", "success"); }
    else toast.show("Enable location permission", "error");
    setDetecting(false);
  };

  const submit = async () => {
    if (name.trim().length < 2) { toast.show("Enter your name", "error"); return; }
    setSaving(true);
    try {
      await api.post("/delivery/register", { name: name.trim(), vehicle, lat: coords.lat, lng: coords.lng });
      toast.show("Submitted! Awaiting admin approval.", "success");
      router.replace("/(delivery)");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <KeyboardAwareScrollView contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + S.xl }} bottomOffset={20} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}><Ionicons name="bicycle" size={28} color={C.brandPrimary} /></View>
        <Txt weight="semibold" size={T["2xl"]} style={{ marginTop: S.lg }}>Become a delivery partner</Txt>
        <Txt color={C.muted} style={{ marginTop: S.xs, marginBottom: S.lg }}>An admin will review and approve your account.</Txt>

        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.lbl}>FULL NAME</Txt>
        <TextInput testID="dname" value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={C.muted} style={styles.input} />

        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.lbl}>VEHICLE</Txt>
        <View style={styles.chips}>
          {VEHICLES.map((v) => (
            <Button key={v} label={v[0].toUpperCase() + v.slice(1)} variant={vehicle === v ? "primary" : "secondary"} onPress={() => setVehicle(v)} style={{ flex: 1, height: 44 }} testID={`vehicle-${v}`} />
          ))}
        </View>

        <Card style={styles.locCard}>
          <Ionicons name="navigate-circle" size={22} color={C.brandPrimary} />
          <View style={{ flex: 1 }}><Txt weight="medium" size={T.sm}>Your location</Txt><Txt size={T.sm} color={C.muted}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</Txt></View>
          <Button label={detecting ? "" : "Detect"} loading={detecting} onPress={useCurrent} variant="secondary" style={{ height: 40, paddingHorizontal: S.md }} testID="ddetect" />
        </Card>

        <Button label="Submit for Approval" onPress={submit} loading={saving} style={{ marginTop: S.xl }} testID="dsubmit" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: R.md, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
  lbl: { marginBottom: S.sm, marginTop: S.md },
  input: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 52, fontFamily: F.medium, fontSize: T.base, color: C.onSurface },
  chips: { flexDirection: "row", gap: S.sm },
  locCard: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, marginTop: S.lg },
});
