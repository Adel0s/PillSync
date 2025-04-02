import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";

const ResetPassword = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleResetPassword = async () => {
        if (!email || !newPassword) {
            Alert.alert("Error", "Please fill in both email and new password.");
            return;
        }
        setLoading(true);

        // In a typical flow, the user is authenticated via a recovery token
        // from the reset email. This example assumes the user has a valid session.
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            setError(error.message);
            Alert.alert("Error", error.message);
        } else {
            Alert.alert(
                "Success",
                "Your password has been updated. Please login with your new password."
            );
            router.push("/login");
        }
        setLoading(false);
    };

    return (
        <LinearGradient
            colors={["#caf0f8", "#90e0ef", "#00b4d8", "#0077b6", "#03045e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    <Text style={styles.header}>Reset Password</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#0077b6"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="New Password"
                            placeholderTextColor="#0077b6"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                        />
                        {error && <Text style={styles.error}>{error}</Text>}
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            <Text style={styles.resetButtonText}>
                                {loading ? "Updating..." : "Change Password"}
                            </Text>
                        </TouchableOpacity>
                        {loading && <ActivityIndicator size="small" color="#0077b6" />}
                    </View>
                </View>
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 16,
        justifyContent: "center",
    },
    container: {
        alignItems: "center",
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#03045e",
        marginBottom: 24,
    },
    card: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 20,
    },
    input: {
        height: 48,
        borderColor: "#00b4d8",
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 16,
        paddingHorizontal: 12,
        backgroundColor: "#f9f9f9",
    },
    error: {
        color: "#ff3b30",
        textAlign: "center",
        marginBottom: 16,
    },
    resetButton: {
        backgroundColor: "#0077b6",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 16,
    },
    resetButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
});

export default ResetPassword;
