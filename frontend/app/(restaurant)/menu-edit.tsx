

// import { useCallback, useState } from "react";
// import { Pressable, StyleSheet, TextInput, View } from "react-native";
// import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";
// import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import { api } from "@/src/api";
// import { StackHeader } from "@/src/components/header";
// import { Button, Txt } from "@/src/components/ui";
// import { ImageUpload } from "@/src/components/image-upload";
// import { useToast } from "@/src/context/toast";
// import { C, F, R, S, T } from "@/src/theme";

// const inp = { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 52, fontFamily: F.medium, fontSize: T.base, color: C.onSurface } as const;

// export default function MenuEdit() {
//   const { id, t } = useLocalSearchParams<{ id: string; t?: string }>();
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const toast = useToast();
  
//   const [name, setName] = useState("");
//   const [desc, setDesc] = useState("");
//   const [price, setPrice] = useState("");
//   const [category, setCategory] = useState("");
//   const [image, setImage] = useState<any>("");
//   const [veg, setVeg] = useState(false);
//   const [saving, setSaving] = useState(false);

//   useFocusEffect(
//     useCallback(() => {
//       if (!id) {
//         setName("");
//         setDesc("");
//         setPrice("");
//         setCategory("");
//         setImage("");
//         setVeg(false);
//         return;
//       }

//       (async () => {
//         try {
//           const r = await api.get("/restaurant/foods");
//           const f = (r.foods || []).find((x: any) => (x.id === id || x._id === id));
//           if (f) { 
//             setName(f.name || ""); 
//             setDesc(f.description || ""); 
//             setPrice(String(f.price || "")); 
//             setCategory(f.category || ""); 
//             setImage(f.image || ""); 
//             setVeg(!!f.veg); 
//           }
//         } catch (e) {
//           console.log("Error fetching food item:", e);
//         }
//       })();
//     }, [id, t])
//   );

//   const handleImageChange = (val: any) => {
//     setImage(val);
//   };

//   const save = async () => {
//     const p = parseInt(price, 10);
//     if (name.trim().length < 2 || !category.trim() || isNaN(p) || p < 0) { 
//       toast.show("Fill name, price and category", "error"); 
//       return; 
//     }
    
//     setSaving(true);
    
//     // ইমেজের সঠিক স্ট্রিং বা অবজেক্ট এক্সট্রাক্ট করা
//     let finalImage = "";
//     if (typeof image === "string") {
//       finalImage = image.trim();
//     } else if (image && typeof image === "object") {
//       finalImage = image.uri || image.url || image.path || "";
//     }

//     // JSON বডি হিসেবে পাঠানো যাতে FormData রিলেটেড কোনো এরর না আসে
//     const body = { 
//       name: name.trim(), 
//       description: desc.trim(), 
//       price: p, 
//       category: category.trim(), 
//       image: finalImage ? finalImage : undefined, 
//       veg, 
//       available: true 
//     };

//     try {
//       if (id) {
//         await api.put(`/restaurant/foods/${id}`, body);
//       } else {
//         await api.post("/restaurant/foods", body);
//       }
//       toast.show("Item saved", "success");
//       router.back();
//     } catch (e: any) { 
//       toast.show(e.message || "Failed to save item", "error"); 
//     } finally { 
//       setSaving(false); 
//     }
//   };

//   return (
//     <View style={{ flex: 1, backgroundColor: C.surface }}>
//       <StackHeader title={id ? "Edit Item" : "Add Item"} />
//       <KeyboardAwareScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }} bottomOffset={20} keyboardShouldPersistTaps="handled">
        
//         <L t="NAME" />
//         <TextInput testID="food-name" value={name} onChangeText={setName} placeholder="Dish name" placeholderTextColor={C.muted} style={inp} />
        
//         <L t="DESCRIPTION" />
//         <TextInput value={desc} onChangeText={setDesc} placeholder="Short description" placeholderTextColor={C.muted} style={inp} />
        
//         <View style={{ flexDirection: "row", gap: S.md }}>
//           <View style={{ flex: 1 }}>
//             <L t="PRICE (₹)" />
//             <TextInput testID="food-price" value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="0" placeholderTextColor={C.muted} style={inp} />
//           </View>
//           <View style={{ flex: 1 }}>
//             <L t="CATEGORY" />
//             <TextInput testID="food-category" value={category} onChangeText={setCategory} placeholder="Biryani" placeholderTextColor={C.muted} style={inp} />
//           </View>
//         </View>
        
//         <View style={{ marginTop: S.md }}>
//           <ImageUpload 
//             key={id || t || "new-item"} 
//             label="FOOD IMAGE" 
//             variant="food" 
//             value={image} 
//             onChange={handleImageChange} 
//             testID="food-image-upload" 
//           />
//         </View>

//         <Pressable style={styles.vegRow} onPress={() => setVeg((v) => !v)} testID="food-veg">
//           <Ionicons name={veg ? "checkbox" : "square-outline"} size={22} color={veg ? C.brandPrimary : C.muted} />
//           <Txt weight="medium">Vegetarian</Txt>
//         </Pressable>

//         <Button label="Save Item" onPress={save} loading={saving} style={{ marginTop: S.xl }} testID="save-food-button" />
//       </KeyboardAwareScrollView>
//     </View>
//   );
// }

// const L = ({ t }: { t: string }) => <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={{ marginBottom: S.sm, marginTop: S.md }}>{t}</Txt>;
// const styles = StyleSheet.create({ vegRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.lg } });































import { useCallback, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { StackHeader } from "@/src/components/header";
import { Button, Txt } from "@/src/components/ui";
import { ImageUpload } from "@/src/components/image-upload";
import { useToast } from "@/src/context/toast";
import { C, F, R, S, T } from "@/src/theme";

const inp = { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 52, fontFamily: F.medium, fontSize: T.base, color: C.onSurface } as const;

export default function MenuEdit() {
  const { id, t } = useLocalSearchParams<{ id: string; t?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState<any>("");
  const [veg, setVeg] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setName("");
        setDesc("");
        setPrice("");
        setDiscountPrice("");
        setCategory("");
        setImage("");
        setVeg(false);
        return;
      }

      (async () => {
        try {
          const r = await api.get("/restaurant/foods");
          const f = (r.foods || []).find((x: any) => (x.id === id || x._id === id));
          if (f) { 
            setName(f.name || ""); 
            setDesc(f.description || ""); 
            setPrice(String(f.price || "")); 
            setDiscountPrice(f.discount_price !== null && f.discount_price !== undefined ? String(f.discount_price) : ""); 
            setCategory(f.category || ""); 
            setImage(f.image || ""); 
            setVeg(!!f.veg); 
          }
        } catch (e) {
          console.log("Error fetching food item:", e);
        }
      })();
    }, [id, t])
  );

  const handleImageChange = (val: any) => {
    setImage(val);
  };

  const save = async () => {
    const p = parseInt(price, 10);
    const dp = discountPrice.trim() ? parseInt(discountPrice, 10) : null;

    if (name.trim().length < 2 || !category.trim() || isNaN(p) || p < 0) { 
      toast.show("Fill name, price and category", "error"); 
      return; 
    }

    if (dp !== null && (isNaN(dp) || dp < 0)) {
      toast.show("Invalid discount price", "error");
      return;
    }

    if (dp !== null && dp >= p) {
      toast.show("Discount price must be less than regular price", "error");
      return;
    }
    
    setSaving(true);
    
    let finalImage = "";
    if (typeof image === "string") {
      finalImage = image.trim();
    } else if (image && typeof image === "object") {
      finalImage = image.uri || image.url || image.path || "";
    }

    const body = { 
      name: name.trim(), 
      description: desc.trim(), 
      price: p, 
      discount_price: dp,
      category: category.trim(), 
      image: finalImage ? finalImage : undefined, 
      veg, 
      available: true 
    };

    try {
      if (id) {
        await api.put(`/restaurant/foods/${id}`, body);
      } else {
        await api.post("/restaurant/foods", body);
      }
      toast.show("Item saved", "success");
      router.back();
    } catch (e: any) { 
      toast.show(e.message || "Failed to save item", "error"); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <StackHeader title={id ? "Edit Item" : "Add Item"} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl }} bottomOffset={20} keyboardShouldPersistTaps="handled">
        
        <L t="NAME" />
        <TextInput testID="food-name" value={name} onChangeText={setName} placeholder="Dish name" placeholderTextColor={C.muted} style={inp} />
        
        <L t="DESCRIPTION" />
        <TextInput value={desc} onChangeText={setDesc} placeholder="Short description" placeholderTextColor={C.muted} style={inp} />
        
        {/* দাম এবং ক্যাটাগরি পাশাপাশি সুন্দরভাবে সাজানো */}
        <View style={{ flexDirection: "row", gap: S.md }}>
          <View style={{ flex: 1 }}>
            <L t="PRICE (₹)" />
            <TextInput testID="food-price" value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="0" placeholderTextColor={C.muted} style={inp} />
          </View>
          <View style={{ flex: 1 }}>
            <L t="CATEGORY" />
            <TextInput testID="food-category" value={category} onChangeText={setCategory} placeholder="Biryani" placeholderTextColor={C.muted} style={inp} />
          </View>
        </View>

        {/* ডিসকাউন্ট প্রাইস অপশনাল ফিল্ড */}
        <L t="DISCOUNT PRICE (₹) - Optional" />
        <TextInput testID="food-discount-price" value={discountPrice} onChangeText={setDiscountPrice} keyboardType="number-pad" placeholder="e.g. 70" placeholderTextColor={C.muted} style={inp} />
        
        <View style={{ marginTop: S.md }}>
          <ImageUpload 
            key={id || t || "new-item"} 
            label="FOOD IMAGE" 
            variant="food" 
            value={image} 
            onChange={handleImageChange} 
            testID="food-image-upload" 
          />
        </View>

        <Pressable style={styles.vegRow} onPress={() => setVeg((v) => !v)} testID="food-veg">
          <Ionicons name={veg ? "checkbox" : "square-outline"} size={22} color={veg ? C.brandPrimary : C.muted} />
          <Txt weight="medium">Vegetarian</Txt>
        </Pressable>

        <Button label="Save Item" onPress={save} loading={saving} style={{ marginTop: S.xl }} testID="save-food-button" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const L = ({ t }: { t: string }) => <Txt weight="medium" size={T.sm} color={C.onSurfaceTertiary} style={{ marginBottom: S.sm, marginTop: S.md }}>{t}</Txt>;
const styles = StyleSheet.create({ vegRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.lg } });