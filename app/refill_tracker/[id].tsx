import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ActivityIndicator,
    Alert,
    ScrollView,
    Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header"; // Adjust path as needed

// Assuming medication_schedule has reminder_enabled and reminder_threshold
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
    reminder_enabled?: boolean;
    reminder_threshold?: number;
    medication?: Medication;
}

const InventoryDetail: React.FC = () => {
    // The schedule ID from the route (e.g., /refill_tracker/123)
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [schedule, setSchedule] = useState<MedicationSchedule | null>(null);

    // Reminder states
    const [isReminderEnabled, setIsReminderEnabled] = useState<boolean>(false);
    const [reminderThreshold, setReminderThreshold] = useState<number>(0);

    // Add new package: open/close modal + stepper value
    const [showNewPackageModal, setShowNewPackageModal] = useState(false);
    const [packageCount, setPackageCount] = useState<number>(1);

    // Remind at X pills: open/close modal + stepper value
    const [showThresholdModal, setShowThresholdModal] = useState(false);
    const [thresholdStepper, setThresholdStepper] = useState<number>(1);

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
        const scheduleData = data as MedicationSchedule;
        setSchedule(scheduleData);

        // Initialize local states from schedule
        setIsReminderEnabled(scheduleData.reminder_enabled ?? false);
        setReminderThreshold(scheduleData.reminder_threshold ?? 0);

        setLoading(false);
    };

    // Handler: adding a new package of pills, triggered after user confirms the stepper
    const handleAddNewPackage = async (toAdd: number) => {
        if (!schedule) return;
        if (toAdd <= 0) {
            Alert.alert("Invalid Input", "Package count must be greater than 0.");
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
            setSchedule(data as MedicationSchedule);
            Alert.alert("Success", `Added ${toAdd} pill(s) to inventory.`);
        }
        setLoading(false);
    };

    // Handler: updating reminder settings in the database
    const handleSaveReminders = async () => {
        if (!schedule) return;

        let thresholdNum = reminderThreshold;
        if (isReminderEnabled && thresholdNum <= 0) {
            Alert.alert("Invalid Input", "Please enter a valid threshold number.");
            return;
        }
        // If reminders are disabled, set threshold to 0 or null
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

    // Confirm new package from the stepper
    const confirmNewPackage = () => {
        setShowNewPackageModal(false);
        handleAddNewPackage(packageCount);
        setPackageCount(1); // reset the stepper
    };

    // Confirm threshold from the stepper
    const confirmThreshold = () => {
        setReminderThreshold(thresholdStepper);
        setShowThresholdModal(false);
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
        <SafeAreaView style={styles.safeContainer}>
            <Header title="Inventory" backRoute="/refill_tracker" />
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>
                    {schedule.medication?.name || "Medication"}
                </Text>

                <Text style={styles.label}>Current inventory</Text>
                <Text style={styles.value}>
                    {schedule.remaining_quantity ?? 0} pill(s) left
                </Text>

                {/* Add new package */}
                <Text style={styles.sectionTitle}>Add new package</Text>
                <TouchableOpacity
                    style={styles.showModalButton}
                    onPress={() => setShowNewPackageModal(true)}
                >
                    <Text style={styles.showModalButtonText}>Add pills</Text>
                </TouchableOpacity>

                {/* Reminder switch & threshold */}
                <View style={styles.reminderContainer}>
                    <Text style={styles.label}>Remind me to refill</Text>
                    <Switch value={isReminderEnabled} onValueChange={setIsReminderEnabled} />
                </View>
                {isReminderEnabled && (
                    <>
                        <View style={styles.reminderRow}>
                            <Text style={styles.label}>Remind me at</Text>
                            <TouchableOpacity
                                style={styles.showModalButton}
                                onPress={() => {
                                    setThresholdStepper(reminderThreshold || 1);
                                    setShowThresholdModal(true);
                                }}
                            >
                                <Text style={styles.showModalButtonText}>
                                    {reminderThreshold > 0 ? reminderThreshold : 1} pill(s)
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveReminders}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* Modal for adding new package */}
                <Modal
                    visible={showNewPackageModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowNewPackageModal(false)}
                >
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Add Pills</Text>
                            <View style={styles.stepperRow}>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => setPackageCount((count) => Math.max(count - 1, 1))}
                                >
                                    <Text style={styles.stepperButtonText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>{packageCount} pill(s)</Text>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => setPackageCount((count) => count + 1)}
                                >
                                    <Text style={styles.stepperButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => {
                                        setShowNewPackageModal(false);
                                        setPackageCount(1);
                                    }}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.okButton]}
                                    onPress={confirmNewPackage}
                                >
                                    <Text style={styles.modalButtonText}>OK</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Modal for threshold stepper */}
                <Modal
                    visible={showThresholdModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowThresholdModal(false)}
                >
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Remind Me At</Text>
                            <View style={styles.stepperRow}>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => setThresholdStepper((val) => Math.max(val - 1, 1))}
                                >
                                    <Text style={styles.stepperButtonText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>{thresholdStepper} pill(s)</Text>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => setThresholdStepper((val) => val + 1)}
                                >
                                    <Text style={styles.stepperButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setShowThresholdModal(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.okButton]}
                                    onPress={confirmThreshold}
                                >
                                    <Text style={styles.modalButtonText}>OK</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
};

export default InventoryDetail;

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "#f9f9f9",
    },
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
    showModalButton: {
        backgroundColor: "#20A0D8",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 24,
    },
    showModalButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    reminderContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        justifyContent: "space-between",
    },
    reminderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        justifyContent: "flex-start",
    },
    saveButton: {
        backgroundColor: "#0077b6",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 24,
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    /* Modal Styles */
    modalBackground: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        width: "80%",
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 16,
    },
    stepperRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    stepperButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#0077b6",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 10,
    },
    stepperButtonText: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
    },
    stepperValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        minWidth: 60,
        textAlign: "center",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "80%",
    },
    modalButton: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        marginHorizontal: 4,
        borderRadius: 8,
    },
    cancelButton: {
        backgroundColor: "#FF3B30",
    },
    okButton: {
        backgroundColor: "#0077b6",
    },
    modalButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});
