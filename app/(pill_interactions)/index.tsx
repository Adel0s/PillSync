import React from 'react';
import { View, Button } from 'react-native';
import * as Notifications from 'expo-notifications';
import { cancelLocalNotification, cancelAllLocalNotifications, scheduleLocalNotificationInSeconds } from "../../services/notificationService";

export default function TestNotif() {
    async function sendTest() {
        const all = await Notifications.getAllScheduledNotificationsAsync();
        console.log("🔔 All scheduled notifications:", JSON.stringify(all, null, 2));
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: "🔔 Test!",
                body: "Notificările locale funcționează. Hehehee!",
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 10,
                repeats: false,
            },
        });

        Notifications.addNotificationReceivedListener(() => {
            Notifications.cancelScheduledNotificationAsync(id);
        });
    }

    return (
        <View style={{ margin: 20 }}>
            <Button title="Trimite test notificare" onPress={sendTest} />
        </View>
    );
}
