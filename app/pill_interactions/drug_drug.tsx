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
    const [refreshing, setRefreshing] = useState(false);

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

            const active = (data as MedicationSchedule[]).filter((s) =>
                isWithinTreatmentPeriod(s.start_date, s.duration_days)
            );
            const uniqMeds = Array.from(
                new Map(active.map((s) => [s.medication!.id, s.medication!])).values()
            );
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

    // Pull-to-refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchMeds();
        setRefreshing(false);
    }, [fetchMeds]);

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

            <View style={styles.content}>
                <TouchableOpacity style={styles.checkBtn} onPress={checkInteractions}>
                    <Text style={styles.checkBtnText}>
                        Check Drug-Drug Interactions
                    </Text>
                </TouchableOpacity>

                {loading && <ActivityIndicator style={{ marginTop: 16 }} />}

                <FlatList
                    data={pairs}
                    keyExtractor={([a, b]) => `${a.id}-${b.id}`}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    ℹ️ You don’t have two medications in treatment simultaneously yet!
                                    {"\n"}
                                    ➕ Add at least two different medications to unlock this feature. 💊
                                </Text>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
                    renderItem={({ item: [a, b] }) => {
                        const key = `${a.id}-${b.id}`;
                        const inters = results[key] || [];

                        return (
                            <View style={styles.resultCard}>
                                <Text style={styles.pairTitle}>
                                    {a.name} ↔️ {b.name}
                                </Text>

                                {inters.length > 0 ? (
                                    inters.map((i, idx) => {
                                        const sev = i.severity.toLowerCase();
                                        let bg = "#c5f1c4";
                                        if (sev.includes("moderate")) bg = "#ffe9b3";
                                        else if (sev.includes("major") || sev.includes("high"))
                                            bg = "#f8c0c0";

                                        return (
                                            <View key={idx} style={styles.interactionRow}>
                                                <View
                                                    style={[styles.badgeSeverity, { backgroundColor: bg }]}
                                                >
                                                    <Text style={styles.badgeText}>
                                                        {i.severity.toUpperCase()}
                                                    </Text>
                                                </View>
                                                <Text style={styles.interactionText}>
                                                    {i.details}
                                                </Text>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <Text style={styles.noResText}>
                                        No interactions found.
                                    </Text>
                                )}
                            </View>
                        );
                    }}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "#f2f4f8",
    },
    content: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f2f4f8",
    },
    checkBtn: {
        backgroundColor: "#0077b6",
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 16,
    },
    checkBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    resultCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        // shadow (iOS)
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        // elevation (Android)
        elevation: 3,
    },
    pairTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
        color: "#333",
    },
    interactionRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    badgeSeverity: {
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#333",
    },
    interactionText: {
        flex: 1,
        fontSize: 14,
        color: "#555",
        lineHeight: 20,
    },
    noResText: {
        fontSize: 14,
        color: "#555",
        fontStyle: "italic",
        textAlign: "center",
        paddingVertical: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 40,
    },
    emptyText: {
        fontSize: 16,
        color: "#555",
        textAlign: "center",
        lineHeight: 24,
        paddingHorizontal: 20,
    },
});
