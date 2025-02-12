import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import {
    View,
    Text,
    TextInput,
    Button,
    Alert,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async () => {
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
            },
        });

        if (error) {
            setError(error.message);
            console.log("Error registering:", error);
        } else {
            Alert.alert("Registration successful!", "Please check your email to confirm your account.");
            router.push("/home");
        }

        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Register</Text>
            <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
            />
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
            <Button title={loading ? "Registering..." : "Register"} onPress={handleRegister} disabled={loading} />
            {loading && <ActivityIndicator size="small" color="#0000ff" />}
            <Text style={styles.link}>
                Already have an account?{" "}
                <Text onPress={() => router.push("/login")} style={styles.linkText}>
                    Login here
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

export default Register;