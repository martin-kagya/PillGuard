import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Medication, Frequency } from '../types';
import { calculateDaysLeft } from './inventory';

export const CalendarService = {
    async requestPermissions() {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status === 'granted') {
            await Calendar.requestRemindersPermissionsAsync();
        }
        return status === 'granted';
    },

    async getDefaultCalendarSource() {
        const sources = await Calendar.getSourcesAsync();

        // Priority 1: iCloud (Most reliable on iOS)
        const iCloud = sources.find(s => s.name === 'iCloud' && s.type === Calendar.SourceType.CALDAV);
        if (iCloud) return iCloud;

        // Priority 2: Local
        const local = sources.find(s => s.type === Calendar.SourceType.LOCAL);
        if (local) return local;

        // Priority 3: Any CalDAV/Exchange (Google/Outlook) - usually writable
        const writable = sources.find(s =>
            (s.type === Calendar.SourceType.CALDAV || s.type === Calendar.SourceType.EXCHANGE) &&
            s.type !== Calendar.SourceType.SUBSCRIBED &&
            s.type !== Calendar.SourceType.BIRTHDAYS
        );
        if (writable) return writable;

        // Fallback
        return sources[0];
    },

    async createCalendar() {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

        // Ensure we find a calendar that is theoretically writable or we own it
        const existing = calendars.find(c => c.title === 'PillGuard' && c.allowsModifications);
        if (existing) {
            console.log(`[Calendar] Found existing dedicated calendar: ${existing.id}`);
            return existing.id;
        }

        const defaultSource = Platform.OS === 'ios'
            ? await this.getDefaultCalendarSource()
            : { isLocalAccount: true, name: 'PillGuard', type: Calendar.SourceType.LOCAL };

        // @ts-ignore
        const newCalendarID = await Calendar.createCalendarAsync({
            title: 'PillGuard',
            color: '#2563EB',
            entityType: Calendar.EntityTypes.EVENT,
            sourceId: defaultSource.id,
            source: defaultSource,
            name: 'PillGuard',
            ownerAccount: 'personal',
            accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
        return newCalendarID;
    },

    async syncMedication(medication: Medication) {
        if (!medication.time) return;

        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) return;

            const calendarId = await this.createCalendar();

            // 1. Calculate Duration
            const daysToSchedule = calculateDaysLeft(medication.stock, medication.frequency);
            const limitDays = Math.min(daysToSchedule, 365); // Cap at 1 year

            // 2. Identify Time Slots
            const times = medication.times && medication.times.length > 0
                ? medication.times
                : [medication.time];

            const startDate = new Date();

            for (const timeStr of times) {
                const [h, m] = timeStr.split(':').map(Number);
                const eventDate = new Date();
                eventDate.setHours(h, m, 0, 0);

                // If time passed today, maybe simple "start today" logic
                console.log(`[Calendar] Creating event for ${medication.name} at ${eventDate.toLocaleTimeString()} in calendar ${calendarId}`);
                try {
                    await Calendar.createEventAsync(calendarId, {
                        title: `Take ${medication.name} (${medication.dosage})`,
                        startDate: eventDate,
                        endDate: new Date(eventDate.getTime() + 15 * 60 * 1000), // 15 min duration
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use local timezone
                        notes: medication.notes,
                        recurrenceRule: {
                            frequency: Calendar.Frequency.DAILY,
                            occurrence: limitDays, // Try occurrence, if fail, check logs.
                        }
                    });
                    console.log(`[Calendar] Event created successfully`);
                } catch (err) {
                    console.error(`[Calendar] Event creation failed:`, err);
                }
            }

        } catch (e) {
            console.warn("Calendar Sync Failed", e);
        }
    }
};
