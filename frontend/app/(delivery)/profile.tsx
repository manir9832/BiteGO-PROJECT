// import { useCallback, useState } from "react";
// import { Linking, ScrollView, StyleSheet, View } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import { Badge, Button, Card, Loading, Txt } from "@/src/components/ui";
// import { useAuth } from "@/src/context/auth";
// import { C, R, S, T } from "@/src/theme";

// const HELPLINE = "9832413545";
// const col: Record<string, any> = { approved: { bg: "#E7F0E9", fg: C.success }, pending: { bg: C.brandTertiary, fg: C.onBrandTertiary }, suspended: { bg: "#FBEBEA", fg: C.error }, rejected: { bg: "#FBEBEA", fg: C.error } };

// export default function DeliveryProfile() {
//   const insets = useSafeAreaInsets();
//   const { logout } = useAuth();
//   const [p, setP] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   const load = useCallback(async () => {
//     try { const r = await api.get("/delivery/me"); setP(r.partner); } catch {} finally { setLoading(false); }
//   }, []);
//   useFocusEffect(useCallback(() => { load(); }, [load]));

//   if (loading) return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;
//   const c = col[p?.status] || col.pending;

//   return (
//     <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ paddingTop: insets.top + S.md, padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
//       <View style={styles.head}>
//         <View style={styles.avatar}><Txt weight="semibold" size={T.xl} color={C.onBrandPrimary}>{(p?.name || "?").slice(0, 1).toUpperCase()}</Txt></View>
//         <View style={{ flex: 1 }}>
//           <Txt weight="semibold" size={T.xl}>{p?.name}</Txt>
//           <Txt color={C.muted}>+91 {p?.phone} · {p?.vehicle}</Txt>
//         </View>
//         <Badge label={(p?.status || "").toUpperCase()} color={c.bg} textColor={c.fg} />
//       </View>

//       <Card style={styles.row}><Ionicons name="power" size={20} color={p?.online ? C.success : C.muted} /><Txt style={{ flex: 1 }}>Status</Txt><Txt weight="medium" color={p?.online ? C.success : C.muted}>{p?.online ? "Online" : "Offline"}</Txt></Card>

//       <Txt weight="medium" size={T.sm} color={C.muted} style={{ marginTop: S.xl, marginBottom: S.sm }}>SUPPORT</Txt>
//       <Card style={styles.row}><Ionicons name="headset-outline" size={20} color={C.brandPrimary} /><Txt style={{ flex: 1 }}>BiteGo Helpline</Txt><Txt weight="medium" color={C.brandPrimary}>{HELPLINE}</Txt></Card>
//       <Button label="Call Support" icon="call" variant="secondary" onPress={() => Linking.openURL(`tel:${HELPLINE}`)} style={{ marginTop: S.md }} testID="delivery-call-support" />

//       <Button label="Log Out" variant="ghost" icon="log-out-outline" onPress={logout} style={{ marginTop: S.xl }} testID="delivery-logout" />
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   head: { flexDirection: "row", alignItems: "center", gap: S.md, marginBottom: S.lg },
//   avatar: { width: 56, height: 56, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
//   row: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg },
// });



















import { useCallback, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Badge, Button, Card, Loading, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { C, R, S, T } from "@/src/theme";

const col: Record<string, any> = { approved: { bg: "#E7F0E9", fg: C.success }, pending: { bg: C.brandTertiary, fg: C.onBrandTertiary }, suspended: { bg: "#FBEBEA", fg: C.error }, rejected: { bg: "#FBEBEA", fg: C.error } };

export default function DeliveryProfile() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [helpline, setHelpline] = useState("9832413545"); // ডিফল্ট ফলব্যাক নম্বর

  const load = useCallback(async () => {
    try { 
      // একসাথে পার্টনারের ডেটা এবং ব্যাকএন্ড থেকে লেটেস্ট হেল্পলাইন নম্বর ফেচ করবে
      const [resPartner, resSettings] = await Promise.all([
        api.get("/delivery/me"),
        api.get("/public/settings").catch(() => null)
      ]);
      
      setP(resPartner.partner);
      if (resSettings && resSettings.helpline) {
        setHelpline(resSettings.helpline);
      }
    } catch {} finally { 
      setLoading(false); 
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={{ flex: 1, backgroundColor: C.surface }}><Loading /></View>;
  const c = col[p?.status] || col.pending;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ paddingTop: insets.top + S.md, padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
      <View style={styles.head}>
        <View style={styles.avatar}><Txt weight="semibold" size={T.xl} color={C.onBrandPrimary}>{(p?.name || "?").slice(0, 1).toUpperCase()}</Txt></View>
        <View style={{ flex: 1 }}>
          <Txt weight="semibold" size={T.xl}>{p?.name}</Txt>
          <Txt color={C.muted}>+91 {p?.phone} · {p?.vehicle}</Txt>
        </View>
        <Badge label={(p?.status || "").toUpperCase()} color={c.bg} textColor={c.fg} />
      </View>

      <Card style={styles.row}><Ionicons name="power" size={20} color={p?.online ? C.success : C.muted} /><Txt style={{ flex: 1 }}>Status</Txt><Txt weight="medium" color={p?.online ? C.success : C.muted}>{p?.online ? "Online" : "Offline"}</Txt></Card>

      <Txt weight="medium" size={T.sm} color={C.muted} style={{ marginTop: S.xl, marginBottom: S.sm }}>SUPPORT</Txt>
      
      {/* এখানে অ্যাডমিন প্যানেল থেকে বদলানো রিয়েল-টাইম হেল্পলাইন নম্বরটি দেখাবে */}
      <Card style={styles.row}><Ionicons name="headset-outline" size={20} color={C.brandPrimary} /><Txt style={{ flex: 1 }}>BiteGo Helpline</Txt><Txt weight="medium" color={C.brandPrimary}>{helpline}</Txt></Card>
      
      <Button label="Call Support" icon="call" variant="secondary" onPress={() => Linking.openURL(`tel:${helpline}`)} style={{ marginTop: S.md }} testID="delivery-call-support" />

      <Button label="Log Out" variant="ghost" icon="log-out-outline" onPress={logout} style={{ marginTop: S.xl }} testID="delivery-logout" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: S.md, marginBottom: S.lg },
  avatar: { width: 56, height: 56, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg },
});