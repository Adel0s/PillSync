import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Modal,
    FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import {
    fetchCalendarData,
    DayStats,
    PillLog,
} from "../../services/calendarService";
import Header from "../../components/Header";
import { exportCalendarReport } from "../../services/reportService";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CELL_MARGIN = 2;
const CELL_SIZE = (SCREEN_WIDTH - CELL_MARGIN * 2 * 7 - 32) / 7;

export default function CalendarView() {
    const [userId, setUserId] = useState<string | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [statsByDay, setStatsByDay] = useState<Record<string, DayStats>>({});
    const [logsByDay, setLogsByDay] = useState<Record<string, PillLog[]>>({});
    const [timesById, setTimesById] = useState<Record<number, string>>({});
    const [timeToSchedule, setTimeToSchedule] = useState<Record<number, number>>({});
    const [scheduleNamesById, setScheduleNamesById] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    // 1) Preluăm user
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setUserId(data.user.id);
        });
    }, []);

    // 2) Fetch când schimbă luna sau user
    useEffect(() => {
        if (!userId) return;
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        setLoading(true);

        fetchCalendarData(userId, year, month)
            .then(({ statsByDay, logsByDay, timesById, timeToSchedule, scheduleNamesById }) => {
                setStatsByDay(statsByDay);
                setLogsByDay(logsByDay);
                setTimesById(timesById);
                setTimeToSchedule(timeToSchedule);
                setScheduleNamesById(scheduleNamesById);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId, currentMonth]);

    // Grid helper
    const firstWeekday = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(), 1
    ).getDay();
    const daysInMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1, 0
    ).getDate();

    const cells: { label: number | null; dateStr?: string }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ label: null });
    for (let d = 1; d <= daysInMonth; d++) {
        const mm = String(currentMonth.getMonth() + 1).padStart(2, "0");
        const dd = String(d).padStart(2, "0");
        cells.push({ label: d, dateStr: `${currentMonth.getFullYear()}-${mm}-${dd}` });
    }
    while (cells.length % 7 !== 0) cells.push({ label: null });

    // Month navigation
    const prevMonth = () =>
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () =>
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    // Procent mediu aderare
    const dayKeys = Object.keys(statsByDay);
    const avgRatio = dayKeys.length
        ? dayKeys
            .map(d => statsByDay[d].taken / statsByDay[d].totalPlanned)
            .reduce((a, b) => a + b, 0) / dayKeys.length
        : 0;
    const adherencePercent = Math.round(avgRatio * 100);

    // Render log în modal
    const renderLog = ({ item }: { item: PillLog }) => {
        const schedId = timeToSchedule[item.schedule_time_id];
        const medName = scheduleNamesById[schedId] || "–";
        const scheduledTime = timesById[item.schedule_time_id] || "--:--";
        const actualTime = item.taken_at.substr(11, 5);

        const iconColor =
            item.status === "taken" ? "#20A0D8"
                : item.status === "skipped" ? "#FF3B30"
                    : "#FF9500";
        const icon =
            item.status === "taken" ? "checkmark-circle"
                : item.status === "skipped" ? "close-circle"
                    : "help-circle";

        return (
            <View style={styles.logRow}>
                <Text style={styles.medName}>{medName}</Text>
                <Text style={styles.logTime}>{scheduledTime}</Text>
                <Text style={styles.logTime}>{actualTime}</Text>
                <Ionicons name={icon} size={20} color={iconColor} />
                {item.note && <Text style={styles.noteText}>{item.note}</Text>}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeContainer}>
            <Header title="Calendar View" backRoute="/home" />

            <View style={styles.container}>
                {/* Month navigator */}
                <View style={styles.nav}>
                    <TouchableOpacity onPress={prevMonth}>
                        <Ionicons name="chevron-back" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>
                        {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                    </Text>
                    <TouchableOpacity onPress={nextMonth}>
                        <Ionicons name="chevron-forward" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Weekdays */}
                <View style={styles.weekRow}>
                    {WEEK_DAYS.map(wd => (
                        <Text key={wd} style={styles.weekDay}>{wd}</Text>
                    ))}
                </View>

                {/* Grid */}
                {loading ? (
                    <ActivityIndicator size="large" color="#20A0D8" style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.grid}>
                        {cells.map((c, i) => {
                            let bg = "#eee";
                            if (c.label && c.dateStr && statsByDay[c.dateStr]) {
                                const { taken, totalPlanned } = statsByDay[c.dateStr];
                                const pct = taken / totalPlanned;
                                bg = pct === 1 ? "#20A0D8" : pct >= 0.5 ? "#FF9500" : "#FF3B30";
                            }
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.cell, { backgroundColor: bg }]}
                                    activeOpacity={c.label && c.dateStr ? 0.6 : 1}
                                    onPress={() => {
                                        if (c.dateStr && logsByDay[c.dateStr]) {
                                            setSelectedDay(c.dateStr);
                                            setModalVisible(true);
                                        }
                                    }}
                                >
                                    {c.label && <Text style={styles.cellText}>{c.label}</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Legendă & statistici */}
                <View style={styles.summaryContainer}>
                    <Text style={styles.adherenceText}>Procent aderare: {adherencePercent}%</Text>
                    <View style={styles.legendContainer}>
                        {[
                            { col: "#20A0D8", txt: "100% luate" },
                            { col: "#FF9500", txt: "50–99%" },
                            { col: "#FF3B30", txt: "<50%" },
                        ].map(({ col, txt }) => (
                            <View key={txt} style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: col }]} />
                                <Text style={styles.legendText}>{txt}</Text>
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity
                        style={styles.reportButton}
                        onPress={() => exportCalendarReport({
                            monthTitle: currentMonth.toLocaleString("default", { month: "long", year: "numeric" }),
                            statsByDay
                        })}
                    >
                        <Text style={styles.reportButtonText}>Vezi rapoarte detaliate</Text>
                    </TouchableOpacity>
                </View>

                {/* Modal cu detalii */}
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{selectedDay}</Text>
                            <FlatList
                                data={selectedDay ? logsByDay[selectedDay] : []}
                                keyExtractor={item => item.id.toString()}
                                renderItem={renderLog}
                                ListEmptyComponent={
                                    <Text style={{ textAlign: "center", marginTop: 20 }}>Nicio înregistrare</Text>
                                }
                            />
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.closeText}>Închide</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: { flex: 1, backgroundColor: "#f9f9f9" },
    container: { flex: 1, padding: 16, backgroundColor: "#f9f9f9" },
    nav: { flexDirection: "row", backgroundColor: "#20A0D8", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 8 },
    navTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
    weekRow: { flexDirection: "row", marginTop: 16 },
    weekDay: { flex: 1, textAlign: "center", fontWeight: "600", color: "#333" },
    grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
    cell: { width: CELL_SIZE, height: CELL_SIZE, margin: CELL_MARGIN, borderRadius: 4, alignItems: "center", justifyContent: "center" },
    cellText: { color: "#fff", fontWeight: "600" },

    summaryContainer: { marginTop: 24, alignItems: "center" },
    adherenceText: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    legendContainer: { flexDirection: "row", marginBottom: 12 },
    legendItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 8 },
    legendColor: { width: 16, height: 16, borderRadius: 4, marginRight: 4 },
    legendText: { fontSize: 14, color: "#333" },
    reportButton: { backgroundColor: "#20A0D8", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
    reportButtonText: { color: "#fff", fontWeight: "600" },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "60%", padding: 16 },
    modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
    logRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
    medName: { flex: 0.4, fontSize: 16, fontWeight: "600", color: "#333" },
    logTime: { flex: 0.2, fontSize: 14, color: "#555", textAlign: "center" },
    noteText: { flex: 0.4, fontSize: 14, color: "#555", marginLeft: 8 },
    closeButton: { marginTop: 12, alignSelf: "center", padding: 10, backgroundColor: "#20A0D8", borderRadius: 8 },
    closeText: { color: "#fff", fontWeight: "bold" },
});
