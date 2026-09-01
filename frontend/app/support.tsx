// import { useState } from "react";
// import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { StackHeader } from "@/src/components/header";
// import { Button, Card, Txt } from "@/src/components/ui";
// import { C, R, S, T } from "@/src/theme";

// const HELPLINE = "9832413545";

// const FAQ = [
//   { q: "How do I place an order?", a: "Choose a restaurant, add items to your cart, pick a delivery address and place your order with Cash on Delivery." },
//   { q: "How is the delivery charge calculated?", a: "Delivery charge depends on the distance between the restaurant and your delivery address. The exact amount is shown at checkout." },
//   { q: "Can I cancel my order?", a: "Yes, you can cancel before the restaurant starts preparing your food from the order tracking screen." },
//   { q: "What payment methods are supported?", a: "Currently BiteGo supports Cash on Delivery (COD)." },
//   { q: "How do I track my order?", a: "Open the order from the Orders tab to see a live status timeline from placement to delivery." },
// ];

// export default function Support() {
//   const insets = useSafeAreaInsets();
//   const [open, setOpen] = useState<number | null>(0);

//   return (
//     <View style={{ flex: 1, backgroundColor: C.surface }}>
//       <StackHeader title="Help & Support" />
//       <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
//         <Card style={styles.helpCard}>
//           <View style={styles.helpIcon}><Ionicons name="call" size={24} color={C.onBrandPrimary} /></View>
//           <Txt weight="semibold" size={T.lg} style={{ marginTop: S.md }}>BiteGo Helpline</Txt>
//           <Txt color={C.muted} style={{ marginTop: 2 }}>We're here to help with any order</Txt>
//           <Txt weight="semibold" size={T["2xl"]} color={C.brandPrimary} style={{ marginTop: S.sm }}>{HELPLINE}</Txt>
//           <Button label="Call Helpline" icon="call" onPress={() => Linking.openURL(`tel:${HELPLINE}`)}
//             style={{ marginTop: S.lg, alignSelf: "stretch" }} testID="call-helpline" />
//         </Card>

//         <Txt weight="semibold" size={T.lg} style={{ marginTop: S.xl, marginBottom: S.sm }}>Frequently Asked Questions</Txt>
//         {FAQ.map((f, i) => (
//           <Pressable key={i} style={styles.faq} onPress={() => setOpen(open === i ? null : i)} testID={`faq-${i}`}>
//             <View style={styles.faqRow}>
//               <Txt weight="medium" style={{ flex: 1 }}>{f.q}</Txt>
//               <Ionicons name={open === i ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
//             </View>
//             {open === i && <Txt size={T.sm} color={C.onSurfaceTertiary} style={{ marginTop: S.sm, lineHeight: 20 }}>{f.a}</Txt>}
//           </Pressable>
//         ))}
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   helpCard: { alignItems: "center", padding: S.xl },
//   helpIcon: { width: 56, height: 56, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
//   faq: { backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.sm },
//   faqRow: { flexDirection: "row", alignItems: "center" },
// });

















import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { StackHeader } from "@/src/components/header";
import { Button, Card, Txt } from "@/src/components/ui";
import { C, R, S, T } from "@/src/theme";

const FAQ = [
  { q: "How do I place an order?", a: "Choose a restaurant, add items to your cart, pick a delivery address and place your order with Cash on Delivery." },
  { q: "How is the delivery charge calculated?", a: "Delivery charge depends on the distance between the restaurant and your delivery address. The exact amount is shown at checkout." },
  { q: "Can I cancel my order?", a: "Yes, you can cancel before the restaurant starts preparing your food from the order tracking screen." },
  { q: "What payment methods are supported?", a: "Currently BiteGo supports Cash on Delivery (COD)." },
  { q: "How do I track my order?", a: "Open the order from the Orders tab to see a live status timeline from placement to delivery." },
];

export default function Support() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(0);
  const [helpline, setHelpline] = useState("9832413545"); // ডিফল্ট ফলব্যাক নম্বর

  // পেজে প্রবেশ করার সাথে সাথেই ব্যাকএন্ড থেকে লেটেস্ট হেল্পলাইন নম্বর ফেচ করবে
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await api.get("/public/settings");
          if (res && res.helpline) {
            setHelpline(res.helpline);
          }
        } catch (e) {
          console.log("Failed to load helpline number", e);
        }
      })();
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title="Help & Support" />
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }}>
        <Card style={styles.helpCard}>
          <View style={styles.helpIcon}><Ionicons name="call" size={24} color={C.onBrandPrimary} /></View>
          <Txt weight="semibold" size={T.lg} style={{ marginTop: S.md }}>BiteGo Helpline</Txt>
          <Txt color={C.muted} style={{ marginTop: 2 }}>We're here to help with any order</Txt>
          
          {/* এখানে অ্যাডমিন প্যানেল থেকে চেঞ্জ করা রিয়েল-টাইম নম্বরটি দেখাবে */}
          <Txt weight="semibold" size={T["2xl"]} color={C.brandPrimary} style={{ marginTop: S.sm }}>{helpline}</Txt>
          
          <Button label="Call Helpline" icon="call" onPress={() => Linking.openURL(`tel:${helpline}`)}
            style={{ marginTop: S.lg, alignSelf: "stretch" }} testID="call-helpline" />
        </Card>

        <Txt weight="semibold" size={T.lg} style={{ marginTop: S.xl, marginBottom: S.sm }}>Frequently Asked Questions</Txt>
        {FAQ.map((f, i) => (
          <Pressable key={i} style={styles.faq} onPress={() => setOpen(open === i ? null : i)} testID={`faq-${i}`}>
            <View style={styles.faqRow}>
              <Txt weight="medium" style={{ flex: 1 }}>{f.q}</Txt>
              <Ionicons name={open === i ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
            </View>
            {open === i && <Txt size={T.sm} color={C.onSurfaceTertiary} style={{ marginTop: S.sm, lineHeight: 20 }}>{f.a}</Txt>}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  helpCard: { alignItems: "center", padding: S.xl },
  helpIcon: { width: 56, height: 56, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
  faq: { backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.sm },
  faqRow: { flexDirection: "row", alignItems: "center" },
});