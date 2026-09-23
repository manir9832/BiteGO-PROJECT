import { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { StackHeader } from "@/src/components/header";
import { Button, Txt } from "@/src/components/ui";
import { ImageUpload } from "@/src/components/image-upload";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

const inp = {
  backgroundColor: C.surfaceSecondary,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: R.md,
  paddingHorizontal: S.lg,
  height: 52,
  fontFamily: F.medium,
  fontSize: T.base,
  color: C.onSurface,
} as const;

export default function RestaurantControlEdit() {
  const {
    id,
    restaurantId,
    restaurantName,
  } = useLocalSearchParams<{
    id?: string;
    restaurantId: string;
    restaurantName?: string;
  }>();

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] =
    useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState<any>("");
  const [veg, setVeg] = useState(true);
  const [available, setAvailable] =
    useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id || !restaurantId) {
        setName("");
        setDesc("");
        setPrice("");
        setDiscountPrice("");
        setCategory("");
        setImage("");
        setVeg(true);
        setAvailable(true);
        return;
      }

      (async () => {
        try {
          setLoading(true);

          const r = await api.get(
            `/admin/restaurants/${restaurantId}/foods`
          );

          const f = (r.foods || []).find(
            (x: any) =>
              x.id === id ||
              x._id === id
          );

          if (f) {
            setName(f.name || "");
            setDesc(f.description || "");
            setPrice(
              String(f.price ?? "")
            );
            setDiscountPrice(
              f.discount_price !== null &&
                f.discount_price !== undefined
                ? String(f.discount_price)
                : ""
            );
            setCategory(f.category || "");
            setImage(f.image || "");
            setVeg(
              f.veg === undefined
                ? true
                : !!f.veg
            );
            setAvailable(
              f.available === undefined
                ? true
                : !!f.available
            );
          }
        } catch (e: any) {
          toast.show(
            e.message ||
              "Failed to load food item",
            "error"
          );
        } finally {
          setLoading(false);
        }
      })();
    }, [id, restaurantId, toast])
  );

  const save = async () => {
    const p = parseInt(price, 10);

    const dp = discountPrice.trim()
      ? parseInt(discountPrice, 10)
      : null;

    if (
      name.trim().length < 2 ||
      !category.trim() ||
      isNaN(p) ||
      p < 0
    ) {
      toast.show(
        "Fill name, price and category",
        "error"
      );
      return;
    }

    if (
      dp !== null &&
      (isNaN(dp) || dp < 0)
    ) {
      toast.show(
        "Invalid discount price",
        "error"
      );
      return;
    }

    if (
      dp !== null &&
      dp >= p
    ) {
      toast.show(
        "Discount price must be less than regular price",
        "error"
      );
      return;
    }

    if (!restaurantId) {
      toast.show(
        "Restaurant not selected",
        "error"
      );
      return;
    }

    setSaving(true);

    let finalImage = "";

    if (typeof image === "string") {
      finalImage = image.trim();
    } else if (
      image &&
      typeof image === "object"
    ) {
      finalImage =
        image.uri ||
        image.url ||
        image.path ||
        "";
    }

    const body = {
      name: name.trim(),
      description: desc.trim(),
      price: p,
      discount_price: dp,
      category: category.trim(),
      image: finalImage || undefined,
      veg,
      available,
    };

    try {
      if (id) {
        await api.put(
          `/admin/restaurants/${restaurantId}/foods/${id}`,
          body
        );
      } else {
        await api.post(
          `/admin/restaurants/${restaurantId}/foods`,
          body
        );
      }

      toast.show(
        "Item saved",
        "success"
      );

      router.back();
    } catch (e: any) {
      toast.show(
        e.message ||
          "Failed to save item",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Txt>Loading...</Txt>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.surface,
      }}
    >
      <StackHeader
        title={
          id ? "Edit Item" : "Add Item"
        }
      />

      <KeyboardAwareScrollView
        contentContainerStyle={{
          padding: S.lg,
          paddingBottom:
            insets.bottom + S.xl,
        }}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        {restaurantName ? (
          <View style={styles.restaurantBox}>
            <Ionicons
              name="storefront-outline"
              size={20}
              color={C.brandPrimary}
            />

            <View style={{ flex: 1 }}>
              <Txt
                size={T.sm}
                color={C.muted}
              >
                Restaurant
              </Txt>

              <Txt
                weight="semibold"
                numberOfLines={1}
              >
                {restaurantName}
              </Txt>
            </View>
          </View>
        ) : null}

        <L t="NAME" />

        <TextInput
          testID="admin-food-name"
          value={name}
          onChangeText={setName}
          placeholder="Dish name"
          placeholderTextColor={C.muted}
          style={inp}
        />

        <L t="DESCRIPTION" />

        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder="Short description"
          placeholderTextColor={C.muted}
          style={inp}
        />

        <View
          style={{
            flexDirection: "row",
            gap: S.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <L t="PRICE (₹)" />

            <TextInput
              testID="admin-food-price"
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={C.muted}
              style={inp}
            />
          </View>

          <View style={{ flex: 1 }}>
            <L t="CATEGORY" />

            <TextInput
              testID="admin-food-category"
              value={category}
              onChangeText={setCategory}
              placeholder="Biryani"
              placeholderTextColor={C.muted}
              style={inp}
            />
          </View>
        </View>

        <L t="DISCOUNT PRICE (₹) - Optional" />

        <TextInput
          testID="admin-food-discount-price"
          value={discountPrice}
          onChangeText={setDiscountPrice}
          keyboardType="number-pad"
          placeholder="e.g. 70"
          placeholderTextColor={C.muted}
          style={inp}
        />

        <View
          style={{
            marginTop: S.md,
          }}
        >
          <ImageUpload
            key={id || "new-admin-item"}
            label="FOOD IMAGE"
            variant="food"
            value={image}
            onChange={setImage}
            testID="admin-food-image-upload"
          />
        </View>

        <Pressable
          style={styles.checkRow}
          onPress={() =>
            setVeg((v) => !v)
          }
        >
          <Ionicons
            name={
              veg
                ? "checkbox"
                : "square-outline"
            }
            size={22}
            color={
              veg
                ? C.brandPrimary
                : C.muted
            }
          />

          <Txt weight="medium">
            Vegetarian
          </Txt>
        </Pressable>

        <Pressable
          style={styles.checkRow}
          onPress={() =>
            setAvailable((v) => !v)
          }
        >
          <Ionicons
            name={
              available
                ? "checkbox"
                : "square-outline"
            }
            size={22}
            color={
              available
                ? C.brandPrimary
                : C.muted
            }
          />

          <Txt weight="medium">
            Available
          </Txt>
        </Pressable>

        <Button
          label="Save Item"
          onPress={save}
          loading={saving}
          style={{
            marginTop: S.xl,
          }}
          testID="admin-save-food"
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

const L = ({
  t,
}: {
  t: string;
}) => (
  <Txt
    weight="medium"
    size={T.sm}
    color={C.onSurfaceTertiary}
    style={{
      marginBottom: S.sm,
      marginTop: S.md,
    }}
  >
    {t}
  </Txt>
);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  restaurantBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    padding: S.md,
    borderRadius: R.md,
    backgroundColor: C.surfaceSecondary,
    borderWidth: 1,
    borderColor: C.border,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    marginTop: S.lg,
  },
});