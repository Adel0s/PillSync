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
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../../components/Header";

// Import the GIF asset
import InventoryIcon from "../../../assets/images/inventory_animated.gif";

const blurhash = 'L038;[xu00WEIQIRRjxy9DRf%Qxx'

interface Medication {
    id: number;
    name: string | null;
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

    // Handler for toggle changes
    const handleToggleReminder = (value: boolean) => {
        setIsReminderEnabled(value);
        // If turning off, reset the threshold to 0 so we can update it to null in DB
        if (!value) {
            setReminderThreshold(0);
        }
    };

    // Add new package of pills
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
            // Fetch medication relation again so the name remains available
            .select("*, medication(*)")
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

    // Update reminder settings
    const handleSaveReminders = async () => {
        if (!schedule) return;

        // If the reminder is enabled, ensure threshold is valid
        if (isReminderEnabled && reminderThreshold <= 0) {
            Alert.alert("Invalid Input", "Please enter a valid threshold number.");
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from("medication_schedule")
            .update({
                reminder_enabled: isReminderEnabled,
                // If reminders are disabled, update the threshold to null, otherwise save the value.
                reminder_threshold: isReminderEnabled ? reminderThreshold : null,
            })
            .eq("id", schedule.id)
            // Fetch medication relation again so the name remains available
            .select("*, medication(*)")
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

    // Confirm new package from stepper
    const confirmNewPackage = () => {
        setShowNewPackageModal(false);
        handleAddNewPackage(packageCount);
        setPackageCount(1);
    };

    // Confirm threshold from stepper
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
            <Header title="Inventory" backRoute={`/refill_tracker/${schedule.id}`} />
            <ScrollView contentContainerStyle={styles.container}>
                <Image
                    style={styles.medImage}
                    source={InventoryIcon}
                    // placeholder={{ blurhash }}
                    contentFit="contain"
                />

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
                    style={styles.actionButton}
                    onPress={() => setShowNewPackageModal(true)}
                >
                    <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.actionIcon} />
                    <Text style={styles.actionButtonText}>Add pills</Text>
                </TouchableOpacity>

                {/* Reminder switch & threshold */}
                <View style={styles.switchContainer}>
                    <Text style={styles.label}>Remind me to refill</Text>
                    <Switch value={isReminderEnabled} onValueChange={handleToggleReminder} />
                </View>

                {isReminderEnabled && (
                    <View style={styles.thresholdRow}>
                        <Text style={styles.label}>Remind me at</Text>
                        <TouchableOpacity
                            style={styles.thresholdButton}
                            onPress={() => {
                                setThresholdStepper(reminderThreshold || 1);
                                setShowThresholdModal(true);
                            }}
                        >
                            <Text style={styles.thresholdButtonText}>
                                {reminderThreshold > 0 ? reminderThreshold : 1} pill(s)
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveReminders}>
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>

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
    medImage: {
        width: 150,
        height: 150,
        alignSelf: "center",
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 12,
        color: "#03045e",
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
        color: "#03045e",
    },
    actionButton: {
        flexDirection: "row",
        backgroundColor: "#20A0D8",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    actionIcon: {
        marginRight: 6,
    },
    actionButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    switchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        justifyContent: "space-between",
    },
    thresholdRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    thresholdButton: {
        backgroundColor: "#fff",
        borderWidth: 2,
        borderColor: "#20A0D8",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    thresholdButtonText: {
        color: "#20A0D8",
        fontWeight: "bold",
        fontSize: 16,
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
        color: "#03045e",
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
        backgroundColor: "#666",
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
