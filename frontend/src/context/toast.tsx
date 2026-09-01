import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S, shadow, T } from "@/src/theme";

type ToastType = "success" | "error" | "info";
type ToastCtx = { show: (msg: string, type?: ToastType) => void };
const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);

  const show = (msg: string, type: ToastType = "info") => {
    setToast({ msg, type });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true })
        .start(() => setToast(null));
    }, 2600);
  };

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const icon = toast?.type === "success" ? "checkmark-circle"
    : toast?.type === "error" ? "alert-circle" : "information-circle";
  const color = toast?.type === "success" ? C.success
    : toast?.type === "error" ? C.error : C.info;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]} testID="app-toast">
          <View style={styles.toast}>
            <Ionicons name={icon as any} size={20} color={color} />
            <Text style={styles.text} numberOfLines={2}>{toast.msg}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 60, left: 0, right: 0, alignItems: "center", zIndex: 9999 },
  toast: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: C.surfaceSecondary, paddingVertical: S.md, paddingHorizontal: S.lg,
    borderRadius: R.md, maxWidth: "88%", borderWidth: 1, borderColor: C.border, ...shadow,
  },
  text: { flex: 1, color: C.onSurface, fontFamily: F.medium, fontSize: T.base },
});
