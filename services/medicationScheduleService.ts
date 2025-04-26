// services/medicationScheduleService.ts
import { supabase } from "../lib/supabase";

export interface ScheduleTime {
    id: number;
    time: string; // "HH:MM:SS"
}
export interface MedicationScheduleDetails {
    id: number;
    start_date: string;
    duration_days: number;
    remaining_quantity: number;
    reminder_enabled: boolean;
    as_needed: boolean;
    medication: { name: string };
    medication_schedule_times: ScheduleTime[];
}

// 1) Fetch the full schedule + times
export async function fetchScheduleDetails(scheduleId: number) {
    const { data, error } = await supabase
        .from("medication_schedule")
        .select(`
      id,
      start_date,
      duration_days,
      remaining_quantity,
      reminder_enabled,
      as_needed,
      medication(name),
      medication_schedule_times(id, time)
    `)
        .eq("id", scheduleId)
        .single();

    return {
        data: data as MedicationScheduleDetails | null,
        error,
    };
}

// 2) Toggle reminders on/off
export async function toggleReminders(scheduleId: number, enabled: boolean) {
    const { error } = await supabase
        .from("medication_schedule")
        .update({ reminder_enabled: enabled })
        .eq("id", scheduleId);

    return { error };
}

// 3) Hard‐delete a schedule
export async function deleteSchedule(scheduleId: number) {
    const { error } = await supabase
        .from("medication_schedule")
        .delete()
        .eq("id", scheduleId);

    return { error };
}

// 4) Add a new reminder time
export async function addScheduleTime(scheduleId: number, time: string) {
    const { data, error } = await supabase
        .from("medication_schedule_times")
        .insert([{ schedule_id: scheduleId, time }])
        .single();

    return {
        data: data as ScheduleTime | null,
        error,
    };
}

// 5) Update an existing reminder time
export async function updateScheduleTime(timeId: number, time: string) {
    const { error } = await supabase
        .from("medication_schedule_times")
        .update({ time })
        .eq("id", timeId);

    return { error };
}

// 6) Delete one reminder time
export async function deleteScheduleTime(timeId: number) {
    const { error } = await supabase
        .from("medication_schedule_times")
        .delete()
        .eq("id", timeId);

    return { error };
}

// 7) Switch to as_needed
export async function setAsNeeded(scheduleId: number) {
    const { error } = await supabase
        .from("medication_schedule")
        .update({ as_needed: true })
        .eq("id", scheduleId);

    return { error };
}
