import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { EmptyState, Loading, Txt } from "@/src/components/ui";
import { useLocation } from "@/src/context/location";
import { money } from "@/src/format";
import { C, F, R, S, T } from "@/src/theme";

export default function Search() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loc } = useLocation();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ restaurants: any[]; foods: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setRes(null); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get("/search", { q: q.trim(), lat: loc.lat, lng: loc.lng });
        setRes({ restaurants: r.restaurants || [], foods: r.foods || [] });
      } catch { setRes({ restaurants: [], foods: [] }); }
      finally { setLoading(false); }
    }, 350);
    return () => timer.current && clearTimeout(timer.current);
  }, [q, loc.lat, loc.lng]);

  const rid = (f: any) => f.restaurant_id;
  const results = res ? [
    ...res.restaurants.map((r) => ({ type: "r", data: r })),
    ...res.foods.map((f) => ({ type: "f", data: f })),
  ] : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top + S.sm }]}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={C.muted} />
        <TextInput
          testID="search-input" autoFocus value={q} onChangeText={setQ}
          placeholder="Search restaurants or dishes" placeholderTextColor={C.muted}
          style={styles.input} returnKeyType="search" />
        {q.length > 0 && (
          <Pressable onPress={() => setQ("")} hitSlop={8} testID="search-clear">
            <Ionicons name="close-circle" size={18} color={C.muted} />
          </Pressable>
        )}
      </View>

      {loading ? <Loading /> : !res ? (
        <EmptyState icon="search" title="Find your next meal"
          subtitle="Search across restaurants, cuisines and dishes near you." />
      ) : results.length === 0 ? (
        <EmptyState icon="sad-outline" title="No results"
          subtitle={`We couldn't find anything for "${q}".`} testID="no-results" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item.type}-${item.data.id}-${i}`}
          contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.sm }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const d = item.data;
            return (
              <Pressable style={styles.row}
                onPress={() => router.push(`/restaurant/${item.type === "r" ? d.id : rid(d)}`)}
                testID={`search-result-${d.id}`}>
                <Image source={{ uri: (item.type === "r" ? (d.cover || d.image) : d.image) || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200" }}
                  style={styles.thumb} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold" numberOfLines={1}>{d.name}</Txt>
                  <Txt size={T.sm} color={C.muted} numberOfLines={1}>
                    {item.type === "r" ? (d.categories || []).slice(0, 3).join(" • ") : `Dish · ${money(d.price)}`}
                  </Txt>
                </View>
                <View style={styles.tag}>
                  <Ionicons name={item.type === "r" ? "storefront-outline" : "fast-food-outline"} size={14} color={C.brandPrimary} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  searchBar: { flexDirection: "row", alignItems: "center", gap: S.sm, margin: S.lg, height: 50, borderRadius: R.md, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.lg },
  input: { flex: 1, fontFamily: F.medium, fontSize: T.lg, color: C.onSurface },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.sm },
  thumb: { width: 54, height: 54, borderRadius: R.sm },
  tag: { width: 34, height: 34, borderRadius: R.pill, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
});
