import { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { RestaurantCard } from "@/src/components/cards";
import { StackHeader } from "@/src/components/header";
import { Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { C, S } from "@/src/theme";

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/favorites");
      setRows(r.restaurants || []);
      setFavIds(r.favorite_ids || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (r: any) => {
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    setFavIds((prev) => prev.filter((x) => x !== r.id));
    try { await api.post(`/favorites?kind=restaurant&ref_id=${r.id}`, {}); } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title="Favorites" />
      {loading ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon="heart-outline" title="No favorites yet"
          subtitle="Tap the heart on any restaurant to save it here."
          action={<Button label="Explore restaurants" onPress={() => router.replace("/(tabs)")} />} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.lg }}
          renderItem={({ item }) => (
            <RestaurantCard r={item} isFav={favIds.includes(item.id)} onToggleFav={() => toggle(item)}
              onPress={() => router.push(`/restaurant/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}
