import React, { useEffect, useState, useCallback } from "react";
import {
    SafeAreaView,
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getDrugDrugInteraction } from "../../services/interactionService";
import Header from "../../components/Header";

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

export default function DrugDrugScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [meds, setMeds] = useState<Medication[]>([]);
    const [pairs, setPairs] = useState<[Medication, Medication][]>([]);
    const [results, setResults] = useState<Record<string, Interaction[]>>({});
    const [loading, setLoading] = useState(false);

    // Fetch active meds + generate pairs
    const fetchMeds = useCallback(async () => {
        if (!user) return;
        setLoading(true);
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

            const schedules = (data as MedicationSchedule[]).filter((s) =>
                isWithinTreatmentPeriod(s.start_date, s.duration_days)
            );
            const uniqMap = new Map<number, Medication>();
            schedules.forEach((s) => {
                if (s.medication?.id) uniqMap.set(s.medication.id, s.medication);
            });
            const uniqMeds = Array.from(uniqMap.values());
            setMeds(uniqMeds);

            const ps: [Medication, Medication][] = [];
            for (let i = 0; i < uniqMeds.length; i++) {
                for (let j = i + 1; j < uniqMeds.length; j++) {
                    ps.push([uniqMeds[i], uniqMeds[j]]);
                }
            }
            setPairs(ps);
        } catch (err) {
            console.error("Unexpected error in fetchMeds:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchMeds();
    }, [fetchMeds]);

    const checkInteractions = useCallback(async () => {
        if (pairs.length === 0) return;
        setLoading(true);
        try {
            const out: Record<string, Interaction[]> = {};
            for (const [a, b] of pairs) {
                const key = `${a.id}-${b.id}`;
                out[key] = await getDrugDrugInteraction(a.id, b.id).catch(() => []);
            }
            setResults(out);
        } catch (err) {
            console.error("Unexpected error in checkInteractions:", err);
        } finally {
            setLoading(false);
        }
    }, [pairs]);

    return (
        <SafeAreaView style={styles.safeContainer}>
            <Header title="Drug ↔️ Drug" backRoute="/home" />

            <View style={styles.container}>
                <TouchableOpacity style={styles.btn} onPress={checkInteractions}>
                    <Text style={styles.btnText}>Check Drug-Drug Interactions</Text>
                </TouchableOpacity>

                {loading && <ActivityIndicator style={{ marginVertical: 12 }} />}

                {!loading && pairs.length > 0 && (
                    <FlatList
                        data={pairs}
                        keyExtractor={([a, b]) => `${a.id}-${b.id}`}
                        renderItem={({ item: [a, b] }) => {
                            const key = `${a.id}-${b.id}`;
                            const inters = results[key] || [];
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
                                        <Text style={styles.interText}>No interactions found.</Text>
                                    )}
                                </View>
                            );
                        }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: { flex: 1, backgroundColor: "#f9f9f9" },
    container: { flex: 1, padding: 16, backgroundColor: "#fff" },
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
        backgroundColor: "#fff",
    },
    pairTitle: { fontWeight: "600", marginBottom: 8 },
    interText: { marginLeft: 8, marginBottom: 4 },
});
