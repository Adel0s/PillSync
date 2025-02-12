import React, { useState } from "react";
import { View, StyleSheet, Alert, TextInput, Button, Text, ActivityIndicator } from "react-native";
import { supabase } from '../lib/supabase';
import { useRouter } from "expo-router";

const Login = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        } else {
            Alert.alert("Success", "Logged in successfully!");
            console.log(error, data);
            router.push("/home"); // Navigate to home screen
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
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button title={loading ? 'Logging in...' : 'Login'} onPress={handleLogin} disabled={loading} />
            {loading && <ActivityIndicator size="small" color="#0000ff" />}
            <Text style={styles.link}>
                Don't have an account?<Text onPress={() => router.push('/register')} style={styles.linkText}>Sign up</Text>
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
    },
    title: {
        fontSize: 24,
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    error: {
        color: 'red',
        marginBottom: 12,
        textAlign: 'center',
    },
    link: {
        marginTop: 16,
        textAlign: 'center',
    },
    linkText: {
        color: 'blue',
    },
});

export default Login;
