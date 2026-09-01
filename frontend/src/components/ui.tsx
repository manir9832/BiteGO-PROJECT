import React from "react";
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S, shadow, T } from "@/src/theme";

export function Txt({ children, style, weight = "regular", size = T.base, color = C.onSurface, numberOfLines }:
  { children: React.ReactNode; style?: TextStyle | TextStyle[]; weight?: "regular" | "medium" | "semibold";
    size?: number; color?: string; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F[weight], fontSize: size, color }, style]}>
      {children}
    </Text>
  );
}

export function Button({ label, onPress, loading, disabled, variant = "primary", icon, style, testID }:
  { label: string; onPress: () => void; loading?: boolean; disabled?: boolean;
    variant?: "primary" | "secondary" | "ghost"; icon?: any; style?: ViewStyle; testID?: string }) {
  const bg = variant === "primary" ? C.brandPrimary : variant === "secondary" ? C.surfaceTertiary : "transparent";
  const fg = variant === "primary" ? C.onBrandPrimary : C.onSurface;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      disabled={isDisabled}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      style={({ pressed }) => [
        styles.btn, { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: C.borderStrong }, style,
      ]}>
      {loading ? <ActivityIndicator color={fg} />
        : (<View style={styles.btnRow}>
            {icon && <Ionicons name={icon} size={18} color={fg} />}
            <Text style={[styles.btnLabel, { color: fg }]}>{label}</Text>
          </View>)}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center} testID="loading-state">
      <ActivityIndicator color={C.brandPrimary} size="large" />
      {label && <Txt color={C.muted} style={{ marginTop: S.md }}>{label}</Txt>}
    </View>
  );
}

export function EmptyState({ icon = "fast-food-outline", title, subtitle, action, image, testID }:
  { icon?: any; title: string; subtitle?: string; action?: React.ReactNode; image?: string; testID?: string }) {
  return (
    <View style={styles.center} testID={testID || "empty-state"}>
      {image ? (
        <Image source={{ uri: image }} style={styles.emptyImg} contentFit="cover" transition={200} />
      ) : (
        <View style={styles.emptyIcon}><Ionicons name={icon} size={40} color={C.brandPrimary} /></View>
      )}
      <Txt weight="semibold" size={T.xl} style={{ marginTop: S.lg, textAlign: "center" }}>{title}</Txt>
      {subtitle && <Txt color={C.muted} style={{ marginTop: S.sm, textAlign: "center", maxWidth: 300 }}>{subtitle}</Txt>}
      {action && <View style={{ marginTop: S.lg }}>{action}</View>}
    </View>
  );
}

export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <View style={styles.center} testID="error-state">
      <View style={[styles.emptyIcon, { backgroundColor: "#FBEBEA" }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={C.error} />
      </View>
      <Txt weight="semibold" size={T.xl} style={{ marginTop: S.lg }}>Connection lost</Txt>
      <Txt color={C.muted} style={{ marginTop: S.sm, textAlign: "center" }}>
        {message || "We couldn't reach BiteGo. Check your connection."}
      </Txt>
      <Button label="Retry" onPress={onRetry} icon="refresh" style={{ marginTop: S.lg, paddingHorizontal: S.xl }} testID="retry-button" />
    </View>
  );
}

export function Stepper({ qty, onInc, onDec, testID }:
  { qty: number; onInc: () => void; onDec: () => void; testID?: string }) {
  return (
    <View style={styles.stepper} testID={testID}>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onDec(); }}
        hitSlop={8} style={styles.stepBtn} testID={`${testID}-dec`}>
        <Ionicons name="remove" size={18} color={C.brandPrimary} />
      </Pressable>
      <Text style={styles.stepQty}>{qty}</Text>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onInc(); }}
        hitSlop={8} style={styles.stepBtn} testID={`${testID}-inc`}>
        <Ionicons name="add" size={18} color={C.brandPrimary} />
      </Pressable>
    </View>
  );
}

export function Badge({ label, color = C.brandTertiary, textColor = C.onBrandTertiary }:
  { label: string; color?: string; textColor?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 52, borderRadius: R.md, alignItems: "center", justifyContent: "center", paddingHorizontal: S.lg },
  btnRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  btnLabel: { fontFamily: F.semibold, fontSize: T.lg },
  card: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, ...shadow },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: S.xl },
  emptyIcon: { width: 88, height: 88, borderRadius: R.pill, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
  emptyImg: { width: 140, height: 140, borderRadius: R.pill },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.borderStrong },
  stepBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  stepQty: { minWidth: 22, textAlign: "center", fontFamily: F.semibold, fontSize: T.base, color: C.onSurface },
  badge: { paddingHorizontal: S.sm, paddingVertical: 3, borderRadius: R.sm, alignSelf: "flex-start" },
  badgeText: { fontFamily: F.semibold, fontSize: T.sm - 1 },
});
