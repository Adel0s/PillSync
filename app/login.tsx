import React, { useState } from "react";
import {
    View,
    StyleSheet,
    Alert,
    TextInput,
    Button,
    Text,
    ActivityIndicator,
    TouchableOpacity,
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
            Alert.alert("Success", "Logged in successfully!");
            router.push("/home");
        }

        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
            />
            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.icon}>
                    <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="gray" />
                </TouchableOpacity>
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
            <Button title={loading ? "Logging in..." : "Login"} onPress={handleLogin} disabled={loading} />
            {loading && <ActivityIndicator size="small" color="#0000ff" />}
            <Text style={styles.link}>
                Don't have an account?{" "}
                <Text onPress={() => router.push("/register")} style={styles.linkText}>
                    Sign up
                </Text>
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 16,
    },
    title: {
        fontSize: 24,
        marginBottom: 16,
        textAlign: "center",
    },
    input: {
        height: 40,
        borderColor: "gray",
        borderWidth: 1,
        marginBottom: 12,
        paddingHorizontal: 8,
        borderRadius: 5,
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "gray",
        borderRadius: 5,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    passwordInput: {
        flex: 1,
        height: 40,
    },
    icon: {
        padding: 8,
    },
    error: {
        color: "red",
        marginBottom: 12,
        textAlign: "center",
    },
    link: {
        marginTop: 16,
        textAlign: "center",
    },
    linkText: {
        color: "blue",
    },
});

export default Login;
