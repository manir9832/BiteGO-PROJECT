// // import { useState } from "react";
// // import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
// // import { Image } from "expo-image";
// // import * as ImagePicker from "expo-image-picker";
// // import { Ionicons } from "@expo/vector-icons";

// // import { uploadImage } from "@/src/api";
// // import { useToast } from "@/src/context/toast";
// // import { C, R, S, T } from "@/src/theme";
// // import { Txt } from "./ui";

// // type Props = {
// //   value?: string | null;
// //   onChange: (url: string) => void;
// //   label?: string;
// //   variant?: "banner" | "logo" | "food";
// //   testID?: string;
// // };

// // const SIZES: Record<string, any> = {
// //   banner: { width: "100%", height: 150, borderRadius: R.md },
// //   logo: { width: 88, height: 88, borderRadius: R.pill },
// //   food: { width: "100%", height: 160, borderRadius: R.md },
// // };
// // const ASPECT: Record<string, [number, number]> = {
// //   banner: [16, 9], logo: [1, 1], food: [4, 3],
// // };

// // export function ImageUpload({ value, onChange, label, variant = "banner", testID }: Props) {
// //   const toast = useToast();
// //   const [busy, setBusy] = useState(false);

// //   const pick = async () => {
// //     // Contextual permission handling
// //     const cur = await ImagePicker.getMediaLibraryPermissionsAsync();
// //     let status = cur.status;
// //     if (status !== "granted") {
// //       const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
// //       status = req.status;
// //       if (status !== "granted") {
// //         if (!req.canAskAgain) {
// //           toast.show("Enable Photos access in Settings to upload", "error");
// //           Linking.openSettings();
// //         } else {
// //           toast.show("Photos permission is needed to upload", "error");
// //         }
// //         return;
// //       }
// //     }
// //     try {
// //       const res = await ImagePicker.launchImageLibraryAsync({
// //         mediaTypes: ["images"],
// //         allowsEditing: true,
// //         aspect: ASPECT[variant],
// //         quality: 0.7,
// //       });
// //       if (res.canceled || !res.assets?.[0]) return;
// //       const a = res.assets[0];
// //       setBusy(true);
// //       const name = a.fileName || `upload_${Date.now()}.jpg`;
// //       const type = a.mimeType || "image/jpeg";
// //       const url = await uploadImage(a.uri, name, type);
// //       onChange(url);
// //       toast.show("Image uploaded", "success");
// //     } catch (e: any) {
// //       toast.show(e.message || "Upload failed", "error");
// //     } finally {
// //       setBusy(false);
// //     }
// //   };

// //   const box = SIZES[variant];
// //   const hasImg = !!value;

// //   return (
// //     <View style={variant === "logo" ? styles.logoWrap : undefined}>
// //       {label ? <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={{ marginBottom: S.sm }}>{label}</Txt> : null}
// //       <Pressable onPress={pick} disabled={busy} style={[styles.box, box, !hasImg && styles.empty]} testID={testID}>
// //         {hasImg ? (
// //           <Image source={{ uri: value! }} style={[box, { position: "absolute" }]} contentFit="cover" transition={150} />
// //         ) : (
// //           <View style={styles.placeholder}>
// //             <Ionicons name={variant === "logo" ? "storefront-outline" : "image-outline"} size={variant === "logo" ? 26 : 30} color={C.muted} />
// //             {variant !== "logo" && <Txt size={T.sm} color={C.muted} style={{ marginTop: 4 }}>Tap to upload</Txt>}
// //           </View>
// //         )}
// //         {busy ? (
// //           <View style={[styles.overlay, box]}><ActivityIndicator color="#fff" /></View>
// //         ) : hasImg ? (
// //           <View style={styles.editBadge}><Ionicons name="camera" size={14} color="#fff" /></View>
// //         ) : null}
// //       </Pressable>
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   logoWrap: { alignItems: "flex-start" },
// //   box: { backgroundColor: C.surfaceTertiary, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
// //   empty: { borderStyle: "dashed", borderColor: C.borderStrong },
// //   placeholder: { alignItems: "center", justifyContent: "center" },
// //   overlay: { position: "absolute", backgroundColor: "rgba(28,25,23,0.4)", alignItems: "center", justifyContent: "center" },
// //   editBadge: { position: "absolute", right: 8, bottom: 8, width: 30, height: 30, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
// // });
























// import { useState } from "react";
// import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
// import { Image } from "expo-image";
// import * as ImagePicker from "expo-image-picker";
// import { Ionicons } from "@expo/vector-icons";

// import { uploadImage } from "@/src/api";
// import { useToast } from "@/src/context/toast";
// import { C, R, S, T } from "@/src/theme";
// import { Txt } from "./ui";

// type Props = {
//   value?: string | null;
//   onChange: (url: string) => void;
//   label?: string;
//   variant?: "banner" | "logo" | "food";
//   testID?: string;
// };

// const SIZES: Record<string, any> = {
//   banner: { width: "100%", height: 150, borderRadius: R.md },
//   logo: { width: 88, height: 88, borderRadius: R.pill },
//   food: { width: "100%", height: 160, borderRadius: R.md },
// };
// const ASPECT: Record<string, [number, number]> = {
//   banner: [16, 9], logo: [1, 1], food: [4, 3],
// };

// export function ImageUpload({ value, onChange, label, variant = "banner", testID }: Props) {
//   const toast = useToast();
//   const [busy, setBusy] = useState(false);

//   const pick = async () => {
//     const cur = await ImagePicker.getMediaLibraryPermissionsAsync();
//     let status = cur.status;
//     if (status !== "granted") {
//       const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       status = req.status;
//       if (status !== "granted") {
//         if (!req.canAskAgain) {
//           toast.show("Enable Photos access in Settings to upload", "error");
//           Linking.openSettings();
//         } else {
//           toast.show("Photos permission is needed to upload", "error");
//         }
//         return;
//       }
//     }
//     try {
//       const res = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ["images"],
//         allowsEditing: true,
//         aspect: ASPECT[variant],
//         quality: 0.7,
//       });
//       if (res.canceled || !res.assets?.[0]) return;
//       const a = res.assets[0];
//       setBusy(true);
//       const name = a.fileName || `upload_${Date.now()}.jpg`;
//       const type = a.mimeType || "image/jpeg";
      
//       const uploadRes: any = await uploadImage(a.uri, name, type);
//       const imageUrl = typeof uploadRes === "string" ? uploadRes : (uploadRes?.url || uploadRes?.data?.url);

//       if (!imageUrl) {
//         throw new Error("Failed to get image URL");
//       }

//       onChange(imageUrl);
//       toast.show("Image uploaded", "success");
//     } catch (e: any) {
//       toast.show(e.message || "Upload failed", "error");
//     } finally {
//       setBusy(false);
//     }
//   };

//   const box = SIZES[variant];
//   const hasImg = !!value && typeof value === "string";

//   return (
//     <View style={variant === "logo" ? styles.logoWrap : undefined}>
//       {label ? <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={{ marginBottom: S.sm }}>{label}</Txt> : null}
//       <Pressable onPress={pick} disabled={busy} style={[styles.box, box, !hasImg && styles.empty]} testID={testID}>
//         {hasImg ? (
//           <Image 
//             source={{ uri: value }} 
//             style={[box, { position: "absolute" }]} 
//             contentFit="cover" 
//             transition={150} 
//             cachePolicy="disk"
//           />
//         ) : (
//           <View style={styles.placeholder}>
//             <Ionicons name={variant === "logo" ? "storefront-outline" : "image-outline"} size={variant === "logo" ? 26 : 30} color={C.muted} />
//             {variant !== "logo" && <Txt size={T.sm} color={C.muted} style={{ marginTop: 4 }}>Tap to upload</Txt>}
//           </View>
//         )}
//         {busy ? (
//           <View style={[styles.overlay, box]}><ActivityIndicator color="#fff" /></View>
//         ) : hasImg ? (
//           <View style={styles.editBadge}><Ionicons name="camera" size={14} color="#fff" /></View>
//         ) : null}
//       </Pressable>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   logoWrap: { alignItems: "flex-start" },
//   box: { backgroundColor: C.surfaceTertiary, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
//   empty: { borderStyle: "dashed", borderColor: C.borderStrong },
//   placeholder: { alignItems: "center", justifyContent: "center" },
//   overlay: { position: "absolute", backgroundColor: "rgba(28,25,23,0.4)", alignItems: "center", justifyContent: "center" },
//   editBadge: { position: "absolute", right: 8, bottom: 8, width: 30, height: 30, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
// });





















import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { uploadImage } from "@/src/api";
import { useToast } from "@/src/context/toast";
import { C, R, S, T } from "@/src/theme";
import { Txt } from "./ui";

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  variant?: "banner" | "logo" | "food";
  testID?: string;
};

const SIZES: Record<string, any> = {
  banner: { width: "100%", height: 150, borderRadius: R.md },
  logo: { width: 88, height: 88, borderRadius: R.pill },
  food: { width: "100%", height: 160, borderRadius: R.md },
};

const ASPECT: Record<string, [number, number]> = {
  banner: [16, 9],
  logo: [1, 1],
  food: [4, 3],
};

export function ImageUpload({ value, onChange, label, variant = "banner", testID }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const pick = async () => {
    const cur = await ImagePicker.getMediaLibraryPermissionsAsync();
    let status = cur.status;

    if (status !== "granted") {
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
      status = req.status;
      if (status !== "granted") {
        if (!req.canAskAgain) {
          toast.show("Enable Photos access in Settings to upload", "error");
          Linking.openSettings();
        } else {
          toast.show("Photos permission is needed to upload", "error");
        }
        return;
      }
    }

    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        // ১. SDK compatibility fix
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: ASPECT[variant],
        quality: 0.7,
      });

      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];

      // ২. Instant local preview
      setPreviewUri(a.uri);
      setBusy(true);

      const name = a.fileName || `upload_${Date.now()}.jpg`;
      const type = a.mimeType || "image/jpeg";

      const uploadRes: any = await uploadImage(a.uri, name, type);
      const imageUrl = typeof uploadRes === "string" ? uploadRes : (uploadRes?.url || uploadRes?.data?.url);

      if (!imageUrl) {
        throw new Error("Failed to get image URL");
      }

      onChange(imageUrl);
      toast.show("Image uploaded", "success");
    } catch (e: any) {
      setPreviewUri(null); // Error হলে লোকাল প্রিভিউ রিমুভ হবে
      toast.show(e.message || "Upload failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const box = SIZES[variant];
  const displayUri = previewUri || value;
  const hasImg = !!displayUri && typeof displayUri === "string";

  return (
    <View style={variant === "logo" ? styles.logoWrap : undefined}>
      {label ? <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={{ marginBottom: S.sm }}>{label}</Txt> : null}
      
      <View style={{ position: "relative" }}>
        <Pressable onPress={pick} disabled={busy} style={[styles.box, box, !hasImg && styles.empty]} testID={testID}>
          {hasImg ? (
            <Image 
              source={{ uri: displayUri }} 
              style={[box, { position: "absolute" }]} 
              contentFit="cover" 
              transition={150} 
              cachePolicy="disk"
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name={variant === "logo" ? "storefront-outline" : "image-outline"} size={variant === "logo" ? 26 : 30} color={C.muted} />
              {variant !== "logo" && <Txt size={T.sm} color={C.muted} style={{ marginTop: 4 }}>Tap to upload</Txt>}
            </View>
          )}

          {busy && (
            <View style={[styles.overlay, box]}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </Pressable>

        {/* ৩. Edit Badge alignment fix for logo & banner */}
        {!busy && hasImg && (
          <Pressable onPress={pick} style={[styles.editBadge, variant === "logo" && styles.logoBadge]}>
            <Ionicons name="camera" size={14} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: "flex-start" },
  box: { backgroundColor: C.surfaceTertiary, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  empty: { borderStyle: "dashed", borderColor: C.borderStrong },
  placeholder: { alignItems: "center", justifyContent: "center" },
  overlay: { position: "absolute", backgroundColor: "rgba(28,25,23,0.4)", alignItems: "center", justifyContent: "center" },
  editBadge: { position: "absolute", right: 8, bottom: 8, width: 30, height: 30, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center", zIndex: 2 },
  logoBadge: { right: -2, bottom: -2 },
});