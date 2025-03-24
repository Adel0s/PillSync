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
            Alert.alert("Not Found", "Medication not found. Please enter details manually. Also check barcode value to match the medication.");
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
            {loading && <ActivityIndicator size="large" color="#0077b6" style={styles.loading} />}
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
                <View style={styles.resultContainer}>
                    <Text style={styles.resultTitle}>Medication Found</Text>
                    <Text style={styles.resultText}>Barcode: {barcode}</Text>
                    <Text style={styles.resultText}>Name: {medication.name}</Text>
                    <Text style={styles.resultText}>Active Substance: {medication.active_substance}</Text>
                    <Text style={styles.resultText}>
                        Quantity: {medication.quantity || "N/A"} {medication.quantity ? "mg" : ""}
                    </Text>
                    <Text style={styles.resultText}>Number of Pills: {medication.nr_of_pills || "N/A"}</Text>
                    <Text style={styles.resultText}>Description: {medication.description || "N/A"}</Text>
                    <Text style={styles.resultText}>
                        Contraindications: {medication.contraindications || "N/A"}
                    </Text>
                    <Text style={styles.resultText}>Side Effects: {medication.side_effect || "N/A"}</Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            setScanned(false);
                            setMedication(null);
                        }}
                    >
                        <Text style={styles.buttonText}>Scan Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={() => router.push("/home")}>
                        <Text style={styles.buttonText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.manualContainer}>
                    <Text style={styles.resultTitle}>Enter Medication Details</Text>
                    {/* Barcode field to show and allow modification */}
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
    resultContainer: {
        padding: 20,
        alignItems: "center",
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 16,
    },
    resultText: {
        fontSize: 18,
        marginBottom: 8,
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
    button: {
        backgroundColor: "#0077b6",
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
});
