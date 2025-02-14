import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push("/home")}>
                    <Ionicons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>
            <View style={styles.content}>
                {name && <Text style={styles.text}>Logged in as: {name}</Text>}
                {email && <Text style={styles.text}>User email: {email}</Text>}
                {dob && <Text style={styles.text}>Date of Birth: {dob}</Text>}
                {phone && <Text style={styles.text}>Phone Number: {phone}</Text>}
                {userId && <Text style={styles.text}>User ID: {userId}</Text>}
            </View>
            <View style={styles.buttonsContainer}>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.signOutIcon} />
                    <Text style={styles.signOutButtonText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9f9f9",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    text: {
        fontSize: 16,
        marginBottom: 10,
        textAlign: "center",
    },
    buttonsContainer: {
        marginBottom: 20,
        alignItems: "center",
    },
    signOutButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FF3B30",
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    signOutIcon: {
        marginRight: 8,
    },
    signOutButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default Profile;