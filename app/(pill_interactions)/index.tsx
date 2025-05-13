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
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getDrugDrugInteraction } from "../../services/interactionService";

// 1) Tipuri pentru Schedule și Medication (preluate din index.tsx)
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

// 2) Helperul de filtrare a perioadei active
const isWithinTreatmentPeriod = (
    start_date: string,
    duration_days: number
): boolean => {
    const start = new Date(start_date);
    const end = new Date(start);
    end.setDate(start.getDate() + duration_days);
    return new Date() <= end;
};

// 3) Tip pentru interacțiune
type Interaction = { severity: string; summary: string; details: string };

export default function PillInteractions() {
    const { user } = useAuth();
    const router = useRouter();

    const [pairs, setPairs] = useState<Array<[Medication, Medication]>>([]);
    const [results, setResults] = useState<Record<string, Interaction[]>>({});
    const [loading, setLoading] = useState(false);

    // 4) Încarcă azi medicamentele active și generează perechi
    const fetchTodaysMeds = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 4.1) Preia toate schedule-urile active și join pe medication
            const { data, error } = await supabase
                .from("medication_schedule")
                .select("*, medication(id, name, active_substance)")
                .eq("patient_id", user.id)
                .in("status", ["active", "paused"]);
            if (error) {
                console.error("Error fetching schedules:", error);
                return;
            }

            // 4.2) Filtrează doar cele în perioada curentă
            const schedules = (data as MedicationSchedule[]).filter((s) =>
                isWithinTreatmentPeriod(s.start_date, s.duration_days)
            );

            // 4.3) Extrage Med-urile, dedupe după id
            const medsList = schedules
                .map((s) => s.medication)
                .filter((m): m is Medication => !!m);
            const uniqMeds = Array.from(
                new Map(medsList.map((m) => [m.id, m])).values()
            );
            console.log("Unique medications:", uniqMeds);

            // 4.4) Generează toate perechile unice A–B
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
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchTodaysMeds();
    }, [fetchTodaysMeds]);

    // 5) La click, fetch interacțiuni pentru fiecare pereche
    const fetchInteractions = useCallback(async () => {
        if (pairs.length === 0) return;
        setLoading(true);
        try {
            const temp: Record<string, Interaction[]> = {};
            for (const [a, b] of pairs) {
                const key = `${a.id}-${b.id}`;
                temp[key] = await getDrugDrugInteraction(a.id, b.id).catch((_) => []);
            }
            setResults(temp);
            console.log("Fetched interactions:", temp);
        } catch (err) {
            console.error("Unexpected error in fetchInteractions:", err);
        } finally {
            setLoading(false);
        }
    }, [pairs]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Pill Interactions</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.close}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Button to trigger checking */}
            <TouchableOpacity style={styles.btn} onPress={fetchInteractions}>
                <Text style={styles.btnText}>Verifică interacțiuni</Text>
            </TouchableOpacity>

            {/* Loading indicator */}
            {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

            {/* Results list */}
            {!loading && Object.keys(results).length > 0 && (
                <FlatList
                    data={pairs}
                    keyExtractor={([a, b]) => `${a.id}-${b.id}`}
                    renderItem={({ item: [a, b] }) => {
                        const key = `${a.id}-${b.id}`;
                        const inters = results[key] ?? [];
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
                                        Nici o interacțiune găsită
                                    </Text>
                                )}
                            </View>
                        );
                    }}
                />
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
    btn: {
        marginTop: 16,
        padding: 12,
        backgroundColor: "#0077b6",
        borderRadius: 8,
        alignItems: "center",
    },
    btnText: { color: "#fff", fontWeight: "600" },
    card: {
        marginTop: 16,
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        borderColor: "#ddd",
    },
    pairTitle: { fontWeight: "600", marginBottom: 8 },
    interText: { marginLeft: 8, marginBottom: 4 },
});
