import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    Alert,
    Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../../lib/supabase";
import { WheelPicker } from "react-native-ui-lib";

// Example frequency options
const FREQUENCY_OPTIONS = [
    { label: "Once daily", value: 1 },
    { label: "Twice daily", value: 2 },
    { label: "Three times daily", value: 3 },
    { label: "Four times daily", value: 4 },
    { label: "As needed", value: 0 },
];

// Example duration options
const DURATION_OPTIONS = [
    { label: "7 days", value: 7 },
    { label: "14 days", value: 14 },
    { label: "30 days", value: 30 },
    { label: "90 days", value: 90 },
    { label: "Ongoing", value: -1 },
];

function NotificationOffsetWheel({
    notificationOffset,
    onChange,
}: {
    notificationOffset: number;
    onChange: (value: number) => void;
}) {
    // Create an array of items from 1 to 60
    const items = Array.from({ length: 60 }, (_, i) => ({
        label: (i + 1).toString(),
        value: i + 1,
    }));

    return (
        <View style={styles.wheelContainer}>
            <WheelPicker
                // The number of rows you see at once (including the selected row).
                numberOfVisibleRows={5}
                // Height each row will occupy.
                itemHeight={40}
                // Current selected value
                initialValue={notificationOffset}
                // The array of items (label + value)
                items={items}
                // Called when user scrolls to a new item
                onChange={onChange}
                // Make the picker tall enough so the selected item is clearly centered
                style={styles.wheelPicker}
            />
            <Text style={styles.minutesText}>minutes</Text>
        </View>
    );
}

export default function MedicationSchedulePage() {
    const router = useRouter();
    const { medicationId, name, quantity, nr_of_pills } = useLocalSearchParams<{
        medicationId?: string;
        name?: string;
        quantity?: string;
        nr_of_pills?: string;
    }>();

    const [medName, setMedName] = useState(name || "");
    const [medStrength, setMedStrength] = useState(quantity || "");
    const [dosage, setDosage] = useState("");
    const [initialQuantity, setInitialQuantity] = useState(
        nr_of_pills ? Number(nr_of_pills) : 0
    );

    // Scheduling details
    const [selectedFrequency, setSelectedFrequency] = useState<number | null>(1);
    const [selectedDuration, setSelectedDuration] = useState<number | null>(7);
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [enableReminders, setEnableReminders] = useState(true);
    const [instructions, setInstructions] = useState("");

    // State for custom duration
    const [isCustomDuration, setIsCustomDuration] = useState(false);
    const [customDuration, setCustomDuration] = useState("");

    // New state for notification offset (in minutes)
    const [notificationOffset, setNotificationOffset] = useState(5);
    const [showNotificationPicker, setShowNotificationPicker] = useState(false);
    const [dosageError, setDosageError] = useState("");

    const [patientId, setPatientId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setPatientId(data.user.id);
            }
        });
    }, []);

    const handleAddMedication = async () => {
        if (dosage.trim() === "") {
            setDosageError("Dosage is required.");
            return;
        }
        setDosageError(""); // Clear error if dosage is valid

        if (!patientId) {
            Alert.alert("Error", "No patient ID found. Please log in first.");
            return;
        }

        try {
            let durationDays: number;
            if (isCustomDuration) {
                durationDays = Number(customDuration);
                if (isNaN(durationDays) || durationDays <= 0) {
                    Alert.alert("Error", "Please enter a valid number of days for the custom duration.");
                    return;
                }
            } else {
                durationDays = selectedDuration === -1 ? 36500 : (selectedDuration as number);
            }

            // Insert schedule
            const { data: scheduleData, error } = await supabase
                .from("medication_schedule")
                .insert([
                    {
                        medication_id: medicationId ? Number(medicationId) : null,
                        patient_id: patientId,
                        start_date: startDate.toISOString(),
                        duration_days: durationDays,
                        initial_quantity: initialQuantity,
                        remaining_quantity: initialQuantity,
                        instructions: instructions,
                        dosage: dosage,
                    },
                ])
                .select("*")
                .single();

            if (error) throw error;

            const newScheduleId = scheduleData.id;

            // Insert times based on selected frequency
            if (selectedFrequency && selectedFrequency > 0) {
                const timesToInsert: string[] = [];
                if (selectedFrequency === 1) {
                    timesToInsert.push("09:00:00");
                } else if (selectedFrequency === 2) {
                    timesToInsert.push("09:00:00", "21:00:00");
                } else if (selectedFrequency === 3) {
                    timesToInsert.push("08:00:00", "14:00:00", "20:00:00");
                } else if (selectedFrequency === 4) {
                    timesToInsert.push("06:00:00", "12:00:00", "18:00:00", "23:00:00");
                }
                const { error: timesError } = await supabase
                    .from("medication_schedule_times")
                    .insert(
                        timesToInsert.map((t) => ({
                            schedule_id: newScheduleId,
                            time: t,
                            notification_offset: enableReminders ? notificationOffset : null,
                        }))
                    );
                if (timesError) throw timesError;
            }

            Alert.alert("Success", "Medication schedule added!");
            router.push("/home");
        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", err.message);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>New Medication</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.label}>Medication Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Medication Name"
                        placeholderTextColor="#999"
                        value={medName}
                        onChangeText={setMedName}
                    />

                    <Text style={styles.label}>Medication Strength</Text>
                    <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={medStrength}
                        editable={false}
                    />

                    <Text style={styles.label}>Number of pills</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter total pills (e.g. 10)"
                        placeholderTextColor="#999"
                        value={String(initialQuantity)}
                        onChangeText={(val) => setInitialQuantity(Number(val))}
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>Dosage</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 2 capsules"
                        placeholderTextColor="#999"
                        value={dosage}
                        onChangeText={(text) => {
                            setDosage(text);
                            if (text.trim() !== "") {
                                setDosageError("");
                            }
                        }}
                    />
                    {/* Conditionally render error message */}
                    {dosageError !== "" && (
                        <Text style={styles.errorText}>{dosageError}</Text>
                    )}


                    <Text style={styles.sectionTitle}>How often?</Text>
                    <View style={styles.optionsRow}>
                        {FREQUENCY_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.optionButton,
                                    selectedFrequency === option.value && styles.optionButtonSelected,
                                ]}
                                onPress={() => setSelectedFrequency(option.value)}
                            >
                                <Text
                                    style={[
                                        styles.optionButtonText,
                                        selectedFrequency === option.value && styles.optionButtonTextSelected,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>For how long?</Text>
                    <View style={styles.optionsRow}>
                        {DURATION_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.optionButton,
                                    !isCustomDuration && selectedDuration === option.value && styles.optionButtonSelected,
                                ]}
                                onPress={() => {
                                    setIsCustomDuration(false);
                                    setSelectedDuration(option.value);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.optionButtonText,
                                        !isCustomDuration && selectedDuration === option.value && styles.optionButtonTextSelected,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                isCustomDuration && styles.optionButtonSelected,
                            ]}
                            onPress={() => {
                                setIsCustomDuration(true);
                                setSelectedDuration(null);
                            }}
                        >
                            <Text
                                style={[
                                    styles.optionButtonText,
                                    isCustomDuration && styles.optionButtonTextSelected,
                                ]}
                            >
                                Custom
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {isCustomDuration && (
                        <TextInput
                            style={[styles.input, { marginBottom: 16 }]}
                            placeholder="Enter number of days"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={customDuration}
                            onChangeText={setCustomDuration}
                        />
                    )}

                    <Text style={styles.label}>Start Date</Text>
                    <TouchableOpacity
                        style={[styles.input, { justifyContent: "center" }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={{ color: "#333" }}>
                            {startDate.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) {
                                    setStartDate(selectedDate);
                                }
                            }}
                        />
                    )}

                    <View style={styles.reminderRow}>
                        <Text style={styles.reminderText}>
                            Get notified when it's time to take your medications
                        </Text>
                        <Switch
                            trackColor={{ false: "#767577", true: "#90e0ef" }}
                            thumbColor={enableReminders ? "#0077b6" : "#f4f3f4"}
                            onValueChange={setEnableReminders}
                            value={enableReminders}
                        />
                    </View>

                    {enableReminders && (
                        <TouchableOpacity
                            style={styles.notificationButton}
                            onPress={() => setShowNotificationPicker(true)}
                        >
                            <Text style={styles.notificationButtonText}>
                                Set reminder: {notificationOffset} minutes
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>Special Instructions</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                        multiline
                        placeholder="Add notes or special instructions..."
                        placeholderTextColor="#999"
                        value={instructions}
                        onChangeText={setInstructions}
                    />
                </View>

                <TouchableOpacity style={styles.addButton} onPress={handleAddMedication}>
                    <Text style={styles.addButtonText}>Add Medication</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Modal for Notification Offset Picker */}
            <Modal
                visible={showNotificationPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowNotificationPicker(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <NotificationOffsetWheel
                            notificationOffset={notificationOffset}
                            onChange={setNotificationOffset}
                        />
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowNotificationPicker(false)}
                        >
                            <Text style={styles.modalCloseButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        backgroundColor: "#0077b6",
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 20,
        color: "#fff",
        fontWeight: "bold",
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#90e0ef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#03045e",
        marginBottom: 4,
    },
    input: {
        height: 48,
        borderColor: "#ddd",
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 16,
        paddingHorizontal: 12,
        backgroundColor: "#f9f9f9",
        color: "#333",
    },
    readOnlyInput: {
        backgroundColor: "#e0e0e0",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        color: "#03045e",
    },
    optionsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 16,
    },
    optionButton: {
        backgroundColor: "#f9f9f9",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    optionButtonSelected: {
        backgroundColor: "#00b4d8",
        borderColor: "#00b4d8",
    },
    optionButtonText: {
        color: "#333",
        fontSize: 14,
        fontWeight: "500",
    },
    optionButtonTextSelected: {
        color: "#fff",
    },
    reminderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        justifyContent: "space-between",
    },
    reminderText: {
        fontSize: 14,
        color: "#03045e",
        flexShrink: 1,
        marginRight: 8,
    },
    notificationButton: {
        backgroundColor: "#0077b6",
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
        marginBottom: 16,
    },
    notificationButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    addButton: {
        backgroundColor: "#0077b6",
        borderRadius: 8,
        paddingVertical: 16,
        marginTop: 20,
        alignItems: "center",
    },
    addButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 16,
        width: "80%",
        alignItems: "center",
    },
    modalCloseButton: {
        marginTop: 16,
        backgroundColor: "#0077b6",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    modalCloseButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    // Styles for the wheel picker using react-native-ui-lib
    wheelContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 16,
    },
    wheelPicker: {
        height: 200,   // Enough height so the selected item is clearly in the center
        width: 100,
    },
    minutesText: {
        fontSize: 16,
        color: "#03045e",
        fontWeight: "600",
        marginLeft: 8,
    },
    errorText: {
        color: "red",
        fontSize: 12,
        marginBottom: 8,
        marginTop: -8,
    },
});