import { Medication, Frequency, DrugForm } from '../types';

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
    // Default deduction
    let deduction = 1;

    try {
        const dosage = medication.dosage?.toLowerCase() || '';
        const form = medication.form || DrugForm.TABLET;

        // Helper to extract first number
        const extractNumber = (str: string) => {
            const match = str.match(/(\d+(\.\d+)?)/);
            return match ? parseFloat(match[0]) : null;
        };

        if (form === DrugForm.LIQUID || form === DrugForm.INJECTION || form === DrugForm.CREAM) {
            // For volume/unit based forms, we trust the number in the dosage is the amount to take
            // e.g. "5ml" -> 5, "10 units" -> 10
            const amount = extractNumber(dosage);
            if (amount !== null) {
                deduction = amount;
            }
        } else if (form === DrugForm.TABLET || form === DrugForm.CAPSULE) {
            // For pills, we ONLY deduct > 1 if the dosage explicitly mentions "tablets", "capsules", "pills" etc.
            // We do NOT want to deduct "500" from "500mg".
            if (dosage.includes('tablet') || dosage.includes('capsule') || dosage.includes('pill')) {
                const amount = extractNumber(dosage);
                if (amount !== null) {
                    deduction = amount;
                }
            }
        }
    } catch (e) {
        console.warn("Error parsing dosage for stock decrement", e);
    }

    return Math.max(0, medication.stock - deduction);
};
