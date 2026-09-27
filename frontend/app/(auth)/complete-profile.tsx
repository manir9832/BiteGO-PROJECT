import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Button, Card, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { useLocation } from "@/src/context/location";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

export default function CompleteProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { refreshUser } = useAuth();
  const { loc, detect, setLocation } = useLocation();
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);

  const useCurrent = async () => {
    setDetecting(true);
    const l = await detect();
    if (!l) toast.show("Enable location permission to auto-detect", "error");
    else { setLine(l.address); toast.show("Location detected", "success"); }
    setDetecting(false);
  };

  const save = async () => {
    if (name.trim().length < 2) { toast.show("Please enter your full name", "error"); return; }
    if (line.trim().length < 4) { toast.show("Please enter your delivery address", "error"); return; }
    setSaving(true);
    try {
      await api.put("/customers/profile", { name: name.trim() });
      await api.post("/addresses", {
        label: "Home", line: line.trim(), lat: loc.lat, lng: loc.lng, is_default: true,
      });
      setLocation({ ...loc, address: line.trim() });
      await refreshUser();
      router.replace("/(tabs)");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: S.xl, paddingTop: insets.top + S.xl, paddingBottom: insets.bottom + S.xl }}
        bottomOffset={20} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}><Ionicons name="person-circle-outline" size={30} color={C.brandPrimary} /></View>
        <Txt weight="semibold" size={T["2xl"]} style={{ marginTop: S.lg }}>Tell us about you</Txt>
        <Txt color={C.muted} style={{ marginTop: S.xs, marginBottom: S.xl }}>
          A few details so we can deliver to the right place.
        </Txt>

        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.label}>FULL NAME</Txt>
        <TextInput testID="name-input" value={name} onChangeText={setName}
          placeholder="e.g. Ananya Sharma" placeholderTextColor={C.muted} style={styles.input} />

        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.label}>DELIVERY ADDRESS</Txt>
        <TextInput testID="address-input" value={line} onChangeText={setLine}
          placeholder="House / Flat, Street, Area" placeholderTextColor={C.muted}
          multiline style={[styles.input, { height: 84, textAlignVertical: "top", paddingTop: S.md }]} />

        <Card style={styles.locCard}>
          <Ionicons name="navigate-circle" size={22} color={C.brandPrimary} />
          <View style={{ flex: 1 }}>
            <Txt weight="medium" size={T.sm}>Use current location</Txt>
            <Txt size={T.sm} color={C.muted} numberOfLines={1}>
              {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
            </Txt>
          </View>
          <Button label={detecting ? "" : "Detect"} loading={detecting} onPress={useCurrent}
            variant="secondary" style={{ height: 40, paddingHorizontal: S.lg }} testID="detect-location-button" />
        </Card>

        <Button label="Continue" onPress={save} loading={saving} style={{ marginTop: S.xl }} testID="save-profile-button" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  icon: { width: 56, height: 56, borderRadius: R.md, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
  label: { marginBottom: S.sm, marginTop: S.md },
  input: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 54, fontFamily: F.medium, fontSize: T.lg, color: C.onSurface },
  locCard: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, marginTop: S.lg },
});
