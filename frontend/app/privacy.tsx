import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackHeader } from "@/src/components/header";
import { Txt } from "@/src/components/ui";
import { C, S, T } from "@/src/theme";

const SECTIONS = [
  { h: "1. Account Information", p: "We collect your name and mobile number to create and secure your BiteGo account. Your mobile number is verified via OTP." },
  { h: "2. Location", p: "With your permission we use your device location to show nearby restaurants, calculate delivery distance and enable accurate delivery. You can change or remove saved locations at any time." },
  { h: "3. Orders", p: "We store your order history, items, delivery address and payment method (Cash on Delivery) to process and deliver your orders." },
  { h: "4. Device Information", p: "We may collect basic device details to keep the service reliable and secure." },
  { h: "5. Notifications", p: "We send order updates and, with your consent, offers and announcements. You can manage notifications from your device settings." },
  { h: "6. Images", p: "Restaurant and food images shown in the app are provided by restaurant partners." },
  { h: "7. Third-Party Services", p: "We use trusted third-party services for SMS OTP, maps and image hosting. These providers process data only as needed to deliver their service." },
  { h: "8. Security", p: "We use industry-standard measures including encryption in transit, hashed credentials and access controls to protect your data." },
  { h: "9. Your Rights", p: "You may access, update or request deletion of your account data by contacting our support team." },
  { h: "10. Account Deletion & Contact", p: "To delete your account or raise a privacy request, contact BiteGo support at the helpline listed in the Help & Support section." },
];

export default function Privacy() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title="Privacy Policy" />
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
        <Txt color={C.muted} style={{ marginBottom: S.md }}>Your privacy matters to us. This policy explains what we collect and how we use it.</Txt>
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
