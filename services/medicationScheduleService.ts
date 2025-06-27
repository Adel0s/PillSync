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
    pill_reminders_enabled: boolean;
    as_needed: boolean;
    medication: { name: string };
    medication_schedule_times: ScheduleTime[];
}

// Fetch the full schedule + times
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
      pill_reminders_enabled,
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

// Toggle reminders on/off
export async function toggleReminders(scheduleId: number, enabled: boolean) {
    const { error } = await supabase
        .from("medication_schedule")
        .update({ reminder_enabled: enabled })
        .eq("id", scheduleId);

    return { error };
}

// Hard‐delete a schedule
export async function deleteSchedule(scheduleId: number) {
    const { error } = await supabase
        .from("medication_schedule")
        .delete()
        .eq("id", scheduleId);

    return { error };
}

// Add a new reminder time (returns the inserted row)
export async function addScheduleTime(scheduleId: number, time: string) {
    // fetch one existing offset (they’re all the same)
    const { data: existing, error: fetchErr } = await supabase
        .from("medication_schedule_times")
        .select("notification_offset")
        .eq("schedule_id", scheduleId)
        .limit(1)
        .single();

    const offset =
        fetchErr || existing?.notification_offset == null
            ? 5
            : existing.notification_offset;

    // insert the new time with the same offset
    const { data, error } = await supabase
        .from("medication_schedule_times")
        .insert({ schedule_id: scheduleId, time, notification_offset: offset })
        .select("id, time") // still just return id & time
        .single();

    return {
        data: data as ScheduleTime | null,
        error,
    };
}

// Update an existing reminder time
export async function updateScheduleTime(timeId: number, time: string) {
    const { error } = await supabase
        .from("medication_schedule_times")
        .update({ time })
        .eq("id", timeId);

    return { error };
}

// Delete one reminder time
export async function deleteScheduleTime(timeId: number) {
    const { error } = await supabase
        .from("medication_schedule_times")
        .delete()
        .eq("id", timeId);

    return { error };
}

// Switch to as_needed
export async function setAsNeeded(scheduleId: number) {
    const { error } = await supabase
        .from("medication_schedule")
        .update({ as_needed: true })
        .eq("id", scheduleId);

    return { error };
}

// Switch to not as_needed
export async function unsetAsNeeded(scheduleId: number) {
    const { error } = await supabase
        .from("medication_schedule")
        .update({ as_needed: false })
        .eq("id", scheduleId);
    return { error };
}

export async function setPillReminders(
    scheduleId: number,
    enabled: boolean
) {
    const { data, error } = await supabase
        .from("medication_schedule")
        .update({ pill_reminders_enabled: enabled })
        .eq("id", scheduleId);
    return { data, error };
}