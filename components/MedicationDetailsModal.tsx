import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import Modal from "react-native-modal";

interface Medication {
    id: number;
    name: string;
    active_substance: string;
    quantity: number;
    nr_of_pills: number;
    description: string;
    contraindications: string;
    side_effect: string;
    barcode: string;
}

interface Props {
    isVisible: boolean;
    onClose: () => void;
    medication: Medication;
    status: "none" | "taken" | "skipped" | "snoozed";
    onTake: () => void;
    onSkip: () => void;
    onSnooze: () => void;
}

const MedicationDetailsModal = ({
    isVisible,
    onClose,
    medication,
    status,
    onTake,
    onSkip,
    onSnooze,
}: Props) => {
    const disabled = status !== "none";

    return (
        <Modal isVisible={isVisible} onBackdropPress={onClose}>
            <View style={styles.container}>
                <Text style={styles.title}>{medication.name}</Text>
                <ScrollView style={styles.scrollArea}>
                    <Detail label="Active Substance" value={medication.active_substance} />
                    <Detail label="Quantity" value={medication.quantity ? `${medication.quantity} mg` : "N/A"} />
                    <Detail label="Number of Pills" value={medication.nr_of_pills?.toString() || "N/A"} />
                    <Detail label="Description" value={medication.description || "N/A"} />
                    <Detail label="Contraindications" value={medication.contraindications || "N/A"} />
                    <Detail label="Side Effects" value={medication.side_effect || "N/A"} />
                </ScrollView>

                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionsButton, disabled && styles.disabledButton]}
                        onPress={onTake}
                        disabled={disabled}
                    >
                        <Text style={[styles.actionsButtonText, disabled && styles.disabledText]}>
                            {status === "taken" ? "✅ Taken" : "Take"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionsButton,
                            { backgroundColor: "#e74c3c" },
                            disabled && styles.disabledButton,
                        ]}
                        onPress={onSkip}
                        disabled={disabled}
                    >
                        <Text style={[styles.actionsButtonText, disabled && styles.disabledText]}>
                            {status === "skipped" ? "🚫 Skipped" : "Skip"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionsButton,
                            { backgroundColor: "#f1c40f" },
                            disabled && styles.disabledButton,
                        ]}
                        onPress={onSnooze}
                        disabled={disabled}
                    >
                        <Text style={[styles.actionsButtonText, disabled && styles.disabledText]}>
                            {status === "snoozed" ? "⏰ Snoozed" : "Snooze"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailItem}>
        <Text style={styles.label}>{label}:</Text>
        <Text style={styles.value}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        maxHeight: "85%",
    },
    scrollArea: {
        marginVertical: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 10,
    },
    detailItem: {
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333",
    },
    value: {
        marginTop: 2
    },

    actionsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
    },
    actionsButton: {
        flex: 1,
        paddingVertical: 10,
        marginHorizontal: 4,
        borderRadius: 8,
        backgroundColor: "#0077b6",
        alignItems: "center",
    },
    actionsButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    disabledButton: {
        opacity: 0.5,
    },
    disabledText: {
        color: "#333",
    },
    closeButton: {
        backgroundColor: "#0077b6",
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 12,
    },
    closeButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
});

export default MedicationDetailsModal;
