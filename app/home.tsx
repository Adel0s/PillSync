import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";

const Home = () => {
    const [email, setEmail] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data, error } = await supabase.auth.getUser();

                if (error) {
                    console.error("Error fetching user:", error.message);
                    return;
                }

                if (data?.user) {
                    setEmail(data.user.email ?? null);
                    setName(data.user.user_metadata?.full_name ?? null);
                    setUserId(data.user.id ?? null);
                }
            } catch (err) {
                console.error("Unexpected error:", err);
            }
        };

        fetchUser();
    }, []);

    const handleSignOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Error signing out:", error.message);
            } else {
                console.log("User signed out");
                router.replace("/login");
            }
        } catch (err) {
            console.error("Unexpected error:", err);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to PillSync</Text>
            {name && <Text style={styles.text}>Logged in as: {name}</Text>}
            {email && <Text style={styles.text}>User email: {email}</Text>}
            {userId && <Text style={styles.text}>User ID: {userId}</Text>}
            <Button title="Sign Out" onPress={handleSignOut} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    text: {
        fontSize: 16,
        marginBottom: 10,
        textAlign: "center",
    },
});

export default Home;