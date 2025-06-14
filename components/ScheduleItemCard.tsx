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
import { cancelLocalNotification, scheduleLocalNotificationInSeconds, scheduleLowInventoryNotification } from "../services/notificationService";
import * as Notifications from "expo-notifications";

interface ScheduleItemProps {
    item: {
        scheduleId: number;
        scheduleTimeId: number;
        logId: number | null;
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
        reminder_enabled: boolean;
        reminder_threshold: number;
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
        reminder_enabled,
        reminder_threshold,
    } = item;

    const [status, setStatus] = useState(initialStatus);
    const [snoozedUntil, setSnoozedUntil] = useState<string | null>(
        initialSnooze
    );
    const [logId, setLogId] = useState<number | null>(item.logId);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [notificationId, setNotificationId] = useState<string | null>(null);

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
        if (notificationId) {
            await cancelLocalNotification(notificationId);
            console.log("Cancelled notification:", notificationId);
            setNotificationId(null);
        }
        try {
            if (logId) {
                // pill has already a status(snoozed) - update the existing log
                await supabase
                    .from("pill_logs")
                    .update({ status: "taken", taken_at: new Date().toISOString() })
                    .eq("id", logId);
            } else {
                // no log - insert a new one
                const payload: any = {
                    schedule_id: scheduleId,
                    status: "taken",
                };
                if (scheduleTimeId > 0) {
                    payload.schedule_time_id = scheduleTimeId;
                }
                const { data: newLog, error: logError } = await supabase
                    .from("pill_logs")
                    .insert([payload])
                    .select("id")
                    .single();
                if (logError) throw logError;
                setLogId(newLog.id);
            }

            const newRemaining = remainingQuantity - 1;
            const { error: updateError } = await supabase
                .from("medication_schedule")
                .update({ remaining_quantity: newRemaining })
                .eq("id", scheduleId);
            if (updateError) throw updateError;
            else {
                console.log(scheduleId, "updated successfully");
                if (reminder_enabled && newRemaining === reminder_threshold) {
                    await scheduleLowInventoryNotification(medication.name, newRemaining);
                }
            }

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
        if (notificationId) {
            await cancelLocalNotification(notificationId);
            console.log("Cancelled notification:", notificationId);
            setNotificationId(null);
        }
        try {
            if (logId) {
                await supabase
                    .from("pill_logs")
                    .update({ status: "skipped", taken_at: new Date().toISOString() })
                    .eq("id", logId);
            } else {
                const { data: newLog, error: insErr } = await supabase
                    .from("pill_logs")
                    .insert([{
                        schedule_id: scheduleId,
                        schedule_time_id: scheduleTimeId > 0 ? scheduleTimeId : null,
                        status: "skipped",
                    }])
                    .select("id")
                    .single();
                if (insErr) throw insErr;
                setLogId(newLog.id);
            }
            setStatus("skipped");
        } catch (e) {
            console.error("Skip error:", e);
        }
    };

    const handleSnooze = async (minutes: number) => {
        if (status !== "none") return;
        const until = new Date(Date.now() + minutes * 60000).toISOString();
        const snoozeTimeInSeconds = minutes * 60;
        try {
            if (logId) {
                // 1) already have a log pending → update it to snoozed
                await supabase
                    .from("pill_logs")
                    .update({
                        status: "snoozed",
                        note: until,
                        processed: false,
                    })
                    .eq("id", logId);
            } else {
                // 2) no log exists → insert a new one
                const { data: newLog, error: insErr } = await supabase
                    .from("pill_logs")
                    .insert([{
                        schedule_id: scheduleId,
                        schedule_time_id: scheduleTimeId > 0 ? scheduleTimeId : null,
                        status: "snoozed",
                        note: until,
                        processed: false,
                    }])
                    .select("id")
                    .single();
                if (insErr) throw insErr;
                setLogId(newLog.id);
            }

            // 3) update UI
            setStatus("snoozed");
            setSnoozedUntil(until);

            // 4) reprogram the snooze notification
            const atDate = new Date(until);
            console.log("Snooze until:", atDate.toISOString());
            console.log("Snooze seconds:", snoozeTimeInSeconds);
            const notifId = await scheduleLocalNotificationInSeconds(
                `⌛ Time to take ${medication.name}`,
                "Snooze expired — please take your pill now.",
                {},
                snoozeTimeInSeconds
            );
            Notifications.addNotificationReceivedListener(() => {
                Notifications.cancelScheduledNotificationAsync(notifId);
            });
            setNotificationId(notifId);
            const all = await Notifications.getAllScheduledNotificationsAsync();
            console.log("🔔 All scheduled notifications:", JSON.stringify(all, null, 2));
            console.log("Scheduled snooze notification id:", notifId);

        } catch (e) {
            console.error("Snooze error:", e);
        }
    };

    const openSnoozeOptions = () => {
        Alert.alert("Snooze for…", "Choose duration:", [
            { text: "1 min", onPress: () => handleSnooze(1) },
            { text: "10 min", onPress: () => handleSnooze(10) },
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
