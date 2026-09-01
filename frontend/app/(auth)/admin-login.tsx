import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { StackHeader } from "@/src/components/header";
import { Button, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

export default function AdminLogin() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { loginWithTokens } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email.trim() || !password) { toast.show("Enter email and password", "error"); return; }
    setLoading(true);
    try {
      const res = await api.post<any>("/auth/admin/login",
        { email: email.trim(), password }, false);
      await loginWithTokens(res.access_token, res.refresh_token, res.user);
      router.replace("/(admin)");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title="Admin Login" />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }} bottomOffset={20} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}><Ionicons name="shield-checkmark" size={28} color={C.brandPrimary} /></View>
        <Txt weight="semibold" size={T["2xl"]} style={{ marginTop: S.lg }}>BiteGo Admin</Txt>
        <Txt color={C.muted} style={{ marginTop: S.xs, marginBottom: S.xl }}>Secure access to platform controls.</Txt>

        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.lbl}>EMAIL</Txt>
        <TextInput testID="admin-email" value={email} onChangeText={setEmail} placeholder="admin@bitego.app"
          placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" style={styles.input} />

        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.lbl}>PASSWORD</Txt>
        <TextInput testID="admin-password" value={password} onChangeText={setPassword} placeholder="••••••••"
          placeholderTextColor={C.muted} secureTextEntry style={styles.input} />

        <Button label="Log In" onPress={login} loading={loading} style={{ marginTop: S.xl }} testID="admin-login-button" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: R.md, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
  lbl: { marginBottom: S.sm, marginTop: S.md },
  input: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 54, fontFamily: F.medium, fontSize: T.lg, color: C.onSurface },
});
