import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medication } from '../types';

const STORAGE_KEY = 'pillguard_medications_v1';

export const saveMedications = async (medications: Medication[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(medications));
    } catch (e) {
        console.error('Failed to save medications', e);
    }
};

export const loadMedications = async (): Promise<Medication[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to load medications', e);
        return [];
    }
};

// Seed initial data if empty for demo purposes
export const seedInitialData = async (): Promise<Medication[]> => {
    const existing = await loadMedications();
    if (existing.length > 0) return existing;

    const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const seeds: Medication[] = [
        {
            id: '1',
            name: 'Lisinopril',
            rxNormName: 'Lisinopril',
            dosage: '10mg',
            frequency: 'Daily' as any,
            time: '08:00',
            times: ['08:00'],
            timezone: defaultTz,
            color: 'bg-blue-500',
            stock: 5, // Low stock to demonstrate alert
            refillThreshold: 7
        },
        {
            id: '2',
            name: 'Metformin',
            rxNormName: 'Metformin',
            dosage: '500mg',
            frequency: 'Twice Daily' as any,
            time: '08:00',
            times: ['08:00', '20:00'], // 8 AM and 8 PM
            timezone: defaultTz,
            notes: 'Take with food',
            color: 'bg-emerald-500',
            stock: 56,
            refillThreshold: 10
        },
        {
            id: '3',
            name: 'Atorvastatin',
            rxNormName: 'Atorvastatin',
            dosage: '20mg',
            frequency: 'Daily' as any,
            time: '20:00',
            times: ['20:00'],
            timezone: defaultTz,
            color: 'bg-purple-500',
            stock: 30,
            refillThreshold: 7
        }
    ];
    await saveMedications(seeds);
    return seeds;
};
