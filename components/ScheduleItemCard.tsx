import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import MedicationDetailsModal from "./MedicationDetailsModal";

interface ScheduleItemProps {
    item: {
        scheduleId: number;
        scheduleTimeId: number;
        medication: {
            id: number;
            name: string;
            active_substance?: string;
            quantity?: number;
            nr_of_pills?: number;
            description?: string;
            contraindications?: string;
            side_effect?: string;
            barcode?: string;
        };
        dosage: string;
        time: string;
        isTaken: boolean;
        remainingQuantity: number;
    };
    onPillTaken: () => void;
}

const ScheduleItemCard = ({ item, onPillTaken }: ScheduleItemProps) => {
    const {
        scheduleId,
        scheduleTimeId,
        medication,
        dosage,
        time,
        isTaken: initialTaken,
        remainingQuantity,
    } = item;
    const [taken, setTaken] = useState(initialTaken);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const handleTake = async () => {
        console.log("Taked pill: ", item);
        if (taken) return;
        try {
            const { error: logError } = await supabase
                .from("pill_logs")
                .insert([
                    {
                        schedule_id: scheduleId,
                        schedule_time_id: scheduleTimeId,
                        status: "taken",
                    },
                ]);
            if (logError) throw logError;

            const newRemaining = remainingQuantity - 1;
            const { error: updateError } = await supabase
                .from("medication_schedule")
                .update({ remaining_quantity: newRemaining })
                .eq("id", scheduleId);
            if (updateError) throw updateError;
            else console.log(scheduleId, "updated successfully");

            setTaken(true);
            if (medication?.side_effect) {
                Alert.alert(
                    "🌿 Just a heads-up!",
                    `This medication may have some possible side effects:\n\n${medication.side_effect}\n\nIf you notice anything unusual, don’t hesitate to contact your doctor. 💬`,
                    [{ text: "Got it!", onPress: () => onPillTaken() }],
                    { cancelable: true }
                );
            } else {
                onPillTaken();
            }
        } catch (e: any) {
            console.error("Error logging pill taken:", e);
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            style={styles.scheduleItem}
            onPress={() => setShowDetailsModal(true)}
        >
            <View style={{ flex: 1 }}>
                <Text style={styles.scheduleItemTitle}>
                    {medication?.name || "Medication"}
                </Text>
                {dosage ? (
                    <Text style={styles.scheduleItemDosage}>Dosage: {dosage}</Text>
                ) : null}
                {time ? (
                    <Text style={styles.scheduleItemDosage}>
                        {time}
                    </Text>
                ) : (
                    <Text style={styles.scheduleItemTime}>No times set</Text>
                )}
            </View>

            <TouchableOpacity
                style={[styles.takeButton, taken && styles.takeButtonTaken]}
                onPress={(e) => {
                    e.stopPropagation(); // prevent modal from opening
                    handleTake();
                }}
                disabled={taken}
            >
                <Text style={[styles.takeButtonText, taken && styles.takeButtonTextTaken]}>
                    {taken ? "Taken" : "Take"}
                </Text>
            </TouchableOpacity>

            <MedicationDetailsModal
                isVisible={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                medication={{
                    ...medication,
                    active_substance: medication.active_substance ?? "",
                    quantity: medication.quantity ?? 0,
                    nr_of_pills: medication.nr_of_pills ?? 0,
                    description: medication.description ?? "",
                    contraindications: medication.contraindications ?? "",
                    side_effect: medication.side_effect ?? "",
                    barcode: medication.barcode ?? "",
                }}
            />
        </TouchableOpacity>
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
