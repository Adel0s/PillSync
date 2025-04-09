import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface HeaderProps {
    title: string;
    backRoute?: string;
}

const Header: React.FC<HeaderProps> = ({ title, backRoute }) => {
    const router = useRouter();

    const handleBack = () => {
        // Navigate to a specified route, or go back by default
        if (backRoute) {
            router.push(backRoute as any);
        } else {
            router.back();
        }
    };

    return (
        <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#03045e",
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#fff",
    },
});

export default Header;
