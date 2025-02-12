// Profile.tsx
import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Button } from "react-native";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";

const Profile = () => {
    const [email, setEmail] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [dob, setDob] = useState<string | null>(null);
    const [phone, setPhone] = useState<string | null>(null);
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
                    setDob(data.user.user_metadata?.date_of_birth ?? null);
                    setPhone(data.user.user_metadata?.phone_number ?? null);
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
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Profile</Text>
            {name && <Text style={styles.text}>Logged in as: {name}</Text>}
            {email && <Text style={styles.text}>User email: {email}</Text>}
            {dob && <Text style={styles.text}>Date of Birth: {dob}</Text>}
            {phone && <Text style={styles.text}>Phone Number: {phone}</Text>}
            {userId && <Text style={styles.text}>User ID: {userId}</Text>}
            <View style={styles.buttonsContainer}>
                <Button title="Back to Home" onPress={() => router.push("/home")} />
                <View style={styles.spacer} />
                <Button title="Sign Out" onPress={handleSignOut} />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#f9f9f9",
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
    buttonsContainer: {
        marginTop: 20,
        flexDirection: "row",
    },
    spacer: {
        width: 20,
    },
});

export default Profile;
