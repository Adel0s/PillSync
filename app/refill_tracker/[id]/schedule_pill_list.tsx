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
    const router = useRouter();

    const [times, setTimes] = useState<ScheduleTime[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [pickerValue, setPickerValue] = useState<Date>(new Date());
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (id) fetchTimes(+id);
    }, [id]);

    async function fetchTimes(scheduleId: number) {
        setLoading(true);
        const { data, error } = await supabase
            .from("medication_schedule_times")
            .select("id, time")
            .eq("schedule_id", scheduleId)
            .order("time", { ascending: true });
        if (error) {
            console.error(error);
            Alert.alert("Error", "Could not load reminder times.");
        } else {
            setTimes(data as ScheduleTime[]);
        }
        setLoading(false);
    }

    function openPicker(entry: ScheduleTime) {
        // create a Date object with today but time from entry.time
        const [hh, mm] = entry.time.split(":").map(Number);
        const date = new Date();
        date.setHours(hh, mm, 0, 0);
        setPickerValue(date);
        setEditingId(entry.id);
        setShowPicker(true);
    }

    async function onPickerChange(
        event: any,
        selected?: Date
    ) {
        setShowPicker(false);
        if (event.type === "set" && editingId !== null && selected) {
            // format to "HH:MM:SS"
            const hh = selected.getHours().toString().padStart(2, "0");
            const mm = selected.getMinutes().toString().padStart(2, "0");
            const newTime = `${hh}:${mm}:00`;

            setLoading(true);
            const { error } = await supabase
                .from("medication_schedule_times")
                .update({ time: newTime })
                .eq("id", editingId);

            if (error) {
                console.error(error);
                Alert.alert("Error", "Could not update time.");
            } else {
                // update local list
                setTimes((ts) =>
                    ts.map((t) =>
                        t.id === editingId ? { ...t, time: newTime } : t
                    )
                );
            }
            setLoading(false);
            setEditingId(null);
        } else {
            setEditingId(null);
        }
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
                            Alert.alert("Error", "Could not delete reminder.");
                        } else {
                            setTimes((ts) =>
                                ts.filter((t) => t.id !== entryId)
                            );
                        }
                        setLoading(false);
                    },
                },
            ],
            { cancelable: true }
        );
    }

    function fmtTime(ts: string) {
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

    return (
        <SafeAreaView style={styles.safeContainer}>
            <Header
                title="Medication schedule"
                backRoute={`/refill_tracker/${id}`}
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
                            onPress={() => openPicker(item)}
                        >
                            <Text style={styles.timeText}>
                                {fmtTime(item.time)}
                            </Text>
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
    trashButton: {
        padding: 8,
    },
});
