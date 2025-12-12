import { Medication, Frequency } from '../types';
import { CalendarService } from './calendar';

export class ScheduleManager {
    static CalendarService = CalendarService;

    /**
     * Returns the user's current IANA timezone (e.g., "America/New_York").
     */
    static getCurrentTimezone(): string {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    // This method is effectively "private" to the ScheduleManager object
    private static getZoneOffset(targetZone: string): number {
        if (targetZone === this.getCurrentTimezone()) return 0;

        try {
            const now = new Date();
            const targetString = now.toLocaleString('en-US', { timeZone: targetZone });
            const targetDateAsLocal = new Date(targetString);
            const diff = targetDateAsLocal.getTime() - now.getTime();
            return isNaN(diff) ? 0 : diff;
        } catch (e) {
            console.warn("Error calculating timezone offset", e);
            return 0;
        }
    }

    /**
     * Converts a time string (HH:mm) from a medication's origin timezone
     * to the current device's local time string (HH:mm).
     */
    static convertToLocalTime(timeStr: string, timezone: string): string {
        if (!timeStr || !timezone || timezone === this.getCurrentTimezone()) {
            return timeStr;
        }
        try {
            const offset = this.getZoneOffset(timezone);
            const [h, m] = timeStr.split(':').map(Number);
            const originDate = new Date();
            originDate.setHours(h, m, 0, 0);

            const localTimestamp = originDate.getTime() - offset;
            const localDate = new Date(localTimestamp);

            return localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) {
            return timeStr;
        }
    }

    static getDisplayTime(medication: Medication, takenCount: number = 0): string {
        // --- Case 1: Interval Dosing ---
        if (medication.frequency === Frequency.EVERY_X_HOURS && medication.intervalHours) {
            const next = this.getNextOccurrence(medication, takenCount);
            if (next) {
                if (next.getTime() < Date.now()) return 'Due Now';
                return next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            }
            return 'Not started';
        }

        // --- Case 2: Fixed Times (Daily, Twice Daily) ---
        // Use 'times' array if available, otherwise fallback to single 'time'
        const schedule = medication.times && medication.times.length > 0
            ? medication.times
            : (medication.time ? [medication.time] : []);

        if (schedule.length === 0) return '';

        // If all doses taken, show tomorrow's first dose
        if (takenCount >= schedule.length) {
            const nextTime = schedule[0];
            const localTime = this.convertToLocalTime(nextTime, medication.timezone || this.getCurrentTimezone());
            return `${localTime} (Tomorrow)`;
        }

        // Otherwise show the NEXT specific dose
        const nextTime = schedule[takenCount];
        return this.convertToLocalTime(nextTime, medication.timezone || this.getCurrentTimezone());
    }

    static isDifferentTimezone(medication: Medication): boolean {
        if (medication.frequency === Frequency.EVERY_X_HOURS) return false;
        return !!medication.timezone && medication.timezone !== this.getCurrentTimezone();
    }

    /**
     * Returns the next Date object for the scheduled notification.
     * @param takenCount The number of doses already taken today.
     */
    static getNextOccurrence(medication: Medication, takenCount: number = 0): Date | null {
        const now = new Date();

        // --- LOGIC 1: Interval Dosing ---
        if (medication.frequency === Frequency.EVERY_X_HOURS && medication.intervalHours) {
            if (medication.lastTaken) {
                return new Date(medication.lastTaken + (medication.intervalHours * 60 * 60 * 1000));
            } else {
                // Not taken yet? Use "time" as start time
                if (!medication.time) return now;
                const [h, m] = medication.time.split(':').map(Number);
                const startDate = new Date();
                startDate.setHours(h, m, 0, 0);
                return startDate;
            }
        }

        // --- LOGIC 2: Fixed Times ---
        const schedule = medication.times && medication.times.length > 0
            ? medication.times
            : (medication.time ? [medication.time] : []);

        if (schedule.length === 0) return null;

        let targetTimeStr = '';
        let isTomorrow = false;

        if (takenCount < schedule.length) {
            // Next dose is today
            targetTimeStr = schedule[takenCount];
        } else {
            // All done for today, schedule first dose tomorrow
            targetTimeStr = schedule[0];
            isTomorrow = true;
        }

        const zone = medication.timezone || this.getCurrentTimezone();
        const offset = this.getZoneOffset(zone);
        const [h, m] = targetTimeStr.split(':').map(Number);

        let candidate = new Date();
        if (isTomorrow) {
            candidate.setDate(candidate.getDate() + 1);
        }
        candidate.setHours(h, m, 0, 0);

        // Adjust for timezone
        let targetLocal = new Date(candidate.getTime() - offset);

        // Safety: If calculated time is in past (e.g. today 8am but it's 10am and we haven't taken it), 
        // it returns the past time so the system knows it's overdue. 
        // However, if we are looking for the NEXT cycle and somehow logic puts us in past, fix it?
        // For "Fixed Times", if it's overdue, we still want that time to show up as "Due".

        return targetLocal;
    }
}
