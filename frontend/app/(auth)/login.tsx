import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Button, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

const ROLE_META: Record<string, { title: string; sub: string }> = {
  customer: { title: "Log in or sign up", sub: "We'll send a one-time code to verify your number." },
  restaurant: { title: "Restaurant Partner", sub: "Log in to manage orders and your menu." },
  delivery: { title: "Delivery Partner", sub: "Log in to go online and accept deliveries." },
};

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role as string) || "customer";
  const meta = ROLE_META[role] || ROLE_META.customer;
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { toast.show("Enter a valid 10-digit mobile number", "error"); return; }
    setLoading(true);
    try {
      const res = await api.post<{ dev_otp?: string }>("/auth/otp/request",
        { phone: digits, role }, false);
      if (res.dev_otp) toast.show(`Dev OTP: ${res.dev_otp}`, "info");
      router.push({ pathname: "/(auth)/otp", params: { phone: digits, role } });
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image
          source={{ uri: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800" }}
          style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["rgba(28,25,23,0.2)", "rgba(28,25,23,0.95)"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.brandWrap, { paddingTop: insets.top + S.xl }]}>
          <View style={styles.logo}><Ionicons name="restaurant" size={26} color={C.onBrandPrimary} /></View>
          <Txt weight="semibold" size={T["3xl"]} color="#fff" style={{ marginTop: S.md }}>BiteGo</Txt>
          <Txt color="#EDE7DE" style={{ marginTop: S.xs }}>
            {role === "customer" ? "Great food, delivered warm." : `${meta.title}`}
          </Txt>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.sheet}
        contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xl }}
        bottomOffset={20} keyboardShouldPersistTaps="handled">
        <Txt weight="semibold" size={T["2xl"]}>{meta.title}</Txt>
        <Txt color={C.muted} style={{ marginTop: S.xs, marginBottom: S.xl }}>{meta.sub}</Txt>

        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={{ marginBottom: S.sm }}>MOBILE NUMBER</Txt>
        <View style={styles.inputRow}>
          <View style={styles.prefix}><Txt weight="medium">+91</Txt></View>
          <TextInput
            testID="phone-input"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
            placeholder="98765 43210"
            placeholderTextColor={C.muted}
            keyboardType="number-pad"
            style={styles.input}
            maxLength={10}
          />
        </View>

        <Button label="Send OTP" onPress={send} loading={loading} style={{ marginTop: S.xl }} testID="send-otp-button" />

        {role === "customer" ? (
          <Pressable onPress={() => router.push("/(auth)/partner")} style={styles.partnerLink} testID="partner-login-link">
            <Ionicons name="briefcase-outline" size={16} color={C.brandPrimary} />
            <Txt weight="semibold" color={C.brandPrimary} size={T.sm}>Partner  register/login</Txt>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.partnerLink} testID="customer-login-link">
            <Ionicons name="arrow-back" size={16} color={C.brandPrimary} />
            <Txt weight="semibold" color={C.brandPrimary} size={T.sm}>Back to customer register/login</Txt>
          </Pressable>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  hero: { height: 300 },
  brandWrap: { flex: 1, alignItems: "flex-start", justifyContent: "flex-end", padding: S.xl },
  logo: { width: 52, height: 52, borderRadius: R.md, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
  sheet: { flex: 1, marginTop: -24, backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg },
  inputRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  prefix: { height: 54, paddingHorizontal: S.md, borderRadius: R.md, backgroundColor: C.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, height: 54, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, fontFamily: F.medium, fontSize: T.xl, color: C.onSurface },
  partnerLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm, marginTop: S.xl },
});

