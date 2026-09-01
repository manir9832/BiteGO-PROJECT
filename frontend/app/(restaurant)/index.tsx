import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Vibration, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Badge, Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { fmtDateTime, money, timeAgo } from "@/src/format";
import { C, ORDER_STATUS_LABELS, R, S, shadow, T } from "@/src/theme";

const TABS = [{ key: "new", label: "New" }, { key: "active", label: "Active" }, { key: "completed", label: "Completed" }];

function remaining(createdAt: string) {
  const ms = new Date(createdAt).getTime() + 10 * 60000 - Date.now();
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function RestaurantOrders() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState("new");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [alert, setAlert] = useState<any>(null);
  const ackRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);
  const player = useAudioPlayer(require("../../assets/sounds/alarm.mp3"));

  const startAlarm = () => {
    try { player.loop = true; player.seekTo(0); player.play(); } catch {}
    Vibration.vibrate([600, 600], true);
  };
  const stopAlarm = () => {
    try { player.pause(); } catch {}
    Vibration.cancel();
  };

  const check = useCallback(async () => {
    try {
      const me = await api.get("/restaurant/me");
      if (!me.registered) { router.replace("/(restaurant)/register"); return false; }
      return true;
    } catch { return false; }
    finally { setChecking(false); }
  }, []);

  const loadNew = useCallback(async () => {
    try {
      const r = await api.get("/restaurant/orders", { kind: "new" });
      const list = r.orders || [];
      // detect brand-new orders for the alarm
      const fresh = list.filter((o: any) => !ackRef.current.has(o.id));
      if (seededRef.current && fresh.length > 0 && !alert) {
        setAlert(fresh[0]);
        startAlarm();
      }
      if (!seededRef.current) { list.forEach((o: any) => ackRef.current.add(o.id)); seededRef.current = true; }
      return list;
    } catch { return []; }
  }, [alert]);

  const load = useCallback(async (kind: string) => {
    setLoading(true);
    try {
      if (kind === "new") { setOrders(await loadNew()); }
      else { const r = await api.get("/restaurant/orders", { kind }); setOrders(r.orders || []); }
    } finally { setLoading(false); }
  }, [loadNew]);

  useFocusEffect(useCallback(() => {
    (async () => { const ok = await check(); if (ok) load(tab); })();
  }, [check, load, tab]));

  // Poll for new orders (loud alert) regardless of active tab
  useEffect(() => {
    const t = setInterval(async () => {
      const list = await loadNew();
      if (tab === "new") setOrders(list);
    }, 6000);
    return () => clearInterval(t);
  }, [loadNew, tab]);

  useEffect(() => () => stopAlarm(), []);

  const act = async (id: string, action: string) => {
    try {
      await api.post(`/restaurant/orders/${id}/${action}`, {});
      toast.show(`Order ${action}`, "success");
      ackRef.current.add(id);
      if (alert?.id === id) { stopAlarm(); setAlert(null); }
      load(tab);
    } catch (e: any) { toast.show(e.message, "error"); }
  };

  const dismissAlert = () => { if (alert) ackRef.current.add(alert.id); stopAlarm(); setAlert(null); load("new"); };

  if (checking) return <View style={styles.root}><Loading /></View>;

  return (
    <View style={[styles.root, { paddingTop: insets.top + S.md }]}>
      <Txt weight="semibold" size={T["2xl"]} style={{ paddingHorizontal: S.lg }}>Orders</Txt>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]} testID={`rorders-tab-${t.key}`}>
            <Txt weight={tab === t.key ? "semibold" : "medium"} color={tab === t.key ? C.onBrandPrimary : C.onSurface} size={T.sm}>{t.label}</Txt>
          </Pressable>
        ))}
      </View>

      {loading ? <Loading /> : orders.length === 0 ? (
        <EmptyState icon="receipt-outline" title={`No ${tab} orders`} subtitle="New orders will appear here instantly." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.md }}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/(restaurant)/order/${item.id}`)} testID={`rorder-${item.id}`}>
              <View style={styles.cardTop}>
                <Txt weight="semibold">#{item.id.slice(-6).toUpperCase()}</Txt>
                <Badge label={ORDER_STATUS_LABELS[item.status]} />
              </View>
              <Txt size={T.sm} color={C.onSurfaceTertiary} numberOfLines={2} style={{ marginTop: S.xs }}>
                {item.items.map((i: any) => `${i.quantity}× ${i.name}`).join(", ")}
              </Txt>
              <View style={styles.cardBottom}>
                <Txt weight="semibold">{money(item.customer_total)}</Txt>
                {item.status === "PLACED" ? (
                  <View style={{ flexDirection: "row", gap: S.sm }}>
                    <Pressable style={styles.reject} onPress={() => act(item.id, "reject")} testID={`reject-${item.id}`}><Txt color={C.error} weight="semibold" size={T.sm}>Reject</Txt></Pressable>
                    <Pressable style={styles.accept} onPress={() => act(item.id, "accept")} testID={`accept-${item.id}`}><Txt color="#fff" weight="semibold" size={T.sm}>Accept</Txt></Pressable>
                  </View>
                ) : item.status === "ACCEPTED" ? (
                  <Pressable style={styles.accept} onPress={() => act(item.id, "preparing")}><Txt color="#fff" weight="semibold" size={T.sm}>Start Preparing</Txt></Pressable>
                ) : item.status === "PREPARING" ? (
                  <Pressable style={styles.accept} onPress={() => act(item.id, "ready")}><Txt color="#fff" weight="semibold" size={T.sm}>Mark Ready</Txt></Pressable>
                ) : <Txt size={T.sm} color={C.muted}>{timeAgo(item.created_at)}</Txt>}
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!alert} transparent animationType="fade" onRequestClose={dismissAlert}>
        <View style={styles.alertBackdrop}>
          <View style={styles.alertCard} testID="new-order-alert">
            <View style={styles.alertIcon}><Ionicons name="notifications" size={30} color={C.onBrandPrimary} /></View>
            <Txt weight="semibold" size={T["2xl"]} style={{ marginTop: S.md }}>New Order!</Txt>
            {alert && (
              <>
                <Txt color={C.muted} style={{ marginTop: 2 }}>#{alert.id.slice(-6).toUpperCase()} · {money(alert.customer_total)}</Txt>
                <Txt size={T.sm} color={C.onSurfaceTertiary} style={{ marginTop: S.sm, textAlign: "center" }}>
                  {alert.items.map((i: any) => `${i.quantity}× ${i.name}`).join(", ")}
                </Txt>
                <Txt weight="semibold" color={C.brandPrimary} style={{ marginTop: S.md }}>Accept within 10 minutes</Txt>
                <View style={styles.alertActions}>
                  <Button label="Reject" variant="ghost" onPress={() => act(alert.id, "reject")} style={{ flex: 1 }} testID="alert-reject" />
                  <Button label="Accept" onPress={() => act(alert.id, "accept")} style={{ flex: 1 }} testID="alert-accept" />
                </View>
                <Pressable onPress={dismissAlert} style={{ padding: S.sm, marginTop: S.xs }}><Txt color={C.muted} size={T.sm}>Silence & view later</Txt></Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  tabs: { flexDirection: "row", gap: S.sm, padding: S.lg },
  tab: { flex: 1, height: 40, borderRadius: R.pill, alignItems: "center", justifyContent: "center", backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
  card: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
  accept: { backgroundColor: C.brandPrimary, paddingHorizontal: S.lg, height: 38, borderRadius: R.md, alignItems: "center", justifyContent: "center" },
  reject: { backgroundColor: "#FBEBEA", paddingHorizontal: S.lg, height: 38, borderRadius: R.md, alignItems: "center", justifyContent: "center" },
  alertBackdrop: { flex: 1, backgroundColor: "rgba(28,25,23,0.7)", alignItems: "center", justifyContent: "center", padding: S.xl },
  alertCard: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, padding: S.xl, alignItems: "center", width: "100%", maxWidth: 380, ...shadow },
  alertIcon: { width: 64, height: 64, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
  alertActions: { flexDirection: "row", gap: S.md, marginTop: S.lg, alignSelf: "stretch" },
});
