import React, { useState, useEffect, useCallback } from "react";
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { useAuth } from "../../context/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getDrugFoodInteraction } from "../../services/interactionService";

interface Medication {
    id: number;
    name: string | null;
    active_substance: string | null;
}

interface MedicationSchedule {
    id: number;
    patient_id: string;
    start_date: string;
    duration_days: number;
    status?: string;
    medication?: Medication;
}

type Interaction = { severity: string; summary: string; details: string };

const isWithinTreatmentPeriod = (
    start_date: string,
    duration_days: number
): boolean => {
    const start = new Date(start_date);
    const end = new Date(start);
    end.setDate(start.getDate() + duration_days);
    return new Date() <= end;
};

export default function DrugFoodScreen() {
    const { user } = useAuth();
    const [meds, setMeds] = useState<Medication[]>([]);
    const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
    const [foodInput, setFoodInput] = useState("");
    const [results, setResults] = useState<Interaction[] | null>(null);
    const [loading, setLoading] = useState(false);

    // Preia lista de medicamente active
    useEffect(() => {
        const fetchMeds = async () => {
            if (!user) return;
            const { data, error } = await supabase
                .from("medication_schedule")
                .select("*, medication(id, name, active_substance)")
                .eq("patient_id", user.id)
                .in("status", ["active", "paused"]);

            if (error) {
                console.error("Error fetching schedules:", error);
                return;
            }
            const schedules = (data as MedicationSchedule[]).filter((s) =>
                isWithinTreatmentPeriod(s.start_date, s.duration_days)
            );
            const uniqMap = new Map<number, Medication>();
            schedules.forEach((s) => {
                if (s.medication?.id) uniqMap.set(s.medication.id, s.medication);
            });
            setMeds(Array.from(uniqMap.values()));
        };
        fetchMeds();
    }, [user]);

    // Cheamă API-ul de interacţiuni medicament-mâncare
    const checkInteraction = useCallback(async () => {
        if (!selectedMed || !foodInput.trim()) return;
        setLoading(true);
        try {
            const res = await getDrugFoodInteraction(
                selectedMed.id,
                foodInput.trim()
            );
            setResults(res);
        } catch (err) {
            console.error("Unexpected error in checkInteraction:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedMed, foodInput]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginVertical: 8 }}
            >
                {meds.map((m) => (
                    <TouchableOpacity
                        key={m.id}
                        style={[
                            styles.medButton,
                            selectedMed?.id === m.id && styles.medButtonSelected,
                        ]}
                        onPress={() => {
                            setSelectedMed(m);
                            setResults(null);
                        }}
                    >
                        <Text
                            style={[
                                styles.medButtonText,
                                selectedMed?.id === m.id && styles.medButtonTextSelected,
                            ]}
                        >
                            {m.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <TextInput
                style={styles.input}
                placeholder="Ex: grapefruit, alcool..."
                value={foodInput}
                onChangeText={setFoodInput}
            />

            <TouchableOpacity style={styles.btn} onPress={checkInteraction}>
                <Text style={styles.btnText}>Check Drug-Food Interactions</Text>
            </TouchableOpacity>

            {loading && <ActivityIndicator style={{ marginVertical: 12 }} />}

            {results !== null && selectedMed && (
                <View style={styles.card}>
                    <Text style={styles.pairTitle}>
                        {selectedMed.name} ↔️ {foodInput.trim()}
                    </Text>
                    {results.length > 0 ? (
                        results.map((i, idx) => (
                            <Text key={idx} style={styles.interText}>
                                • [{i.severity}] {i.details}
                            </Text>
                        ))
                    ) : (
                        <Text style={styles.interText}>No interactions found.</Text>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#fff" },

    medButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#0077b6",
        borderRadius: 20,
        marginRight: 8,
    },
    medButtonSelected: {
        backgroundColor: "#0077b6",
    },
    medButtonText: {
        color: "#0077b6",
    },
    medButtonTextSelected: {
        color: "#fff",
        fontWeight: "600",
    },

    input: {
        marginTop: 8,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        padding: 10,
    },

    btn: {
        marginTop: 8,
        padding: 12,
        backgroundColor: "#0077b6",
        borderRadius: 8,
        alignItems: "center",
    },
    btnText: { color: "#fff", fontWeight: "600" },

    card: {
        marginTop: 12,
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        borderColor: "#ddd",
    },
    pairTitle: { fontWeight: "600", marginBottom: 8 },
    interText: { marginLeft: 8, marginBottom: 4 },
});
