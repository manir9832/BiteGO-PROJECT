// import { useCallback, useState } from "react";
// import { ScrollView, StyleSheet, Switch, View } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import { Badge, Button, Card, Loading, Txt } from "@/src/components/ui";
// import { ImageUpload } from "@/src/components/image-upload";
// import { useAuth } from "@/src/context/auth";
// import { useToast } from "@/src/context/toast";
// import { C, R, S, T } from "@/src/theme";

// const statusColor: Record<string, any> = { approved: { bg: "#E7F0E9", fg: C.success }, pending: { bg: C.brandTertiary, fg: C.onBrandTertiary }, suspended: { bg: "#FBEBEA", fg: C.error }, rejected: { bg: "#FBEBEA", fg: C.error } };

// export default function RestaurantProfile() {
//   const insets = useSafeAreaInsets();
//   const toast = useToast();
//   const { logout } = useAuth();
//   const [r, setR] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   const load = useCallback(async () => {
//     try { const res = await api.get("/restaurant/me"); setR(res.restaurant); }
//     catch {} finally { setLoading(false); }
//   }, []);
//   useFocusEffect(useCallback(() => { load(); }, [load]));

//   const toggleOpen = async () => {
//     const next = !r.is_open;
//     setR((p: any) => ({ ...p, is_open: next }));
//     try { await api.put("/restaurant/profile", { is_open: next }); toast.show(next ? "You are now Open" : "You are now Closed", "success"); }
//     catch (e: any) { toast.show(e.message, "error"); load(); }
//   };

//   const saveMedia = async (patch: any) => {
//     try {
//       const res = await api.put("/restaurant/profile", patch);
//       setR(res.restaurant);
//       toast.show("Updated", "success");
//     } catch (e: any) { toast.show(e.message, "error"); }
//   };

//   if (loading) return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;
//   const col = statusColor[r?.status] || statusColor.pending;

//   return (
//     <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ paddingTop: insets.top + S.md, padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
//       <ImageUpload label="RESTAURANT BANNER" variant="banner" value={r?.cover || r?.image}
//         onChange={(url) => saveMedia({ cover: url, image: url })} testID="profile-banner" />
//       <View style={[styles.head, { marginTop: S.lg }]}>
//         <ImageUpload variant="logo" value={r?.logo}
//           onChange={(url) => saveMedia({ logo: url })} testID="profile-logo" />
//         <View style={{ flex: 1 }}>
//           <Txt weight="semibold" size={T.xl} numberOfLines={1}>{r?.name}</Txt>
//           <Txt color={C.muted}>+91 {r?.phone}</Txt>
//         </View>
//         <Badge label={(r?.status || "").toUpperCase()} color={col.bg} textColor={col.fg} />
//       </View>

//       {r?.status === "approved" && (
//         <Card style={styles.openCard}>
//           <View style={{ flex: 1 }}>
//             <Txt weight="semibold">Accepting Orders</Txt>
//             <Txt size={T.sm} color={C.muted}>Toggle to open or close your restaurant</Txt>
//           </View>
//           <Switch value={!!r?.is_open} onValueChange={toggleOpen} trackColor={{ true: C.brandPrimary }} testID="open-toggle" />
//         </Card>
//       )}
//       {r?.status === "pending" && (
//         <Card style={styles.info}><Ionicons name="time" size={20} color={C.warning} /><Txt style={{ flex: 1 }} color={C.onSurfaceTertiary}>Your restaurant is awaiting admin approval. You'll be able to receive orders once approved.</Txt></Card>
//       )}

//       <Card style={[styles.info, { marginTop: S.md }]}>
//         <Ionicons name="star" size={20} color={C.warning} />
//         <Txt style={{ flex: 1 }}>Rating {r?.rating > 0 ? `${r.rating} (${r.rating_count})` : "New"}</Txt>
//         <Txt color={C.muted} size={T.sm}>{r?.open_time}–{r?.close_time}</Txt>
//       </Card>
//       <Card style={[styles.info, { marginTop: S.md }]}>
//         <Ionicons name="location" size={20} color={C.brandPrimary} />
//         <Txt style={{ flex: 1 }} color={C.onSurfaceTertiary} numberOfLines={2}>{r?.address}</Txt>
//       </Card>

//       <Button label="Log Out" variant="ghost" icon="log-out-outline" onPress={logout} style={{ marginTop: S.xl }} testID="restaurant-logout" />
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   head: { flexDirection: "row", alignItems: "center", gap: S.md, marginBottom: S.lg },
//   avatar: { width: 56, height: 56, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
//   openCard: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg },
//   info: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg },
// });
























import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Badge, Button, Card, Loading, Txt } from "@/src/components/ui";
import { ImageUpload } from "@/src/components/image-upload";
import { useAuth } from "@/src/context/auth";
import { useToast } from "@/src/context/toast";
import { C, R, S, T } from "@/src/theme";

const statusColor: Record<string, any> = { approved: { bg: "#E7F0E9", fg: C.success }, pending: { bg: C.brandTertiary, fg: C.onBrandTertiary }, suspended: { bg: "#FBEBEA", fg: C.error }, rejected: { bg: "#FBEBEA", fg: C.error } };

export default function RestaurantProfile() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { logout } = useAuth();
  const [r, setR] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const res = await api.get("/restaurant/me"); setR(res.restaurant); }
    catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ইমেজ আপলোড থেকে আসা ডেটা সুরক্ষিতভাবে স্ট্রিং (URL) এ রূপান্তর করার ফাংশন
  const extractUrl = (val: any) => {
    if (typeof val === "object" && val !== null) {
      return val.url || val.path || "";
    } else if (typeof val === "string") {
      return val;
    }
    return "";
  };

  const toggleOpen = async () => {
    const next = !r.is_open;
    setR((p: any) => ({ ...p, is_open: next }));
    try { await api.put("/restaurant/profile", { is_open: next }); toast.show(next ? "You are now Open" : "You are now Closed", "success"); }
    catch (e: any) { toast.show(e.message, "error"); load(); }
  };

  const saveMedia = async (patch: any) => {
    try {
      const res = await api.put("/restaurant/profile", patch);
      setR(res.restaurant);
      toast.show("Updated", "success");
    } catch (e: any) { toast.show(e.message, "error"); }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;
  const col = statusColor[r?.status] || statusColor.pending;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ paddingTop: insets.top + S.md, padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
      <ImageUpload 
        label="RESTAURANT BANNER" 
        variant="banner" 
        value={r?.cover || r?.image}
        onChange={(val) => {
          const url = extractUrl(val);
          if (url) saveMedia({ cover: url, image: url });
        }} 
        testID="profile-banner" 
      />
      <View style={[styles.head, { marginTop: S.lg }]}>
        <ImageUpload 
          variant="logo" 
          value={r?.logo}
          onChange={(val) => {
            const url = extractUrl(val);
            if (url) saveMedia({ logo: url });
          }} 
          testID="profile-logo" 
        />
        <View style={{ flex: 1 }}>
          <Txt weight="semibold" size={T.xl} numberOfLines={1}>{r?.name}</Txt>
          <Txt color={C.muted}>+91 {r?.phone}</Txt>
        </View>
        <Badge label={(r?.status || "").toUpperCase()} color={col.bg} textColor={col.fg} />
      </View>

      {r?.status === "approved" && (
        <Card style={styles.openCard}>
          <View style={{ flex: 1 }}>
            <Txt weight="semibold">Accepting Orders</Txt>
            <Txt size={T.sm} color={C.muted}>Toggle to open or close your restaurant</Txt>
          </View>
          <Switch value={!!r?.is_open} onValueChange={toggleOpen} trackColor={{ true: C.brandPrimary }} testID="open-toggle" />
        </Card>
      )}
      {r?.status === "pending" && (
        <Card style={styles.info}><Ionicons name="time" size={20} color={C.warning} /><Txt style={{ flex: 1 }} color={C.onSurfaceTertiary}>Your restaurant is awaiting admin approval. You'll be able to receive orders once approved.</Txt></Card>
      )}

      <Card style={[styles.info, { marginTop: S.md }]}>
        <Ionicons name="star" size={20} color={C.warning} />
        <Txt style={{ flex: 1 }}>Rating {r?.rating > 0 ? `${r.rating} (${r.rating_count})` : "New"}</Txt>
        <Txt color={C.muted} size={T.sm}>{r?.open_time}–{r?.close_time}</Txt>
      </Card>
      <Card style={[styles.info, { marginTop: S.md }]}>
        <Ionicons name="location" size={20} color={C.brandPrimary} />
        <Txt style={{ flex: 1 }} color={C.onSurfaceTertiary} numberOfLines={2}>{r?.address}</Txt>
      </Card>

      <Button label="Log Out" variant="ghost" icon="log-out-outline" onPress={logout} style={{ marginTop: S.xl }} testID="restaurant-logout" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: S.md, marginBottom: S.lg },
  avatar: { width: 56, height: 56, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
  openCard: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg },
  info: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg },
});