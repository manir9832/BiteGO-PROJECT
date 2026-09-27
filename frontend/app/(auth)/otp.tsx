import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Button, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

const LEN = 6;

export default function Otp() {
  const { phone, role: roleParam } = useLocalSearchParams<{ phone: string; role?: string }>();
  const role = (roleParam as string) || "customer";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { loginWithTokens } = useAuth();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const routeAfter = (user: any) => {
    if (user.role === "restaurant") router.replace("/(restaurant)");
    else if (user.role === "delivery") router.replace("/(delivery)");
    else if (!user.name) router.replace("/(auth)/complete-profile");
    else router.replace("/(tabs)");
  };

  const verify = async (value: string) => {
    setLoading(true);
    try {
      const res = await api.post<any>("/auth/otp/verify",
        { phone, otp: value, role }, false);
      await loginWithTokens(res.access_token, res.refresh_token, res.user);
      routeAfter(res.user);
    } catch (e: any) {
      toast.show(e.message, "error");
      setCode("");
    } finally { setLoading(false); }
  };

  const resend = async () => {
    try {
      const res = await api.post<{ dev_otp?: string }>("/auth/otp/request",
        { phone, role }, false);
      if (res.dev_otp) toast.show(`Dev OTP: ${res.dev_otp}`, "info");
      setCooldown(60);
    } catch (e: any) { toast.show(e.message, "error"); }
  };

  const digits = code.padEnd(LEN, " ").split("").slice(0, LEN);

  return (
    <View style={[styles.root, { paddingTop: insets.top + S.md, paddingBottom: insets.bottom + S.lg }]}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} testID="otp-back">
        <Ionicons name="chevron-back" size={26} color={C.onSurface} />
      </Pressable>

      <View style={{ paddingHorizontal: S.xl, flex: 1 }}>
        <Txt weight="semibold" size={T["2xl"]} style={{ marginTop: S.lg }}>Verify your number</Txt>
        <Txt color={C.muted} style={{ marginTop: S.xs }}>Enter the 6-digit code sent to +91 {phone}</Txt>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow} testID="otp-boxes">
          {digits.map((d, i) => (
            <View key={i} style={[styles.otpBox, i === code.length && styles.otpBoxActive]}>
              <Txt weight="semibold" size={T["2xl"]}>{d.trim()}</Txt>
            </View>
          ))}
        </Pressable>

        <TextInput
          ref={inputRef}
          testID="otp-input"
          value={code}
          onChangeText={(t) => {
            const v = t.replace(/\D/g, "").slice(0, LEN);
            setCode(v);
            if (v.length === LEN) verify(v);
          }}
          keyboardType="number-pad"
          maxLength={LEN}
          style={styles.hiddenInput}
        />

        <Button label="Verify & Continue" onPress={() => verify(code)}
          loading={loading} disabled={code.length < LEN}
          style={{ marginTop: S.xl }} testID="verify-otp-button" />

        <View style={styles.resendRow}>
          {cooldown > 0 ? (
            <Txt color={C.muted}>Resend code in {cooldown}s</Txt>
          ) : (
            <Pressable onPress={resend} testID="resend-otp">
              <Txt weight="semibold" color={C.brandPrimary}>Resend OTP</Txt>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  back: { paddingHorizontal: S.lg },
  otpRow: { flexDirection: "row", gap: S.sm, marginTop: S["2xl"] },
  otpBox: { flex: 1, aspectRatio: 0.85, borderRadius: R.md, backgroundColor: C.surfaceSecondary, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  otpBoxActive: { borderColor: C.brandPrimary },
  hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },
  resendRow: { alignItems: "center", marginTop: S.xl },
});
