import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import Modal from "react-native-modal";

interface Medication {
    name: string;
    active_substance: string;
    quantity: number | null;
    nr_of_pills: number | null;
    description: string;
    contraindications: string;
    side_effect: string;
    barcode: string;
}

interface Props {
    isVisible: boolean;
    onClose: () => void;
    medication: Medication;
}

const MedicationDetailsModal = ({ isVisible, onClose, medication }: Props) => {
    return (
        <Modal isVisible={isVisible} onBackdropPress={onClose} style={styles.modal}>
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
    modal: {
        justifyContent: "center",
        margin: 0,
    },
    container: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        maxHeight: "80%",
    },
    scrollArea: {
        marginVertical: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 10,
    },
    detailItem: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
    },
    value: {
        fontSize: 15,
        color: "#444",
    },
    closeButton: {
        backgroundColor: "#0077b6",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
    },
    closeButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
});

export default MedicationDetailsModal;
