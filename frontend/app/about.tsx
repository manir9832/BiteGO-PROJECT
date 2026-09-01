import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackHeader } from "@/src/components/header";
import { Txt } from "@/src/components/ui";
import { C, R, S, T } from "@/src/theme";

const SECTIONS = [
  { h: "What is BiteGo?", p: "BiteGo is a food-delivery platform that connects hungry customers with nearby restaurants and reliable delivery partners. Order your favourite meals and have them delivered warm to your doorstep." },
  { h: "How BiteGo works", p: "Browse restaurants near your location, add dishes to your cart, choose a delivery address and place your order with Cash on Delivery. Track every step from kitchen to your door." },
  { h: "For customers", p: "Discover local restaurants, search dishes, save favourites, reorder in a tap and rate your experience after every delivery." },
  { h: "Restaurant partners", p: "Local restaurants join BiteGo to reach more customers, manage their menu and receive orders in real time." },
  { h: "Delivery partners", p: "Delivery partners accept nearby delivery requests, pick up from restaurants and deliver to customers, earning for every completed delivery." },
];

export default function About() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title="About BiteGo" />
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
        <View style={styles.logoWrap}>
          <View style={styles.logo}><Ionicons name="restaurant" size={28} color={C.onBrandPrimary} /></View>
          <Txt weight="semibold" size={T["2xl"]} style={{ marginTop: S.md }}>BiteGo</Txt>
          <Txt color={C.muted}>Great food, delivered warm.</Txt>
        </View>
        {SECTIONS.map((s) => (
          <View key={s.h} style={{ marginTop: S.xl }}>
            <Txt weight="semibold" size={T.lg}>{s.h}</Txt>
            <Txt color={C.onSurfaceTertiary} style={{ marginTop: S.xs, lineHeight: 22 }}>{s.p}</Txt>
          </View>
        ))}
        <Txt size={T.sm} color={C.muted} style={{ textAlign: "center", marginTop: S["2xl"] }}>Version 1.0.0</Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: "center", marginTop: S.md },
  logo: { width: 64, height: 64, borderRadius: R.lg, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
});
