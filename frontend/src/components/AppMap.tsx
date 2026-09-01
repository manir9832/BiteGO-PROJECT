// Cross-platform map (native implementation via react-native-maps).
// Metro serves AppMap.web.tsx on web automatically.
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { C } from "@/src/theme";

export type MapMarker = {
  lat: number;
  lng: number;
  title?: string;
  color?: string; // "red" | "green" | hex
};

export type MapCircle = { lat: number; lng: number; radiusKm: number; color?: string };

export type AppMapProps = {
  markers?: MapMarker[];
  polyline?: { latitude: number; longitude: number }[];
  circles?: MapCircle[];
  style?: any;
  showsUser?: boolean;
  onPress?: (coord: { lat: number; lng: number }) => void;
  fitToMarkers?: boolean;
};

function centerOf(markers: MapMarker[]) {
  if (markers.length === 0) return { latitude: 22.5726, longitude: 88.3639 };
  const lat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
  const lng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
  return { latitude: lat, longitude: lng };
}

export default function AppMap({
  markers = [],
  polyline = [],
  circles = [],
  style,
  showsUser,
  onPress,
  fitToMarkers = true,
}: AppMapProps) {
  const ref = useRef<MapView>(null);
  const center = centerOf(markers);

  useEffect(() => {
    if (!fitToMarkers || markers.length < 2 || !ref.current) return;
    const coords = markers.map((m) => ({ latitude: m.lat, longitude: m.lng }));
    const t = setTimeout(() => {
      ref.current?.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [markers, fitToMarkers]);

  return (
    <View style={[styles.wrap, style]}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={!!showsUser}
        initialRegion={{
          ...center,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={
          onPress
            ? (e) =>
                onPress({
                  lat: e.nativeEvent.coordinate.latitude,
                  lng: e.nativeEvent.coordinate.longitude,
                })
            : undefined
        }
      >
        {markers.map((m, i) => (
          <Marker
            key={i}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.title}
            pinColor={m.color || C.brandPrimary}
          />
        ))}
        {polyline.length > 1 && (
          <Polyline coordinates={polyline} strokeWidth={5} strokeColor={C.brandPrimary} />
        )}
        {circles.map((c, i) => (
          <Circle
            key={`c${i}`}
            center={{ latitude: c.lat, longitude: c.lng }}
            radius={c.radiusKm * 1000}
            strokeColor={c.color || C.brandPrimary}
            fillColor={(c.color || C.brandPrimary) + "22"}
            strokeWidth={2}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#E9E4DD" },
});
