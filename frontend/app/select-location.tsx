import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import AppMap from "@/src/components/AppMap";
import { StackHeader } from "@/src/components/header";
import { Button, Txt } from "@/src/components/ui";
import { useLocation } from "@/src/context/location";
import { useToast } from "@/src/context/toast";
import { C, R, S, T } from "@/src/theme";

export default function SelectLocation() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { loc, available, areaName, setLocation, detect } = useLocation();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [confirming, setConfirming] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => { try { const r = await api.get("/addresses"); setAddresses(r.addresses || []); } catch {} })();
  }, []));

  const detectNow = async () => {
    setDetecting(true);
    const l = await detect();
    if (!l) toast.show("Enable location permission", "error");
    else { setPin(null); toast.show("Location updated", "success"); }
    setDetecting(false);
  };

  const confirmPin = async () => {
    if (!pin) return;
    setConfirming(true);
    let address = "Pinned location";
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: pin.lat, longitude: pin.lng });
      if (geo[0]) {
        const g = geo[0];
        address = [g.name, g.district || g.subregion, g.city].filter(Boolean).slice(0, 2).join(", ") || address;
      }
    } catch {}
    setLocation({ lat: pin.lat, lng: pin.lng, address });
    setConfirming(false);
    toast.show("Location set", "success");
    router.back();
  };

  const mapMarker = pin || { lat: loc.lat, lng: loc.lng };

  return (
    <View style={styles.root}>
      <StackHeader title="Delivery Location" />
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
        <View style={[styles.banner, { backgroundColor: available === false ? "#FBEBEA" : "#E7F0E9" }]}>
          <Ionicons name={available === false ? "alert-circle" : "checkmark-circle"} size={20}
            color={available === false ? C.error : C.success} />
          <Txt size={T.sm} weight="medium" color={available === false ? C.error : C.success} style={{ flex: 1 }}>
            {available === false ? "BiteGo is not available at your current location"
              : `Delivering in ${areaName || "your area"}`}
          </Txt>
        </View>

        <View style={styles.mapCard} testID="location-picker-map">
          <AppMap
            style={{ height: 240 }}
            markers={[{ lat: mapMarker.lat, lng: mapMarker.lng, title: "Delivery point", color: C.brandPrimary }]}
            onPress={({ lat, lng }) => setPin({ lat, lng })}
            fitToMarkers={false}
            showsUser
          />
        </View>
        <Txt size={T.sm} color={C.muted} style={{ marginTop: S.xs }}>Tap the map to drop a pin</Txt>
        {pin && (
          <Button label="Confirm this location" onPress={confirmPin} loading={confirming}
            style={{ marginTop: S.sm }} testID="confirm-pin" />
        )}

        <Pressable style={styles.current} onPress={detectNow} testID="use-current">
          <View style={styles.curIcon}><Ionicons name="navigate" size={20} color={C.onBrandPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Txt weight="semibold">Use current location</Txt>
            <Txt size={T.sm} color={C.muted} numberOfLines={1}>{loc.address}</Txt>
          </View>
          {detecting ? <Ionicons name="sync" size={18} color={C.brandPrimary} />
            : <Ionicons name="chevron-forward" size={18} color={C.muted} />}
        </Pressable>

        {addresses.length > 0 && (
          <>
            <Txt weight="medium" size={T.sm} color={C.muted} style={{ marginTop: S.xl, marginBottom: S.sm }}>SAVED ADDRESSES</Txt>
            {addresses.map((a) => (
              <Pressable key={a.id} style={styles.addr}
                onPress={() => { setLocation({ lat: a.lat, lng: a.lng, address: a.line }); toast.show("Location set", "success"); router.back(); }}
                testID={`select-address-${a.id}`}>
                <Ionicons name="location-outline" size={20} color={C.brandPrimary} />
                <View style={{ flex: 1 }}>
                  <Txt weight="medium">{a.label}</Txt>
                  <Txt size={T.sm} color={C.muted} numberOfLines={1}>{a.line}</Txt>
                </View>
              </Pressable>
            ))}
          </>
        )}

        <Button label="Manage Addresses" variant="ghost" icon="settings-outline"
          onPress={() => router.push("/addresses")} style={{ marginTop: S.xl }} testID="manage-addresses" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  banner: { flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.md, borderRadius: R.md },
  mapCard: { borderRadius: R.md, overflow: "hidden", borderWidth: 1, borderColor: C.border, marginTop: S.lg },
  current: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginTop: S.lg },
  curIcon: { width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
  addr: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.sm },
});
