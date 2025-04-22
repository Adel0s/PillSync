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
import Header from "../../components/Header";

// Example frequency options
const FREQUENCY_OPTIONS = [
    { label: "Once daily", value: 1 },
    { label: "Twice daily", value: 2 },
    { label: "Three times daily", value: 3 },
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
                numberOfVisibleRows={5}
                itemHeight={40}
                initialValue={notificationOffset}
                items={items}
                onChange={onChange}
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

    // Notification offset
    const [notificationOffset, setNotificationOffset] = useState(5);
    const [showNotificationPicker, setShowNotificationPicker] = useState(false);
    const [dosageError, setDosageError] = useState("");

    // Track authenticated user
    const [patientId, setPatientId] = useState<string | null>(null);

    // State for dose times and controlling each time picker
    const [doseTimes, setDoseTimes] = useState<Date[]>([]);
    const [showTimePickerIndex, setShowTimePickerIndex] = useState<number | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setPatientId(data.user.id);
            }
        });
    }, []);

    // Whenever selectedFrequency changes, reset doseTimes
    useEffect(() => {
        if (selectedFrequency && selectedFrequency > 0) {
            const newTimes: Date[] = [];
            for (let i = 0; i < selectedFrequency; i++) {
                newTimes.push(new Date()); // default to now
            }
            setDoseTimes(newTimes);
        } else {
            setDoseTimes([]);
        }
    }, [selectedFrequency]);

    const handleAddMedication = async () => {
        if (dosage.trim() === "") {
            setDosageError("Dosage is required.");
            return;
        }
        setDosageError("");

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

            // Convert chosen doseTimes to "HH:mm:00" strings
            if (selectedFrequency && selectedFrequency > 0) {
                const formatTime = (date: Date) => {
                    const hh = String(date.getHours()).padStart(2, "0");
                    const mm = String(date.getMinutes()).padStart(2, "0");
                    return `${hh}:${mm}:00`;
                };
                const timesToInsert = doseTimes.map((t) => formatTime(t));
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
            <Header title="New Medication" backRoute="/home" />

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
                    {/* Render a time picker for each dose based on selectedFrequency */}
                    {doseTimes.map((time, index) => (
                        <View key={index} style={{ marginBottom: 16 }}>
                            <Text style={styles.label}>
                                Dose Time #{index + 1}
                            </Text>
                            <TouchableOpacity
                                style={[styles.input, { justifyContent: "center" }]}
                                onPress={() => setShowTimePickerIndex(index)}
                            >
                                <Text style={{ color: "#333" }}>
                                    {time.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </Text>
                            </TouchableOpacity>
                            {showTimePickerIndex === index && (
                                <DateTimePicker
                                    value={time}
                                    mode="time"
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        if (selectedDate) {
                                            const updated = [...doseTimes];
                                            updated[index] = selectedDate;
                                            setDoseTimes(updated);
                                        }
                                        setShowTimePickerIndex(null);
                                    }}
                                />
                            )}
                        </View>
                    ))}

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
        height: 200,
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