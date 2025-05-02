// app/refill_tracker/[id]/schedule_pill_list.tsx
import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../../components/Header";
import {
    ScheduleTime,
    fetchScheduleDetails,
    addScheduleTime,
    updateScheduleTime,
    deleteScheduleTime,
    setAsNeeded,
    unsetAsNeeded,
} from "../../../services/medicationScheduleService";

export default function SchedulePillList() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const scheduleId = Number(id);
    const router = useRouter();

    const [times, setTimes] = useState<ScheduleTime[]>([]);
    const [asNeeded, setAsNeededState] = useState(false);
    const [startDate, setStartDate] = useState<string>("");
    const [durationDays, setDurationDays] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // For editing vs adding
    const [editingId, setEditingId] = useState<number | null>(null);
    const [adding, setAdding] = useState(false);

    // Shared date-picker state
    const [pickerValue, setPickerValue] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (!isNaN(scheduleId)) loadSchedule();
    }, [scheduleId]);

    async function loadSchedule() {
        setLoading(true);
        const { data, error } = await fetchScheduleDetails(scheduleId);
        if (error || !data) {
            console.error(error);
            Alert.alert("Error", "Could not load reminder times.");
        } else {
            setAsNeededState(data.as_needed);
            setTimes(data.medication_schedule_times || []);
            setStartDate(data.start_date);
            setDurationDays(data.duration_days);
        }
        setLoading(false);
    }

    function openEdit(entry: ScheduleTime) {
        const [hh, mm] = entry.time.split(":").map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        setPickerValue(d);
        setEditingId(entry.id);
        setAdding(false);
        setShowPicker(true);
    }

    function openAdd() {
        const now = new Date();
        now.setSeconds(0, 0);
        setPickerValue(now);
        setEditingId(null);
        setAdding(true);
        setShowPicker(true);
    }

    async function onPickerChange(
        event: any,
        selected?: Date
    ) {
        setShowPicker(false);
        if (event.type !== "set" || !selected) {
            setEditingId(null);
            setAdding(false);
            return;
        }

        const hh = selected.getHours().toString().padStart(2, "0");
        const mm = selected.getMinutes().toString().padStart(2, "0");
        const newTime = `${hh}:${mm}:00`;

        setLoading(true);
        if (adding) {
            const { data, error } = await addScheduleTime(scheduleId, newTime);
            if (error || !data) {
                console.error(error);
                Alert.alert("Error", "Failed to add reminder time.");
            } else {
                setTimes(ts =>
                    [...ts, data].sort((a, b) => a.time.localeCompare(b.time))
                );
                Alert.alert("Success", "Reminder time added.");
            }
        } else if (editingId !== null) {
            const { error } = await updateScheduleTime(editingId, newTime);
            if (error) {
                console.error(error);
                Alert.alert("Error", "Failed to update reminder time.");
            } else {
                setTimes(ts =>
                    ts
                        .map(t => (t.id === editingId ? { ...t, time: newTime } : t))
                        .sort((a, b) => a.time.localeCompare(b.time))
                );
                Alert.alert("Success", "Reminder time updated.");
            }
        }
        setEditingId(null);
        setAdding(false);
        setLoading(false);
    }

    async function handleDelete(entryId: number) {
        Alert.alert(
            "Delete Reminder",
            "Remove this reminder time?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        const { error } = await deleteScheduleTime(entryId);
                        if (error) {
                            console.error(error);
                            Alert.alert("Error", "Failed to delete reminder.");
                        } else {
                            const newList = times.filter(t => t.id !== entryId);
                            setTimes(newList);
                            Alert.alert("Deleted", "Reminder removed.");

                            if (newList.length === 0 && !asNeeded) {
                                const { error: e2 } = await setAsNeeded(scheduleId);
                                if (!e2) {
                                    setAsNeededState(true);
                                    Alert.alert("As-needed mode", "Switched to As-needed.");
                                } else {
                                    console.error(e2);
                                    Alert.alert("Error", "Failed to switch to As-needed mode.");
                                }
                            }
                        }
                        setLoading(false);
                    },
                },
            ]);
    }

    async function handleConvertBack() {
        // 1) unset as_needed
        console.log("Converting back to fixed schedule...");
        setLoading(true);
        const { error } = await unsetAsNeeded(scheduleId);
        if (error) {
            Alert.alert("Error", "Could not switch back to fixed schedule.");
            setLoading(false);
            return;
        }
        setAsNeededState(false);
        // 2) immediately open the picker to add your first fixed reminder time
        openAdd();
        setLoading(false);
    }

    function fmt(ts: string) {
        const [hh, mm] = ts.split(":").map(Number);
        const d = new Date();
        d.setHours(hh, mm);
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    // Frequency label
    const freqCount = times.length;
    let frequencyLabel = asNeeded
        ? "As needed"
        : freqCount === 1
            ? "Once daily"
            : freqCount === 2
                ? "Twice daily"
                : `${freqCount} times daily`;

    // Duration label
    // If no duration, show "No end date"
    let durationLabel = "No end date";
    if (durationDays > 0) {
        const end = new Date(startDate);
        end.setDate(end.getDate() + durationDays);
        durationLabel = `Ends on ${end.toLocaleDateString()}`;
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0077b6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeContainer}>
            <Header title="Medication schedule" backRoute={`/refill_tracker/${scheduleId}`} />

            {/* Frequency */}
            <View style={styles.card}>
                <View style={styles.cardRow}>
                    <Ionicons name="repeat-outline" size={24} color="#03045e" style={styles.cardIcon} />
                    <View>
                        <Text style={styles.cardTitle}>Frequency</Text>
                        <Text style={styles.cardSubtitle}>{frequencyLabel}</Text>
                    </View>
                </View>
            </View>

            {/* Duration */}
            <View style={styles.card}>
                <View style={styles.cardRow}>
                    <Ionicons name="calendar-outline" size={24} color="#03045e" style={styles.cardIcon} />
                    <View>
                        <Text style={styles.cardTitle}>Duration</Text>
                        <Text style={styles.cardSubtitle}>{durationLabel}</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.sectionHeader}>Reminder details</Text>

            {asNeeded ? (
                <View style={styles.center}>
                    <Text style={styles.infoText}>
                        This medication is set to <Text style={{ fontWeight: "bold" }}>As needed</Text>.
                    </Text>
                    <TouchableOpacity style={styles.convertButton} onPress={handleConvertBack}>
                        <Text style={styles.convertText}>Switch to fixed schedule</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <FlatList
                        data={times}
                        keyExtractor={item => item.id.toString()}
                        ItemSeparatorComponent={() => <View style={styles.sep} />}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => (
                            <View style={styles.row}>
                                <TouchableOpacity style={styles.timeButton} onPress={() => openEdit(item)}>
                                    <Text style={styles.timeText}>{fmt(item.time)}</Text>
                                    <Ionicons name="chevron-down" size={16} color="#555" style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.trashButton} onPress={() => handleDelete(item.id)}>
                                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                </TouchableOpacity>
                            </View>
                        )}
                    />

                    <View style={styles.footer}>
                        {times.length < 3 ? (
                            <TouchableOpacity style={styles.addButton} onPress={() => openAdd()}>
                                <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={styles.addText}>Add reminder time</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.convertButton} onPress={handleConvertBack}>
                                <Text style={styles.convertText}>Switch to As-needed</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {showPicker && (
                        <DateTimePicker
                            value={pickerValue}
                            mode="time"
                            display={Platform.OS === "ios" ? "spinner" : "default"}
                            onChange={onPickerChange}
                        />
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: { flex: 1, backgroundColor: "#f9f9f9" },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#90e0ef",
    },
    cardRow: { flexDirection: "row", alignItems: "center" },
    cardIcon: { marginRight: 12 },
    cardTitle: { fontSize: 16, fontWeight: "600", color: "#03045e" },
    cardSubtitle: { fontSize: 14, color: "#555", marginTop: 4 },
    sectionHeader: {
        marginTop: 24,
        marginHorizontal: 16,
        fontSize: 18,
        fontWeight: "600",
        color: "#03045e",
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    infoText: { fontSize: 16, color: "#555", textAlign: "center", margin: 16 },
    list: { padding: 16 },
    sep: { height: 12 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#90e0ef",
    },
    timeButton: {
        flexDirection: "row",
        alignItems: "center",
    },
    timeText: { fontSize: 18, color: "#03045e" },
    trashButton: { padding: 8 },
    footer: { padding: 16 },
    addButton: {
        flexDirection: "row",
        backgroundColor: "#0077b6",
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    addText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    convertButton: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ff8c00",
        alignItems: "center",
        marginTop: 12,
    },
    convertText: { color: "#ff8c00", fontSize: 16, fontWeight: "600" },
});
