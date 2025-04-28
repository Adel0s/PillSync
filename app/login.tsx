import React, { useState } from "react";
import * as Linking from "expo-linking";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
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

// import refactored styles + theme
import styles from "./Login.styles";
import { COLORS } from "../styles/colors";

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
            colors={[
                COLORS.veryLight,
                COLORS.light,
                COLORS.secondary,
                COLORS.primary,
                COLORS.primaryDark,
            ]}
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
                            placeholderTextColor={COLORS.primary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
                                placeholderTextColor={COLORS.primary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.icon}
                            >
                                <Ionicons
                                    name={showPassword ? "eye" : "eye-off"}
                                    size={24}
                                    color={COLORS.primary}
                                />
                            </TouchableOpacity>
                        </View>

                        {error && <Text style={styles.error}>{error}</Text>}

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <Text style={styles.loginButtonText}>
                                {loading ? "Logging in..." : "Login"}
                            </Text>
                        </TouchableOpacity>
                        {loading && <ActivityIndicator size="small" color={COLORS.primary} />}

                        <TouchableOpacity
                            onPress={handleForgotPassword}
                            style={styles.forgotContainer}
                        >
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => router.push("/register")}>
                        <Text style={styles.footerText}>
                            Don't have an account? Sign up here
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </LinearGradient>
    );
};

export default Login;
