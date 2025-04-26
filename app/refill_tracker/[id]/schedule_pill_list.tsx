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
import { supabase } from "../../../lib/supabase";
import Header from "../../../components/Header";

interface ScheduleTime {
    id: number;
    time: string; // "HH:MM:SS"
}

export default function ScheduleList() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const scheduleId = Number(id);
    const router = useRouter();

    const [times, setTimes] = useState<ScheduleTime[]>([]);
    const [asNeeded, setAsNeeded] = useState(false);
    const [loading, setLoading] = useState(true);

    // For editing vs adding
    const [editingId, setEditingId] = useState<number | null>(null);
    const [adding, setAdding] = useState(false);

    // Shared date-picker state
    const [pickerValue, setPickerValue] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (!isNaN(scheduleId)) fetchAll();
    }, [scheduleId]);

    async function fetchAll() {
        setLoading(true);

        // Fetch as_needed + times
        const { data, error } = await supabase
            .from("medication_schedule")
            .select(`
        as_needed,
        medication_schedule_times (
          id,
          time
        )
      `)
            .eq("id", scheduleId)
            .single();

        if (error) {
            console.error(error);
            Alert.alert("Error", "Could not load reminder times.");
        } else {
            setAsNeeded(data.as_needed);
            setTimes(data.medication_schedule_times ?? []);
        }
        setLoading(false);
    }

    function onStartEdit(entry: ScheduleTime) {
        // preload the picker
        const [hh, mm] = entry.time.split(":").map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        setPickerValue(d);
        setEditingId(entry.id);
        setAdding(false);
        setShowPicker(true);
    }

    function onStartAdd() {
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
            // INSERT new time and ask Supabase to return the inserted row
            const { data, error } = await supabase
                .from("medication_schedule_times")
                .insert([{ schedule_id: scheduleId, time: newTime }])
                .select("id, time")           // ← add this
                .single();                    // ← and chain .single()
            if (error) {
                console.error(error);
                Alert.alert("Error", "Failed to add reminder time.");
            } else {
                setTimes((ts) =>
                    [...ts, data].sort((a, b) => a.time.localeCompare(b.time))
                );
                Alert.alert("Success", "Reminder time added.");
            }
        } else if (editingId !== null) {
            // UPDATE existing
            const { error } = await supabase
                .from("medication_schedule_times")
                .update({ time: newTime })
                .eq("id", editingId);
            if (error) {
                console.error(error);
                Alert.alert("Error", "Failed to update reminder time.");
            } else {
                setTimes((ts) =>
                    ts
                        .map((t) => (t.id === editingId ? { ...t, time: newTime } : t))
                        .sort((a, b) => a.time.localeCompare(b.time))
                );
                Alert.alert("Success", "Reminder time updated.");
            }
        }

        setEditingId(null);
        setAdding(false);
        setLoading(false);
    }

    async function deleteTime(entryId: number) {
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
                        const { error } = await supabase
                            .from("medication_schedule_times")
                            .delete()
                            .eq("id", entryId);

                        if (error) {
                            console.error(error);
                            Alert.alert("Error", "Failed to delete reminder.");
                        } else {
                            const newList = times.filter((t) => t.id !== entryId);
                            setTimes(newList);
                            Alert.alert("Deleted", "Reminder removed.");

                            // If that was the last time, convert to as-needed
                            if (newList.length === 0 && !asNeeded) {
                                const { error: e2 } = await supabase
                                    .from("medication_schedule")
                                    .update({ as_needed: true })
                                    .eq("id", scheduleId);

                                if (e2) {
                                    console.error(e2);
                                    Alert.alert(
                                        "Error",
                                        "Failed to switch to As-needed mode."
                                    );
                                } else {
                                    setAsNeeded(true);
                                    Alert.alert(
                                        "As-needed mode",
                                        "No fixed reminders left—switched to As-needed."
                                    );
                                }
                            }
                        }

                        setLoading(false);
                    },
                },
            ],
            { cancelable: true }
        );
    }

    async function convertToAsNeeded() {
        setLoading(true);
        const { error } = await supabase
            .from("medication_schedule")
            .update({ as_needed: true })
            .eq("id", scheduleId);
        setLoading(false);

        if (error) {
            console.error(error);
            Alert.alert("Error", "Failed to set As-needed mode.");
        } else {
            setAsNeeded(true);
            Alert.alert(
                "As-needed mode",
                "This medication is now marked 'As needed'."
            );
        }
    }

    function fmt(ts: string) {
        const [hh, mm] = ts.split(":").map(Number);
        const d = new Date();
        d.setHours(hh, mm);
        return d.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0077b6" />
            </View>
        );
    }

    // AS-NEEDED UI
    if (asNeeded) {
        return (
            <SafeAreaView style={styles.safeContainer}>
                <Header
                    title="Medication schedule"
                    backRoute={`/refill_tracker/${scheduleId}`}
                />
                <View style={styles.center}>
                    <Text style={styles.infoText}>
                        This medication is set to{" "}
                        <Text style={{ fontWeight: "bold" }}>As needed</Text>.
                    </Text>
                    <Text style={styles.subInfo}>
                        No fixed reminder times.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // FIXED-SCHEDULE UI
    const canAdd = times.length < 3;

    return (
        <SafeAreaView style={styles.safeContainer}>
            <Header
                title="Medication schedule"
                backRoute={`/refill_tracker/${scheduleId}`}
            />

            <FlatList
                data={times}
                keyExtractor={(item) => item.id.toString()}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.row}>
                        <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => onStartEdit(item)}
                        >
                            <Text style={styles.timeText}>{fmt(item.time)}</Text>
                            <Ionicons
                                name="chevron-down"
                                size={16}
                                color="#555"
                                style={{ marginLeft: 4 }}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.trashButton}
                            onPress={() => deleteTime(item.id)}
                        >
                            <Ionicons name="trash-outline" size={20} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                )}
            />

            <View style={{ padding: 16 }}>
                {canAdd ? (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={onStartAdd}
                    >
                        <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color="#fff"
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.addText}>Add reminder time</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.convertButton}
                        onPress={convertToAsNeeded}
                    >
                        <Text style={styles.convertText}>
                            More than 3 reminders? Switch to As-needed
                        </Text>
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: { flex: 1, backgroundColor: "#f9f9f9" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    infoText: { fontSize: 18, color: "#555", textAlign: "center" },
    subInfo: { marginTop: 12, color: "#777", textAlign: "center" },
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
    },
    convertText: { color: "#ff8c00", fontSize: 16, fontWeight: "600" },
});
