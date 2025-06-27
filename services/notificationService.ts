import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
const { SchedulableTriggerInputTypes } = Notifications;
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';

const STORAGE_KEY = '@scheduled_notifications';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function requestPermissionsAndGetPushToken(userId: string) {
    // Cerem permisiuni întâi (inclusiv pentru notificări locale)
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    console.log('Notification permissions status:', existing);
    if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        console.warn('Push notifications permission denied');
        return null; // nici local, nici push nu merg
    }

    // Dacă vrem token push, avem nevoie de device fizic
    if (!Constants.isDevice || !Device.isDevice) {
        console.log(Device.deviceName, Device.modelName);
        console.warn('Simulator or emulator detected, push notifications not available');
        console.warn('Must use physical device for push notifications');
        return null; // dar permisiunea locală e OK
    }

    // Obține token-ul pentru notificări push (dacă e cazul)
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    // salvează token-ul în Supabase (tabel users sau un tabel dedicat)
    await supabase
        .from('user_push_tokens')
        .upsert({ user_id: userId, token: pushToken }, { onConflict: 'user_id' });

    // Android: configurează canalul de notificări
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default channel',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default',
        });
    }

    return pushToken;
}

export async function scheduleLocalNotificationInSeconds(
    title: string,
    body: string,
    data: any,
    secondsFromNow: number
): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, data },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsFromNow, repeats: false },
    });
    return id;
}

export async function scheduleLowInventoryNotification(medName: string, remaining: number) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Low Inventory',
            body: `You have only ${remaining} pill(s) left of ${medName}. It's time for a refill!`,
            sound: true,
        },
        trigger: null, // trigger immediately
    });
}

export async function scheduleLocalNotificationAtDate(
    title: string,
    body: string,
    data: any,
    at: Date
): Promise<string> {
    const d = at;
    return await Notifications.scheduleNotificationAsync({
        content: { title, body, data },
        trigger: {
            type: SchedulableTriggerInputTypes.CALENDAR,
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            day: d.getDate(),
            hour: d.getHours(),
            minute: d.getMinutes(),
            second: d.getSeconds(),
            repeats: false
        }
    });
}

// Şterge toate notificările programate anterior
export async function cancelAllNotifications() {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
        const ids: string[] = JSON.parse(stored);
        await Promise.all(
            ids.map(id => Notifications.cancelScheduledNotificationAsync(id))
        );
        await AsyncStorage.removeItem(STORAGE_KEY);
    }
}

// Programează toate reminderele active din Supabase
export async function scheduleAllReminders(userId: string) {
    console.log('Scheduling all reminders...');
    await cancelAllNotifications();

    const nowISO = dayjs().toISOString();
    const { data: schedules, error } = await supabase
        .from('medication_schedule')
        .select(`
      id,
      start_date,
      duration_days,
      remaining_quantity,
      pill_reminders_enabled,
      medication:medication_id(name)
    `)
        .eq('patient_id', userId)
        .eq('pill_reminders_enabled', true)
        .gt('remaining_quantity', 0)
        .lte('start_date', nowISO);

    if (error || !schedules) {
        console.error('Eroare la fetch schedules:', error);
        return;
    }

    // filtrare în JS după data de final: start_date + duration_days > now
    const active = schedules.filter(s => {
        const start = dayjs(s.start_date);
        const end = start.add(s.duration_days, 'day');
        return dayjs().isBefore(end);
    });
    console.log('Fetched schedules for user', userId, active);

    const storedIds: string[] = [];

    for (const sched of active) {
        const { data: times, error: err2 } = await supabase
            .from('medication_schedule_times')
            .select('time, notification_offset')
            .eq('schedule_id', sched.id);

        if (err2 || !times) {
            console.error(`Eroare la fetch times pentru schedule ${sched.id}`, err2);
            continue;
        }

        const medData = sched.medication as { name: string } | { name: string }[];
        const medName = Array.isArray(medData) ? medData[0].name : medData.name;
        const start = dayjs(sched.start_date);
        for (let d = 0; d < sched.duration_days; d++) {
            const dayDate = start.add(d, 'day');
            if (dayDate.isBefore(dayjs(), 'day')) continue; // skip past datesr
            for (const t of times) {
                const [hh, mm] = t.time.split(':').map(Number);
                const doseTime = dayDate.hour(hh).minute(mm).second(0);
                const notifTime = doseTime.subtract(t.notification_offset, 'minute');

                if (notifTime.isAfter(dayjs())) {
                    console.log(`Scheduling notification for ${medName} at ${notifTime.format('YYYY-MM-DD HH:mm:ss')}`);
                    const notifId = await Notifications.scheduleNotificationAsync({
                        content: {
                            title: `Time to take ${medName}`,
                            body: `Take your pill at ${doseTime.format('HH:mm')}`,
                            data: { scheduleId: sched.id },
                        },
                        trigger: { type: SchedulableTriggerInputTypes.DATE, date: notifTime.toDate() },
                    });
                    storedIds.push(notifId);
                }
            }
        }
    }
    const all = await Notifications.getAllScheduledNotificationsAsync();
    console.log("🔔 All scheduled notifications:", JSON.stringify(all, null, 2));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedIds));
}

export async function cancelLocalNotification(id: string) {
    await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllLocalNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

export function addNotificationListener(
    onReceive: (notification: Notifications.Notification) => void,
    onResponse: (response: Notifications.NotificationResponse) => void
) {
    const sub1 = Notifications.addNotificationReceivedListener(onReceive);
    const sub2 = Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => {
        sub1.remove();
        sub2.remove();
    };
}
