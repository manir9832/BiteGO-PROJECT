import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { StackHeader } from "@/src/components/header";
import { Button, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (name.trim().length < 2) { toast.show("Enter your name", "error"); return; }
    setSaving(true);
    try {
      await api.put("/customers/profile", { name: name.trim(), email: email.trim() || undefined });
      await refreshUser();
      toast.show("Profile updated", "success");
      router.back();
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title="Edit Profile" />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }} bottomOffset={20} keyboardShouldPersistTaps="handled">
        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.lbl}>FULL NAME</Txt>
        <TextInput testID="edit-name" value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={C.muted} style={styles.input} />

        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.lbl}>EMAIL (OPTIONAL)</Txt>
        <TextInput testID="edit-email" value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={C.muted} keyboardType="email-address" autoCapitalize="none" style={styles.input} />

        <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={styles.lbl}>MOBILE NUMBER</Txt>
        <View style={[styles.input, styles.disabled]}>
          <Txt color={C.muted}>+91 {user?.phone}</Txt>
        </View>

        <Button label="Save Changes" onPress={save} loading={saving} style={{ marginTop: S.xl }} testID="save-changes-button" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  lbl: { marginBottom: S.sm, marginTop: S.md },
  input: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 54, fontFamily: F.medium, fontSize: T.lg, color: C.onSurface, justifyContent: "center" },
  disabled: { backgroundColor: C.surfaceTertiary },
});
