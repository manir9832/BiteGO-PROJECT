import { useState } from "react";
import { View, TextInput, Button, Alert, StyleSheet } from "react-native";
import { api } from "@/src/api"; // আপনার প্রজেক্টের এপিআই ক্লায়েন্ট
import { C, S, T } from "@/src/theme";
import { Txt } from "@/src/components/ui";

export default function AdminBroadcastScreen() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Error", "Please fill in both title and message");
      return;
    }

    try {
      setLoading(true);
      // ব্যাকএন্ডের /broadcast এপিআই কল করা
      const res = await api.post("/admin/broadcast", {
        title,
        body,
        role: "customer", // চাইলে ডাইনামিকও রাখতে পারেন
      });

      Alert.alert("Success", `Broadcast sent to ${res.sent} users successfully!`);
      setTitle("");
      setBody("");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to send broadcast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Txt weight="semibold" size={T.lg} style={{ marginBottom: S.md }}>
        Send Broadcast Notification
      </Txt>

      <TextInput
        placeholder="Notification Title (e.g., Special Offer!)"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <TextInput
        placeholder="Type your message here..."
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={4}
        style={[styles.input, { height: 120, textAlignVertical: "top" }]}
      />

      <Button
        title={loading ? "Sending..." : "Send to All Customers"}
        onPress={handleSendBroadcast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: S.lg, backgroundColor: C.surface, flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: C.border || "#ccc",
    borderRadius: 8,
    padding: S.md,
    marginBottom: S.md,
    backgroundColor: "#fff",
  },
});