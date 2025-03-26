import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";

interface ScheduleItemProps {
    item: any;
    onPillTaken: () => void;
}

const ScheduleItemCard = ({ item, onPillTaken }: ScheduleItemProps) => {
    const { medication, medication_schedule_times, dosage, id, isTaken: initialTaken } = item;
    const [taken, setTaken] = useState(initialTaken);

    const handleTake = async () => {
        console.log("Take pill", item);
        if (taken) return;
        try {
            // Insert a pill log record
            const { error: logError } = await supabase.from("pill_logs").insert([
                {
                    schedule_id: id,
                    status: "taken",
                },
            ]);
            if (logError) throw logError;

            // Fetch current remaining_quantity for this schedule
            const { data: scheduleData, error: fetchError } = await supabase
                .from("medication_schedule")
                .select("remaining_quantity")
                .eq("id", id)
                .single();
            if (fetchError) throw fetchError;
            const currentRemaining = scheduleData.remaining_quantity || 0;
            console.log("currentRemaining", currentRemaining);
            if (currentRemaining <= 0) return;
            const newRemaining = currentRemaining - 1;
            console.log("newRemaining", newRemaining);

            // Update the remaining_quantity
            const { error: updateError } = await supabase
                .from("medication_schedule")
                .update({ remaining_quantity: newRemaining })
                .eq("id", id);
            if (updateError) throw updateError;
            else console.log(id);

            setTaken(true);
            onPillTaken();
        } catch (e: any) {
            console.error(e);
        }
    };

    return (
        <View style={styles.scheduleItem}>
            <View style={{ flex: 1 }}>
                <Text style={styles.scheduleItemTitle}>
                    {medication?.name || "Medication"}
                </Text>
                {dosage ? (
                    <Text style={styles.scheduleItemDosage}>Dosage: {dosage}</Text>
                ) : null}
                {medication_schedule_times?.length ? (
                    medication_schedule_times.map((timeObj: any) => (
                        <Text key={timeObj.id} style={styles.scheduleItemTime}>
                            {timeObj.time}
                        </Text>
                    ))
                ) : (
                    <Text style={styles.scheduleItemTime}>No times set</Text>
                )}
            </View>
            <TouchableOpacity
                style={[styles.takeButton, taken && styles.takeButtonTaken]}
                onPress={handleTake}
                disabled={taken}
            >
                <Text style={[styles.takeButtonText, taken && styles.takeButtonTextTaken]}>
                    {taken ? "Taken" : "Take"}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    scheduleItem: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: "#90e0ef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        flexDirection: "row",
        alignItems: "center",
    },
    scheduleItemTitle: {
        fontSize: 16,
        color: "#333",
        fontWeight: "bold",
        marginBottom: 4,
    },
    scheduleItemDosage: {
        fontSize: 14,
        color: "#333",
        marginBottom: 4,
    },
    scheduleItemTime: {
        fontSize: 14,
        color: "#03045e",
    },
    takeButton: {
        backgroundColor: "#0077b6",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: "center",
        marginLeft: 8,
    },
    takeButtonTaken: {
        backgroundColor: "#90e0ef",
    },
    takeButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    takeButtonTextTaken: {
        color: "#333",
    },
});

export default ScheduleItemCard;
