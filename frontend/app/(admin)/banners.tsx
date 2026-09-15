import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { api } from "@/src/api";
import { Button, Card, Loading, Txt } from "@/src/components/ui";
import { C, R, S, T } from "@/src/theme";

type Banner = {
  _id: string;
  title?: string;
  image: string;
  order: number;
  active: boolean;
};

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("banner.jpg");

  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("0");
  const [active, setActive] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/admin/banners");
      setBanners(r?.banners || []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load banners");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // ================= IMAGE PICKER =================

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to select a banner."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 7],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    setSelectedImage(asset.uri);
    setSelectedImageName(
      asset.fileName || `banner-${Date.now()}.jpg`
    );
  };

  // ================= UPLOAD =================

  const uploadImage = async (uri: string) => {
    const formData = new FormData();

    formData.append("file", {
      uri,
      name: selectedImageName,
      type: "image/jpeg",
    } as any);

    const result = await api.post("/upload", formData);

    if (!result?.url) {
      throw new Error("Image upload failed");
    }

    return result.url;
  };

  // ================= RESET =================

  const resetForm = () => {
    setSelectedImage(null);
    setSelectedImageName("banner.jpg");
    setTitle("");
    setOrder("0");
    setActive(true);
    setEditingId(null);
  };

  // ================= SAVE =================

  const saveBanner = async () => {
    if (!selectedImage) {
      Alert.alert(
        "Banner image required",
        "Please select a banner image."
      );
      return;
    }

    setSaving(true);

    try {
      let imageUrl = selectedImage;

      // নতুন image হলে Cloudinary-তে upload
      if (selectedImage.startsWith("file://")) {
        imageUrl = await uploadImage(selectedImage);
      }

      const body = {
        title: title.trim(),
        image: imageUrl,
        order: Number(order) || 0,
        active,
      };

      if (editingId) {
        await api.put(
          `/admin/banners/${editingId}`,
          body
        );

        Alert.alert(
          "Success",
          "Banner updated successfully."
        );
      } else {
        await api.post(
          "/admin/banners",
          body
        );

        Alert.alert(
          "Success",
          "Banner added successfully."
        );
      }

      resetForm();
      await load();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.message || "Failed to save banner."
      );
    } finally {
      setSaving(false);
    }
  };

  // ================= EDIT =================

  const editBanner = (banner: Banner) => {
    setEditingId(banner._id);
    setTitle(banner.title || "");
    setOrder(String(banner.order ?? 0));
    setActive(banner.active);
    setSelectedImage(banner.image);
  };

  // ================= DELETE =================

  const deleteBanner = (banner: Banner) => {
    Alert.alert(
      "Delete Banner",
      "Are you sure you want to delete this banner?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(
                `/admin/banners/${banner._id}`
              );

              await load();
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.message || "Failed to delete banner."
              );
            }
          },
        },
      ]
    );
  };

  // ================= ACTIVE / INACTIVE =================

  const toggleActive = async (banner: Banner) => {
    try {
      await api.put(
        `/admin/banners/${banner._id}`,
        {
          title: banner.title || "",
          image: banner.image,
          order: banner.order,
          active: !banner.active,
        }
      );

      await load();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.message || "Failed to update banner."
      );
    }
  };

  // ================= LOADING =================

  if (loading) {
    return (
      <View style={styles.loading}>
        <Loading />
      </View>
    );
  }

  // ================= UI =================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View>
          <Txt
            weight="semibold"
            size={T["2xl"]}
          >
            Banners
          </Txt>

          <Txt
            size={T.sm}
            color={C.muted}
          >
            Manage Customer Home promotional banners
          </Txt>
        </View>

        {editingId && (
          <Button
            label="Cancel Edit"
            variant="ghost"
            onPress={resetForm}
          />
        )}
      </View>

      {/* ADD / EDIT */}

      <Card style={styles.formCard}>
        <Txt
          weight="semibold"
          size={T.lg}
        >
          {editingId ? "Edit Banner" : "Add Banner"}
        </Txt>

        {/* IMAGE */}

        <Pressable
          onPress={pickImage}
          style={styles.imagePicker}
        >
          {selectedImage ? (
            <Image
              source={{ uri: selectedImage }}
              style={styles.preview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.emptyImage}>
              <Ionicons
                name="cloud-upload-outline"
                size={38}
                color={C.muted}
              />

              <Txt
                size={T.sm}
                color={C.muted}
                style={{ marginTop: S.sm }}
              >
                Select Banner Image
              </Txt>

              <Txt
                size={T.xs}
                color={C.muted}
              >
                Recommended ratio 16:7
              </Txt>
            </View>
          )}
        </Pressable>

        <Button
          label="Choose Image"
          variant="ghost"
          onPress={pickImage}
        />

        {/* TITLE */}

        <View style={styles.field}>
          <Txt
            size={T.sm}
            color={C.muted}
          >
            Banner Title
          </Txt>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Example: Special Offer"
            placeholderTextColor={C.muted}
            style={styles.input}
          />
        </View>

        {/* ORDER */}

        <View style={styles.field}>
          <Txt
            size={T.sm}
            color={C.muted}
          >
            Display Order
          </Txt>

          <TextInput
            value={order}
            onChangeText={setOrder}
            placeholder="0"
            placeholderTextColor={C.muted}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>

        {/* ACTIVE */}

        <View style={styles.activeRow}>
          <View style={{ flex: 1 }}>
            <Txt weight="medium">
              Active
            </Txt>

            <Txt
              size={T.xs}
              color={C.muted}
            >
              Active banners will appear in Customer app
            </Txt>
          </View>

          <Switch
            value={active}
            onValueChange={setActive}
          />
        </View>

        {/* SAVE */}

        <Button
          label={
            saving
              ? "Saving..."
              : editingId
              ? "Update Banner"
              : "Add Banner"
          }
          onPress={saveBanner}
          loading={saving}
          disabled={saving}
          style={{ marginTop: S.md }}
        />
      </Card>

      {/* EXISTING */}

      <View style={styles.listHeader}>
        <Txt
          weight="semibold"
          size={T.lg}
        >
          Existing Banners
        </Txt>

        <Txt
          size={T.sm}
          color={C.muted}
        >
          {banners.length} banner
          {banners.length === 1 ? "" : "s"}
        </Txt>
      </View>

      {banners.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons
            name="images-outline"
            size={40}
            color={C.muted}
          />

          <Txt
            weight="medium"
            style={{ marginTop: S.sm }}
          >
            No banners yet
          </Txt>

          <Txt
            size={T.sm}
            color={C.muted}
          >
            Add your first promotional banner above.
          </Txt>
        </Card>
      ) : (
        banners.map((banner) => (
          <Card
            key={banner._id}
            style={styles.bannerCard}
          >
            <Image
              source={{ uri: banner.image }}
              style={styles.bannerImage}
              resizeMode="cover"
            />

            <View style={styles.bannerInfo}>
              <View style={{ flex: 1 }}>
                <Txt weight="semibold">
                  {banner.title || "Untitled Banner"}
                </Txt>

                <Txt
                  size={T.sm}
                  color={C.muted}
                >
                  Display order: {banner.order}
                </Txt>

                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          banner.active
                            ? C.success
                            : C.muted,
                      },
                    ]}
                  />

                  <Txt
                    size={T.xs}
                    color={
                      banner.active
                        ? C.success
                        : C.muted
                    }
                  >
                    {banner.active
                      ? "Active"
                      : "Inactive"}
                  </Txt>
                </View>
              </View>

              <Switch
                value={banner.active}
                onValueChange={() =>
                  toggleActive(banner)
                }
              />
            </View>

            <View style={styles.actions}>
              <Button
                label="Edit"
                variant="ghost"
                onPress={() =>
                  editBanner(banner)
                }
                style={{ flex: 1 }}
              />

              <Button
                label="Delete"
                variant="ghost"
                onPress={() =>
                  deleteBanner(banner)
                }
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  container: {
    flex: 1,
    backgroundColor: C.surface,
  },

  content: {
    padding: S.lg,
    paddingBottom: S["3xl"],
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.lg,
  },

  formCard: {
    padding: S.lg,
    gap: S.md,
  },

  imagePicker: {
    width: "100%",
    height: 190,
    borderRadius: R.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceSecondary,
  },

  preview: {
    width: "100%",
    height: "100%",
  },

  emptyImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  field: {
    gap: S.xs,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    paddingHorizontal: S.md,
    color: C.onSurface,
    backgroundColor: C.surface,
    fontFamily: F.regular,
    fontSize: T.base,
  },

  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: S.sm,
  },

  listHeader: {
    marginTop: S["2xl"],
    marginBottom: S.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  bannerCard: {
    padding: S.md,
    marginBottom: S.md,
  },

  bannerImage: {
    width: "100%",
    height: 150,
    borderRadius: R.sm,
    backgroundColor: C.surfaceSecondary,
  },

  bannerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: S.md,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
    marginTop: S.xs,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: R.pill,
  },

  actions: {
    flexDirection: "row",
    gap: S.sm,
    marginTop: S.md,
  },

  emptyCard: {
    padding: S["2xl"],
    alignItems: "center",
  },
});