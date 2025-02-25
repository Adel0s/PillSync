import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";

const calculateAge = (dobString: string) => {
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const Profile = () => {
    const router = useRouter();
    const { user } = useAuth();
    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    if (!user) {
        return null;
    }
    const email = user.email;
    const fullName = user.user_metadata?.full_name;
    const dob = user.user_metadata?.date_of_birth;
    const phone = user.user_metadata?.phone_number;
    const role = user.user_metadata?.role;
    const userId = user.id;

    const handleSignOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Error signing out:", error.message);
            } else {
                console.log("User signed out");
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
                {role && <Text style={styles.text}>Role: {role}</Text>}
                {fullName && <Text style={styles.text}>Logged in as: {fullName}</Text>}
                {email && <Text style={styles.text}>User email: {email}</Text>}
                {dob && <Text style={styles.text}>Date of Birth: {dob}</Text>}
                {dob && <Text style={styles.text}>Age: {calculateAge(dob)} years</Text>}
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