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
        time: string; // "HH:MM:SS" sau ""
        status: "none" | "taken" | "skipped" | "snoozed";
        snoozedUntil: string | null;
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
        status: initialStatus,
        snoozedUntil: initialSnooze,
        remainingQuantity,
    } = item;

    const [status, setStatus] = useState(initialStatus);
    const [snoozedUntil, setSnoozedUntil] = useState<string | null>(
        initialSnooze
    );
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // 1) figure out if "now" is past this pill's time—recomputed every render
    const [H, M] = time?.split(":").map(Number) ?? [0, 0];
    const now = new Date();
    const pillTime = new Date();
    pillTime.setHours(H, M, 0, 0);
    const isOverdue = status === "none" && time && now > pillTime;

    // 2) pick a border color
    //    – default aqua, – green if taken, – red if overdue/skipped, – yellow if snoozed
    const borderColor =
        status === "taken"
            ? "#2ecc71"    // emerald green
            : status === "skipped"
                ? "#e74c3c"
                : status === "snoozed"
                    ? "#f1c40f"
                    : isOverdue
                        ? "#e74c3c"  // tomato red
                        : "#90e0ef"; // your light aqua

    const handleTake = async () => {
        console.log("Taked pill: ", item);
        if (status !== "none") return;
        try {
            const payload: Record<string, any> = {
                schedule_id: scheduleId,
                status: "taken",
            };
            if (scheduleTimeId > 0) {
                payload.schedule_time_id = scheduleTimeId;
            }
            const { error: logError } = await supabase
                .from("pill_logs")
                .insert([
                    payload,
                ]);
            if (logError) throw logError;

            const newRemaining = remainingQuantity - 1;
            const { error: updateError } = await supabase
                .from("medication_schedule")
                .update({ remaining_quantity: newRemaining })
                .eq("id", scheduleId);
            if (updateError) throw updateError;
            else console.log(scheduleId, "updated successfully");

            setStatus("taken");
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

    const handleSkip = async () => {
        if (status !== "none") return;
        try {
            await supabase.from("pill_logs").insert([
                {
                    schedule_id: scheduleId,
                    schedule_time_id: scheduleTimeId > 0 ? scheduleTimeId : null,
                    status: "skipped",
                },
            ]);
            setStatus("skipped");
        } catch (e) {
            console.error("Skip error:", e);
        }
    };

    const handleSnooze = async (minutes: number) => {
        if (status !== "none") return;
        const until = new Date(Date.now() + minutes * 60000).toISOString();
        try {
            await supabase.from("pill_logs").insert([
                {
                    schedule_id: scheduleId,
                    schedule_time_id: scheduleTimeId > 0 ? scheduleTimeId : null,
                    status: "snoozed",
                    note: until,
                },
            ]);
            setStatus("snoozed");
            setSnoozedUntil(until);
        } catch (e) {
            console.error("Snooze error:", e);
        }
    };

    const openSnoozeOptions = () => {
        Alert.alert("Snooze for…", "Choose duration:", [
            { text: "5 min", onPress: () => handleSnooze(5) },
            { text: "10 min", onPress: () => handleSnooze(10) },
            { text: "15 min", onPress: () => handleSnooze(15) },
            { text: "Cancel", style: "cancel" },
        ]);
    };

    // Dynamic action label based on status
    const actionLabel =
        status === "taken"
            ? "✅ Taken"
            : status === "skipped"
                ? "🚫 Skipped"
                : status === "snoozed"
                    ? "⏰ Snoozed"
                    : "Take";

    const disabled = status !== "none";

    return (
        <>
            <TouchableOpacity
                activeOpacity={0.9}
                style={[
                    styles.card,
                    { borderColor }             // override the default border
                ]}
                onPress={() => setShowDetailsModal(true)}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleItemTitle}>
                        {medication?.name || "Medication"}
                    </Text>
                    {dosage ? (
                        <Text style={styles.dosage}>Dosage: {dosage}</Text>
                    ) : null}
                    {time ? (
                        <Text style={styles.time}>
                            Time: {time}
                        </Text>
                    ) : (
                        <Text style={styles.time}>No times set</Text>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.actionBtn, disabled && styles.disabledBtn]}
                    onPress={(e) => {
                        e.stopPropagation(); // prevent modal from opening
                        handleTake();
                    }}
                    disabled={disabled}
                >
                    <Text style={[styles.actionText, disabled && styles.disabledText]}>
                        {actionLabel}
                    </Text>
                </TouchableOpacity>
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
                status={status}
                onTake={() => {
                    handleTake();
                    setShowDetailsModal(false);
                }}
                onSkip={() => {
                    handleSkip();
                    setShowDetailsModal(false);
                }}
                onSnooze={() => {
                    openSnoozeOptions();
                    setShowDetailsModal(false);
                }}
            />
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 12,
        borderWidth: 1.2,
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
    dosage: {
        fontSize: 14,
        color: "#333",
        marginBottom: 4,
    },
    time: {
        fontSize: 14,
        color: "#03045e",
    },
    actionBtn: {
        backgroundColor: "#0077b6",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: "center",
        marginLeft: 8,
    },
    actionText: {
        color: "#fff",
        fontWeight: "bold",
    },
    disabledBtn: {
        opacity: 0.5,
    },
    disabledText: {
        color: "#333",
    },
});

export default ScheduleItemCard;
