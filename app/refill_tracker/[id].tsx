import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Switch,
    ActivityIndicator,
    Alert,
    ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";

// Type definitions (adjust to your actual fields)
// Assuming medication_schedule now has reminder_enabled and reminder_threshold
interface Medication {
    id: number;
    name: string | null;
    // ... other fields
}

interface MedicationSchedule {
    id: number;
    medication_id: number | null;
    patient_id: string;
    start_date: string;
    duration_days: number;
    initial_quantity: number;
    remaining_quantity: number;
    reminder_enabled?: boolean;    // new field
    reminder_threshold?: number;  // new field
    // joined medication object
    medication?: Medication;
}

const InventoryDetail: React.FC = () => {
    // The schedule ID from the route (e.g., /refill_tracker/123)
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [schedule, setSchedule] = useState<MedicationSchedule | null>(null);

    // UI states
    const [newPackageCount, setNewPackageCount] = useState<string>(""); // how many pills to add
    const [isReminderEnabled, setIsReminderEnabled] = useState<boolean>(false);
    const [reminderThreshold, setReminderThreshold] = useState<string>("");

    useEffect(() => {
        if (id) {
            fetchSchedule(parseInt(id as string, 10));
        }
    }, [id]);

    // Fetch the medication schedule from the database
    const fetchSchedule = async (scheduleId: number) => {
        setLoading(true);
        const { data, error } = await supabase
            .from("medication_schedule")
            .select("*, medication(*)")
            .eq("id", scheduleId)
            .single();
        if (error) {
            console.error("Error fetching schedule:", error);
            Alert.alert("Error", "Could not fetch schedule details.");
            setLoading(false);
            return;
        }
        // cast to our type
        const scheduleData = data as MedicationSchedule;
        setSchedule(scheduleData);

        // initialize local states from schedule
        setIsReminderEnabled(scheduleData.reminder_enabled ?? false);
        setReminderThreshold(
            scheduleData.reminder_threshold ? scheduleData.reminder_threshold.toString() : ""
        );

        setLoading(false);
    };

    // Handler: adding a new package of pills
    const handleAddNewPackage = async () => {
        if (!schedule) return;

        const toAdd = parseInt(newPackageCount, 10);
        if (isNaN(toAdd) || toAdd <= 0) {
            Alert.alert("Invalid Input", "Please enter a valid number of pills to add.");
            return;
        }

        const newRemaining = (schedule.remaining_quantity ?? 0) + toAdd;
        setLoading(true);
        const { data, error } = await supabase
            .from("medication_schedule")
            .update({ remaining_quantity: newRemaining })
            .eq("id", schedule.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating inventory:", error);
            Alert.alert("Error", "Failed to update inventory.");
        } else {
            // update local state
            setSchedule(data as MedicationSchedule);
            setNewPackageCount("");
            Alert.alert("Success", "Pills added to inventory.");
        }
        setLoading(false);
    };

    // Handler: enable/disable reminders & set threshold
    const handleSaveReminders = async () => {
        if (!schedule) return;

        let thresholdNum = parseInt(reminderThreshold, 10);
        if (isReminderEnabled && (isNaN(thresholdNum) || thresholdNum <= 0)) {
            Alert.alert("Invalid Input", "Please enter a valid threshold number.");
            return;
        }
        // if reminders are disabled, you might set threshold to null, or keep last value
        if (!isReminderEnabled) {
            thresholdNum = 0;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from("medication_schedule")
            .update({
                reminder_enabled: isReminderEnabled,
                reminder_threshold: thresholdNum || null,
            })
            .eq("id", schedule.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating reminder settings:", error);
            Alert.alert("Error", "Failed to update reminder settings.");
        } else {
            setSchedule(data as MedicationSchedule);
            Alert.alert("Success", "Reminder settings saved.");
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0077b6" />
            </View>
        );
    }

    if (!schedule) {
        return (
            <View style={styles.center}>
                <Text>Schedule not found.</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>{schedule.medication?.name || "Medication"}</Text>

            <Text style={styles.label}>Current inventory</Text>
            <Text style={styles.value}>
                {schedule.remaining_quantity ?? 0} pill(s) left
            </Text>

            {/* Add new package */}
            <Text style={styles.sectionTitle}>Add new package</Text>
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Number of pills to add"
                    keyboardType="numeric"
                    value={newPackageCount}
                    onChangeText={setNewPackageCount}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddNewPackage}>
                    <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
            </View>

            {/* Reminder switch & threshold */}
            <View style={styles.reminderContainer}>
                <Text style={styles.label}>Remind me to refill</Text>
                <Switch
                    value={isReminderEnabled}
                    onValueChange={setIsReminderEnabled}
                />
            </View>
            {isReminderEnabled && (
                <View style={styles.reminderThresholdRow}>
                    <Text style={styles.label}>Remind me at</Text>
                    <TextInput
                        style={[styles.input, { flex: 0.5, marginHorizontal: 8 }]}
                        keyboardType="numeric"
                        placeholder="Pill count"
                        value={reminderThreshold}
                        onChangeText={setReminderThreshold}
                    />
                    <Text style={styles.label}>pills</Text>
                </View>
            )}
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveReminders}>
                <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default InventoryDetail;

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: "#f9f9f9",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 12,
        textAlign: "center",
    },
    label: {
        fontSize: 16,
        marginBottom: 4,
        color: "#333",
    },
    value: {
        fontSize: 18,
        marginBottom: 24,
        color: "#555",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: "row",
        marginBottom: 24,
        alignItems: "center",
    },
    input: {
        flex: 1,
        height: 48,
        backgroundColor: "#fff",
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    addButton: {
        backgroundColor: "#20A0D8",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginLeft: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    addButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    reminderContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        justifyContent: "space-between",
    },
    reminderThresholdRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
    },
    saveButton: {
        backgroundColor: "#0077b6",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
});