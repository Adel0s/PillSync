import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Image,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import Header from "../../components/Header";
import PillsIcon from "../../assets/images/pill_icon_64px.png";

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
    medication?: Medication;
}

// Helper to check if the treatment period is valid.
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

    const fetchSchedules = async () => {
        setLoading(true);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
            console.error("Error fetching user:", authError);
            setLoading(false);
            return;
        }
        const userId = authData.user.id;
        const { data, error } = await supabase
            .from("medication_schedule")
            .select("*, medication(*)")
            .eq("patient_id", userId)
            .in("status", ["active", "paused"]);
        if (error) {
            console.error("Error fetching medication schedules:", error);
        } else {
            const activeSchedules = (data as MedicationSchedule[]).filter((schedule) =>
                isWithinTreatmentPeriod(schedule.start_date, schedule.duration_days)
            );
            setSchedules(activeSchedules);
        }
        setLoading(false);
    };

    const renderItem = ({ item }: { item: MedicationSchedule }) => {
        const medName = item.medication?.name || "Unnamed Medication";
        const remaining = item.remaining_quantity || 0;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/refill_tracker/${item.id}`)}
            >
                <Image
                    source={PillsIcon}
                    style={styles.icon}
                />
                <View style={styles.cardContent}>
                    <Text style={styles.medName}>{medName}</Text>
                    <Text style={styles.remaining}>Remaining Pills: {remaining}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeContainer}>
            <Header title="Your Active Medicines" backRoute="/home" />
            <View style={styles.container}>
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, color: "#03045e", textAlign: "center", lineHeight: 22 }}>
                        Welcome! 🌿 Here you can view all your <Text style={{ fontWeight: "bold" }}>active medications</Text> along with the number of pills you have left. 💊{"\n\n"}
                        Tap on any medication to open its detailed view. There, you’ll be able to{" "}
                        <Text style={{ fontWeight: "bold" }}>set reminders</Text> 🕒 and{" "}
                        <Text style={{ fontWeight: "bold" }}>add pills</Text> to your inventory when needed. 📦
                    </Text>
                </View>
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "#f9f9f9",
    },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f9f9f9",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    noSchedules: {
        fontSize: 18,
        color: "#0077b6",
        textAlign: "center",
        marginTop: 20,
    },
    listContainer: {
        paddingBottom: 20,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#90e0ef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    icon: {
        width: 30,
        height: 30,
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    medName: {
        fontSize: 20,
        fontWeight: "600",
        color: "#03045e",
    },
    remaining: {
        fontSize: 16,
        color: "#0077b6",
        marginTop: 4,
    },
});

export default RefillTracker;
