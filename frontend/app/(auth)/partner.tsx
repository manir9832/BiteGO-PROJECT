import { StyleSheet, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackHeader } from "@/src/components/header";
import { Txt } from "@/src/components/ui";
import { C, R, S, T } from "@/src/theme";

const OPTIONS = [
  { role: "restaurant", icon: "restaurant", title: "Restaurant Partner", sub: "Manage orders, menu & earnings", route: "/(auth)/login?role=restaurant" },
  { role: "delivery", icon: "bicycle", title: "Delivery Partner", sub: "Go online & accept deliveries", route: "/(auth)/login?role=delivery" },
  { role: "admin", icon: "shield-checkmark", title: "Admin", sub: "Platform control & settings (web)", route: "/(auth)/admin-login" },
];

export default function Partner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title="Partner " />
      <View style={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
        <Txt color={C.muted} style={{ marginBottom: S.md }}>Choose how you want to sign in to BiteGo.</Txt>
        {OPTIONS.map((o) => (
          <Pressable key={o.role} style={styles.card} onPress={() => router.push(o.route as any)} testID={`role-${o.role}`}>
            <View style={styles.icon}><Ionicons name={o.icon as any} size={24} color={C.brandPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Txt weight="semibold" size={T.lg}>{o.title}</Txt>
              <Txt size={T.sm} color={C.muted}>{o.sub}</Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.md },
  icon: { width: 48, height: 48, borderRadius: R.md, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
});
