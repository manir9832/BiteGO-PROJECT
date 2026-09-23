import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import { api } from "@/src/api";
import { Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { money } from "@/src/format";
import { C, R, S, T } from "@/src/theme";

export default function RestaurantControl() {
  const { id, restaurantName } =
    useLocalSearchParams<{
      id: string;
      restaurantName?: string;
    }>();

  const toast = useToast();

  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFoods = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const r = await api.get(
        `/admin/restaurants/${id}/foods`
      );

      setFoods(r.foods || []);
    } catch (e: any) {
      toast.show(
        e.message || "Failed to load restaurant menu",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useFocusEffect(
    useCallback(() => {
      loadFoods();
    }, [loadFoods])
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <Loading />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Txt
            size={T["2xl"]}
            weight="semibold"
            numberOfLines={1}
          >
            {restaurantName || "Restaurant"}
          </Txt>

          <Txt
            size={T.sm}
            color={C.muted}
            style={{ marginTop: 4 }}
          >
            Admin Restaurant Control
          </Txt>
        </View>
      </View>

      {/* MENU SECTION */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Txt size={T.xl} weight="semibold">
              Menu
            </Txt>

            <Txt size={T.sm} color={C.muted}>
              Manage this restaurant's food items
            </Txt>
          </View>

          <Button
            label="Add Item"
            icon="add"
            onPress={() => {
              toast.show(
                "Add Item will be connected next",
                "success"
              );
            }}
            style={{
              height: 40,
              paddingHorizontal: S.md,
            }}
          />
        </View>
      </View>

      {foods.length === 0 ? (
        <EmptyState
          icon="fast-food-outline"
          title="No menu items"
          subtitle="This restaurant has no food items yet."
        />
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(item) =>
            item.id || item._id
          }
          contentContainerStyle={{
            padding: S.lg,
            paddingTop: 0,
            paddingBottom: S["3xl"],
            gap: S.md,
          }}
          renderItem={({ item }) => (
            <View style={styles.foodCard}>
              <View style={{ flex: 1 }}>
                <Txt
                  weight="semibold"
                  numberOfLines={1}
                >
                  {item.name}
                </Txt>

                <Txt
                  size={T.sm}
                  color={C.muted}
                  style={{ marginTop: 4 }}
                >
                  Base price: {money(item.price)}
                </Txt>

                <Txt
                  size={T.sm}
                  color={C.muted}
                  style={{ marginTop: 2 }}
                >
                  {item.category}
                </Txt>
              </View>

              <View style={styles.foodActions}>
                <Button
                  label="Edit"
                  variant="ghost"
                  onPress={() => {
                    toast.show(
                      "Edit will be connected next",
                      "success"
                    );
                  }}
                  style={styles.smallButton}
                />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
  },

  loading: {
    flex: 1,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    padding: S.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  section: {
    padding: S.lg,
    paddingBottom: S.md,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
  },

  foodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: S.lg,
  },

  foodActions: {
    alignItems: "center",
  },

  smallButton: {
    height: 38,
    paddingHorizontal: S.md,
  },
});