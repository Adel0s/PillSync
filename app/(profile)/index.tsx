import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
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
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.logoContainer}>
                    <Image source={require("../../assets/images/logo.png")} style={styles.logo} />
                </View>
                <View style={styles.content}>
                    {role && <Text style={styles.userInfoText}>Role: {role}</Text>}
                    {fullName && <Text style={styles.userInfoText}>Logged in as: {fullName}</Text>}
                    {email && <Text style={styles.userInfoText}>Email: {email}</Text>}
                    {dob && <Text style={styles.userInfoText}>Date of Birth: {dob}</Text>}
                    {dob && <Text style={styles.userInfoText}>Age: {calculateAge(dob)} years</Text>}
                    {phone && <Text style={styles.userInfoText}>Phone Number: {phone}</Text>}
                    {userId && <Text style={styles.userInfoText}>User ID: {userId}</Text>}
                </View>
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity style={styles.commonButton} onPress={() => router.push("/profile/edit")}>
                        <Ionicons name="create-outline" size={20} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.commonButton} onPress={() => router.push("/settings")}>
                        <Ionicons name="settings-outline" size={20} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.commonButton} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#caf0f8",
    },
    scrollContainer: {
        paddingHorizontal: 16,
        paddingBottom: 30,
        flexGrow: 1,
        justifyContent: "space-between",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#03045e",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#90e0ef",
    },
    backButton: {
        marginRight: 8,
    },
    headerTitle: {
        flex: 1,
        textAlign: "left",
        fontSize: 22,
        fontWeight: "bold",
        color: "#caf0f8",
    },
    logoContainer: {
        alignItems: "center",
        marginVertical: 20,
    },
    logo: {
        width: 80,
        height: 80,
        resizeMode: "contain",
    },
    content: {
        alignItems: "center",
        marginBottom: 20,
    },
    userInfoText: {
        fontSize: 18,
        marginVertical: 6,
        color: "#03045e",
        backgroundColor: "#90e0ef",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        textAlign: "center",
        width: "100%",
    },
    buttonsContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    commonButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0077b6",
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
        width: "80%",
        justifyContent: "center",
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default Profile;