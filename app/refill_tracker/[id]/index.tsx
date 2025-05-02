import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../lib/supabase";
import Header from "../../../components/Header";

// 1) Extend the interface with schedule_times
interface MedicationDetails {
    id: number;
    start_date: string;
    duration_days: number;
    remaining_quantity: number;
    reminder_enabled: boolean;
    medication?: { name: string };
    medication_schedule_times?: { time: string }[];
}

export default function MedicationDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [detail, setDetail] = useState<MedicationDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchDetail(+id);
    }, [id]);

    // 2) Pull in medication_schedule_times
    async function fetchDetail(scheduleId: number) {
        setLoading(true);
        const { data, error } = await supabase
            .from("medication_schedule")
            .select(`
            *,
            medication(*),
            medication_schedule_times(time)
      `)
            .eq("id", scheduleId)
            .single();

        if (error) {
            console.error(error);
            Alert.alert("Error", "Could not load medication details.");
        } else {
            setDetail(data as MedicationDetails);
        }
        setLoading(false);
    }

    async function toggleReminders() {
        if (!detail) return;
        setLoading(true);
        await supabase
            .from("medication_schedule")
            .update({ reminder_enabled: !detail.reminder_enabled })
            .eq("id", detail.id);
        await fetchDetail(detail.id);
    }

    async function deleteMedication() {
        if (!detail) return;
        Alert.alert(
            "Delete Medication",
            "Are you sure you want to delete this?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        await supabase
                            .from("medication_schedule")
                            .delete()
                            .eq("id", detail.id);
                        router.back();
                    },
                },
            ]
        );
    }

    if (loading || !detail) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0077b6" />
            </View>
        );
    }

    // 3) Compute schedule display
    const times = detail.medication_schedule_times
        ?.map((t) => t.time)
        .sort() ?? []; // they come as "HH:MM:SS"
    const count = times.length;

    // helper to format "HH:MM:SS" → "h:mm A"
    function fmt(t: string) {
        const [hh, mm] = t.split(":").map(Number);
        const d = new Date();
        d.setHours(hh, mm);
        return d.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    // Build the schedule line
    let scheduleText = "";
    if (count === 1) {
        scheduleText = `Daily — ${fmt(times[0])}`;
    } else if (count === 2) {
        scheduleText = `2 times daily — ${fmt(times[0])} and ${fmt(times[1])}`;
    } else if (count > 2) {
        const formatted = times.map(fmt);
        const last = formatted.pop();
        scheduleText = `${count} times daily — ${formatted.join(", ")}, and ${last}`;
    }

    // compute end date
    const startDate = new Date(detail.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + detail.duration_days);

    const name = detail.medication?.name ?? "Medication";

    return (
        <SafeAreaView style={styles.safeContainer}>
            <Header title="Medication details" backRoute="/refill_tracker" />
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.card}>
                    <View style={styles.cardRowLeft}>
                        <Ionicons name="medical-outline" size={24} color="#03045e" style={{ marginRight: 8 }} />
                        <Text style={styles.cardTitle}>{name}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() =>
                        router.push(`/refill_tracker/${id}/inventory`)
                    }
                >
                    <View style={styles.cardRow}>
                        <View style={styles.cardRowLeft}>
                            <Ionicons name="layers-outline" size={24} color="#03045e" style={{ marginRight: 8 }} />
                            <Text style={styles.cardTitle}>Inventory</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {detail.remaining_quantity} pill(s) left
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push(`/refill_tracker/${id}/schedule_pill_list`)}
                >
                    <View style={styles.cardRowLeft}>
                        <Ionicons name="calendar-outline" size={24} color="#03045e" style={{ marginRight: 8 }} />
                        <Text style={styles.cardTitle}>Medication schedule</Text>
                    </View>

                    {count > 0 ? (
                        <>
                            <Text style={styles.cardSubtitle}>{scheduleText}</Text>
                            <Text style={styles.cardSubtitle}>
                                Ends on {endDate.toLocaleDateString()}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.cardSubtitle}>No schedule times set</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.card}>
                    <View style={styles.cardRowLeft}>
                        <Ionicons name="notifications-outline" size={24} color="#03045e" style={{ marginRight: 8 }} />
                        <Text style={styles.cardTitle}>Reminder settings</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                        {detail.reminder_enabled
                            ? "Critical reminders are on"
                            : "Critical reminders are off"}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.reminderButton}
                    onPress={toggleReminders}
                >
                    <View style={styles.cardRowLeft}>
                        <Ionicons
                            name={detail.reminder_enabled ? "pause-outline" : "play-outline"}
                            size={20}
                            color="#fff"
                            style={styles.buttonIcon}
                        />
                        <Text style={styles.buttonText}>
                            {detail.reminder_enabled
                                ? "Pause reminders"
                                : "Resume reminders"}
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.reminderButton, styles.deleteButton]}
                    onPress={deleteMedication}
                >
                    <View style={styles.cardRowLeft}>
                        <Ionicons
                            name="trash-outline"
                            size={20}
                            color="#fff"
                            style={styles.buttonIcon}
                        />
                        <Text style={styles.buttonText}>Delete medication</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: { flex: 1, backgroundColor: "#f9f9f9" },
    container: { padding: 16 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#90e0ef",
    },
    cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    cardRowLeft: { flexDirection: "row", alignItems: "center" },
    cardTitle: { fontSize: 18, fontWeight: "600", color: "#03045e" },
    cardSubtitle: { fontSize: 14, color: "#555", marginTop: 4 },
    badge: {
        marginTop: 8,
        alignSelf: "flex-start",
        backgroundColor: "#90e0ef",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    badgeText: { color: "#03045e", fontSize: 14 },
    actionTextButton: { marginTop: 16, alignItems: "center" },
    actionText: { fontSize: 16, color: "#ff8c00" },
    deleteTextButton: { marginTop: 8 },
    deleteText: { color: "#ff4444" },
    // new “pill” button style
    reminderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ff8c00',
        paddingVertical: 14,
        borderRadius: 8,
        marginTop: 16,
    },
    deleteButton: {
        backgroundColor: '#ff4444',
        marginTop: 8,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
