import React, { useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthProvider";
import CircularProgress from "react-native-circular-progress-indicator";


const COLORS = {
    primaryDark: "#03045e",
    primary: "#0077b6",
    secondary: "#00b4d8",
    light: "#90e0ef",
    veryLight: "#caf0f8",
    complementary: "#f48c06"
};

const Home = () => {
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            router.replace("/login");
        }
    }, [user]);

    if (!user) return null;

    const goToProfile = () => {
        router.push("/(profile)");
    };

    const handleAddMedication = () => {
        router.push("/(add_medication)");
    };
    const handleCalendarView = () => {
        // TODO: navigate or do something
    };
    const handleHistoryLog = () => {
        // TODO: navigate or do something
    };
    const handleRefillTracker = () => {
        // TODO: navigate or do something
    };

    // Example progress values
    const progressValue = 50;
    const dosesTaken = 5;
    const totalDoses = 10;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>PillSync</Text>
                <TouchableOpacity style={styles.iconContainer} onPress={goToProfile}>
                    <Ionicons name="person-circle-outline" size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Daily Progress Area */}
            <View style={styles.progressContainer}>
                <Text style={styles.progressTitle}>Daily Progress</Text>
                <View style={styles.circleContainer}>
                    <CircularProgress
                        value={progressValue}
                        radius={60}
                        duration={750}
                        maxValue={100}
                        activeStrokeColor={COLORS.primary}
                        inActiveStrokeColor={COLORS.light}
                        activeStrokeWidth={10}
                        inActiveStrokeWidth={10}
                        valueSuffix="%"
                        progressValueStyle={styles.circlePercentage}
                    />
                    <Text style={styles.circleLabel}>
                        {dosesTaken} of {totalDoses} doses
                    </Text>
                </View>
            </View>

            {/* Quick Actions Title */}
            <View style={styles.quickActionsTitleContainer}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
                {/* Add Medication */}
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
                    onPress={handleAddMedication}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons
                            name="medkit-outline"
                            size={24}
                            color="#fff"
                            style={styles.actionIcon}
                        />
                        <Text style={styles.actionButtonText}>Add Medication</Text>
                    </View>
                </TouchableOpacity>

                {/* Calendar View */}
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.secondary }]}
                    onPress={handleCalendarView}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons
                            name="calendar-outline"
                            size={24}
                            color="#fff"
                            style={styles.actionIcon}
                        />
                        <Text style={styles.actionButtonText}>Calendar View</Text>
                    </View>
                </TouchableOpacity>

                {/* History Log */}
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.complementary }]}
                    onPress={handleHistoryLog}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons
                            name="document-text-outline"
                            size={24}
                            color="#fff"
                            style={styles.actionIcon}
                        />
                        <Text style={styles.actionButtonText}>History Log</Text>
                    </View>
                </TouchableOpacity>

                {/* Refill Tracker */}
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.primaryDark }]}
                    onPress={handleRefillTracker}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons
                            name="sync-outline"
                            size={24}
                            color="#fff"
                            style={styles.actionIcon}
                        />
                        <Text style={styles.actionButtonText}>Refill Tracker</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Welcome Text */}
            <View style={styles.footer}>
                <Text style={styles.welcomeText}>
                    Welcome back, {user?.user_metadata?.full_name || "User"}
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.veryLight,
    },
    header: {
        height: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        backgroundColor: COLORS.primaryDark,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 2,
        elevation: 3,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    iconContainer: {
        backgroundColor: COLORS.primary,
        padding: 8,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 2,
        elevation: 2,
    },
    progressContainer: {
        backgroundColor: COLORS.secondary,
        paddingVertical: 20,
        alignItems: "center",
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 16,
    },
    circleContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    circlePercentage: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.primaryDark,
    },
    circleLabel: {
        fontSize: 16,
        color: "#fff",
        marginTop: 8,
    },
    quickActionsTitleContainer: {
        paddingHorizontal: 16,
        marginTop: 20,
    },
    quickActionsTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.primaryDark,
        marginBottom: 8,
    },
    quickActionsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 20,
        paddingHorizontal: 16,
        // Space out two columns evenly and align them with the same left padding
        justifyContent: "space-between",
    },
    actionButton: {
        width: "47%",        // two columns with a small gap
        height: 90,
        borderRadius: 12,
        marginBottom: 16,
        justifyContent: "center",
    },
    buttonContent: {
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingLeft: 10,
    },
    actionIcon: {
        marginBottom: 4,
    },
    actionButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "left",
    },
    footer: {
        alignItems: "center",
        marginTop: 10,
    },
    welcomeText: {
        fontSize: 16,
        color: COLORS.primaryDark,
    },
});

export default Home;
