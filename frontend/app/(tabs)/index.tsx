import { useCallback, useState } from "react";
import {
  FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { CategoryChip, RestaurantCard } from "@/src/components/cards";
import { FloatingCartBar } from "@/src/components/overlays";
import { Button, EmptyState, ErrorState, Loading, Txt } from "@/src/components/ui";
import { useLocation } from "@/src/context/location";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { loc, available, areaName } = useLocation();

  const [cats, setCats] = useState<any[]>([]);
  const [rests, setRests] = useState<any[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [unread, setUnread] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (category?: string | null) => {
    setError(false);
    try {
      const [c, r, f, n] = await Promise.all([
        api.get("/categories"),
        api.get("/restaurants", { lat: loc.lat, lng: loc.lng, category: category || undefined }),
        api.get("/favorites").catch(() => ({ favorite_ids: [] })),
        api.get("/notifications", { limit: 1 }).catch(() => ({ unread: 0 })),
      ]);
      setCats(c.categories || []);
      setRests(r.restaurants || []);
      setFavIds(f.favorite_ids || []);
      setUnread(n.unread || 0);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [loc.lat, loc.lng]);

  useFocusEffect(useCallback(() => { load(active); }, [load, active]));

  const onRefresh = async () => { setRefreshing(true); await load(active); setRefreshing(false); };

  const selectCat = (name: string | null) => { setActive(name); setLoading(true); load(name); };

  const toggleFav = async (r: any) => {
    setFavIds((prev) => prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id]);
    try { await api.post(`/favorites?kind=restaurant&ref_id=${r.id}`, {}); } catch {}
  };

  const header = (
    <View style={[styles.headerWrap, { paddingTop: insets.top + S.sm }]}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.headerRow}>
        <Pressable style={styles.locBtn} onPress={() => router.push("/select-location")} testID="home-location">
          <Ionicons name="location" size={18} color={C.brandPrimary} />
          <View style={{ maxWidth: 220 }}>
            <Txt size={T.sm} color={C.muted}>Deliver to</Txt>
            <Txt weight="semibold" numberOfLines={1}>{areaName || loc.address}</Txt>
          </View>
          <Ionicons name="chevron-down" size={16} color={C.onSurface} />
        </Pressable>
        <Pressable style={styles.bell} onPress={() => router.push("/notifications")} testID="home-notifications">
          <Ionicons name="notifications-outline" size={22} color={C.onSurface} />
          {unread > 0 && <View style={styles.dot} />}
        </Pressable>
      </View>
      <Pressable style={styles.search} onPress={() => router.push("/(tabs)/search")} testID="home-search-bar">
        <Ionicons name="search" size={18} color={C.muted} />
        <Txt color={C.muted}>Search restaurants or dishes</Txt>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}>
        <CategoryChip label="All" active={active === null} onPress={() => selectCat(null)} />
        {cats.map((c) => (
          <CategoryChip key={c.id} label={c.name} image={c.image}
            active={active === c.name} onPress={() => selectCat(c.name)} />
        ))}
      </ScrollView>
    </View>
  );

  const HEADER_H = insets.top + 190;

  const renderBody = () => {
    if (available === false) {
      return (
        <EmptyState icon="sad-outline"
          title="BiteGo isn't here yet"
          subtitle={`Sorry, BiteGo is currently not available in your location. Try changing your delivery location.`}
          action={<Button label="Change location" icon="location" onPress={() => router.push("/select-location")} />}
          testID="area-unavailable" />
      );
    }
    if (loading) return <Loading label="Finding great food near you" />;
    if (error) return <ErrorState onRetry={() => { setLoading(true); load(active); }} />;
    if (rests.length === 0) {
      return (
        <EmptyState image="https://images.unsplash.com/photo-1567934124115-2eca8953796b?w=400"
          title="No restaurants nearby"
          subtitle="We couldn't find open restaurants around you right now. Pull down to refresh." />
      );
    }
    return (
      <FlatList
        data={rests}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingTop: HEADER_H + S.md, paddingHorizontal: S.lg, paddingBottom: 110, gap: S.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brandPrimary} progressViewOffset={HEADER_H} />}
        ListHeaderComponent={
          <View style={{ marginBottom: S.xs }}>
            <Txt weight="semibold" size={T.xl}>Restaurants near you</Txt>
            <Txt size={T.sm} color={C.muted}>{rests.length} places delivering now</Txt>
          </View>
        }
        renderItem={({ item }) => (
          <RestaurantCard r={item} isFav={favIds.includes(item.id)}
            onToggleFav={() => toggleFav(item)}
            onPress={() => router.push(`/restaurant/${item.id}`)} />
        )}
      />
    );
  };

  return (
    <View style={styles.root}>
      {(available === false || loading || error || rests.length === 0) ? (
        <View style={{ flex: 1, paddingTop: HEADER_H }}>{renderBody()}</View>
      ) : renderBody()}
      {header}
      <FloatingCartBar bottom={S.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  headerWrap: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "rgba(253,251,247,0.75)", borderBottomWidth: 1, borderBottomColor: C.border, overflow: "hidden", paddingBottom: S.sm },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg },
  locBtn: { flexDirection: "row", alignItems: "center", gap: S.sm, flex: 1 },
  bell: { width: 42, height: 42, borderRadius: R.pill, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: C.brandPrimary },
  search: { flexDirection: "row", alignItems: "center", gap: S.sm, marginHorizontal: S.lg, marginTop: S.md, height: 46, borderRadius: R.md, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.lg },
  chipRow: { gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.md },
});
