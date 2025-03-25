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
// If you plan to use Ionicons or other icons, import them
// import { Ionicons } from "@expo/vector-icons";
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
    // If you passed in route params (e.g., medicationId) from the scanning page:
    //   router.push({
    //     pathname: "/add_medication/schedule",
    //     params: { medicationId, name, quantity, etc. }
    //   })
    // You can retrieve them here:
    const { medicationId, name, quantity } = useLocalSearchParams<{
        medicationId?: string;
        name?: string;
        quantity?: string;
    }>();

    // State for scheduling
    const [medName, setMedName] = useState(name || "");
    const [dosage, setDosage] = useState(quantity || "");
    const [selectedFrequency, setSelectedFrequency] = useState<number | null>(1);
    const [selectedDuration, setSelectedDuration] = useState<number | null>(7);
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [enableReminders, setEnableReminders] = useState(true);
    const [instructions, setInstructions] = useState("");

    // For demonstration, we assume the user is a "patient" with ID stored in supabase auth
    // or you can pass the patient_id in route params as well.
    const [patientId, setPatientId] = useState<string | null>(null);

    useEffect(() => {
        // Example: get the currently logged in user to retrieve their ID
        supabase.auth.getUser().then(({ data, error }) => {
            if (data?.user) {
                setPatientId(data.user.id);
            }
        });
    }, []);

    // Called when user taps "Add Medication"
    const handleAddMedication = async () => {
        if (!patientId) {
            Alert.alert("Error", "No patient ID found. Please log in first.");
            return;
        }

        // Example insertion flow:
        // 1. If medication is not yet in the DB, you’d create it or use medicationId if it already exists.
        // 2. Insert a row into medication_schedule with the schedule details.
        // 3. If frequency > 0, insert the daily times into medication_schedule_times, etc.

        // For demonstration, let’s do a basic insert into medication_schedule:
        try {
            // Insert into medication_schedule
            const durationDays = selectedDuration === -1 ? 36500 : selectedDuration;
            // If "Ongoing" is chosen, you might store 36500 days or handle it differently

            const { data: scheduleData, error } = await supabase
                .from("medication_schedule")
                .insert([
                    {
                        medication_id: medicationId ? Number(medicationId) : null, // or handle creation if not existing
                        patient_id: patientId,
                        start_date: startDate.toISOString(),
                        duration_days: durationDays,
                        initial_quantity: dosage ? Number(dosage) : 0,
                        remaining_quantity: dosage ? Number(dosage) : 0,
                        instructions,
                        // You could also store a "prescribed_by" or "prescription_date" if needed
                    },
                ])
                .select("*")
                .single();

            if (error) {
                throw error;
            }

            const newScheduleId = scheduleData.id;

            // If frequency > 0, you might create multiple times per day, e.g., morning/noon/evening.
            // For now, let's do a simple example that if selectedFrequency is 2 => 2 times per day at 9 AM and 9 PM, etc.
            if (selectedFrequency && selectedFrequency > 0) {
                const timesToInsert = [];
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
                            notification_offset: enableReminders ? 5 : null, // e.g., 5 minutes prior
                        }))
                    );
                if (timesError) {
                    throw timesError;
                }
            }

            Alert.alert("Success", "Medication schedule added!");
            // Go back home or wherever you want
            router.push("/home");
        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", err.message);
        }
    };

    return (
        <View style={styles.container}>
            {/* You can replace this with your custom header or remove it */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>New Medication</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Card-like container for inputs */}
                <View style={styles.card}>
                    {/* Medication Name */}
                    <TextInput
                        style={styles.input}
                        placeholder="Medication Name"
                        placeholderTextColor="#999"
                        value={medName}
                        onChangeText={setMedName}
                    />

                    {/* Dosage */}
                    <TextInput
                        style={styles.input}
                        placeholder="Dosage (e.g., 500mg)"
                        placeholderTextColor="#999"
                        value={dosage}
                        onChangeText={setDosage}
                        keyboardType="numeric"
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
                    <TouchableOpacity
                        style={[styles.input, { justifyContent: "center" }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={{ color: "#333" }}>
                            Starts {startDate.toLocaleDateString()}
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
