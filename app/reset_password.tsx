import React, { useState, useEffect } from "react";
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
import * as Linking from "expo-linking";

const ResetPassword = () => {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleDeepLink = async (eventOrUrl: { url: string } | string) => {
            const url = typeof eventOrUrl === 'string' ? eventOrUrl : eventOrUrl.url;
            const { queryParams } = Linking.parse(url);

            // Catch if the link is invalid or expired
            if (queryParams && queryParams.error) {
                Alert.alert(
                    'Expired or invalid link',
                    decodeURIComponent(
                        (queryParams.error_description as string) || (queryParams.error as string)
                    )
                );
                return;
            }

            const {
                type,
                access_token,
                refresh_token
            } = queryParams as Record<string, string>;

            if (type === 'recovery' && access_token && refresh_token) {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token,
                    refresh_token,
                });
                if (sessionError) {
                    console.error('Session error:', sessionError);
                    Alert.alert('Error', 'The session could not be initialized.');
                }
            }
        };

        const sub = Linking.addEventListener('url', handleDeepLink);
        (async () => {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) await handleDeepLink(initialUrl);
        })();

        return () => sub.remove();
    }, []);

    const handleResetPassword = async () => {
        if (!newPassword) {
            Alert.alert("Error", "Please enter a new password.");
            return;
        }
        setLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });
        setLoading(false);
        console.log("Update user response:", updateError);

        if (updateError) {
            setError(updateError.message);
            Alert.alert("Error", updateError.message);
        } else {
            Alert.alert(
                "Success",
                "Your password has been updated. Please login with your new password."
            );
            router.push("/login");
        }
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
