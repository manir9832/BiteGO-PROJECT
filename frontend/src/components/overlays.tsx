import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { C, F, R, S, shadow, T } from "@/src/theme";
import { money } from "@/src/format";
import { useCart } from "@/src/context/cart";
import { Button, Txt } from "./ui";

export function CartConflictModal() {
  const { pendingConflict, clearConflict, confirmReplace } = useCart();
  const visible = !!pendingConflict;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={clearConflict}>
      <Pressable style={styles.backdrop} onPress={clearConflict}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} testID="cart-conflict-modal">
          <View style={styles.warnIcon}><Ionicons name="cart" size={26} color={C.brandPrimary} /></View>
          <Txt weight="semibold" size={T.xl} style={{ marginTop: S.md, textAlign: "center" }}>Start a new cart?</Txt>
          <Txt color={C.muted} style={{ marginTop: S.sm, textAlign: "center" }}>
            Your cart contains items from another restaurant. Clear it and add items from this restaurant?
          </Txt>
          <Button label="Clear cart & add" onPress={confirmReplace} style={{ marginTop: S.xl, alignSelf: "stretch" }} testID="confirm-replace-cart" />
          <Pressable onPress={clearConflict} style={{ padding: S.md, marginTop: S.xs }} testID="cancel-replace-cart">
            <Txt weight="medium" color={C.muted}>Keep existing cart</Txt>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function FloatingCartBar({ bottom }: { bottom: number }) {
  const { count, subtotal, cart } = useCart();
  const router = useRouter();
  if (count === 0) return null;
  return (
    <Pressable
      onPress={() => router.push("/cart")}
      style={[styles.floatBar, { bottom }]} testID="floating-cart-bar">
      {cart.lines[0]?.image ? (
        <Image source={{ uri: cart.lines[0].image }} style={styles.floatImg} contentFit="cover" />
      ) : (
        <View style={[styles.floatImg, styles.floatIcon]}><Ionicons name="cart" size={18} color={C.onBrandPrimary} /></View>
      )}
      <View style={{ flex: 1 }}>
        <Txt weight="semibold" color="#fff" numberOfLines={1}>{count} item{count > 1 ? "s" : ""} · {money(subtotal)}</Txt>
        <Txt size={T.sm} color="#EDE7DE" numberOfLines={1}>{cart.restaurant_name}</Txt>
      </View>
      <Txt weight="semibold" color="#fff">View Cart</Txt>
      <Ionicons name="arrow-forward" size={18} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28,25,23,0.55)", alignItems: "center", justifyContent: "center", padding: S.xl },
  sheet: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, padding: S.xl, alignItems: "center", width: "100%", maxWidth: 380, ...shadow },
  warnIcon: { width: 60, height: 60, borderRadius: R.pill, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
  floatBar: { position: "absolute", left: S.lg, right: S.lg, flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceInverse, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: S.md, ...shadow },
  floatImg: { width: 40, height: 40, borderRadius: R.sm },
  floatIcon: { backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
});
