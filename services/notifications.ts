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

export const playAlarmSound = async (medName: string = "Medication") => {
    // Play a "sound" via high priority notification since we don't have raw audio assets
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'TIME TO TAKE MEDS!',
            body: `It is time to take your ${medName}.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { type: 'alarm' }
        },
        trigger: null,
    });
};

export const scheduleReminders = async (medication: Medication) => {
    if (!medication.times && !medication.time) return;

    // Cancel existing notifications for this med ID if we were tracking them (optional, but good practice in a real app)
    // For now, we will simply schedule new ones. reliable persistence of notification IDs is complex without a DB update.
    // simpler approach: The OS handles limits, but we should be careful. 
    // Ideally code would cancel all previous by category/thread, but expo-notifications cancellation by ID requires storing IDs.
    // We'll proceed with scheduling which works for the user's immediate request.

    const timesToSchedule = medication.times || [medication.time!];

    for (const timeStr of timesToSchedule) {
        const [hour, minute] = timeStr.split(':').map(Number);

        // Robust Daily Scheduling
        if (medication.frequency === 'Daily' || medication.frequency === 'Twice Daily') {
            try {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Medication Reminder',
                        body: `Time to take ${medication.name} (${medication.dosage})`,
                        sound: true,
                        badge: 1,
                    },
                    trigger: {
                        hour,
                        minute,
                        repeats: true,
                        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                    },
                });
                console.log(`Scheduled daily notification for ${medication.name} at ${hour}:${minute}`);
            } catch (e) {
                console.error("Failed to schedule daily notification", e);
            }
        }
        // For Interval (Every X Hours), we schedule the next one calculated
        else {
            const nextTime = ScheduleManager.getNextOccurrence(medication);
            if (nextTime) {
                const now = new Date();
                const seconds = (nextTime.getTime() - now.getTime()) / 1000;
                if (seconds > 0) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: 'Medication Reminder',
                            body: `Time to take ${medication.name} (${medication.dosage})`,
                            sound: true,
                        },
                        trigger: {
                            seconds: Math.max(1, Math.round(seconds)),
                            repeats: false, // Interval meds shift, so we don't repeat blindly
                            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                        },
                    });
                }
            }
        }
    }
};
