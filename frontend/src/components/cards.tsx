import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S, shadow, T } from "@/src/theme";
import { money } from "@/src/format";
import { Badge, Stepper, Txt } from "./ui";

export function RestaurantCard({ r, onPress, onToggleFav, isFav }:
  { r: any; onPress: () => void; onToggleFav?: () => void; isFav?: boolean }) {
  const closed = !r.is_open;
  const cover = r.cover || r.image;
  return (
    <Pressable onPress={onPress} style={styles.rCard} testID={`restaurant-card-${r.id}`}>
      <View>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.rImg} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.rImg, styles.imgFallback]}><Ionicons name="storefront" size={40} color={C.muted} /></View>
        )}
        <LinearGradient colors={["transparent", "rgba(28,25,23,0.85)"]} style={styles.scrim} />
        {closed && <View style={styles.closedOverlay}><Badge label="Closed" color={C.surfaceInverse} textColor={C.onSurfaceInverse} /></View>}
        {onToggleFav && (
          <Pressable onPress={onToggleFav} hitSlop={10} style={styles.fav} testID={`fav-${r.id}`}>
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color={isFav ? C.brandPrimary : "#fff"} />
          </Pressable>
        )}
        <View style={styles.rOverlay}>
          <Txt weight="semibold" size={T.xl} color="#fff" numberOfLines={1}>{r.name}</Txt>
          <Txt size={T.sm} color="#EDE7DE" numberOfLines={1}>{(r.categories || []).slice(0, 3).join(" • ")}</Txt>
        </View>
      </View>
      <View style={styles.rMeta}>
        <View style={styles.metaPill}>
          <Ionicons name="star" size={13} color={C.warning} />
          <Txt size={T.sm} weight="medium">{r.rating > 0 ? r.rating : "New"}</Txt>
        </View>
        {r.distance_km != null && (
          <View style={styles.metaPill}>
            <Ionicons name="location-outline" size={13} color={C.muted} />
            <Txt size={T.sm} color={C.muted}>{r.distance_km.toFixed(1)} km</Txt>
          </View>
        )}
        <View style={styles.metaPill}>
          <Ionicons name="time-outline" size={13} color={C.muted} />
          <Txt size={T.sm} color={C.muted}>{r.open_time}–{r.close_time}</Txt>
        </View>
      </View>
    </Pressable>
  );
}

export function FoodRow({ f, qty, onInc, onDec }:
  { f: any; qty: number; onInc: () => void; onDec: () => void }) {
  const disabled = !f.available;
  return (
    <View style={styles.food} testID={`food-row-${f.id}`}>
      <View style={{ flex: 1, paddingRight: S.md }}>
        <View style={styles.vegRow}>
          <View style={[styles.vegDot, { borderColor: f.veg ? C.success : C.error }]}>
            <View style={[styles.vegInner, { backgroundColor: f.veg ? C.success : C.error }]} />
          </View>
          <Txt weight="semibold" size={T.lg} numberOfLines={1} style={{ flex: 1 }}>{f.name}</Txt>
        </View>
        <Txt weight="medium">{money(f.price)}</Txt>
        {!!f.description && <Txt size={T.sm} color={C.muted} numberOfLines={2} style={{ marginTop: 2 }}>{f.description}</Txt>}
        {disabled && <Txt size={T.sm} color={C.error} style={{ marginTop: 4 }}>Currently unavailable</Txt>}
      </View>
      <View style={{ alignItems: "center" }}>
        {f.image ? (
          <Image source={{ uri: f.image }} style={styles.foodImg} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.foodImg, styles.imgFallback]}><Ionicons name="fast-food" size={26} color={C.muted} /></View>
        )}
        <View style={styles.foodAction}>
          {qty > 0 ? (
            <Stepper qty={qty} onInc={onInc} onDec={onDec} testID={`food-stepper-${f.id}`} />
          ) : (
            <Pressable onPress={onInc} disabled={disabled} style={[styles.addBtn, disabled && { opacity: 0.4 }]} testID={`food-add-${f.id}`}>
              <Txt weight="semibold" color={C.onBrandPrimary} size={T.sm}>ADD</Txt>
              <Ionicons name="add" size={14} color={C.onBrandPrimary} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export function CategoryChip({ label, image, active, onPress }:
  { label: string; image?: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} testID={`category-${label}`}>
      {image ? <Image source={{ uri: image }} style={styles.chipImg} contentFit="cover" /> : null}
      <Txt size={T.sm} weight={active ? "semibold" : "medium"} color={active ? C.onBrandPrimary : C.onSurface}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rCard: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, overflow: "hidden", borderWidth: 1, borderColor: C.border, ...shadow },
  rImg: { width: "100%", height: 168 },
  imgFallback: { backgroundColor: C.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  closedOverlay: { position: "absolute", top: S.md, left: S.md },
  fav: { position: "absolute", top: S.md, right: S.md, width: 36, height: 36, borderRadius: R.pill, backgroundColor: "rgba(28,25,23,0.4)", alignItems: "center", justifyContent: "center" },
  rOverlay: { position: "absolute", left: S.lg, right: S.lg, bottom: S.md },
  rMeta: { flexDirection: "row", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  food: { flexDirection: "row", paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.divider },
  vegRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginBottom: 4 },
  vegDot: { width: 14, height: 14, borderWidth: 1.5, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  vegInner: { width: 7, height: 7, borderRadius: 4 },
  foodImg: { width: 104, height: 92, borderRadius: R.md },
  foodAction: { marginTop: -18 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: C.brandPrimary, paddingHorizontal: S.md, height: 34, borderRadius: R.md, justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: S.sm, height: 40, paddingHorizontal: S.md, borderRadius: R.pill, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, flexShrink: 0 },
  chipActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
  chipImg: { width: 26, height: 26, borderRadius: R.pill },
});
