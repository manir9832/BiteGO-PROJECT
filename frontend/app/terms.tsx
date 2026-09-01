import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackHeader } from "@/src/components/header";
import { Txt } from "@/src/components/ui";
import { C, S, T } from "@/src/theme";

const SECTIONS = [
  { h: "1. Platform Usage", p: "BiteGo provides a platform connecting customers, restaurants and delivery partners. By using the app you agree to these terms." },
  { h: "2. Ordering", p: "Orders are subject to restaurant availability and operating hours. Prices and charges shown at checkout are final for that order." },
  { h: "3. Cash on Delivery", p: "Payment is collected in cash at the time of delivery. Please keep the exact amount ready where possible." },
  { h: "4. Cancellation", p: "You may cancel an order before the restaurant begins preparing it. Orders not accepted by a restaurant within the allowed time are cancelled automatically." },
  { h: "5. Restaurant Responsibilities", p: "Restaurants are responsible for food quality, accurate menus, pricing and hygiene." },
  { h: "6. Delivery Responsibilities", p: "Delivery partners are responsible for safe, timely pickup and delivery of orders." },
  { h: "7. Customer Responsibilities", p: "Customers must provide accurate addresses, be reachable for delivery and treat partners respectfully." },
];

export default function Terms() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title="Terms & Conditions" />
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
        <Txt color={C.muted} style={{ marginBottom: S.md }}>Please read these terms carefully before using BiteGo.</Txt>
        {SECTIONS.map((s) => (
          <View key={s.h} style={{ marginTop: S.lg }}>
            <Txt weight="semibold" size={T.lg}>{s.h}</Txt>
            <Txt color={C.onSurfaceTertiary} style={{ marginTop: S.xs, lineHeight: 22 }}>{s.p}</Txt>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
