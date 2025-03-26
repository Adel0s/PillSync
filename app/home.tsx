import React, { useEffect, useState, useCallback } from "react";
import {
    SafeAreaView,
    FlatList,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthProvider";
import CircularProgress from "react-native-circular-progress-indicator";
import { supabase } from "../lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import ScheduleItemCard from "../components/ScheduleItemCard";

const COLORS = {
    primaryDark: "#03045e",
    primary: "#0077b6",
    secondary: "#00b4d8",
    light: "#90e0ef",
    veryLight: "#caf0f8",
    complementary: "#f48c06",
};

export default function Home() {
    const router = useRouter();
    const { user } = useAuth();

    // Show a loader while checking auth state
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [dosesTaken, setDosesTaken] = useState(0);
    const [totalDoses, setTotalDoses] = useState(0);
    const [todaysSchedules, setTodaysSchedules] = useState<any[]>([]);

    // Redirect if user is not authenticated
    useEffect(() => {
        if (!user) {
            router.replace("/login");
        } else {
            setLoadingAuth(false);
        }
    }, [user]);

    // Re-fetch data when screen is focused
    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchTodaysMedications();
            }
        }, [user])
    );

    const fetchTodaysMedications = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from("medication_schedule")
                .select(
                    `id,
          start_date,
          duration_days,
          dosage,
          instructions,
          remaining_quantity,
          medication:medication_id ( name ),
          medication_schedule_times ( id, time )`
                )
                .eq("patient_id", user.id);
            if (error) {
                console.error("Error fetching schedules:", error);
                return;
            }
            if (!data) {
                setTodaysSchedules([]);
                setTotalDoses(0);
                setDosesTaken(0);
                return;
            }
            console.log(data);
            const today = new Date();
            const filtered = data.filter((schedule) => {
                const start = new Date(schedule.start_date);
                const end = new Date(start);
                end.setDate(end.getDate() + schedule.duration_days);
                return today >= start && today <= end;
            });
            // For each schedule, check pill_logs and add an isTaken flag
            const startOfDay = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
            );
            const endOfDay = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate() + 1
            );
            const pillLogPromises = filtered.map((schedule) =>
                supabase
                    .from("pill_logs")
                    .select("id", { count: "exact", head: true })
                    .eq("schedule_id", schedule.id)
                    .gte("taken_at", startOfDay.toISOString())
                    .lt("taken_at", endOfDay.toISOString())
            );
            const pillLogResults = await Promise.all(pillLogPromises);
            const updatedSchedules = filtered.map((schedule, index) => ({
                ...schedule,
                isTaken: (pillLogResults[index].count || 0) > 0,
            }));
            setTodaysSchedules(updatedSchedules);
            setTotalDoses(updatedSchedules.length);
            const totalTaken = pillLogResults.reduce(
                (sum, res) => sum + (res.count || 0),
                0
            );
            setDosesTaken(totalTaken);
        } catch (err) {
            console.error("Unexpected error:", err);
        }
    };

    const handlePillTaken = () => {
        setDosesTaken((prev) => prev + 1);
    };

    const progressValue = totalDoses > 0 ? (dosesTaken / totalDoses) * 100 : 0;

    const goToProfile = () => router.push("/(profile)");
    const handleAddMedication = () => router.push("/(add_medication)");
    const handleCalendarView = () => {
        // router.push("/calendar")
    };
    const handleHistoryLog = () => {
        // router.push("/history")
    };
    const handleRefillTracker = () => {
        // router.push("/refill-tracker")
    };

    const renderEmptyList = () => (
        <Text style={styles.noMedsText}>No Medications Scheduled for today</Text>
    );

    const renderFooter = () => (
        <View style={styles.footer}>
            <Text style={styles.welcomeText}>
                Welcome back, {user?.user_metadata?.full_name || "User"} !
            </Text>
        </View>
    );

    const renderHeader = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.title}>PillSync</Text>
                <TouchableOpacity style={styles.iconContainer} onPress={goToProfile}>
                    <Ionicons name="person-circle-outline" size={28} color="#fff" />
                </TouchableOpacity>
            </View>
            <View style={styles.progressContainer}>
                <Text style={styles.progressTitle}>Daily Progress</Text>
                <View style={styles.circleContainer}>
                    <CircularProgress
                        value={progressValue}
                        radius={60}
                        duration={750}
                        maxValue={100}
                        activeStrokeColor={COLORS.light}
                        inActiveStrokeColor={COLORS.primary}
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
            <View style={styles.quickActionsTitleContainer}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
                    onPress={handleAddMedication}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons name="medkit-outline" size={24} color="#fff" style={styles.actionIcon} />
                        <Text style={styles.actionButtonText}>Add Medication</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.secondary }]}
                    onPress={handleCalendarView}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons name="calendar-outline" size={24} color="#fff" style={styles.actionIcon} />
                        <Text style={styles.actionButtonText}>Calendar View</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.complementary }]}
                    onPress={handleHistoryLog}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons name="document-text-outline" size={24} color="#fff" style={styles.actionIcon} />
                        <Text style={styles.actionButtonText}>History Log</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.primaryDark }]}
                    onPress={handleRefillTracker}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons name="sync-outline" size={24} color="#fff" style={styles.actionIcon} />
                        <Text style={styles.actionButtonText}>Refill Tracker</Text>
                    </View>
                </TouchableOpacity>
            </View>
            <View style={styles.scheduleHeaderContainer}>
                <View style={styles.scheduleHeader}>
                    <View style={styles.scheduleHeaderLeft}>
                        <Ionicons
                            name="time-outline"
                            size={22}
                            color={COLORS.primaryDark}
                            style={styles.scheduleIcon}
                        />
                        <Text style={styles.scheduleTitle}>Today's Schedule</Text>
                    </View>
                    <TouchableOpacity onPress={handleCalendarView}>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );

    if (loadingAuth) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <FlatList
                data={todaysSchedules}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <ScheduleItemCard item={item} onPillTaken={handlePillTaken} />
                )}
                ListHeaderComponent={renderHeader()}
                ListEmptyComponent={renderEmptyList()}
                ListFooterComponent={renderFooter()}
                contentContainerStyle={styles.listContentContainer}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#fff",
    },
    listContentContainer: {
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    /* Header Bar */
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
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
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
    /* Quick Actions */
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
        justifyContent: "space-between",
    },
    actionButton: {
        width: "47%",
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
    /* Today's Schedule Heading */
    scheduleHeaderContainer: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    scheduleHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    scheduleHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    scheduleIcon: {
        marginRight: 6,
    },
    scheduleTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.primaryDark,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.primaryDark,
    },
    noMedsText: {
        fontSize: 14,
        color: "#666",
        marginHorizontal: 16,
        marginTop: 4,
    },
    /* Footer */
    footer: {
        alignItems: "center",
        marginVertical: 10,
    },
    welcomeText: {
        fontSize: 16,
        color: COLORS.primaryDark,
    },
});
