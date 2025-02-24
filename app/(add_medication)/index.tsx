import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
} from "react-native";
import { Camera, CameraType, CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function MedicationScan() {
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState<boolean>(false);
    const [barcode, setBarcode] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [medication, setMedication] = useState<any | null>(null);

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
        console.log(`Bar code with type ${type} and data ${data} has been scanned!`);

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
        } else {
            Alert.alert("Not Found", "Medication not found. Please enter details manually.");
            // Navigate to a manual entry form here.
        }
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
            {!scanned ? (
                <CameraView
                    style={styles.camera}
                    facing={'back'}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr", "ean13", "ean8"],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                >
                    <View style={styles.scanOverlay}>
                        <Text style={styles.scanText}>Scan Medication Barcode</Text>
                    </View>
                </CameraView>
            ) : (
                <View style={styles.resultContainer}>
                    {medication ? (
                        <View>
                            <Text style={styles.resultTitle}>Medication Found</Text>
                            <Text style={styles.resultText}>Name: {medication.name}</Text>
                            <Text style={styles.resultText}>Active Substance: {medication.active_substance}</Text>
                            <Text style={styles.resultText}>Quantity: {medication.quantity || "N/A"}</Text>
                            <Text style={styles.resultText}>Number of Pills: {medication.nr_of_pills || "N/A"}</Text>
                            <Text style={styles.resultText}>Description: {medication.description || "N/A"}</Text>
                            <Text style={styles.resultText}>Contraindications: {medication.contraindications || "N/A"}</Text>
                            <Text style={styles.resultText}>Side Effects: {medication.side_effect || "N/A"}</Text>
                        </View>
                    ) : (
                        <Text style={styles.resultText}>Medication not found.</Text>
                    )}
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
