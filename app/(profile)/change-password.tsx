import React, { useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { useRouter } from "expo-router";

export default function ChangePassword() {
    const router = useRouter();
    const { user } = useAuth();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (password.length < 6) {
            return Alert.alert("Error", "Password must have at least 6 characters.");
        }
        if (password !== confirm) {
            return Alert.alert("Error", "Passwords do not match.");
        }
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (error) {
            Alert.alert("Eroare", error.message);
        } else {
            Alert.alert("Success", "Password has been changed successfully.");
            router.back();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Change Password</Text>
            <View style={styles.form}>
                <Text style={styles.label}>New Password:</Text>
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="••••••"
                />
                <Text style={styles.label}>Confirm Password:</Text>
                <TextInput
                    style={styles.input}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    placeholder="••••••"
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleChangePassword}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.buttonText}>Update Password</Text>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9f9f9", padding: 16 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: "#03045e" },
    form: {},
    label: { fontSize: 16, marginTop: 12, marginBottom: 4, color: "#03045e" },
    input: {
        height: 48, borderColor: "#ccc", borderWidth: 1, borderRadius: 8,
        paddingHorizontal: 12, backgroundColor: "#fff"
    },
    button: {
        marginTop: 20, backgroundColor: "#007AFF", padding: 14, borderRadius: 8,
        alignItems: "center"
    },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
