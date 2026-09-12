


import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Switch, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { money } from "@/src/format";
import { C, R, S, T } from "@/src/theme";

export default function RestaurantMenu() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const me = await api.get("/restaurant/me");
      const approved = me?.is_approved || me?.restaurant?.status === "approved";
      setIsApproved(approved);

      if (approved) {
        const r = await api.get("/restaurant/foods");
        setFoods(r.foods || []);
      }
    } catch (e: any) {
      toast.show(e.message || "Failed to load menu", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = async (f: any) => {
    const itemId = f.id || f._id;
    setFoods((p) => p.map((x) => (x.id === itemId || x._id === itemId) ? { ...x, available: !x.available } : x));
    try { 
      await api.put(`/restaurant/foods/${itemId}`, { ...f, available: !f.available }); 
    } catch (e: any) { 
      toast.show(e.message, "error"); 
      load(); 
    }
  };

  const del = async (f: any) => {
    const itemId = f.id || f._id;
    try { 
      await api.del(`/restaurant/foods/${itemId}`); 
      toast.show("Item removed", "success"); 
      load(); 
    } catch (e: any) { 
      toast.show(e.message, "error"); 
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, justifyContent: "center" }}>
        <Loading />
      </View>
    );
  }

  if (isApproved === false) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top + S.md, paddingHorizontal: S.lg, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="time-outline" size={72} color={C.brandPrimary} />
        <Txt weight="bold" size={T.xl} style={{ marginTop: 16, textAlign: "center" }}>
          Approval Pending
        </Txt>
        <Txt color={C.muted} style={{ textAlign: "center", marginTop: 8, lineHeight: 20 }}>
          Your restaurant account is currently waiting for admin approval. You can manage your menu once approved.
        </Txt>
        <Button label="Refresh Status" onPress={load} style={{ marginTop: 24, paddingHorizontal: S.xl }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top + S.md }}>
      <View style={styles.head}>
        <Txt weight="semibold" size={T["2xl"]}>Menu</Txt>
        <Button 
          label="Add Item" 
          icon="add" 
          onPress={() => router.push({ pathname: "/menu-edit", params: { t: Date.now() } })} 
          style={{ height: 42, paddingHorizontal: S.lg }} 
          testID="add-food-button" 
        />
      </View>

      {foods.length === 0 ? (
        <EmptyState 
          icon="fast-food-outline" 
          title="No menu items" 
          subtitle="Add your first dish to start receiving orders."
          action={<Button label="Add Item" icon="add" onPress={() => router.push({ pathname: "/menu-edit", params: { t: Date.now() } })} />} 
        />
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(f) => f.id || f._id}
          contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.md }}
          renderItem={({ item }) => {
            const itemId = item.id || item._id;
            return (
              <View style={styles.card} testID={`menu-item-${itemId}`}>
                {item.image ? (
                  <Image 
                    source={{ uri: item.image }} 
                    style={styles.img}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="disk"
                  />
                ) : (
                  <View style={[styles.img, styles.imgFallback]}>
                    <Ionicons name="fast-food" size={24} color={C.muted} />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Txt weight="semibold" numberOfLines={1}>{item.name}</Txt>
                  <Txt size={T.sm} color={C.muted}>{money(item.price)} · {item.category}</Txt>
                  
                  <View style={styles.actions}>
                    <Pressable 
                      onPress={() => router.push({ pathname: "/menu-edit", params: { id: itemId } })} 
                      testID={`edit-food-${itemId}`}
                    >
                      <Txt weight="semibold" color={C.brandPrimary} size={T.sm}>Edit</Txt>
                    </Pressable>
                    <Pressable 
                      onPress={() => del(item)} 
                      testID={`del-food-${itemId}`}
                    >
                      <Txt weight="semibold" color={C.error} size={T.sm}>Delete</Txt>
                    </Pressable>
                  </View>
                </View>

                <View style={{ alignItems: "center" }}>
                  <Switch 
                    value={item.available} 
                    onValueChange={() => toggle(item)} 
                    trackColor={{ true: C.brandPrimary }} 
                    testID={`avail-${itemId}`} 
                  />
                  <Txt size={T.sm} color={C.muted}>{item.available ? "On" : "Off"}</Txt>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, marginBottom: S.sm },
  card: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md },
  img: { width: 60, height: 60, borderRadius: R.sm, backgroundColor: C.surfaceTertiary },
  imgFallback: { alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: S.lg, marginTop: S.sm },
});






















