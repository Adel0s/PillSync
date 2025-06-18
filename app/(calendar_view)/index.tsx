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
    ScrollView,
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

    const [scheduleTimesByDay, setScheduleTimesByDay] = useState<Record<string, number[]>>({});
    const [statsByDay, setStatsByDay] = useState<Record<string, DayStats>>({});
    const [logsByDay, setLogsByDay] = useState<Record<string, PillLog[]>>({});
    const [timesById, setTimesById] = useState<Record<number, string>>({});
    const [timeToSchedule, setTimeToSchedule] = useState<Record<number, number>>({});
    const [scheduleNamesById, setScheduleNamesById] = useState<Record<number, string>>({});
    const [currentAdherence, setCurrentAdherence] = useState(0);
    const [prevAdherence, setPrevAdherence] = useState(0);

    const [monthlyMPR, setMonthlyMPR] = useState(0);
    const [monthlyPDC, setMonthlyPDC] = useState(0);

    // metric to show in info modal
    const [infoMetric, setInfoMetric] = useState<"adherence" | "mpr" | "pdc" | null>(null);

    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    //For today comparison
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate()
    ).padStart(2, "0")}`;

    // 1) Load userId on mount
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setUserId(data.user.id);
        });
    }, []);

    // Fetch date when userId or currentMonth changes
    useEffect(() => {
        if (!userId) return;
        setLoading(true);

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;

        const load = async () => {
            const {
                statsByDay: sByDay,
                logsByDay: lByDay,
                timesById: tById,
                timeToSchedule: t2s,
                scheduleNamesById: namesById,
                scheduleTimesByDay: stByDay,
            } = await fetchCalendarData(userId, year, month);
            setStatsByDay(sByDay);
            setLogsByDay(lByDay);
            setTimesById(tById);
            setTimeToSchedule(t2s);
            setScheduleNamesById(namesById);
            setScheduleTimesByDay(stByDay);

            // Daily medication adherence
            const ratios = Object.values(sByDay).map(s => s.taken / (s.totalPlanned || 1));
            const avgCur = ratios.length
                ? ratios.reduce((a, b) => a + b, 0) / ratios.length
                : 0;
            setCurrentAdherence(Math.round(avgCur * 100));

            // MPR = totalTaken / totalPlanned
            const totalPlanned = Object.values(sByDay).reduce((sum, s) => sum + s.totalPlanned, 0);
            const totalTaken = Object.values(sByDay).reduce((sum, s) => sum + s.taken, 0);
            const mpr = totalPlanned > 0
                ? Math.round((totalTaken / totalPlanned) * 100)
                : 0;
            setMonthlyMPR(mpr);

            // PDC = zile cu 100% luate / zile cu planificate
            const daysWithPlan = Object.values(sByDay).filter(s => s.totalPlanned > 0).length;
            const daysCovered = Object.values(sByDay)
                .filter(s => s.totalPlanned > 0 && s.taken >= s.totalPlanned)
                .length;
            const pdc = daysWithPlan > 0
                ? Math.round((daysCovered / daysWithPlan) * 100)
                : 0;
            setMonthlyPDC(pdc);

            // calculate the previous month for adherence comparison
            const prevDate = new Date(year, currentMonth.getMonth() - 1, 1);
            const { statsByDay: prevStats } = await fetchCalendarData(userId, prevDate.getFullYear(), prevDate.getMonth() + 1);
            const prevRatios = Object.values(prevStats).map(s => s.taken / (s.totalPlanned || 1));
            const avgPrev = prevRatios.length
                ? prevRatios.reduce((a, b) => a + b, 0) / prevRatios.length
                : 0;
            setPrevAdherence(Math.round(avgPrev * 100));
        };

        load().catch(console.error).finally(() => setLoading(false));
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

    // render log
    const renderLog = ({ item }: { item: PillLog }) => {
        console.log("renderLog", item);
        const schedId = timeToSchedule[item.schedule_time_id];
        const medName = scheduleNamesById[schedId] || "-";
        //console.log(scheduleNamesById, schedId, medName);
        // Take raw string from timesById, e.g. "21:00:00"
        const rawScheduled = timesById[item.schedule_time_id] || "--:--";

        // Keep only the first 5 characters (HH:mm)
        const scheduledTime = rawScheduled.slice(0, 5);

        const isoString = item.taken_at
            // changing "2023-10-01 21:00:00" to "2023-10-01T21:00:00" for ISO format
            .replace(" ", "T")
            // add ":00" to the offset to make it "+00:00"
            .replace(/([+-]\d{2})$/, "$1:00");

        // Parser and convert to local timezone
        const actualDate = new Date(isoString);

        // Only format hour and minute, with zero-padding
        // If the date is invalid, we show "XX:XX"
        const actualTime =
            item.status === "unknown" || item.status === null
                ? "XX:XX"
                : actualDate.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                });


        const iconColor =
            item.status === "taken" ? "#4CAF50" :
                item.status === "skipped" ? "#FF3B30" :
                    item.status === "snoozed" ? "#FF9500" :
                        "#999999";  // grey for unknown
        const icon =
            item.status === "taken" ? "checkmark-circle" :
                item.status === "skipped" ? "close-circle" :
                    item.status === "snoozed" ? "alarm" :
                        "help-circle";

        const snoozedUntilStr = item.note
            ? item.note
                // replace first space with 'T' for ISO format
                .replace(" ", "T")
                // adding ":00" to the offset to make it "+00:00"
                .replace(/([+-]\d{2})$/, "$1:00")
            : "";

        const snoozedUntilDate = new Date(snoozedUntilStr);
        const snoozedUntil = item.status === "unknown"
            ? "XX:XX"
            : snoozedUntilDate.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });

        return (
            <View style={styles.logRow}>
                <Text style={styles.medName}>{medName}</Text>
                <Text style={styles.logTime}>{scheduledTime}</Text>
                <Text style={styles.logTime}>{actualTime}</Text>
                <Ionicons name={icon} size={20} color={iconColor} />
                {item.note && <Text style={styles.noteText}>{snoozedUntil}</Text>}
            </View>
        );
    };

    // build the modal’s list by merging real logs with the missing scheduleTimes
    const ModalContent = () => {
        if (!selectedDay) return null;
        const logsReal = logsByDay[selectedDay] || [];
        const allTimes = scheduleTimesByDay[selectedDay] || [];
        const missing = allTimes.filter(
            sid => !logsReal.some(l => l.schedule_time_id === sid)
        );
        const placeholderLogs: PillLog[] = missing.map(stid => ({
            id: -stid,
            schedule_id: timeToSchedule[stid],
            schedule_time_id: stid,
            taken_at: "",            // no actual timestamp
            status: "unknown",       // correct union type
            note: null,
        }));

        const logsForDay: PillLog[] = [...logsReal, ...placeholderLogs];

        return (
            <Modal
                visible
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{selectedDay}</Text>
                        <FlatList
                            data={logsForDay}
                            keyExtractor={item => item.id.toString()}
                            renderItem={renderLog}
                            ListEmptyComponent={
                                <Text style={{ textAlign: "center", marginTop: 20 }}>
                                    No logs
                                </Text>
                            }
                        />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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

                {loading ? (
                    <ActivityIndicator size="large" color="#20A0D8" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Weekdays */}
                        <View style={styles.weekRow}>
                            {WEEK_DAYS.map(wd => (
                                <Text key={wd} style={styles.weekDay}>{wd}</Text>
                            ))}
                        </View>
                        {/* Monthly grid */}
                        <View style={styles.grid}>
                            {cells.map((c, i) => {
                                let bg = "#eee";
                                if (c.label && c.dateStr && c.dateStr <= todayStr) {
                                    const stats = statsByDay[c.dateStr];
                                    // console.log("stats: ", stats);
                                    if (stats?.totalPlanned > 0) {
                                        const pct = stats.taken / stats.totalPlanned;
                                        bg = pct >= 1 ? "#4CAF50" : pct >= 0.5 ? "#FF9500" : "#FF3B30";
                                    }
                                }
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.cell, { backgroundColor: bg }]}
                                        activeOpacity={c.label ? 0.6 : 1}
                                        onPress={() => {
                                            const hasLogs = c.dateStr && (logsByDay[c.dateStr]?.length ?? 0) > 0;
                                            const hasUnknown = c.dateStr && (statsByDay[c.dateStr]?.unknown ?? 0) > 0;
                                            console.log("hasLogs", hasLogs, "hasUnknown", hasUnknown);
                                            console.log("logsByDay", c.dateStr ? logsByDay[c.dateStr] : undefined);
                                            console.log("statsByDay", c.dateStr ? statsByDay[c.dateStr] : undefined);
                                            if (c.dateStr && (hasLogs || hasUnknown)) {
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
                        {/* Trend, legend & raport */}
                        <View style={styles.summaryContainer}>
                            <View style={styles.trendRow}>
                                <Text
                                    style={[
                                        styles.trendText,
                                        currentAdherence - prevAdherence >= 0 ? styles.up : styles.down,
                                    ]}
                                >
                                    {currentAdherence - prevAdherence >= 0 ? "↑" : "↓"}{" "}
                                    {Math.abs(currentAdherence - prevAdherence)}% compared to last month
                                </Text>
                            </View>

                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                                <Text style={styles.adherenceText}>
                                    Adherence rate: {currentAdherence}%
                                </Text>
                                <TouchableOpacity onPress={() => setInfoMetric("adherence")}>
                                    <Ionicons
                                        name="information-circle-outline"
                                        size={18}
                                        color="#666"
                                        style={{ marginLeft: 4 }}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.metricsRow}>
                                <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 2 }}>
                                    <Text style={styles.metricText}>MPR: {monthlyMPR}%</Text>
                                    <TouchableOpacity onPress={() => setInfoMetric("mpr")}>
                                        <Ionicons
                                            name="information-circle-outline"
                                            size={18}
                                            color="#666"
                                            style={{ marginLeft: 4 }}
                                        />
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 2 }}>
                                    <Text style={styles.metricText}>PDC: {monthlyPDC}%</Text>
                                    <TouchableOpacity onPress={() => setInfoMetric("pdc")}>
                                        <Ionicons
                                            name="information-circle-outline"
                                            size={18}
                                            color="#666"
                                            style={{ marginLeft: 4 }}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.legendContainer}>
                                {[
                                    { col: "#4CAF50", txt: "100%" },
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
                                onPress={() =>
                                    exportCalendarReport({
                                        monthTitle: currentMonth.toLocaleString("default", {
                                            month: "long",
                                            year: "numeric",
                                        }),
                                        statsByDay,
                                    })
                                }
                            >
                                <Text style={styles.reportButtonText}>Export to PDF</Text>
                            </TouchableOpacity>
                        </View>

                        {infoMetric && (
                            <Modal transparent animationType="fade" onRequestClose={() => setInfoMetric(null)}>
                                <View style={styles.tooltipOverlay}>
                                    <View style={styles.tooltipBox}>
                                        <Text style={styles.tooltipTitle}>
                                            {infoMetric === "adherence"
                                                ? "Aderare zilnică"
                                                : infoMetric === "mpr"
                                                    ? "Medication Possession Ratio"
                                                    : "Proportion of Days Covered"}
                                        </Text>
                                        <Text>
                                            {infoMetric === "adherence"
                                                ? "Procentul mediu zilnic de administrare: media zilnică a dozelor luate raportată la dozele planificate."
                                                : infoMetric === "mpr"
                                                    ? "Total doze administrate / total doze planificate × 100."
                                                    : "Zile cu toate dozele luate / zile cu doze planificate × 100."}
                                        </Text>
                                        <TouchableOpacity
                                            style={{ marginTop: 12, alignSelf: "flex-end" }}
                                            onPress={() => setInfoMetric(null)}
                                        >
                                            <Text style={styles.tooltipCloseText}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>
                        )}

                        {modalVisible && <ModalContent />}
                    </>
                )}
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
    trendRow: { alignItems: "center", marginBottom: 8 },
    trendText: { fontSize: 14, fontWeight: "600" },
    up: { color: "#20A0D8" },
    down: { color: "#FF3B30" },

    adherenceText: { fontSize: 16, fontWeight: "600" },
    metricsRow: {
        alignItems: "flex-start",
        marginBottom: 12,
    },
    metricText: {
        fontSize: 14,
        color: "#333",
    },
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

    tooltipOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    tooltipBox: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        width: "80%",
    },
    tooltipTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
    },
    tooltipCloseText: {
        color: "#20A0D8",
        fontWeight: "bold",
    },
});
