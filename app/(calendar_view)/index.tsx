// CalendarView.tsx
import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import {
    fetchCalendarData,
    DayStats,
} from "../../services/calendarService";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CalendarView() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [statsByDay, setStatsByDay] = useState<Record<string, DayStats>>({});
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // 1) Preluăm userId
    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getUser();
            if (data.user) setUserId(data.user.id);
        })();
    }, []);

    // 2) Fetch calendar data când se schimbă luna sau userId
    useEffect(() => {
        if (!userId) return;
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        setLoading(true);
        fetchCalendarData(userId, year, month)
            .then(({ statsByDay }) => setStatsByDay(statsByDay))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [currentMonth, userId]);

    // 3) Helpers pentru grid
    const firstWeekday = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
    ).getDay(); // 0=Su
    const daysInMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
    ).getDate();

    // cream o listă de celule de afișat
    const cells: { label: number | null; dateStr?: string }[] = [];
    // zile goale înainte de 1
    for (let i = 0; i < firstWeekday; i++) cells.push({ label: null });
    // zilele lunii
    for (let d = 1; d <= daysInMonth; d++) {
        const mm = String(currentMonth.getMonth() + 1).padStart(2, "0");
        const dd = String(d).padStart(2, "0");
        cells.push({ label: d, dateStr: `${currentMonth.getFullYear()}-${mm}-${dd}` });
    }
    // completăm ultima săptămână
    while (cells.length % 7 !== 0) cells.push({ label: null });

    // 4) Funcții de navigare între luni
    const goPrev = () =>
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        );
    const goNext = () =>
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
        );

    // 5) Render
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goPrev}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {currentMonth.toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                    })}
                </Text>
                <TouchableOpacity onPress={goNext}>
                    <Ionicons name="chevron-forward" size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Weekday labels */}
            <View style={styles.weekRow}>
                {WEEK_DAYS.map((wd) => (
                    <Text key={wd} style={styles.weekDay}>
                        {wd}
                    </Text>
                ))}
            </View>

            {/* Grid zile / loader */}
            {loading ? (
                <ActivityIndicator
                    size="large"
                    color="#20A0D8"
                    style={{ marginTop: 40 }}
                />
            ) : (
                <View style={styles.grid}>
                    {cells.map((c, idx) => {
                        let bgColor = "#eee";
                        if (c.label && c.dateStr && statsByDay[c.dateStr]) {
                            const { taken, totalPlanned } = statsByDay[c.dateStr];
                            const ratio = taken / totalPlanned;
                            if (ratio === 1) bgColor = "#20A0D8";
                            else if (ratio >= 0.5) bgColor = "#FF9500";
                            else bgColor = "#FF3B30";
                        }
                        return (
                            <View key={idx} style={[styles.cell, { backgroundColor: bgColor }]}>
                                {c.label && <Text style={styles.cellText}>{c.label}</Text>}
                            </View>
                        );
                    })}
                </View>
            )}
        </SafeAreaView>
    );
}

const CELL_MARGIN = 2;
const CELL_SIZE = (SCREEN_WIDTH - CELL_MARGIN * 2 * 7 - 32) / 7;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9f9f9",
        padding: 16,
    },
    header: {
        flexDirection: "row",
        backgroundColor: "#20A0D8",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    weekRow: {
        flexDirection: "row",
        marginTop: 16,
    },
    weekDay: {
        flex: 1,
        textAlign: "center",
        fontWeight: "600",
        color: "#333",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 8,
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        margin: CELL_MARGIN,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    cellText: {
        color: "#fff",
        fontWeight: "600",
    },
});
