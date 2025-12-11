import * as Notifications from 'expo-notifications';
import { ScheduleManager } from './schedule';
import { Medication } from '../types';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// Configure notifications handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true, // Deprecated but might be needed for older versions
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const requestNotificationPermission = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'PillGuard Meds',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 200, 500],
            lightColor: '#FF231F7C',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
        });
    }
};

export const sendNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: true,
        },
        trigger: null, // Immediate
    });
};

export const playAlarmSound = async () => {
    // We rely on system notifications for sound.
    // To play a custom in-app sound, we would need a valid asset file.
    console.log('Alarm sound requested (handled by system notification)');
    // If we wanted to, we could try:
    // await Audio.setIsEnabledAsync(true);
    // But without a file, we do nothing.
};

export const scheduleReminders = async (medication: Medication) => {
    if (!medication.time) return;

    const nextTime = ScheduleManager.getNextOccurrence(medication);
    if (!nextTime) return;

    const now = new Date();
    const timeUntil = nextTime.getTime() - now.getTime();
    console.log(timeUntil)

    // In RN, we can schedule via Notifications API directly instead of setTimeout
    // Trigger is seconds from now
    const seconds = timeUntil / 1000;

    if (seconds > 0) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Medication Reminder',
                body: `It's time to take your ${medication.name}`,
                sound: true,
                interruptionLevel: 'timeSensitive', // iOS 15+
                priority: Notifications.AndroidNotificationPriority.MAX, // Android
                vibrate: [0, 500, 200, 500], // Android
            },
            trigger: {
                seconds: Math.max(1, Math.round(seconds)), // Ensure integer > 0
            } as any,
        });
    }
};
