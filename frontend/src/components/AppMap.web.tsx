// Web map implementation using the Google Maps JavaScript API (js-api-loader v2 functional API).
// Metro serves this file on web; native platforms use AppMap.tsx.
import React, { useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { AppMapProps } from "./AppMap";

const BRAND = "#C25934";
let ready: Promise<void> | null = null;

function ensureGoogle(): Promise<void> {
  if (!ready) {
    setOptions({ key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY as string, v: "weekly" });
    ready = Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
      importLibrary("core"),
    ]).then(() => undefined);
  }
  return ready;
}

export default function AppMap({
  markers = [],
  polyline = [],
  circles = [],
  style,
  onPress,
  fitToMarkers = true,
}: AppMapProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    ensureGoogle()
      .then(() => {
        if (cancelled || !elRef.current || mapRef.current) return;
        const g = window.google;
        const center = markers[0] || { lat: 22.5726, lng: 88.3639 };
        mapRef.current = new g.maps.Map(elRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
        });
        if (onPress) {
          mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (e.latLng) onPress({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          });
        }
        draw();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && window.google) draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(markers), JSON.stringify(polyline), JSON.stringify(circles)]);

  function draw() {
    const g = window.google;
    const map = mapRef.current;
    if (!map || !g) return;
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    const bounds = new g.maps.LatLngBounds();

    markers.forEach((m) => {
      const fill =
        m.color === "green" ? "#2E7D32"
        : m.color === "red" ? "#C62828"
        : m.color && m.color.startsWith("#") ? m.color
        : BRAND;
      const mk = new g.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map,
        title: m.title,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: fill,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      overlaysRef.current.push(mk);
      bounds.extend({ lat: m.lat, lng: m.lng });
    });

    if (polyline.length > 1) {
      const pl = new g.maps.Polyline({
        path: polyline.map((p) => ({ lat: p.latitude, lng: p.longitude })),
        strokeColor: BRAND,
        strokeWeight: 5,
        map,
      });
      overlaysRef.current.push(pl);
      polyline.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
    }

    circles.forEach((c) => {
      const circle = new g.maps.Circle({
        center: { lat: c.lat, lng: c.lng },
        radius: c.radiusKm * 1000,
        strokeColor: c.color || BRAND,
        strokeWeight: 2,
        fillColor: c.color || BRAND,
        fillOpacity: 0.12,
        map,
      });
      overlaysRef.current.push(circle);
      const cb = circle.getBounds();
      if (cb) bounds.union(cb);
    });

    if (fitToMarkers && (markers.length > 1 || circles.length > 0)) {
      map.fitBounds(bounds, 60);
    } else if (markers.length >= 1 && circles.length === 0) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
    }
  }

  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {};
  return (
    <div
      ref={elRef}
      style={{
        width: "100%",
        height: flat.height || 240,
        borderRadius: flat.borderRadius || 12,
        overflow: "hidden",
        background: "#E9E4DD",
      }}
    />
  );
}
