import { supabase } from "../lib/supabase";

export interface PillLog {
    id: number;
    schedule_id: number;
    schedule_time_id: number;
    taken_at: string;   // ISO timestamp
    status: "taken" | "skipped" | "snoozed" | "unknown" | null;
    note: string | null;
}

export interface DayStats {
    totalPlanned: number;
    taken: number;
    skipped: number;
    snoozed: number;
    unknown: number;
}

export interface CalendarData {
    statsByDay: Record<string, DayStats>;
    logsByDay: Record<string, PillLog[]>;
    timesById: Record<number, string>;
    timeToSchedule: Record<number, number>;
    scheduleNamesById: Record<number, string>;
    scheduleTimesByDay: Record<string, number[]>;
}

// Fetch data for a single month
export async function fetchCalendarData(
    userId: string,
    year: number,
    month: number
): Promise<CalendarData> {
    // Month interval in UTC
    const startDateObj = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDateObj = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const startISO = startDateObj.toISOString();
    const endISO = endDateObj.toISOString();

    // Active schedules for the user
    const { data: schedulesData, error: schErr } = await supabase
        .from("medication_schedule")
        .select("id")
        .eq("patient_id", userId)
        .eq("status", "active");
    if (schErr) throw schErr;
    const scheduleIds = (schedulesData ?? []).map(s => s.id);
    if (scheduleIds.length === 0) {
        return {
            statsByDay: {},
            logsByDay: {},
            timesById: {},
            timeToSchedule: {},
            scheduleNamesById: {},
            scheduleTimesByDay: {},
        };
    }

    // Planned times for the schedules + their start date and duration
    const { data: timesData, error: tErr } = await supabase
        .from("medication_schedule_times")
        .select("id, schedule_id, time, medication_schedule(start_date, duration_days)")
        .in("schedule_id", scheduleIds);
    if (tErr) throw tErr;
    const timesList = timesData ?? [];

    const timesById: Record<number, string> = {};
    const timeToSchedule: Record<number, number> = {};
    timesList.forEach(t => {
        timesById[t.id] = t.time;
        timeToSchedule[t.id] = t.schedule_id;
    });
    const scheduleTimeIds = timesList.map(t => t.id);

    // Pill-logs for month
    const { data: logsData, error: lErr } = await supabase
        .from("pill_logs")
        .select("id, schedule_id, schedule_time_id, taken_at, status, note")
        .in("schedule_time_id", scheduleTimeIds)
        .gte("taken_at", startISO)
        .lte("taken_at", endISO)
        .order("taken_at", { ascending: true });
    if (lErr) throw lErr;
    const logsList: PillLog[] = logsData ?? [];

    // Group logs by day
    const logsByDay: Record<string, PillLog[]> = {};
    logsList.forEach(l => {
        const day = l.taken_at.substr(0, 10);
        if (!logsByDay[day]) logsByDay[day] = [];
        logsByDay[day].push(l);
    });

    // Create an object to hold the planned doses for each day
    const dailyPlanned: Record<string, number> = {};
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        dailyPlanned[d.toISOString().substr(0, 10)] = 0;
    }
    timesList.forEach((t: any) => {
        const sch = t.medication_schedule;
        if (!sch?.start_date || sch.duration_days == null) return;
        const s0 = new Date(sch.start_date);
        const schStart = new Date(Date.UTC(s0.getUTCFullYear(), s0.getUTCMonth(), s0.getUTCDate()));
        const schEnd = new Date(schStart);
        schEnd.setUTCDate(schEnd.getUTCDate() + sch.duration_days - 1);

        const from = schStart > startDateObj ? schStart : startDateObj;
        const to = schEnd < endDateObj ? schEnd : endDateObj;
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().substr(0, 10);
            dailyPlanned[key] = (dailyPlanned[key] || 0) + 1;
        }
    });

    // Create an object to hold stats for each day based on dailyPlanned and logsByDay
    const statsByDay: Record<string, DayStats> = {};
    Object.entries(dailyPlanned).forEach(([day, planned]) => {
        const logs = logsByDay[day] || [];
        const taken = logs.filter(l => l.status === "taken").length;
        const skipped = logs.filter(l => l.status === "skipped").length;
        const snoozed = logs.filter(l => l.status === "snoozed").length;
        const unknown = planned - taken - skipped;
        statsByDay[day] = { totalPlanned: planned, taken, skipped, snoozed, unknown };
    });

    const scheduleTimesByDay: Record<string, number[]> = {};
    // initialize array for each day in the month
    Object.keys(statsByDay).forEach(day => {
        scheduleTimesByDay[day] = [];
    });
    // for each time-slot, distribute its id to every day it applies
    timesList.forEach((t: any) => {
        const sch = t.medication_schedule;
        if (!sch?.start_date || sch.duration_days == null) return;
        const s0 = new Date(sch.start_date);
        const schStart = new Date(Date.UTC(s0.getUTCFullYear(), s0.getUTCMonth(), s0.getUTCDate()));
        const schEnd = new Date(schStart);
        schEnd.setUTCDate(schEnd.getUTCDate() + sch.duration_days - 1);

        const from = schStart > startDateObj ? schStart : startDateObj;
        const to = schEnd < endDateObj ? schEnd : endDateObj;
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().substr(0, 10);
            if (scheduleTimesByDay[key]) {
                scheduleTimesByDay[key].push(t.id);
            }
        }
    });

    // Get medication names for the schedules used in logs
    const usedScheduleIds = Array.from(new Set(timesList.map((t: any) => t.schedule_id)));
    const { data: medsData, error: mErr } = await supabase
        .from("medication_schedule")
        .select("id, medication(name)")
        .in("id", usedScheduleIds);
    if (mErr) throw mErr;
    const scheduleNamesById: Record<number, string> = {};
    (medsData ?? []).forEach((row: any) => {
        const rel = row.medication;
        scheduleNamesById[row.id] = Array.isArray(rel)
            ? rel[0]?.name ?? "–"
            : rel?.name ?? "–";
    });

    return {
        statsByDay,
        logsByDay,
        timesById,
        timeToSchedule,
        scheduleNamesById,
        scheduleTimesByDay
    };
}
