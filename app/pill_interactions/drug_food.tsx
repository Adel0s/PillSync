import React, { useState, useEffect, useCallback } from "react";
import {
    SafeAreaView,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    Platform,
    FlatList,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getDrugFoodInteraction } from "../../services/interactionService";
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

export default function DrugFoodScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [meds, setMeds] = useState<Medication[]>([]);
    const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
    const [foodInput, setFoodInput] = useState("");
    const [results, setResults] = useState<Interaction[] | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch active meds
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

            const active = (data as MedicationSchedule[]).filter((s) =>
                isWithinTreatmentPeriod(s.start_date, s.duration_days)
            );
            const uniqMeds = Array.from(
                new Map(active.map((s) => [s.medication!.id, s.medication!])).values()
            );
            setMeds(uniqMeds);
        };
        fetchMeds();
    }, [user]);

    const checkInteraction = useCallback(async () => {
        if (!selectedMed || !foodInput.trim()) return;
        setLoading(true);
        try {
            const response = await getDrugFoodInteraction(
                selectedMed.id,
                foodInput.trim()
            );
            setResults(response);
        } catch (err) {
            console.error("Unexpected error in checkInteraction:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedMed, foodInput]);

    return (
        <SafeAreaView style={styles.safe}>
            <Header title="Drug ↔️ Food" backRoute="/home" />

            <ScrollView contentContainerStyle={styles.content}>
                <FlatList
                    data={meds}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(m) => m.id.toString()}
                    contentContainerStyle={styles.pillsContainer}
                    renderItem={({ item: m }) => {
                        const isSel = selectedMed?.id === m.id;
                        return (
                            <TouchableOpacity
                                key={m.id}
                                style={[
                                    styles.pill,
                                    isSel && styles.pillSelected,
                                ]}
                                onPress={() => {
                                    // toggle selection: deselect if already selected
                                    if (isSel) {
                                        setSelectedMed(null);
                                        setResults(null);
                                    } else {
                                        setSelectedMed(m);
                                        setResults(null);
                                    }
                                }}
                            >
                                <Text
                                    style={[
                                        styles.pillText,
                                        isSel && styles.pillTextSelected,
                                    ]}
                                    numberOfLines={2}
                                >
                                    {m.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Ex: banana, alcool..."
                    value={foodInput}
                    onChangeText={setFoodInput}
                    returnKeyType="done"
                />

                <TouchableOpacity
                    style={styles.checkBtn}
                    onPress={checkInteraction}
                >
                    <Text style={styles.checkBtnText}>
                        Check Drug-Food Interactions
                    </Text>
                </TouchableOpacity>

                {loading && <ActivityIndicator style={{ marginTop: 16 }} />}

                {results !== null && selectedMed && (
                    <View style={styles.resultCard}>
                        <Text style={styles.resultTitle}>
                            {selectedMed.name} ↔️ {foodInput.trim()}
                        </Text>

                        {results.length > 0 ? (
                            results.map((i, idx) => {
                                const sev = i.severity.toLowerCase();
                                let bgColor = "#c5f1c4";
                                if (sev.includes("moderate")) bgColor = "#ffe9b3";
                                if (sev.includes("major") || sev.includes("high")) bgColor = "#f8c0c0";

                                return (
                                    <View key={idx} style={styles.interactionRow}>
                                        <View
                                            style={[styles.badgeSeverity, { backgroundColor: bgColor }]}
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
                            <Text style={styles.noResText}>No interactions found.</Text>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#f2f4f8",
    },
    content: {
        padding: 16,
        paddingBottom: Platform.OS === "android" ? 32 : 16,
    },
    pillsContainer: {
        paddingVertical: 16,
        paddingHorizontal: 4,
        marginBottom: 12,
        minHeight: 70,
    },
    pill: {
        minWidth: 100,
        maxWidth: 320,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#0077b6",
        backgroundColor: "#fff",
        alignItems: "center",
    },
    pillSelected: {
        backgroundColor: "#0077b6",
    },
    pillText: {
        color: "#0077b6",
        fontSize: 14,
    },
    pillTextSelected: {
        color: "#fff",
        fontWeight: "600",
    },
    input: {
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ccc",
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        marginBottom: 12,
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
        // shadow iOS
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        // elevation Android
        elevation: 3,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
        color: "#333",
    },
    interactionRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 8,
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
        textAlign: "center",
        paddingVertical: 8,
    },
});
