import { Medication, Frequency } from '../types';

export const getDailyUsage = (frequency: Frequency): number => {
    switch (frequency) {
        case Frequency.DAILY: return 1;
        case Frequency.TWICE_DAILY: return 2;
        case Frequency.WEEKLY: return 1 / 7;
        case Frequency.AS_NEEDED: return 0.5; // Estimate
        default: return 1;
    }
};

export const calculateDaysLeft = (stock: number, frequency: Frequency): number => {
    const daily = getDailyUsage(frequency);
    if (daily === 0) return 999;
    return Math.floor(stock / daily);
};

export const getPredictedRefillDate = (stock: number, frequency: Frequency): Date | null => {
    const daysLeft = calculateDaysLeft(stock, frequency);
    if (daysLeft > 365) return null; // Too far out or as needed

    const date = new Date();
    date.setDate(date.getDate() + daysLeft);
    return date;
};

export const decrementStock = (medication: Medication): number => {
    // Basic logic: assume 1 unit per dose event. 
    // In a complex app, we'd parse the dosage string (e.g. "2 tablets")
    return Math.max(0, medication.stock - 1);
};
