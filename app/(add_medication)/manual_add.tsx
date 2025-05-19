import React, { useState, useCallback } from "react";
import {
    SafeAreaView,
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
import Header from "../../components/Header";
import { Ionicons } from "@expo/vector-icons";
import PillsIcon from "../../assets/images/pill_icon_64px.png";

export default function MedicationSearch() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // I use loadsh debounce to limit the number of requests
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
                .ilike("name", `%${text}%`) // use ilike for case insensitive search
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
        // Navigate to /schedule with the same params as in scan
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

    // Helper to render name with highlighted match
    const renderHighlighted = (name: string) => {
        if (!query) return <Text style={styles.itemText}>{name}</Text>;
        // split on match, case-insensitive
        const regex = new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "i");
        const parts = name.split(regex);
        return (
            <Text style={styles.itemText}>
                {parts.map((part, idx) =>
                    regex.test(part) ? (
                        <Text key={idx} style={styles.highlight}>
                            {part}
                        </Text>
                    ) : (
                        <Text key={idx}>{part}</Text>
                    )
                )}
            </Text>
        );
    };

    return (
        <SafeAreaView style={styles.safeContainer}>
            <Header title="Manual Add" backRoute="/home" />

            <View style={styles.container}>
                <Text style={styles.title}>Search medication</Text>

                {/* Search input with icon and clear button */}
                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={20} color="#666" style={styles.iconLeft} />
                    <TextInput
                        style={styles.inputInner}
                        placeholder="Type medication name..."
                        value={query}
                        onChangeText={onChangeText}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery("")} style={styles.iconRight}>
                            <Ionicons name="close-circle" size={20} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>

                {loading && <ActivityIndicator style={{ margin: 8 }} />}
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.item} onPress={() => onSelect(item)}>
                            {renderHighlighted(item.name || "")}
                            <Text style={styles.subText}>
                                {item.quantity ?? "–"} mg • {item.nr_of_pills ?? "–"} compr.
                            </Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        !loading && query ? (
                            <Text style={styles.noResults}>No result found.</Text>
                        ) : null
                    }
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "#fff",
    },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 12,
        color: "#000",
    },
    searchWrapper: {
        position: "relative",
        marginBottom: 12,
        height: 48,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        backgroundColor: "#f9f9f9",
        justifyContent: "center",
    },
    iconLeft: {
        position: "absolute",
        left: 12,
        zIndex: 1,
    },
    iconRight: {
        position: "absolute",
        right: 12,
        zIndex: 1,
    },
    inputInner: {
        height: "100%",
        paddingHorizontal: 36,
        fontSize: 16,
        color: "#000",
    },
    item: {
        padding: 12,
        borderBottomColor: "#eee",
        borderBottomWidth: 1,
    },
    itemText: {
        fontSize: 18,
        color: "#000",
    },
    highlight: {
        fontWeight: "bold",
    },
    subText: {
        fontSize: 14,
        color: "#666",
    },
    noResults: {
        textAlign: "center",
        marginTop: 20,
        color: "#666",
    },
});
