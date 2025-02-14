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
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const Login = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError(error.message);
        } else {
            router.push("/home");
        }
        setLoading(false);
    };

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert("Forgot Password", "Please enter your email address to reset your password.");
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: "https://your-app-url.com/reset-password",
        });
        if (error) {
            Alert.alert("Error", error.message);
        } else {
            Alert.alert("Success", "Check your email for password reset instructions.");
        }
        setLoading(false);
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <Text style={styles.header}>Login</Text>
                <View style={styles.card}>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Password"
                            placeholderTextColor="#999"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.icon}>
                            <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="gray" />
                        </TouchableOpacity>
                    </View>
                    {error && <Text style={styles.error}>{error}</Text>}
                    <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                        <Text style={styles.loginButtonText}>
                            {loading ? "Logging in..." : "Login"}
                        </Text>
                    </TouchableOpacity>
                    {loading && <ActivityIndicator size="small" color="#0000ff" />}
                    <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotContainer}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => router.push("/register")}>
                    <Text style={styles.footerText}>Don't have an account? Sign up here</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: "#f2f2f2",
        padding: 16,
        justifyContent: "center",
    },
    container: {
        alignItems: "center",
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 24,
        color: "#333",
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
        borderColor: "#ddd",
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 16,
        paddingHorizontal: 12,
        backgroundColor: "#f9f9f9",
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderColor: "#ddd",
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: "#f9f9f9",
        marginBottom: 16,
        paddingHorizontal: 12,
    },
    passwordInput: {
        flex: 1,
        height: 48,
    },
    icon: {
        padding: 8,
    },
    error: {
        color: "red",
        textAlign: "center",
        marginBottom: 16,
    },
    loginButton: {
        backgroundColor: "#20A0D8",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 16,
    },
    loginButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    forgotContainer: {
        marginVertical: 8,
        alignItems: "center",
    },
    forgotText: {
        color: "blue",
        textDecorationLine: "underline",
    },
    footerText: {
        fontSize: 16,
        color: "#20A0D8",
        textAlign: "center",
        textDecorationLine: "underline",
    },
});

export default Login;
