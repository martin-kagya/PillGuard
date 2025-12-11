import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Medication, Frequency } from '../types';
import { MedicationCard } from './MedicationCard';
import { ScheduleManager } from '../services/schedule';
import * as AdherenceService from '../services/adherence';
import * as NotificationService from '../services/notifications';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // We don't have this, but manual state tracking works.

// We pass in adherence stat manually or calculate it in parent.
// For simplicity, we calculate here if needed, but App.tsx has logic.
// Refactoring: Dashboard should receive props.

interface DashboardProps {
    medications: Medication[];
    takenLog: Record<string, number>;
    onTake: (id: string) => void;
    onRefill: (id: string) => void;
    onInfo: (name: string) => void;
    timezoneChanged: boolean;
    adherenceStats: any; // Passed from parent to avoid async mess here
    setStatsRange: (days: number) => void;
    statsRange: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
    medications,
    takenLog,
    onTake,
    onRefill,
    onInfo,
    timezoneChanged,
    adherenceStats,
    setStatsRange,
    statsRange
}) => {

    const isMorning = (date: Date) => date.getHours() < 12;
    const morningMeds: Medication[] = [];
    const eveningMeds: Medication[] = [];

    medications.forEach(m => {
        const takenCount = takenLog[m.id] || 0;
        const next = ScheduleManager.getNextOccurrence(m, takenCount);

        if (next && isMorning(next)) {
            morningMeds.push(m);
        } else {
            eveningMeds.push(m);
        }
    });

    const lowStockMeds = medications.filter(m => m.stock <= m.refillThreshold);

    return (
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Timezone Alert */}
            {timezoneChanged && (
                <View className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 rounded-lg p-4 mb-4 flex-row">
                    <FontAwesome5 name="globe-americas" size={20} color="#6366f1" style={{ marginRight: 12, marginTop: 4 }} />
                    <View className="flex-1">
                        <Text className="font-bold text-indigo-800 dark:text-indigo-200">Timezone Changed</Text>
                        <Text className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                            Your medication times have been adjusted.
                        </Text>
                    </View>
                </View>
            )}

            {/* Refill Alerts */}
            {lowStockMeds.length > 0 && (
                <View className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg p-4 mb-6">
                    <View className="flex-row">
                        <FontAwesome5 name="exclamation-triangle" size={20} color="#f97316" style={{ marginRight: 12, marginTop: 4 }} />
                        <View className="flex-1">
                            <Text className="font-bold text-orange-800 dark:text-orange-200">Refills Needed</Text>
                            <View className="mt-2 space-y-2">
                                {lowStockMeds.map(m => (
                                    <View key={m.id} className="flex-row justify-between items-center py-1">
                                        <Text className="text-orange-900 dark:text-orange-100 text-sm">{m.name} ({m.stock} left)</Text>
                                        <TouchableOpacity
                                            onPress={() => onRefill(m.id)}
                                            className="bg-white dark:bg-orange-900/40 border border-orange-300 px-3 py-1 rounded-lg"
                                        >
                                            <Text className="text-xs font-bold text-orange-700 dark:text-orange-200">+ Refill</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* Stats Card */}
            <View className="bg-primary-600 rounded-xl p-6 shadow-lg mb-6">
                <View className="flex-row justify-between items-start mb-4">
                    <View>
                        <Text className="text-primary-100 text-sm font-medium mb-1">
                            {statsRange === 1 ? "Today's" : `${statsRange}-Day`} Adherence
                        </Text>
                        <Text className="text-4xl font-bold text-white">{adherenceStats.rate}%</Text>
                    </View>
                    <View className="flex-row bg-black/20 rounded-lg p-1">
                        {[1, 7, 30].map(days => (
                            <TouchableOpacity
                                key={days}
                                onPress={() => setStatsRange(days)}
                                className={`px-3 py-1 rounded-md ${statsRange === days ? 'bg-white' : ''}`}
                            >
                                <Text className={`text-xs font-bold ${statsRange === days ? 'text-primary-700' : 'text-primary-100'}`}>
                                    {days === 1 ? 'Today' : `${days}d`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View className="w-full bg-black/20 rounded-full h-2">
                    <View className="bg-white h-2 rounded-full" style={{ width: `${adherenceStats.rate}%` }} />
                </View>
                <View className="mt-3 flex-row justify-between px-1">
                    <Text className="text-xs text-primary-100 opacity-80">{adherenceStats.totalTaken} taken</Text>
                    <Text className="text-xs text-primary-100 opacity-80">{adherenceStats.totalScheduled} scheduled</Text>
                </View>
            </View>

            {/* Morning Section */}
            <View className="mb-6">
                <View className="flex-row items-center mb-3">
                    <FontAwesome5 name="sun" size={16} color="#f59e0b" style={{ marginRight: 8 }} />
                    <Text className="text-lg font-bold text-slate-800 dark:text-white">Morning / Upcoming</Text>
                </View>
                <View>
                    {morningMeds.map(med => (
                        <MedicationCard key={med.id} medication={med} takenCount={takenLog[med.id] || 0} onTake={onTake} onInfo={onInfo} />
                    ))}
                    {morningMeds.length === 0 && <Text className="text-slate-400 italic text-sm">No morning medications due.</Text>}
                </View>
            </View>

            {/* Evening Section */}
            <View>
                <View className="flex-row items-center mb-3">
                    <FontAwesome5 name="moon" size={16} color="#4f46e5" style={{ marginRight: 8 }} />
                    <Text className="text-lg font-bold text-slate-800 dark:text-white">Evening / Later</Text>
                </View>
                <View>
                    {eveningMeds.map(med => (
                        <MedicationCard key={med.id} medication={med} takenCount={takenLog[med.id] || 0} onTake={onTake} onInfo={onInfo} />
                    ))}
                    {eveningMeds.length === 0 && <Text className="text-slate-400 italic text-sm">No evening medications due.</Text>}
                </View>
            </View>

        </ScrollView>
    );
};
