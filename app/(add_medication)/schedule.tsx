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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../../lib/supabase";

// Example frequency options
const FREQUENCY_OPTIONS = [
    { label: "Once daily", value: 1 },
    { label: "Twice daily", value: 2 },
    { label: "Three times daily", value: 3 },
    { label: "Four times daily", value: 4 },
    { label: "As needed", value: 0 }, // or handle "as needed" differently
];

// Example duration options
const DURATION_OPTIONS = [
    { label: "7 days", value: 7 },
    { label: "14 days", value: 14 },
    { label: "30 days", value: 30 },
    { label: "90 days", value: 90 },
    { label: "Ongoing", value: -1 }, // or handle "ongoing" differently
];

export default function MedicationSchedulePage() {
    const router = useRouter();
    // Retrieve data passed from the scanning/manual-entry page.
    // e.g., router.push({ pathname: "/add_medication/schedule", params: { medicationId, name, quantity, nr_of_pills } })
    const { medicationId, name, quantity, nr_of_pills } = useLocalSearchParams<{
        medicationId?: string;
        name?: string;
        quantity?: string;      // e.g., "400 mg" or just "400"
        nr_of_pills?: string;   // e.g., "10"
    }>();

    // Distinguish medication strength from dosage
    const [medName, setMedName] = useState(name || "");
    const [medStrength, setMedStrength] = useState(quantity || ""); // read-only display for "400 mg"
    const [dosage, setDosage] = useState(""); // user-entered (e.g. "2 capsules")

    // Use nr_of_pills as initial quantity in the schedule
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

    // For demonstration, assume the user is a "patient" with ID from Supabase auth
    const [patientId, setPatientId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setPatientId(data.user.id);
            }
        });
    }, []);

    const handleAddMedication = async () => {
        if (!patientId) {
            Alert.alert("Error", "No patient ID found. Please log in first.");
            return;
        }

        try {
            // If "Ongoing" is selected, you might store a large number or handle differently
            const durationDays = selectedDuration === -1 ? 36500 : selectedDuration;

            // Insert schedule
            const { data: scheduleData, error } = await supabase
                .from("medication_schedule")
                .insert([
                    {
                        medication_id: medicationId ? Number(medicationId) : null,
                        patient_id: patientId,
                        start_date: startDate.toISOString(),
                        duration_days: durationDays,
                        // Use the number_of_pills as the initial quantity
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
                // Insert each time row
                const { error: timesError } = await supabase
                    .from("medication_schedule_times")
                    .insert(
                        timesToInsert.map((t) => ({
                            schedule_id: newScheduleId,
                            time: t,
                            notification_offset: enableReminders ? 5 : null, // e.g., 5 min prior
                        }))
                    );
                if (timesError) throw timesError;
            }

            Alert.alert("Success", "Medication schedule added!");
            // Navigate away (e.g. to home)
            router.push("/home");
        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", err.message);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>New Medication</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    {/* Medication Name */}
                    <Text style={styles.label}>Medication Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Medication Name"
                        placeholderTextColor="#999"
                        value={medName}
                        onChangeText={setMedName}
                    />

                    {/* Medication Strength (read-only) */}
                    <Text style={styles.label}>Medication Strength</Text>
                    <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={medStrength}
                        editable={false}
                    />

                    {/* Number of Pills (initial quantity) */}
                    <Text style={styles.label}>Number of pills</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter total pills (e.g. 10)"
                        placeholderTextColor="#999"
                        value={String(initialQuantity)}
                        onChangeText={(val) => setInitialQuantity(Number(val))}
                        keyboardType="numeric"
                    />

                    {/* Dosage (e.g. 2 capsules) */}
                    <Text style={styles.label}>Dosage</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 2 capsules"
                        placeholderTextColor="#999"
                        value={dosage}
                        onChangeText={setDosage}
                    />

                    {/* Frequency */}
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

                    {/* Duration */}
                    <Text style={styles.sectionTitle}>For how long?</Text>
                    <View style={styles.optionsRow}>
                        {DURATION_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.optionButton,
                                    selectedDuration === option.value && styles.optionButtonSelected,
                                ]}
                                onPress={() => setSelectedDuration(option.value)}
                            >
                                <Text
                                    style={[
                                        styles.optionButtonText,
                                        selectedDuration === option.value && styles.optionButtonTextSelected,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Start Date */}
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

                    {/* Reminders */}
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

                    {/* Notes or instructions */}
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

                {/* Add Medication Button */}
                <TouchableOpacity style={styles.addButton} onPress={handleAddMedication}>
                    <Text style={styles.addButtonText}>Add Medication</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

// Example styling with your color palette
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#caf0f8",
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
        backgroundColor: "#e0e0e0", // visually indicate read-only
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
});
