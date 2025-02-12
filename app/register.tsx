import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { View, Text, TextInput, Button, Alert, StyleSheet, ActivityIndicator } from 'react-native';

const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async () => {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) {
            setError(error.message);
            console.log('Error registering:', error);

        } else {
            Alert.alert('Registration successful!', 'Please check your email to confirm your account.');
            console.log(error, data);
            router.push('/home');
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
                autoCapitalize="none"
                autoCorrect={false}
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
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button title={loading ? 'Registering...' : 'Register'} onPress={handleRegister} disabled={loading} />
            {loading && <ActivityIndicator size="small" color="#0000ff" />}
            <Text style={styles.link}>
                Already have an account? <Text onPress={() => router.push('/login')} style={styles.linkText}>Login here</Text>
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

export default Register;