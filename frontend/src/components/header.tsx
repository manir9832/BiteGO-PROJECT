import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, S, T } from "@/src/theme";
import { Txt } from "./ui";

export function StackHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
      <Pressable onPress={() => router.back()} hitSlop={10} testID="header-back">
        <Ionicons name="chevron-back" size={24} color={C.onSurface} />
      </Pressable>
      <Txt weight="semibold" size={T.xl} style={{ flex: 1, marginLeft: S.md }} numberOfLines={1}>{title}</Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: S.lg, paddingBottom: S.md,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surfaceSecondary,
  },
});
