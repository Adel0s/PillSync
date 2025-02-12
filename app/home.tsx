import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { supabase } from '../lib/supabase'; // Adjust the import path as necessary
import { useRouter } from 'expo-router';

const Home: React.FC = () => {
    const [email, setEmail] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [data, setData] = useState<string | null>(null);
    const [user_id, setUserID] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setData(data);
                setEmail(user.email ?? null);
                setName(user.user_metadata.full_name ?? null);
                setUserID(user.id ?? null);
            }
        };

        fetchUser();
    }, []);

    const handleSignOut = async () => {
        console.log(data);
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error.message);
        } else {
            console.log('User signed out');
            console.log(data);
            router.replace('/login');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to PillSync</Text>
            {name && <Text style={styles.email}>Logged in as: {name}</Text>}
            {email && <Text style={styles.email}>User email: {email}</Text>}
            {user_id && <Text style={styles.email}>User ID: {user_id}</Text>}
            <Button title="Sign Out" onPress={handleSignOut} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    email: {
        fontSize: 16,
        marginBottom: 20,
    },
});

export default Home;