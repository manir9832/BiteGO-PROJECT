import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { C, F, R, S, T } from "@/src/theme";

type Item = { icon: any; label: string; route?: string; danger?: boolean; onPress?: () => void };

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Account", items: [
        { icon: "person-outline", label: "Edit Profile", route: "/edit-profile" },
        { icon: "location-outline", label: "Saved Addresses", route: "/addresses" },
        { icon: "heart-outline", label: "Favorites", route: "/favorites" },
        { icon: "notifications-outline", label: "Notifications", route: "/notifications" },
      ],
    },
    {
      title: "Support & Info", items: [
        { icon: "headset-outline", label: "Help & Support", route: "/support" },
        { icon: "information-circle-outline", label: "About BiteGo", route: "/about" },
        { icon: "shield-checkmark-outline", label: "Privacy Policy", route: "/privacy" },
        { icon: "document-text-outline", label: "Terms & Conditions", route: "/terms" },
      ],
    },
  ];

  return (
    <ScrollView style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + S.md, paddingBottom: insets.bottom + S.xl }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Txt weight="semibold" size={T["2xl"]} color={C.onBrandPrimary}>
            {(user?.name || "?").slice(0, 1).toUpperCase()}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt weight="semibold" size={T.xl} numberOfLines={1}>{user?.name || "BiteGo User"}</Txt>
          <Txt color={C.muted}>+91 {user?.phone}</Txt>
        </View>
      </View>

      {groups.map((g) => (
        <View key={g.title} style={{ marginTop: S.xl }}>
          <Txt weight="medium" size={T.sm} color={C.muted} style={{ marginLeft: S.xl, marginBottom: S.sm }}>
            {g.title.toUpperCase()}
          </Txt>
          <Card style={styles.group}>
            {g.items.map((it, i) => (
              <Pressable key={it.label}
                onPress={() => it.route && router.push(it.route as any)}
                style={[styles.row, i < g.items.length - 1 && styles.rowBorder]}
                testID={`profile-${it.label.replace(/\s+/g, "-").toLowerCase()}`}>
                <View style={styles.rowIcon}><Ionicons name={it.icon} size={20} color={C.brandPrimary} /></View>
                <Txt weight="medium" style={{ flex: 1 }}>{it.label}</Txt>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}

      <Card style={[styles.group, { marginTop: S.xl }]}>
        <Pressable style={styles.row} onPress={logout} testID="logout-button">
          <View style={[styles.rowIcon, { backgroundColor: "#FBEBEA" }]}><Ionicons name="log-out-outline" size={20} color={C.error} /></View>
          <Txt weight="medium" color={C.error} style={{ flex: 1 }}>Log Out</Txt>
        </Pressable>
      </Card>

      <Txt size={T.sm} color={C.muted} style={{ textAlign: "center", marginTop: S.xl }}>BiteGo · v1.0.0</Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  head: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.xl, marginTop: S.md },
  avatar: { width: 64, height: 64, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
  group: { marginHorizontal: S.lg, padding: 0, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  rowIcon: { width: 38, height: 38, borderRadius: R.sm, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
});
