import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Image,
    Pressable,
    Animated,
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
    const [error, setError] = useState(false);

    // I use loadsh debounce to limit the number of requests
    const fetchMedications = useCallback(
        debounce(async (text: string) => {
            setError(false);
            if (!text) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("medication")
                    .select("*")
                    .ilike("name", `%${text}%`) // use ilike for case insensitive search
                    .limit(10);
                setLoading(false);

                if (error) {
                    console.error("Search error:", error);
                    setError(true);
                } else {
                    setResults(data || []);
                }
            } catch (e) {
                console.error("Network error:", e);
                setLoading(false);
                setError(true);
            }
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

    // Animated item component
    const AnimatedItem = ({ item, index }: { item: any; index: number }) => {
        const fadeAnim = useRef(new Animated.Value(0)).current;
        useEffect(() => {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay: index * 50,
                useNativeDriver: true,
            }).start();
        }, []);

        return (
            <Animated.View style={{ opacity: fadeAnim }}>
                <Pressable
                    onPress={() => onSelect(item)}
                    style={({ pressed }) => [
                        styles.item,
                        pressed && styles.itemPressed,
                    ]}
                >
                    <Image source={PillsIcon} style={styles.pillIcon} />
                    <View style={styles.textWrapper}>
                        {renderHighlighted(item.name || "")}
                        <Text style={styles.subText}>
                            {item.quantity ?? "–"} mg • {item.nr_of_pills ?? "–"} compr.
                        </Text>
                    </View>
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.safeContainer}>
            <Header title="Manual Add" backRoute="/home" />

            <View style={styles.container}>
                <Text style={styles.title}>Search medication</Text>

                {/* Search input with icon and clear button */}
                <View style={styles.searchWrapper}>
                    <Ionicons
                        name="search"
                        size={20}
                        color="#666"
                        style={styles.iconLeft}
                    />
                    <TextInput
                        style={styles.inputInner}
                        placeholder="Type medication name..."
                        value={query}
                        onChangeText={onChangeText}
                    />
                    {query.length > 0 && (
                        <Pressable
                            onPress={() => {
                                setQuery("");
                                setResults([]);
                                setError(false);
                            }}
                            style={styles.iconRight}
                        >
                            <Ionicons
                                name="close-circle"
                                size={20}
                                color="#666"
                            />
                        </Pressable>
                    )}
                </View>

                {error && (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorText}>
                            Network error. Please check your connection.
                        </Text>
                        <Pressable
                            style={styles.retryButton}
                            onPress={() => fetchMedications(query)}
                        >
                            <Text style={styles.retryButtonText}>
                                Try again.
                            </Text>
                        </Pressable>
                    </View>
                )}

                {loading && <ActivityIndicator style={{ margin: 8 }} />}

                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item, index }) => (
                        <AnimatedItem item={item} index={index} />
                    )}
                    ListEmptyComponent={
                        !loading && !error && query ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons
                                    name="search-outline"
                                    size={64}
                                    color="#ccc"
                                    style={{ marginBottom: 16 }}
                                />
                                <Text style={styles.emptyText}>
                                    No results found…
                                </Text>
                                <Text style={styles.emptySubText}>
                                    Try a different name or check your spelling.
                                </Text>
                            </View>
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
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderBottomColor: "#eee",
        borderBottomWidth: 1,
        backgroundColor: "#fff",
    },
    itemPressed: {
        transform: [{ scale: 0.97 }],
        opacity: 0.8,
    },
    pillIcon: {
        width: 24,
        height: 24,
        marginRight: 12,
        resizeMode: "contain",
    },
    textWrapper: {
        flex: 1,
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
    emptyContainer: {
        alignItems: "center",
        marginTop: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 8,
        color: "#555",
    },
    emptySubText: {
        fontSize: 14,
        color: "#777",
        textAlign: "center",
        paddingHorizontal: 20,
    },
    errorCard: {
        backgroundColor: "#f8d7da",
        borderRadius: 8,
        padding: 16,
        marginVertical: 12,
    },
    errorText: {
        color: "#721c24",
        marginBottom: 8,
        textAlign: "center",
    },
    retryButton: {
        alignSelf: "center",
        backgroundColor: "#721c24",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    retryButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
});
