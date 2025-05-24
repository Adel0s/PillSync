import * as Linking from 'expo-linking';
import React, { useState, useEffect } from "react";
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
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";

export default function ChangeEmail() {
    const router = useRouter();
    const { user } = useAuth();

    const [newEmail, setNewEmail] = useState(user?.email || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) setNewEmail(user.email);
    }, [user]);

    const handleChangeEmail = async () => {
        if (newEmail === user.email) {
            return Alert.alert("Info", "Adresa de email este aceeași.");
        }
        setLoading(true);
        const confirmUrl = Linking.createURL('/confirm-change-email')
        const { error } = await supabase.auth.updateUser(
            { email: newEmail },
            { emailRedirectTo: confirmUrl }
        )
        setLoading(false);
        if (error) {
            console.error("Error changing email:", error);
            Alert.alert("Eroare", error.message);
        } else {
            Alert.alert(
                "Succes",
                "Am trimis un link de confirmare pe noua adresă. Verifică-ți inbox-ul."
            );
            router.back();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Change Email</Text>
            <View style={styles.form}>
                <Text style={styles.label}>Current:</Text>
                <Text style={styles.current}>{user?.email}</Text>
                <Text style={styles.label}>New Email:</Text>
                <TextInput
                    style={styles.input}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleChangeEmail}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.buttonText}>Update Email</Text>}
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
    current: { fontSize: 16, marginBottom: 12, color: "#555" },
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
