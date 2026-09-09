// import { useCallback, useState } from "react";
// import { FlatList, StyleSheet, View } from "react-native";
// import { useFocusEffect } from "expo-router";

// import { api } from "@/src/api";
// import { Badge, Button, EmptyState, Loading, Txt } from "@/src/components/ui";
// import { useToast } from "@/src/context/toast";
// import { C, R, S, T } from "@/src/theme";

// export default function AdminCustomers() {
//   const toast = useToast();
//   const [rows, setRows] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   const load = useCallback(async () => {
//     setLoading(true);
//     try { const r = await api.get("/admin/customers"); setRows(r.customers || []); }
//     catch {} finally { setLoading(false); }
//   }, []);
//   useFocusEffect(useCallback(() => { load(); }, [load]));

//   const toggle = async (id: string) => {
//     try { const r = await api.post(`/admin/customers/${id}/toggle`, {}); toast.show(r.active ? "Activated" : "Suspended", "success"); load(); }
//     catch (e: any) { toast.show(e.message, "error"); }
//   };

//   return (
//     <View style={{ flex: 1, backgroundColor: C.surface }}>
//       {loading ? <Loading /> : rows.length === 0 ? (
//         <EmptyState icon="people-outline" title="No customers yet" subtitle="Registered customers will appear here." />
//       ) : (
//         <FlatList
//           data={rows}
//           keyExtractor={(r) => r.id}
//           contentContainerStyle={{ padding: S.lg, paddingBottom: S["3xl"], gap: S.md }}
//           renderItem={({ item }) => (
//             <View style={styles.card} testID={`admin-customer-${item.id}`}>
//               <View style={{ flex: 1 }}>
//                 <Txt weight="semibold">{item.name || "Unnamed"}</Txt>
//                 <Txt size={T.sm} color={C.muted}>+91 {item.phone}</Txt>
//               </View>
//               <Badge label={item.active ? "ACTIVE" : "BLOCKED"} color={item.active ? "#E7F0E9" : "#FBEBEA"} textColor={item.active ? C.success : C.error} />
//               <Button label={item.active ? "Block" : "Unblock"} variant="ghost" onPress={() => toggle(item.id)} style={{ height: 40, paddingHorizontal: S.md, marginLeft: S.sm }} testID={`toggle-c-${item.id}`} />
//             </View>
//           )}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   card: { flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
// });





































import { useCallback, useState } from "react";
import { FlatList, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { api } from "@/src/api";
import { Badge, Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { useToast } from "@/src/context/toast";
import { C, R, S, T } from "@/src/theme";

export default function AdminCustomers() {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // সার্চ কুয়েরির জন্য স্টেট

  const load = useCallback(async () => {
    setLoading(true);
    try { 
      const r = await api.get("/admin/customers"); 
      setRows(r.customers || []); 
    }
    catch {} 
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (id: string) => {
    try { 
      const r = await api.post(`/admin/customers/${id}/toggle`, {}); 
      toast.show(r.active ? "Activated" : "Suspended", "success"); 
      load(); 
    }
    catch (e: any) { toast.show(e.message, "error"); }
  };

  // কাস্টমার নাম বা ফোন নম্বর দিয়ে ফিল্টার করার লজিক
  const filteredCustomers = rows.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    const name = String(item.name || "").toLowerCase();
    const phone = String(item.phone || "").toLowerCase();
    return name.includes(query) || phone.includes(query);
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, padding: S.lg }}>
      {/* সার্চ বার */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={C.muted} style={{ marginRight: S.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={C.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Ionicons 
            name="close-circle" 
            size={18} 
            color={C.muted} 
            onPress={() => setSearchQuery("")} 
          />
        )}
      </View>

      {loading ? (
        <Loading />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState 
          icon="people-outline" 
          title="No customers found" 
          subtitle={searchQuery ? "No matching results for your search." : "Registered customers will appear here."} 
        />
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingBottom: S["3xl"], gap: S.md }}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`admin-customer-${item.id}`}>
              <View style={{ flex: 1 }}>
                <Txt weight="semibold">{item.name || "Unnamed"}</Txt>
                <Txt size={T.sm} color={C.muted}>+91 {item.phone}</Txt>
              </View>
              <Badge 
                label={item.active ? "ACTIVE" : "BLOCKED"} 
                color={item.active ? "#E7F0E9" : "#FBEBEA"} 
                textColor={item.active ? C.success : C.error} 
              />
              <Button 
                label={item.active ? "Block" : "Unblock"} 
                variant="ghost" 
                onPress={() => toggle(item.id)} 
                style={{ height: 40, paddingHorizontal: S.md, marginLeft: S.sm }} 
                testID={`toggle-c-${item.id}`} 
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    marginBottom: S.md,
  },
  searchInput: {
    flex: 1,
    fontSize: T.sm,
    color: C.onSurface,
    paddingVertical: 2,
  },
  card: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: S.sm, 
    backgroundColor: C.surfaceSecondary, 
    borderRadius: R.md, 
    borderWidth: 1, 
    borderColor: C.border, 
    padding: S.lg 
  },
});