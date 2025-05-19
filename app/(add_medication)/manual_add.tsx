import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import debounce from "lodash/debounce";

export default function MedicationSearch() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Debounce pentru a nu supraîncărca Supabase la fiecare literă
    const fetchMedications = useCallback(
        debounce(async (text: string) => {
            if (!text) {
                setResults([]);
                return;
            }
            setLoading(true);
            const { data, error } = await supabase
                .from("medication")
                .select("*")
                .ilike("name", `%${text}%`)
                .limit(10);
            setLoading(false);
            if (error) {
                console.error("Search error:", error);
                return;
            }
            setResults(data || []);
        }, 300),
        []
    );

    const onChangeText = (text: string) => {
        setQuery(text);
        fetchMedications(text);
    };

    const onSelect = (med: any) => {
        // Navighează la /schedule cu aceleași params ca la scanare
        router.push({
            pathname: "/schedule",
            params: {
                medicationId: med.id,
                name: med.name,
                quantity: med.quantity,
                nr_of_pills: med.nr_of_pills,
            },
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Caută medicament</Text>
            <TextInput
                style={styles.input}
                placeholder="Scrie numele medicamentului..."
                value={query}
                onChangeText={onChangeText}
            />
            {loading && <ActivityIndicator style={{ margin: 8 }} />}
            <FlatList
                data={results}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => onSelect(item)}
                    >
                        <Text style={styles.itemText}>{item.name}</Text>
                        <Text style={styles.subText}>
                            {item.quantity ?? "–"} mg • {item.nr_of_pills ?? "–"} compr.
                        </Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    !loading && query
                        ? <Text style={styles.noResults}>Niciun rezultat găsit.</Text>
                        : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#fff" },
    title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
    input: {
        height: 48,
        borderColor: "#ddd",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
        backgroundColor: "#f9f9f9",
    },
    item: {
        padding: 12,
        borderBottomColor: "#eee",
        borderBottomWidth: 1,
    },
    itemText: { fontSize: 18 },
    subText: { fontSize: 14, color: "#666" },
    noResults: { textAlign: "center", marginTop: 20, color: "#666" },
});
