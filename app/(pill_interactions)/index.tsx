// app/(pill_interactions)/index.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
    SafeAreaView,
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthProvider";
import { supabase } from "../../lib/supabase";
import {
    getDrugDrugInteraction,
    getDrugFoodInteraction,
} from "../../services/interactionService";

// 1) Types for Schedule and Medication
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

// 2) Helper method for getting active medications
const isWithinTreatmentPeriod = (
    start_date: string,
    duration_days: number
): boolean => {
    const start = new Date(start_date);
    const end = new Date(start);
    end.setDate(start.getDate() + duration_days);
    return new Date() <= end;
};

// 3) Type for interactions
type Interaction = { severity: string; summary: string; details: string };

export default function PillInteractions() {
    const { user } = useAuth();
    const router = useRouter();

    // drug–drug states
    const [pairs, setPairs] = useState<Array<[Medication, Medication]>>([]);
    const [ddResults, setDdResults] = useState<Record<string, Interaction[]>>({});
    const [ddLoading, setDdLoading] = useState(false);

    // păstrăm și lista unică de medicamente
    const [meds, setMeds] = useState<Medication[]>([]);

    // drug–food states
    const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
    const [foodInput, setFoodInput] = useState("");
    const [dfResults, setDfResults] = useState<Interaction[] | null>(null);
    const [dfLoading, setDfLoading] = useState(false);

    // 4) Fetch today's medications
    const fetchTodaysMeds = useCallback(async () => {
        if (!user) return;
        // loading doar pentru DD aici
        setDdLoading(true);
        try {
            const { data, error } = await supabase
                .from("medication_schedule")
                .select("*, medication(id, name, active_substance)")
                .eq("patient_id", user.id)
                .in("status", ["active", "paused"]);

            if (error) {
                console.error("Error fetching schedules:", error);
                return;
            }

            // get only active medications
            const schedules = (data as MedicationSchedule[]).filter((s) =>
                isWithinTreatmentPeriod(s.start_date, s.duration_days)
            );

            // get unique medications
            const uniqMap = new Map<number, Medication>();
            schedules.forEach((s) => {
                if (s.medication?.id) uniqMap.set(s.medication.id, s.medication);
            });
            const uniqMeds = Array.from(uniqMap.values());
            setMeds(uniqMeds);
            console.log("Unique medications:", uniqMeds);

            // generate pairs for Drug-Drug checker
            const ps: Array<[Medication, Medication]> = [];
            for (let i = 0; i < uniqMeds.length; i++) {
                for (let j = i + 1; j < uniqMeds.length; j++) {
                    ps.push([uniqMeds[i], uniqMeds[j]]);
                }
            }
            setPairs(ps);
            console.log("Generated pairs:", ps);
        } catch (err) {
            console.error("Unexpected error in fetchTodaysMeds:", err);
        } finally {
            setDdLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchTodaysMeds();
    }, [fetchTodaysMeds]);

    // 5) drug–drug checker
    const check_drug_drug_interaction = useCallback(async () => {
        if (pairs.length === 0) return;
        setDdLoading(true);
        try {
            const out: Record<string, Interaction[]> = {};
            for (const [a, b] of pairs) {
                const key = `${a.id}-${b.id}`;
                out[key] = await getDrugDrugInteraction(a.id, b.id).catch(() => []);
            }
            setDdResults(out);
            console.log("Fetched DD interactions:", out);
        } catch (err) {
            console.error("Unexpected error in checking DD interaction:", err);
        } finally {
            setDdLoading(false);
        }
    }, [pairs]);

    // 6) drug–food checker
    const check_drug_food_interaction = useCallback(async () => {
        if (!selectedMed || !foodInput.trim()) return;
        setDfLoading(true);
        try {
            const res = await getDrugFoodInteraction(
                selectedMed.id,
                foodInput.trim()
            );
            setDfResults(res);
            console.log("Fetched DF interactions:", res);
        } catch (err) {
            console.error("Unexpected error in checking DF interaction:", err);
        } finally {
            setDfLoading(false);
        }
    }, [selectedMed, foodInput]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Pill Interactions</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.close}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* --- DD Section --- */}
            <Text style={styles.sectionTitle}>
                Drug ↔️ Drug Interactions
            </Text>
            <TouchableOpacity style={styles.btn} onPress={check_drug_drug_interaction}>
                <Text style={styles.btnText}>Check Drug-Drug interactions</Text>
            </TouchableOpacity>
            {ddLoading && <ActivityIndicator style={{ marginVertical: 12 }} />}
            {!ddLoading && Object.keys(ddResults).length > 0 && (
                <FlatList
                    data={pairs}
                    keyExtractor={([a, b]) => `${a.id}-${b.id}`}
                    renderItem={({ item: [a, b] }) => {
                        const key = `${a.id}-${b.id}`;
                        const inters = ddResults[key] || [];
                        return (
                            <View style={styles.card}>
                                <Text style={styles.pairTitle}>
                                    {a.name} ↔️ {b.name}
                                </Text>
                                {inters.length > 0 ? (
                                    inters.map((i, idx) => (
                                        <Text key={idx} style={styles.interText}>
                                            • [{i.severity}] {i.details}
                                        </Text>
                                    ))
                                ) : (
                                    <Text style={styles.interText}>
                                        No interactions found.
                                    </Text>
                                )}
                            </View>
                        );
                    }}
                />
            )}

            {/* --- DF Section --- */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                Drug ↔️ Food Interactions
            </Text>
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
                            setDfResults(null);
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
            <TouchableOpacity style={styles.btn} onPress={check_drug_food_interaction}>
                <Text style={styles.btnText}>Check Drug-Food interactions</Text>
            </TouchableOpacity>
            {dfLoading && <ActivityIndicator style={{ marginVertical: 12 }} />}
            {!dfLoading && dfResults !== null && selectedMed && (
                <View style={styles.card}>
                    <Text style={styles.pairTitle}>
                        {selectedMed.name} ↔️ {foodInput.trim()}
                    </Text>
                    {dfResults.length > 0 ? (
                        dfResults.map((i, idx) => (
                            <Text key={idx} style={styles.interText}>
                                • [{i.severity}] {i.details}
                            </Text>
                        ))
                    ) : (
                        <Text style={styles.interText}>
                            No interactions found.
                        </Text>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#fff" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    title: { fontSize: 20, fontWeight: "bold" },
    close: { fontSize: 24, padding: 4 },

    sectionTitle: { fontSize: 18, fontWeight: "600", marginTop: 16 },

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

    // drug–food picker buttons
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
});
