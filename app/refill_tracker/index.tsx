import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

// Type definitions for medication and schedule records
interface Medication {
    id: number;
    name: string | null;
    active_substance: string | null;
    quantity: number | null;
    nr_of_pills: number | null;
    description: string | null;
    contraindications: string | null;
    side_effect: string | null;
    barcode: string | null;
}

interface MedicationSchedule {
    id: number;
    medication_id: number | null;
    patient_id: string;
    start_date: string;
    duration_days: number;
    initial_quantity: number;
    remaining_quantity: number;
    prescribed_by?: string;
    prescription_date?: string;
    instructions?: string;
    created_at?: string;
    status?: string; // e.g., "active", "completed", "cancelled"
    // The joined medication object (if available)
    medication?: Medication;
}

// Helper function to determine if the treatment period is still valid.
const isWithinTreatmentPeriod = (
    start_date: string,
    duration_days: number
): boolean => {
    const startDate = new Date(start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration_days);
    return new Date() <= endDate;
};

const RefillTracker: React.FC = () => {
    const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();

    useEffect(() => {
        fetchSchedules();
    }, []);

    // Fetch the medication schedules for the logged-in patient.
    // Only schedules that are explicitly marked as active and still within the treatment period will be displayed.
    const fetchSchedules = async () => {
        setLoading(true);
        // Retrieve the current logged-in user
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
            console.error("Error fetching user:", authError);
            setLoading(false);
            return;
        }
        const userId = authData.user.id;
        // Query the medication_schedule table, filtering by patient_id and active status
        const { data, error } = await supabase
            .from("medication_schedule")
            .select("*, medication(*)")
            .eq("patient_id", userId)
            .eq("status", "active");
        if (error) {
            console.error("Error fetching medication schedules:", error);
        } else {
            // Double-check that the treatment period is still valid.
            const activeSchedules = (data as MedicationSchedule[]).filter(
                (schedule) =>
                    isWithinTreatmentPeriod(schedule.start_date, schedule.duration_days)
            );
            setSchedules(activeSchedules);
        }
        setLoading(false);
    };

    // Render each medication schedule as a card.
    const renderItem = ({ item }: { item: MedicationSchedule }) => {
        // Use the joined medication object (if available), or use a fallback.
        const medName = item.medication?.name || "Unnamed Medication";
        const remaining = item.remaining_quantity || 0;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/refill_tracker/${item.id}`)}
            >
                <Ionicons name="medkit" size={30} color="#00b4d8" style={styles.icon} />
                <View style={styles.cardContent}>
                    <Text style={styles.medName}>{medName}</Text>
                    <Text style={styles.remaining}>Remaining Pills: {remaining}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Your Active Medicines</Text>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0077b6" />
                </View>
            ) : schedules.length === 0 ? (
                <Text style={styles.noSchedules}>
                    No active medications scheduled yet.
                </Text>
            ) : (
                <FlatList
                    data={schedules}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9f9f9", // Main background remains as requested
        padding: 16,
    },
    header: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#03045e", // Dark blue for header text
        marginBottom: 20,
        textAlign: "center",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    noSchedules: {
        fontSize: 18,
        color: "#0077b6", // Blue for alerts
        textAlign: "center",
        marginTop: 20,
    },
    listContainer: {
        paddingBottom: 20,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffffff", // White card for a clean look
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#90e0ef", // Soft light blue border for subtle accent
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    icon: {
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    medName: {
        fontSize: 20,
        fontWeight: "600",
        color: "#03045e", // Dark blue for medication name
    },
    remaining: {
        fontSize: 16,
        color: "#0077b6", // Blue for remaining count
        marginTop: 4,
    },
});

export default RefillTracker;
