// import { useState } from "react";
// import { StyleSheet, TextInput, View } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useRouter } from "expo-router";
// import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import { Button, Card, Txt } from "@/src/components/ui";
// import { ImageUpload } from "@/src/components/image-upload";
// import { useLocation } from "@/src/context/location";
// import { useToast } from "@/src/context/toast";
// import { C, F, R, S, T } from "@/src/theme";

// const F_ = { input: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 52, fontFamily: F.medium, fontSize: T.base, color: C.onSurface } };

// export default function RestaurantRegister() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
//   const { loc, detect } = useLocation();
//   const [name, setName] = useState("");
//   const [address, setAddress] = useState("");
//   const [cats, setCats] = useState("Biryani, Chicken");
//   const [logo, setLogo] = useState("");
//   const [cover, setCover] = useState("");
//   const [open, setOpen] = useState("09:00");
//   const [close, setClose] = useState("22:00");
//   const [coords, setCoords] = useState({ lat: loc.lat, lng: loc.lng });
//   const [detecting, setDetecting] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const useCurrent = async () => {
//     setDetecting(true);
//     const l = await detect();
//     if (l) { setCoords({ lat: l.lat, lng: l.lng }); if (!address) setAddress(l.address); toast.show("Location set", "success"); }
//     else toast.show("Enable location permission", "error");
//     setDetecting(false);
//   };

//   const submit = async () => {
//     if (name.trim().length < 2 || address.trim().length < 4) { toast.show("Enter restaurant name and address", "error"); return; }
//     setSaving(true);
//     try {
//       await api.post("/restaurant/register", {
//         name: name.trim(), address: address.trim(), lat: coords.lat, lng: coords.lng,
//         categories: cats.split(",").map((c) => c.trim()).filter(Boolean),
//         image: cover || undefined, cover: cover || undefined,
//         logo: logo || undefined, open_time: open, close_time: close,
//       });
//       toast.show("Submitted! Awaiting admin approval.", "success");
//       router.replace("/(restaurant)");
//     } catch (e: any) { toast.show(e.message, "error"); }
//     finally { setSaving(false); }
//   };

//   return (
//     <View style={{ flex: 1, backgroundColor: C.surface }}>
//       <KeyboardAwareScrollView contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + S.xl }} bottomOffset={20} keyboardShouldPersistTaps="handled">
//         <View style={styles.icon}><Ionicons name="storefront" size={28} color={C.brandPrimary} /></View>
//         <Txt weight="semibold" size={T["2xl"]} style={{ marginTop: S.lg }}>Register your restaurant</Txt>
//         <Txt color={C.muted} style={{ marginTop: S.xs, marginBottom: S.lg }}>An admin will review and approve your restaurant.</Txt>

//         <Lbl t="RESTAURANT NAME" /><TextInput testID="rname" value={name} onChangeText={setName} placeholder="e.g. Spice Route" placeholderTextColor={C.muted} style={F_.input} />
//         <Lbl t="ADDRESS" /><TextInput testID="raddr" value={address} onChangeText={setAddress} placeholder="Full address" placeholderTextColor={C.muted} style={F_.input} />
//         <Lbl t="CATEGORIES (comma separated)" /><TextInput value={cats} onChangeText={setCats} placeholder="Biryani, Pizza" placeholderTextColor={C.muted} style={F_.input} />
//         <View style={{ marginTop: S.md }}>
//           <ImageUpload label="RESTAURANT BANNER" variant="banner" value={cover} onChange={setCover} testID="reg-banner" />
//         </View>
//         <View style={{ marginTop: S.md }}>
//           <ImageUpload label="LOGO" variant="logo" value={logo} onChange={setLogo} testID="reg-logo" />
//         </View>
//         <View style={{ flexDirection: "row", gap: S.md }}>
//           <View style={{ flex: 1 }}><Lbl t="OPENS" /><TextInput value={open} onChangeText={setOpen} style={F_.input} /></View>
//           <View style={{ flex: 1 }}><Lbl t="CLOSES" /><TextInput value={close} onChangeText={setClose} style={F_.input} /></View>
//         </View>

//         <Card style={styles.locCard}>
//           <Ionicons name="navigate-circle" size={22} color={C.brandPrimary} />
//           <View style={{ flex: 1 }}><Txt weight="medium" size={T.sm}>Restaurant location</Txt><Txt size={T.sm} color={C.muted}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</Txt></View>
//           <Button label={detecting ? "" : "Detect"} loading={detecting} onPress={useCurrent} variant="secondary" style={{ height: 40, paddingHorizontal: S.md }} testID="rdetect" />
//         </Card>

//         <Button label="Submit for Approval" onPress={submit} loading={saving} style={{ marginTop: S.xl }} testID="rsubmit" />
//       </KeyboardAwareScrollView>
//     </View>
//   );
// }
// const Lbl = ({ t }: { t: string }) => <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={{ marginBottom: S.sm, marginTop: S.md }}>{t}</Txt>;
// const styles = StyleSheet.create({
//   icon: { width: 56, height: 56, borderRadius: R.md, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
//   locCard: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, marginTop: S.lg },
// });
























import { useState, useEffect } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Button, Card, Txt } from "@/src/components/ui";
import { ImageUpload } from "@/src/components/image-upload";
import { useLocation } from "@/src/context/location";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

const F_ = { input: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 52, fontFamily: F.medium, fontSize: T.base, color: C.onSurface } };

export default function RestaurantRegister() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { loc, detect } = useLocation();
  
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [cats, setCats] = useState("Biryani, Chicken");
  const [logo, setLogo] = useState("");
  const [cover, setCover] = useState("");
  const [open, setOpen] = useState("09:00");
  const [close, setClose] = useState("22:00");
  
  // ১. লোকেশন সিঙ্ক বাগ ফিক্স (fallback zero দিয়ে অ্যাপ ক্র্যাশ আটকানো)
  const [coords, setCoords] = useState({ 
    lat: loc?.lat ?? 0, 
    lng: loc?.lng ?? 0 
  });
  
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Global Context থেকে লোকেশন আপডেট হলে localCoords সেটিং
  useEffect(() => {
    if (loc?.lat && loc?.lng) {
      setCoords({ lat: loc.lat, lng: loc.lng });
      if (!address && loc.address) {
        setAddress(loc.address);
      }
    }
  }, [loc]);

  const useCurrent = async () => {
    setDetecting(true);
    const l = await detect();
    if (l?.lat && l?.lng) { 
      setCoords({ lat: l.lat, lng: l.lng }); 
      if (l.address) setAddress(l.address); 
      toast.show("Location set", "success"); 
    } else {
      toast.show("Enable location permission", "error");
    }
    setDetecting(false);
  };

  const submit = async () => {
    if (name.trim().length < 2 || address.trim().length < 4) { 
      toast.show("Enter restaurant name and address", "error"); 
      return; 
    }

    if (!coords.lat || !coords.lng) {
      toast.show("Please set restaurant location", "error");
      return;
    }

    setSaving(true);
    try {
      // ২. Clean Payload পাঠানো (Empty String সরাতে undefined ব্যবহার)
      await api.post("/restaurant/register", {
        name: name.trim(), 
        address: address.trim(), 
        lat: Number(coords.lat), 
        lng: Number(coords.lng),
        categories: cats.split(",").map((c) => c.trim()).filter(Boolean),
        image: cover.trim() || undefined, 
        cover: cover.trim() || undefined,
        logo: logo.trim() || undefined, 
        open_time: open.trim() || "09:00", 
        close_time: close.trim() || "22:00",
      });
      
      toast.show("Submitted! Awaiting admin approval.", "success");
      router.replace("/(restaurant)");
    } catch (e: any) { 
      toast.show(e.message || "Registration failed", "error"); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <KeyboardAwareScrollView contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + S.xl }} bottomOffset={20} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}><Ionicons name="storefront" size={28} color={C.brandPrimary} /></View>
        <Txt weight="semibold" size={T["2xl"]} style={{ marginTop: S.lg }}>Register your restaurant</Txt>
        <Txt color={C.muted} style={{ marginTop: S.xs, marginBottom: S.lg }}>An admin will review and approve your restaurant.</Txt>

        <Lbl t="RESTAURANT NAME" />
        <TextInput testID="rname" value={name} onChangeText={setName} placeholder="e.g. Spice Route" placeholderTextColor={C.muted} style={F_.input} />
        
        <Lbl t="ADDRESS" />
        <TextInput testID="raddr" value={address} onChangeText={setAddress} placeholder="Full address" placeholderTextColor={C.muted} style={F_.input} />
        
        <Lbl t="CATEGORIES (comma separated)" />
        <TextInput value={cats} onChangeText={setCats} placeholder="Biryani, Pizza" placeholderTextColor={C.muted} style={F_.input} />
        
        <View style={{ marginTop: S.md }}>
          <ImageUpload label="RESTAURANT BANNER" variant="banner" value={cover} onChange={setCover} testID="reg-banner" />
        </View>
        
        <View style={{ marginTop: S.md }}>
          <ImageUpload label="LOGO" variant="logo" value={logo} onChange={setLogo} testID="reg-logo" />
        </View>
        
        <View style={{ flexDirection: "row", gap: S.md }}>
          <View style={{ flex: 1 }}><Lbl t="OPENS (HH:MM)" /><TextInput value={open} onChangeText={setOpen} placeholder="09:00" placeholderTextColor={C.muted} style={F_.input} /></View>
          <View style={{ flex: 1 }}><Lbl t="CLOSES (HH:MM)" /><TextInput value={close} onChangeText={setClose} placeholder="22:00" placeholderTextColor={C.muted} style={F_.input} /></View>
        </View>

        <Card style={styles.locCard}>
          <Ionicons name="navigate-circle" size={22} color={C.brandPrimary} />
          <View style={{ flex: 1 }}>
            <Txt weight="medium" size={T.sm}>Restaurant location</Txt>
            <Txt size={T.sm} color={C.muted}>
              {coords.lat ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Location not set"}
            </Txt>
          </View>
          <Button label={detecting ? "" : "Detect"} loading={detecting} onPress={useCurrent} variant="secondary" style={{ height: 40, paddingHorizontal: S.md }} testID="rdetect" />
        </Card>

        <Button label="Submit for Approval" onPress={submit} loading={saving} style={{ marginTop: S.xl }} testID="rsubmit" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const Lbl = ({ t }: { t: string }) => <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={{ marginBottom: S.sm, marginTop: S.md }}>{t}</Txt>;

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: R.md, backgroundColor: C.brandTertiary, alignItems: "center", justifyContent: "center" },
  locCard: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, marginTop: S.lg },
});