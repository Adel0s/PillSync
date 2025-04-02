import React, { useState } from "react";
import * as Linking from "expo-linking";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import logo from "../assets/images/logo.png";

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
        const resetPasswordURL = Linking.createURL("/reset_password");
        if (!email) {
            Alert.alert("Forgot Password", "Please enter your email address to reset your password.");
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: resetPasswordURL,
        });
        if (error) {
            Alert.alert("Error", error.message);
        } else {
            Alert.alert("Success", "Check your email for password reset instructions.");
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
                    <Image source={logo} style={styles.logo} resizeMode="contain" />
                    <Text style={styles.header}>Login</Text>
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
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
                                placeholderTextColor="#0077b6"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.icon}>
                                <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="#0077b6" />
                            </TouchableOpacity>
                        </View>
                        {error && <Text style={styles.error}>{error}</Text>}
                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                            <Text style={styles.loginButtonText}>{loading ? "Logging in..." : "Login"}</Text>
                        </TouchableOpacity>
                        {loading && <ActivityIndicator size="small" color="#0077b6" />}
                        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotContainer}>
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => router.push("/register")}>
                        <Text style={styles.footerText}>Don't have an account? Sign up here</Text>
                    </TouchableOpacity>
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
    logo: {
        width: 120,
        height: 120,
        marginBottom: 16,
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
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderColor: "#00b4d8",
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
        color: "#ff3b30",
        textAlign: "center",
        marginBottom: 16,
    },
    loginButton: {
        backgroundColor: "#0077b6",
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
        color: "#0077b6",
        textDecorationLine: "underline",
    },
    footerText: {
        fontSize: 16,
        color: "#caf0f8",
        textAlign: "center",
        textDecorationLine: "underline",
    },
});

export default Login;
