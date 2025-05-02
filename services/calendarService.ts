import { supabase } from "../lib/supabase";

export interface PillLog {
    id: number;
    schedule_id: number;
    schedule_time_id: number;
    taken_at: string;   // ISO timestamp
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
    statsByDay: Record<string, DayStats>;
    logsByDay: Record<string, PillLog[]>;
    timesById: Record<number, string>;
    timeToSchedule: Record<number, number>;
    scheduleNamesById: Record<number, string>;
}

export async function fetchCalendarData(
    userId: string,
    year: number,
    month: number
): Promise<CalendarData> {
    // 1) Intervalul lunii
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();

    // 2) Programe active ale utilizatorului
    const { data: schedulesData, error: schErr } = await supabase
        .from("medication_schedule")
        .select("id")
        .eq("patient_id", userId)
        .eq("status", "active");
    if (schErr) throw schErr;
    const schedules = schedulesData ?? [];
    const scheduleIds = schedules.map(s => s.id);
    if (scheduleIds.length === 0) {
        return {
            statsByDay: {},
            logsByDay: {},
            timesById: {},
            timeToSchedule: {},
            scheduleNamesById: {},
        };
    }

    // 3) Ore planificate + mapping timeId → scheduleId
    const { data: timesData, error: tErr } = await supabase
        .from("medication_schedule_times")
        .select("id, schedule_id, time")
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

    // 4) Pill-logs pentru luna
    const { data: logsData, error: lErr } = await supabase
        .from("pill_logs")
        .select("id, schedule_id, schedule_time_id, taken_at, status, note")
        .in("schedule_time_id", scheduleTimeIds)
        .gte("taken_at", startDate)
        .lte("taken_at", endDate)
        .order("taken_at", { ascending: true });
    if (lErr) throw lErr;
    const logsList = logsData ?? [];

    // 5) Grupare log-uri pe zile
    const logsByDay: Record<string, PillLog[]> = {};
    logsList.forEach(l => {
        const day = l.taken_at.substr(0, 10);
        if (!logsByDay[day]) logsByDay[day] = [];
        logsByDay[day].push(l);
    });

    // 6) Statistici zilnice
    const statsByDay: Record<string, DayStats> = {};
    const totalPlannedPerDay = scheduleTimeIds.length;
    Object.entries(logsByDay).forEach(([day, dayLogs]) => {
        const taken = dayLogs.filter(l => l.status === "taken").length;
        const skipped = dayLogs.filter(l => l.status === "skipped").length;
        const unknown = totalPlannedPerDay - taken - skipped;
        statsByDay[day] = { totalPlanned: totalPlannedPerDay, taken, skipped, unknown };
    });

    // 7) Preluare nume medicamente pentru schedule-urile folosite
    const usedScheduleIds = Array.from(new Set(logsList.map(l => l.schedule_id)));
    const { data: medsData, error: mErr } = await supabase
        .from("medication_schedule")
        .select("id, medication(name)")
        .in("id", usedScheduleIds);

    if (mErr) throw mErr;
    const medsList = medsData ?? [];

    const scheduleNamesById: Record<number, string> = {};
    medsList.forEach((row: any) => {
        const rel = row.medication;
        const medName = Array.isArray(rel)
            ? rel[0]?.name ?? "–"
            : rel && typeof rel.name === "string"
                ? rel.name
                : "–";
        scheduleNamesById[row.id] = medName;
    });

    return {
        statsByDay,
        logsByDay,
        timesById,
        timeToSchedule,
        scheduleNamesById,
    };
}
