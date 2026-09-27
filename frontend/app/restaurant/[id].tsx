import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { FoodRow } from "@/src/components/cards";
import { FloatingCartBar } from "@/src/components/overlays";
import { Badge, ErrorState, Loading, Txt } from "@/src/components/ui";
import { useCart } from "@/src/context/cart";
import { useLocation } from "@/src/context/location";
import { C, R, S, T } from "@/src/theme";

export default function RestaurantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loc } = useLocation();
  const { qtyOf, addItem, decItem } = useCart();
  const [r, setR] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get(`/restaurants/${id}`, { lat: loc.lat, lng: loc.lng });
      setR(res.restaurant);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.root}><Loading /></View>;
  if (error || !r) return <View style={styles.root}><ErrorState onRetry={() => { setLoading(true); load(); }} /></View>;

  const rest = { id: r.id, name: r.name };
  const byCat: Record<string, any[]> = {};
  (r.menu || []).forEach((f: any) => { (byCat[f.category] = byCat[f.category] || []).push(f); });
  const cats = Object.keys(byCat);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.hero}>
          <Image source={{ uri: r.cover || r.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800" }}
            style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(28,25,23,0.4)", "transparent", "rgba(28,25,23,0.6)"]} style={StyleSheet.absoluteFill} />
          <Pressable onPress={() => router.back()} style={[styles.back, { top: insets.top + S.sm }]} testID="restaurant-back">
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Txt weight="semibold" size={T["2xl"]} style={{ flex: 1 }}>{r.name}</Txt>
            <Badge label={r.is_open ? "Open" : "Closed"}
              color={r.is_open ? "#E7F0E9" : "#FBEBEA"} textColor={r.is_open ? C.success : C.error} />
          </View>
          <Txt color={C.muted} style={{ marginTop: 2 }}>{(r.categories || []).join(" • ")}</Txt>
          <View style={styles.stats}>
            <View style={styles.stat}><Ionicons name="star" size={15} color={C.warning} />
              <Txt weight="medium" size={T.sm}>{r.rating > 0 ? `${r.rating} (${r.rating_count})` : "New"}</Txt></View>
            {r.distance_km != null && <View style={styles.stat}><Ionicons name="location-outline" size={15} color={C.muted} />
              <Txt size={T.sm} color={C.muted}>{r.distance_km.toFixed(1)} km</Txt></View>}
            <View style={styles.stat}><Ionicons name="time-outline" size={15} color={C.muted} />
              <Txt size={T.sm} color={C.muted}>{r.open_time}–{r.close_time}</Txt></View>
          </View>
          {!!r.address && <Txt size={T.sm} color={C.muted} style={{ marginTop: S.sm }}>{r.address}</Txt>}
        </View>

        {cats.length === 0 ? (
          <View style={{ padding: S.xl, alignItems: "center" }}>
            <Ionicons name="fast-food-outline" size={36} color={C.brandPrimary} />
            <Txt weight="semibold" style={{ marginTop: S.md }}>Menu not available</Txt>
            <Txt size={T.sm} color={C.muted} style={{ marginTop: S.xs }}>This restaurant hasn't added items yet.</Txt>
          </View>
        ) : cats.map((cat) => (
          <View key={cat} style={styles.section}>
            <Txt weight="semibold" size={T.xl} style={{ marginBottom: S.xs }}>{cat}</Txt>
            {byCat[cat].map((f: any) => (
              <FoodRow key={f.id} f={f} qty={qtyOf(f.id)}
                onInc={() => addItem(f, rest)} onDec={() => decItem(f.id)} />
            ))}
          </View>
        ))}

        {(r.reviews || []).length > 0 && (
          <View style={styles.section}>
            <Txt weight="semibold" size={T.xl} style={{ marginBottom: S.md }}>Reviews</Txt>
            {r.reviews.slice(0, 5).map((rev: any) => (
              <View key={rev.id} style={styles.review}>
                <View style={styles.reviewTop}>
                  <Txt weight="semibold" size={T.sm}>{rev.customer_name || "Customer"}</Txt>
                  <View style={styles.stat}><Ionicons name="star" size={13} color={C.warning} />
                    <Txt size={T.sm} weight="medium">{rev.restaurant_rating}</Txt></View>
                </View>
                {!!rev.comment && <Txt size={T.sm} color={C.onSurfaceTertiary} style={{ marginTop: 2 }}>{rev.comment}</Txt>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <FloatingCartBar bottom={insets.bottom + S.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  hero: { height: 240 },
  back: { position: "absolute", left: S.lg, width: 40, height: 40, borderRadius: R.pill, backgroundColor: "rgba(28,25,23,0.45)", alignItems: "center", justifyContent: "center" },
  info: { padding: S.lg, backgroundColor: C.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: C.border },
  infoRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  stats: { flexDirection: "row", gap: S.lg, marginTop: S.md },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  section: { paddingHorizontal: S.lg, paddingTop: S.lg },
  review: { paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.divider },
  reviewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
