import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medication } from '../types';

// Helper to get date string YYYY-MM-DD
const toDateString = (date: Date) => date.toISOString().split('T')[0];

export const calculateAdherenceStats = async (medications: Medication[], daysToLookBack: number = 30) => {
    let totalScheduled = 0;
    let totalTaken = 0;
    const today = new Date();

    // Create array of Promises to fetch logs in parallel
    const promiseArray = [];
    for (let i = 0; i < daysToLookBack; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateKey = toDateString(d);
        promiseArray.push(AsyncStorage.getItem(`pillguard_log_${dateKey}`));
    }

    const logs = await Promise.all(promiseArray);

    // Process logs
    logs.forEach((logStr) => {
        const log = logStr ? JSON.parse(logStr) : {};

        medications.forEach(med => {
            if (med.frequency === 'As Needed') return;

            const dosesPerDay = med.frequency === 'Twice Daily' ? 2 : 1;

            if (med.frequency !== 'Weekly') {
                totalScheduled += dosesPerDay;
                if (log[med.id]) {
                    totalTaken += Math.min(log[med.id] || 0, dosesPerDay);
                }
            }
        });
    });

    const rate = totalScheduled === 0 ? 100 : Math.round((totalTaken / totalScheduled) * 100);
    return {
        rate,
        totalTaken,
        totalScheduled
    };
};
