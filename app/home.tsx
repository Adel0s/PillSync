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
import { cancelAllNotifications, cancelLocalNotification, scheduleAllReminders, cancelAllLocalNotifications } from '../services/notificationService';

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
                .select(`
          id,
          start_date,
          duration_days,
          dosage,
          instructions,
          remaining_quantity,
          reminder_enabled,
          reminder_threshold,
          medication:medication_id (
            id,
            name,
            active_substance,
            quantity,
            nr_of_pills,
            description,
            contraindications,
            side_effect,
            barcode
          ),
          medication_schedule_times ( id, time )
        `)
                .eq("patient_id", user.id);
            if (error) {
                console.error("Error fetching schedules:", error);
                return;
            }
            if (!data || data.length === 0) {
                setTodaysSchedules([]);
                setTotalDoses(0);
                setDosesTaken(0);
                return;
            }
            // console.log(data);
            // 2) Filtere schedule items to only include those that are active today
            // (i.e., start_date <= today <= end_date)
            const today = new Date();
            const filtered = data.filter(schedule => {
                const start = new Date(schedule.start_date);
                const end = new Date(start);
                end.setDate(end.getDate() + schedule.duration_days);
                return today >= start && today <= end;
            });
            // Find all pill_logs with status = 'snoozed' wich have note ≤ now  
            // note = snoozedUntil
            const nowIso = new Date().toISOString();
            const { data: snoozedLogs, error: fetchErr } = await supabase
                .from("pill_logs")
                .select("id, schedule_id, schedule_time_id")
                .eq("status", "snoozed")
                .lte("note", nowIso)
                .eq("processed", false);
            if (fetchErr) throw fetchErr;
            console.log("Snoozed logs:", snoozedLogs);

            if (snoozedLogs?.length) {
                // insert new logs with status = null for each snoozed log
                // (this will be used to show the pill as not taken)
                const resetEntries = snoozedLogs.map(l => ({
                    schedule_id: l.schedule_id,
                    schedule_time_id: l.schedule_time_id,
                    status: null,
                    note: null,
                    taken_at: new Date().toISOString(),
                }));
                const { error: insertErr } = await supabase
                    .from("pill_logs")
                    .insert(resetEntries);
                if (insertErr) console.error("Error inserting reset logs:", insertErr);

                // Mark the snoozed logs as processed
                const processedUpdates = snoozedLogs.map(l => ({
                    id: l.id,
                    processed: true,
                }));
                const { error: updateErr } = await supabase
                    .from("pill_logs")
                    .upsert(processedUpdates, { onConflict: "id" });
                if (updateErr) console.error("Error marking snoozes as processed:", updateErr);
            }
            // For each schedule, check pill_logs and add an isTaken flag
            const startOfDay = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
            );
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);

            // 4) For each schedule, fetch the latest pill_logs for each time
            type Item = {
                scheduleId: number;
                scheduleTimeId: number;
                medication: any;
                dosage: number;
                time: string;
                status: "none" | "taken" | "skipped" | "snoozed";
                snoozedUntil: string | null;
                remainingQuantity: number;
                logId: number | null;
                reminder_enabled: boolean;
                reminder_threshold: number;
            };

            const items: Promise<Item>[] = filtered.flatMap(schedule =>
                schedule.medication_schedule_times.map(async timeObj => {
                    const { data: logs, error: logError } = await supabase
                        .from("pill_logs")
                        .select("id, status, note")
                        .eq("schedule_id", schedule.id)
                        .eq("schedule_time_id", timeObj.id)
                        .gte("taken_at", startOfDay.toISOString())
                        .lt("taken_at", endOfDay.toISOString())
                        .order("taken_at", { ascending: false })
                        .limit(1);
                    if (logError) throw logError;
                    const log = logs?.[0] ?? null;
                    return {
                        scheduleId: schedule.id,
                        scheduleTimeId: timeObj.id,
                        medication: schedule.medication,
                        dosage: schedule.dosage,
                        time: timeObj.time,
                        status: (log?.status as any) ?? "none",
                        snoozedUntil: log?.status === "snoozed" ? log.note : null,
                        remainingQuantity: schedule.remaining_quantity,
                        logId: log?.id ?? null,
                        reminder_enabled: schedule.reminder_enabled,
                        reminder_threshold: schedule.reminder_threshold,
                    };
                })
            );

            const results = await Promise.all(items);
            // 5) Add a schedule with no times set -> 'As Needed'
            filtered.forEach(schedule => {
                if (schedule.medication_schedule_times.length === 0) {
                    results.push({
                        scheduleId: schedule.id,
                        // give a unique negative key so it doesn’t collide with real times:
                        scheduleTimeId: -schedule.id,
                        medication: schedule.medication,
                        dosage: schedule.dosage,
                        time: "",          // empty → falsy, so the card shows “No times set”
                        status: "none",    // always untaken by default
                        snoozedUntil: null,
                        remainingQuantity: schedule.remaining_quantity,
                        logId: null,
                        reminder_enabled: schedule.reminder_enabled,
                        reminder_threshold: schedule.reminder_threshold,
                    });
                }
            });

            // flat.sort((a, b) => a.time.localeCompare(b.time)); -> if there are no times set, this will throw an error
            // (if the As needed case is treated)
            results.sort((a, b) => {
                if (!a.time && !b.time) return 0;   // both no‐time
                if (!a.time) return 1;  // push a after b
                if (!b.time) return -1;  // push b after a
                return a.time.localeCompare(b.time);
            });
            // 7) Set the state with the results and calculate the total doses and taken doses
            setTodaysSchedules(results);
            setTotalDoses(results.length);
            setDosesTaken(results.filter(item => item.status === "taken").length);
        } catch (err) {
            console.error("Unexpected error:", err);
        }
    };

    const handlePillTaken = () => {
        setDosesTaken(prev => prev + 1);
    };

    const progressValue = totalDoses > 0 ? (dosesTaken / totalDoses) * 100 : 0;

    const goToProfile = () => router.push("/(profile)");
    const handleAddMedication = () => router.push("/(add_medication)");
    const handleCalendarView = () => {
        router.push("/(calendar_view)")
    };
    const handlePillInteractions = () => {
        router.push("/pill_interactions");
    };
    const handleRefillTracker = () => {
        router.push("/refill_tracker");
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

            {/* Daily Progress */}
            <View style={styles.progressContainer}>
                <Text style={styles.progressTitle}>Daily Progress</Text>
                <View style={styles.circleContainer}>
                    <CircularProgress
                        value={progressValue}
                        radius={60}
                        duration={750}
                        maxValue={100}
                        activeStrokeColor={COLORS.veryLight}
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

            {/* Quick Actions */}
            <View style={styles.quickActionsTitleContainer}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
                    onPress={handleAddMedication}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons name="add-circle-outline" size={24} color="#fff" style={styles.actionIcon} />
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
                    onPress={handlePillInteractions}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons name="document-text-outline" size={24} color="#fff" style={styles.actionIcon} />
                        <Text style={styles.actionButtonText}>Pill Interactions</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.primaryDark }]}
                    onPress={handleRefillTracker}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons name="medkit-outline" size={24} color="#fff" style={styles.actionIcon} />
                        <Text style={styles.actionButtonText}>Treatment</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Today's Schedule Heading */}
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
                keyExtractor={item => item.scheduleTimeId.toString()}
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
    /* Daily Progress */
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
