export enum Frequency {
    DAILY = 'Daily',
    TWICE_DAILY = 'Twice Daily',
    WEEKLY = 'Weekly',
    AS_NEEDED = 'As Needed',
    EVERY_X_HOURS = 'Every X Hours'
}

export interface Medication {
    id: string;
    name: string; // The display name or nickname
    rxNormName?: string; // Canonical name from RxNav
    rxCui?: string; // RxNorm Concept Unique Identifier
    dosage: string;
    frequency: Frequency;
    time?: string; // Legacy/Primary start time (HH:mm)
    times?: string[]; // Array of scheduled times (HH:mm) for multi-dose frequencies
    intervalHours?: number; // Only used if Frequency is EVERY_X_HOURS
    lastTaken?: number; // Timestamp (ms) of last dose
    lastNotified?: number; // Timestamp (ms) of last notification
    timezone?: string; // IANA timezone string (e.g. "America/New_York")
    notes?: string;
    color: string;
    stock: number;
    refillThreshold: number; // Notification trigger level
    pharmacyContact?: string;
}

export interface InteractionDetail {
    med1: string;
    med2: string;
    severity: 'low' | 'moderate' | 'high';
    description: string;
}

export interface InteractionResult {
    hasInteraction: boolean;
    severity: 'low' | 'moderate' | 'high' | 'none'; // Overall severity
    summary: string; // General summary
    recommendation: string;
    interactions: InteractionDetail[]; // Detailed breakdown
}

export enum AppView {
    DASHBOARD = 'DASHBOARD',
    MEDICATIONS = 'MEDICATIONS',
    AI_CONSULT = 'AI_CONSULT'
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
    isError?: boolean;
}
