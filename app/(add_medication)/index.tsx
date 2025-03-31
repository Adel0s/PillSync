import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    TextInput,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function MedicationScan() {
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState<boolean>(false);
    const [barcode, setBarcode] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [medication, setMedication] = useState<any | null>(null);

    const [medName, setMedName] = useState("");
    const [activeSubstance, setActiveSubstance] = useState("");
    const [quantity, setQuantity] = useState("");
    const [nrOfPills, setNrOfPills] = useState("");
    const [description, setDescription] = useState("");
    const [contraindications, setContraindications] = useState("");
    const [sideEffect, setSideEffect] = useState("");

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        })();
    }, []);

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        setScanned(true);
        setBarcode(data);
        setLoading(true);
        console.log(`Barcode scanned: type ${type}, data: ${data}`);

        const { data: medData, error } = await supabase
            .from("medication")
            .select("*")
            .eq("barcode", data)
            .maybeSingle();
        setLoading(false);
        if (error) {
            Alert.alert("Error", "An error occurred while fetching medication data.");
            console.error(error);
            return;
        }
        if (medData) {
            setMedication(medData);
            console.log("Medication found:", medData);
        } else {
            console.log("Medication not found!");
            Alert.alert(
                "Not Found",
                "Medication not found. Please enter details manually. Also check barcode value to match the medication."
            );
        }
    };

    const handleSaveMedication = async () => {
        if (!medName || !activeSubstance) {
            Alert.alert("Validation", "Please fill in at least the medication name and active substance.");
            return;
        }
        setLoading(true);

        const numericQuantity = quantity ? Number(quantity) : null;
        const numericNrOfPills = nrOfPills ? Number(nrOfPills) : null;

        const { data: insertedData, error } = await supabase
            .from("medication")
            .insert([
                {
                    barcode: barcode,
                    name: medName,
                    active_substance: activeSubstance,
                    quantity: numericQuantity,
                    nr_of_pills: numericNrOfPills,
                    description: description,
                    contraindications: contraindications,
                    side_effect: sideEffect,
                },
            ])
            .maybeSingle();

        setLoading(false);
        if (error) {
            Alert.alert("Error", "Failed to save medication.");
            console.error(error);
            return;
        }
        setMedication(insertedData);
        Alert.alert("Success", "Medication saved!");
    };

    if (hasPermission === null) {
        return (
            <View style={styles.center}>
                <Text>Requesting camera permission...</Text>
            </View>
        );
    }
    if (hasPermission === false) {
        return (
            <View style={styles.center}>
                <Text>No access to camera.</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {loading && <ActivityIndicator size="large" color="#20A0D8" style={styles.loading} />}
            {/* If not scanned yet, show camera view */}
            {!scanned ? (
                <CameraView
                    style={styles.camera}
                    facing={"back"}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr", "ean13", "ean8"],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                >
                    <View style={styles.scanOverlay}>
                        <Text style={styles.scanText}>Scan Medication Barcode</Text>
                    </View>
                </CameraView>
            ) : medication ? (
                <View style={styles.cardContainer}>
                    <Text style={styles.cardTitle}>Medication details</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Barcode:</Text>
                        <Text style={styles.detailValue}>{barcode}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name:</Text>
                        <Text style={styles.detailValue}>{medication.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Active Substance:</Text>
                        <Text style={styles.detailValue}>{medication.active_substance}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Quantity:</Text>
                        <Text style={styles.detailValue}>
                            {medication.quantity ? `${medication.quantity} mg` : "N/A"}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Number of Pills:</Text>
                        <Text style={styles.detailValue}>{medication.nr_of_pills || "N/A"}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Description:</Text>
                        <Text style={styles.detailValue}>{medication.description || "N/A"}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Contraindications:</Text>
                        <Text style={styles.detailValue}>{medication.contraindications || "N/A"}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Side Effects:</Text>
                        <Text style={styles.detailValue}>{medication.side_effect || "N/A"}</Text>
                    </View>
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity style={styles.button} onPress={() => router.push({
                            pathname: "/schedule",
                            params: { medicationId: medication.id, name: medication.name, quantity: medication.quantity, nr_of_pills: medication.nr_of_pills }
                        })}>
                            <Text style={styles.buttonText}>Next</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.secondaryButton]}
                            onPress={() => {
                                setScanned(false);
                                setMedication(null);
                            }}
                        >
                            <Text style={styles.secondaryButtonText}>Scan Again</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.secondaryButton]}
                            onPress={() => router.push("/home")}
                        >
                            <Text style={styles.secondaryButtonText}>Back to Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                // Manual entry view remains unchanged
                <View style={styles.manualContainer}>
                    <Text style={styles.resultTitle}>Enter Medication Details</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Barcode"
                        placeholderTextColor="#999"
                        value={barcode}
                        onChangeText={setBarcode}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Medication Name"
                        placeholderTextColor="#999"
                        value={medName}
                        onChangeText={setMedName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Active Substance"
                        placeholderTextColor="#999"
                        value={activeSubstance}
                        onChangeText={setActiveSubstance}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Quantity (numeric)"
                        placeholderTextColor="#999"
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Number of Pills (numeric)"
                        placeholderTextColor="#999"
                        value={nrOfPills}
                        onChangeText={setNrOfPills}
                        keyboardType="numeric"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Description"
                        placeholderTextColor="#999"
                        value={description}
                        onChangeText={setDescription}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Contraindications"
                        placeholderTextColor="#999"
                        value={contraindications}
                        onChangeText={setContraindications}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Side Effects"
                        placeholderTextColor="#999"
                        value={sideEffect}
                        onChangeText={setSideEffect}
                    />
                    <TouchableOpacity style={styles.button} onPress={handleSaveMedication}>
                        <Text style={styles.buttonText}>Save Medication</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: "#0077b6", marginTop: 8 }]}
                        onPress={() => {
                            setScanned(false);
                            setMedication(null);
                        }}
                    >
                        <Text style={styles.buttonText}>Scan Again</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 16,
        backgroundColor: "#20A0D8",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    loading: {
        marginVertical: 20,
    },
    camera: {
        flex: 1,
        height: 300,
    },
    scanOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 50,
        backgroundColor: "transparent",
    },
    scanText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    manualContainer: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    input: {
        width: "100%",
        height: 48,
        borderColor: "#ddd",
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 12,
        paddingHorizontal: 12,
        backgroundColor: "#f9f9f9",
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 16,
    },
    cardContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        marginVertical: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 16,
        color: "#20A0D8",
        textAlign: "center",
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    detailValue: {
        fontSize: 16,
        color: "#333",
        textAlign: "right",
        flexShrink: 1,
    },
    buttonGroup: {
        marginTop: 20,
    },
    button: {
        backgroundColor: "#20A0D8",
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 12,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    secondaryButton: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#20A0D8",
    },
    secondaryButtonText: {
        color: "#20A0D8",
        fontSize: 18,
        fontWeight: "bold",
    },
});