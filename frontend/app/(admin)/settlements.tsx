


import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { api } from "@/src/api";
import { Card, Loading, Txt } from "@/src/components/ui";
import { money } from "@/src/format";
import { C, R, S, T } from "@/src/theme";

export default function AdminSettlements() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { 
      setLoading(true);
      const res = await api.get("/admin/settlements/detailed"); 
      setD(res.data || res); 
    } catch (error) {
      console.error(error);
    } finally { 
      setLoading(false); 
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // রেস্টুরেন্ট পেমেন্ট সেটেল বা পে করার ফাংশন
  const handleSettleRestaurant = async (restId: string) => {
    Alert.alert(
      "Confirm Settlement",
      "Are you sure you want to clear this restaurant's balance and reset to 0?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Proceed & Pay", 
          onPress: async () => {
            try {
              setActionLoading(restId);
              await api.post(`/admin/settlements/restaurant/${restId}/pay`);
              Alert.alert("Success", "Restaurant balance settled successfully!");
              load(); 
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to settle payment.");
            } finally {
              setActionLoading(null);
            }
          } 
        }
      ]
    );
  };

  // ডেলিভারি পার্টনার পেমেন্ট সেটেল বা পে করার ফাংশন
  const handleSettlePartner = async (partnerId: string) => {
    Alert.alert(
      "Confirm Settlement",
      "Are you sure you want to clear this delivery partner's balance and reset to 0?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Proceed & Pay", 
          onPress: async () => {
            try {
              setActionLoading(partnerId);
              await api.post(`/admin/settlements/partner/${partnerId}/pay`);
              Alert.alert("Success", "Delivery partner balance settled successfully!");
              load(); 
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to settle payment.");
            } finally {
              setActionLoading(null);
            }
          } 
        }
      ]
    );
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" }}><Loading /></View>;

  const restaurants = d?.restaurants || [];
  const partners = d?.partners || [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ padding: S.lg, paddingBottom: S["3xl"] }}>
      <Txt weight="semibold" size={T["2xl"]} style={{ marginBottom: S.md }}>Financial Settlements & Payouts</Txt>

      {/* Restaurant Section */}
      <View style={styles.secHead}>
        <Ionicons name="storefront" size={18} color={C.brandPrimary} />
        <Txt weight="semibold" size={T.lg}>Restaurants Settlement</Txt>
      </View>

      {restaurants.length === 0 ? (
        <Card style={styles.empty}><Txt color={C.muted}>No restaurant settlements found.</Txt></Card>
      ) : (
        restaurants.map((r: any) => (
          <Card key={r.id} style={styles.card} testID={`settle-rest-${r.id}`}>
            <View style={styles.top}>
              <Txt weight="semibold" style={{ flex: 1 }} size={T.md}>{r.name}</Txt>
              <Txt size={T.sm} color={C.muted}>{r.orders_count} orders</Txt>
            </View>

            {/* ব্যাকএন্ড থেকে আসা সমস্ত ডিটেইলড হিসাবের ফিল্ডসমূহ */}
            <Row l="Gross Sales" v={money(r.gross || 0)} />
            <Row l="Food Subtotal" v={money(r.food_subtotal || 0)} />
            <Row l="Platform Charge" v={money(r.platform_charge || 0)} />
            <Row l="Delivery Charge" v={money(r.delivery_charge || 0)} />
            <Row l="Commission" v={money(r.commission || 0)} />
            <Row l="Fixed Fee" v={money(r.fixed_fee || 0)} />

            <View style={styles.divider} />

            <Row l="Today's Earnings" v={money(r.daily_earnings || 0)} tint={C.success} />
            <Row l="Weekly Earnings" v={money(r.weekly_earnings || 0)} tint={C.info} />
            <Row l="Net Payable" v={money(r.net_payable || 0)} />
            <Row l="Paid" v={money(r.paid || 0)} />
            
            <View style={styles.divider} />
            
            <Row l="Remaining Due" v={money(r.remaining || 0)} tint={C.warning} bold />
            
            {/* Pay / Settle Button */}
            <TouchableOpacity
              style={[
                styles.payButton, 
                { backgroundColor: r.remaining > 0 ? C.brandPrimary : C.divider }
              ]}
              disabled={r.remaining <= 0 || actionLoading === r.id}
              onPress={() => handleSettleRestaurant(r.id)}
            >
              <Txt weight="semibold" color="#FFFFFF" size={T.sm}>
                {actionLoading === r.id ? "Processing..." : r.remaining > 0 ? "Pay / Settle Balance" : "Settled (৳0)"}
              </Txt>
            </TouchableOpacity>
          </Card>
        ))
      )}

      {/* Delivery Partner Section */}
      <View style={styles.secHead}>
        <Ionicons name="bicycle" size={18} color={C.brandPrimary} />
        <Txt weight="semibold" size={T.lg}>Delivery Partner Settlement</Txt>
      </View>

      {partners.length === 0 ? (
        <Card style={styles.empty}><Txt color={C.muted}>No delivery partner settlements found.</Txt></Card>
      ) : (
        partners.map((p: any) => (
          <Card key={p.id} style={styles.card} testID={`settle-partner-${p.id}`}>
            <View style={styles.top}>
              <Txt weight="semibold" style={{ flex: 1 }} size={T.md}>{p.name}</Txt>
              <Txt size={T.sm} color={C.muted}>{p.deliveries_count} deliveries</Txt>
            </View>

            {/* ডেলিভারি পার্টনারের হিসাবের ফিল্ডসমূহ */}
            <Row l="Total Deliveries Earning" v={money(p.delivery_earnings || 0)} />
            <Row l="Today's Earnings" v={money(p.daily_earnings || 0)} tint={C.success} />
            <Row l="Weekly Earnings" v={money(p.weekly_earnings || 0)} tint={C.info} />
            <Row l="Paid" v={money(p.paid || 0)} />
            
            <View style={styles.divider} />
            
            <Row l="Remaining Due" v={money(p.remaining || 0)} tint={C.warning} bold />
            
            {/* Pay / Settle Button */}
            <TouchableOpacity
              style={[
                styles.payButton, 
                { backgroundColor: p.remaining > 0 ? C.brandPrimary : C.divider }
              ]}
              disabled={p.remaining <= 0 || actionLoading === p.id}
              onPress={() => handleSettlePartner(p.id)}
            >
              <Txt weight="semibold" color="#FFFFFF" size={T.sm}>
                {actionLoading === p.id ? "Processing..." : p.remaining > 0 ? "Pay / Settle Balance" : "Settled (৳0)"}
              </Txt>
            </TouchableOpacity>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const Row = ({ l, v, bold, tint }: { l: string; v: string; bold?: boolean; tint?: string }) => (
  <View style={styles.row}>
    <Txt size={T.sm} color={C.onSurfaceTertiary}>{l}</Txt>
    <Txt size={T.sm} weight={bold ? "semibold" : "medium"} color={tint || C.onSurface}>{v}</Txt>
  </View>
);

const styles = StyleSheet.create({
  secHead: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.xl, marginBottom: S.sm },
  card: { padding: S.lg, marginBottom: S.md, gap: 4 },
  empty: { padding: S.lg, alignItems: "center" },
  top: { flexDirection: "row", alignItems: "center", marginBottom: S.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: S.sm },
  payButton: {
    marginTop: S.md,
    paddingVertical: S.sm,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
  },
});