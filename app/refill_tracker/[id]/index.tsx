// app/refill_tracker/[id]/index.tsx
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../lib/supabase";
import Header from "../../../components/Header";

interface MedicationDetails {
    id: number;
    remaining_quantity: number;
    reminder_enabled: boolean;
    medication?: { name: string };
}

export default function MedicationDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [detail, setDetail] = useState<MedicationDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchDetail(+id);
    }, [id]);

    async function fetchDetail(scheduleId: number) {
        setLoading(true);
        const { data, error } = await supabase
            .from("medication_schedule")
            .select("*, medication(*)")
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

    const name = detail.medication?.name ?? "Medication";

    return (
        <SafeAreaView style={styles.safeContainer}>
            <Header title="Medication details" backRoute="/refill_tracker" />
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{name}</Text>
                </View>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() =>
                        router.push(`/refill_tracker/${id}/inventory`)
                    }
                >
                    <Text style={styles.cardTitle}>Inventory</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {detail.remaining_quantity} pill(s) left
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Medication schedule</Text>
                    <Text style={styles.cardSubtitle}>
                        Daily — 6 times between 8:00 AM and 8:00 PM
                    </Text>
                    <Text style={styles.cardSubtitle}>No end date</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Reminder settings</Text>
                    <Text style={styles.cardSubtitle}>
                        {detail.reminder_enabled
                            ? "Critical reminders are on"
                            : "Critical reminders are off"}
                    </Text>
                </View>

                {/* Action buttons */}
                <TouchableOpacity
                    style={styles.actionTextButton}
                    onPress={toggleReminders}
                >
                    <Text style={styles.actionText}>
                        {detail.reminder_enabled
                            ? "Pause reminders"
                            : "Resume reminders"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionTextButton, styles.deleteTextButton]}
                    onPress={deleteMedication}
                >
                    <Text style={[styles.actionText, styles.deleteText]}>
                        Delete medication
                    </Text>
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
});
