import { supabase } from "../lib/supabase";

export interface PillLog {
    id: number;
    schedule_id: number;
    schedule_time_id: number;
    taken_at: string; // ISO timestamp
    status: "taken" | "skipped" | "unknown" | null;
    note: string | null;
}

export interface DayStats {
    totalPlanned: number;
    taken: number;
    skipped: number;
    unknown: number;
}

export interface CalendarData {
    statsByDay: Record<string, DayStats>;    // ex: { "2025-04-15": { totalPlanned:3, taken:2, skipped:1, unknown:0 } }
    logsByDay: Record<string, PillLog[]>;   // ex: { "2025-04-15": [ {id:…, status:"taken",…}, … ] }
    timesById: Record<number, string>;      // ex: { 7: "08:00:00", 8: "20:00:00", … }
}

export async function fetchCalendarData(
    userId: string,
    year: number,
    month: number
): Promise<CalendarData> {
    // 1) Interval lună
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();

    // 2) Programe active
    const { data: schedules, error: schedulesError } = await supabase
        .from("medication_schedule")
        .select("id")
        .eq("patient_id", userId)
        .eq("status", "active");
    if (schedulesError) throw schedulesError;
    const scheduleIds = schedules.map(s => s.id);
    if (scheduleIds.length === 0) {
        return { statsByDay: {}, logsByDay: {}, timesById: {} };
    }

    // 3) Ore planificate
    const { data: times, error: timesError } = await supabase
        .from("medication_schedule_times")
        .select("id, time")
        .in("schedule_id", scheduleIds);
    if (timesError) throw timesError;
    const scheduleTimeIds = times.map(t => t.id);
    const timesById: Record<number, string> = {};
    times.forEach(t => { timesById[t.id] = t.time; });

    // 4) Log-uri în interval
    const { data: logs, error: logsError } = await supabase
        .from("pill_logs")
        .select("id, schedule_id, schedule_time_id, taken_at, status, note")
        .in("schedule_time_id", scheduleTimeIds)
        .gte("taken_at", startDate)
        .lte("taken_at", endDate);
    if (logsError) throw logsError;

    // 5) Grupăm log-urile pe zi
    const logsByDay: Record<string, PillLog[]> = {};
    logs.forEach(l => {
        const day = l.taken_at.substr(0, 10); // "YYYY-MM-DD"
        if (!logsByDay[day]) logsByDay[day] = [];
        logsByDay[day].push(l);
    });

    // 6) Calculăm statistici
    const statsByDay: Record<string, DayStats> = {};
    const totalPlannedPerDay = scheduleTimeIds.length;
    Object.entries(logsByDay).forEach(([day, dayLogs]) => {
        const taken = dayLogs.filter(l => l.status === "taken").length;
        const skipped = dayLogs.filter(l => l.status === "skipped").length;
        const unknown = totalPlannedPerDay - taken - skipped;
        statsByDay[day] = { totalPlanned: totalPlannedPerDay, taken, skipped, unknown };
    });

    console.log("Calendar data fetched:", { statsByDay, logsByDay, timesById });
    return { statsByDay, logsByDay, timesById };
}
