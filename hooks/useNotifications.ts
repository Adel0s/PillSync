// hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import {
    requestPermissionsAndGetPushToken,
    addNotificationListener,
} from '../services/notificationService';
import { useAuth } from '../context/AuthProvider';

export function useNotifications() {
    const { user } = useAuth();
    const [pushToken, setPushToken] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        requestPermissionsAndGetPushToken(user.id).then(token => {
            if (token) setPushToken(token);
        });

        const cleanup = addNotificationListener(
            notification => {
                console.log('Notification received in foreground', notification);
            },
            response => {
                console.log('User tapped on notification', response);
                // aici poți naviga: ex router.push(...)
            }
        );
        return cleanup;
    }, [user]);

    return { pushToken };
}
