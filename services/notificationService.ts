import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
const { SchedulableTriggerInputTypes } = Notifications;

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function requestPermissionsAndGetPushToken(userId: string) {
    // 1) Cer permisiuni întâi (inclusiv pentru notificări locale)
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

    // 2) Dacă vrem token push, avem nevoie de device fizic
    if (!Constants.isDevice || !Device.isDevice) {
        console.log(Device.deviceName, Device.modelName);
        console.warn('Simulator or emulator detected, push notifications not available');
        console.warn('Must use physical device for push notifications');
        return null; // dar permisiunea locală e OK
    }

    // 3) Obține token-ul pentru notificări push (dacă e cazul)
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
