import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import AppMap from "@/src/components/AppMap";
import { Button, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { fmtDateTime, money } from "@/src/format";
import { decodePolyline } from "@/src/utils/polyline";
import { C, F, ORDER_STATUS_LABELS, R, S, T, TRACK_STEPS } from "@/src/theme";

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [o, setO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const poll = useRef<any>(null);

  const load = useCallback(async () => {
    try { const r = await api.get(`/orders/${id}`); setO(r.order); }
    catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    load();
    poll.current = setInterval(load, 8000);
    return () => poll.current && clearInterval(poll.current);
  }, [load]);

  if (loading) return <View style={styles.root}><Loading /></View>;
  if (!o) return <View style={styles.root}><Loading label="Loading order" /></View>;

  const cancelled = o.status === "CANCELLED" || o.status === "REJECTED";
  const curIdx = TRACK_STEPS.indexOf(o.status);
  const timelineMap: Record<string, string> = {};
  (o.timeline || []).forEach((t: any) => { if (!timelineMap[t.status]) timelineMap[t.status] = t.at; });

  const cancel = async () => {
    try { const r = await api.post(`/orders/${id}/cancel`); setO(r.order); toast.show("Order cancelled", "success"); }
    catch (e: any) { toast.show(e.message, "error"); }
  };

  const submitReview = async () => {
    setSubmitting(true);
    try {
      await api.post(`/orders/${id}/review`, { restaurant_rating: stars, delivery_rating: stars, comment });
      toast.show("Thanks for your feedback!", "success");
      load();
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSubmitting(false); }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="order-back"><Ionicons name="chevron-back" size={24} color={C.onSurface} /></Pressable>
        <Txt weight="semibold" size={T.xl}>Order Details</Txt>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.statusHead}>
          <Txt weight="semibold" size={T["2xl"]}>{ORDER_STATUS_LABELS[o.status]}</Txt>
          <Txt color={C.muted} style={{ marginTop: 2 }}>{o.restaurant_name} · #{o.id.slice(-6).toUpperCase()}</Txt>
        </View>

        {!cancelled && o.restaurant_lat != null && o.address?.lat != null && (
          <View style={styles.mapCard} testID="order-map">
            <AppMap
              style={{ height: 220 }}
              markers={[
                { lat: o.restaurant_lat, lng: o.restaurant_lng, title: o.restaurant_name, color: C.brandPrimary },
                { lat: o.address.lat, lng: o.address.lng, title: "Delivery address", color: "red" },
                ...(o.partner_location ? [{ lat: o.partner_location.lat, lng: o.partner_location.lng, title: o.delivery_partner_name || "Partner", color: "green" as const }] : []),
              ]}
              polyline={decodePolyline(o.route_polyline)}
            />
          </View>
        )}

        {cancelled ? (
          <View style={styles.cancelBanner} testID="order-cancelled-banner">
            <Ionicons name="close-circle" size={22} color={C.error} />
            <Txt color={C.error} weight="medium" style={{ flex: 1 }}>{o.cancellation_reason || "This order was cancelled."}</Txt>
          </View>
        ) : (
          <View style={styles.timeline} testID="order-timeline">
            {TRACK_STEPS.map((step, i) => {
              const done = i <= curIdx;
              const isCur = i === curIdx;
              return (
                <View key={step} style={styles.tRow}>
                  <View style={styles.tLeft}>
                    <View style={[styles.tDot, done && styles.tDotDone, isCur && styles.tDotCur]}>
                      {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    {i < TRACK_STEPS.length - 1 && <View style={[styles.tLine, i < curIdx && styles.tLineDone]} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: S.lg }}>
                    <Txt weight={isCur ? "semibold" : "medium"} color={done ? C.onSurface : C.muted}>{ORDER_STATUS_LABELS[step]}</Txt>
                    {timelineMap[step] && <Txt size={T.sm} color={C.muted}>{fmtDateTime(timelineMap[step])}</Txt>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {o.delivery_partner_name && (
          <View style={styles.partner}>
            <View style={styles.partnerAvatar}><Ionicons name="bicycle" size={20} color={C.onBrandPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Txt size={T.sm} color={C.muted}>Delivery Partner</Txt>
              <Txt weight="semibold">{o.delivery_partner_name}</Txt>
            </View>
          </View>
        )}

        {["PLACED", "ACCEPTED"].includes(o.status) && (
          <Button label="Cancel Order" variant="ghost" onPress={cancel} style={{ marginTop: S.md }} testID="cancel-order-button" />
        )}

        {o.status === "DELIVERED" && !o.review_done && (
          <View style={styles.reviewCard}>
            <Txt weight="semibold" size={T.lg}>Rate your order</Txt>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => setStars(s)} testID={`star-${s}`}>
                  <Ionicons name={s <= stars ? "star" : "star-outline"} size={32} color={C.warning} />
                </Pressable>
              ))}
            </View>
            <TextInput value={comment} onChangeText={setComment} placeholder="Share your experience (optional)"
              placeholderTextColor={C.muted} style={styles.reviewInput} multiline testID="review-comment" />
            <Button label="Submit Review" onPress={submitReview} loading={submitting} style={{ marginTop: S.md }} testID="submit-review-button" />
          </View>
        )}

        <Txt weight="semibold" size={T.lg} style={{ marginTop: S.xl, marginBottom: S.sm }}>Invoice</Txt>
        <View style={styles.invoice}>
          <View style={styles.invHead}>
            <Txt weight="semibold" color={C.brandPrimary}>BiteGo</Txt>
            <Txt size={T.sm} color={C.muted}>{fmtDateTime(o.created_at)}</Txt>
          </View>
          {o.items.map((it: any, i: number) => (
            <View key={i} style={styles.invRow}>
              <Txt style={{ flex: 1 }} numberOfLines={1}>{it.quantity}× {it.name}</Txt>
              <Txt weight="medium">{money(it.price * it.quantity)}</Txt>
            </View>
          ))}
          <View style={styles.invDivider} />
          <InvRow label="Item Total" value={money(o.food_subtotal)} />
          <InvRow label="Platform Charge" value={money(o.platform_charge)} />
          <InvRow label="Delivery Charge" value={money(o.customer_delivery_charge)} />
          <View style={[styles.invRow, styles.invTotal]}>
            <Txt weight="semibold" size={T.lg}>Total ({o.payment_method})</Txt>
            <Txt weight="semibold" size={T.lg}>{money(o.customer_total)}</Txt>
          </View>
          <View style={styles.invAddr}>
            <Ionicons name="location-outline" size={16} color={C.muted} />
            <Txt size={T.sm} color={C.muted} style={{ flex: 1 }}>{o.address?.label} · {o.address?.line}</Txt>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InvRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.invRow}>
      <Txt color={C.onSurfaceTertiary}>{label}</Txt>
      <Txt weight="medium">{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surfaceSecondary },
  statusHead: { marginBottom: S.lg },
  mapCard: { borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: S.lg },
  cancelBanner: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: "#FBEBEA", borderRadius: R.md, padding: S.lg },
  timeline: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  tRow: { flexDirection: "row", gap: S.md },
  tLeft: { alignItems: "center", width: 24 },
  tDot: { width: 24, height: 24, borderRadius: R.pill, backgroundColor: C.surfaceTertiary, borderWidth: 1, borderColor: C.borderStrong, alignItems: "center", justifyContent: "center" },
  tDotDone: { backgroundColor: C.success, borderColor: C.success },
  tDotCur: { backgroundColor: C.brandPrimary, borderColor: C.brandPrimary },
  tLine: { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 2 },
  tLineDone: { backgroundColor: C.success },
  partner: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginTop: S.md },
  partnerAvatar: { width: 44, height: 44, borderRadius: R.pill, backgroundColor: C.brandPrimary, alignItems: "center", justifyContent: "center" },
  reviewCard: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, marginTop: S.lg },
  stars: { flexDirection: "row", gap: S.sm, marginVertical: S.md },
  reviewInput: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: S.md, minHeight: 70, textAlignVertical: "top", fontFamily: F.regular, fontSize: T.base, color: C.onSurface },
  invoice: { backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  invHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.md },
  invRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: S.xs },
  invDivider: { height: 1, backgroundColor: C.divider, marginVertical: S.sm },
  invTotal: { marginTop: S.sm, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
  invAddr: { flexDirection: "row", gap: S.sm, marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.divider },
});


















