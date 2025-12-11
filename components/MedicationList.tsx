import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Medication, Frequency } from '../types';
import * as InventoryService from '../services/inventory';
import { FontAwesome5 } from '@expo/vector-icons';

interface MedicationListProps {
    medications: Medication[];
    onAdd: () => void;
    onEdit: (med: Medication) => void;
    onDelete: (id: string) => void;
}

export const MedicationList: React.FC<MedicationListProps> = ({ medications, onAdd, onEdit, onDelete }) => {
    return (
        <View className="flex-1 p-4 pb-24">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-slate-800 dark:text-white">My Cabinet</Text>
                <TouchableOpacity
                    onPress={onAdd}
                    className="bg-primary-600 flex-row items-center px-4 py-2 rounded-lg shadow-sm"
                >
                    <FontAwesome5 name="plus" size={14} color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white font-bold text-sm">Add Drug</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="space-y-3">
                {medications.map(med => {
                    const refillDate = InventoryService.getPredictedRefillDate(med.stock, med.frequency);

                    return (
                        <TouchableOpacity
                            key={med.id}
                            onPress={() => onEdit(med)}
                            className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex-row justify-between items-center mb-3 shadow-sm"
                        >
                            <View className="flex-row items-center flex-1 mr-2">
                                <View className={`w-12 h-12 rounded-full ${med.color} bg-opacity-10 items-center justify-center mr-4`}>
                                    <FontAwesome5 name="pills" size={20} color="#475569" />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg" numberOfLines={1}>{med.name}</Text>
                                    <View className="flex-row flex-wrap gap-2 mt-1">
                                        <View className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                            <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                <FontAwesome5 name="prescription-bottle" size={10} color="#64748b" style={{ marginRight: 4 }} />
                                                {med.dosage}
                                            </Text>
                                        </View>
                                        <View className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                            <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {med.frequency === Frequency.EVERY_X_HOURS
                                                    ? `Every ${med.intervalHours}h`
                                                    : (med.times && med.times.length > 1 ? `${med.times.length}x Daily` : med.time)
                                                }
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View className="items-end">
                                <Text className={`text-sm font-bold ${med.stock <= med.refillThreshold ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {med.stock} left
                                </Text>
                                {refillDate && (
                                    <Text className="text-[10px] text-slate-400">
                                        Refill: {refillDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </Text>
                                )}
                                <View className="flex-row mt-2 gap-3">
                                    <TouchableOpacity
                                        onPress={() => onEdit(med)}
                                        className="p-1"
                                    >
                                        <FontAwesome5 name="pen" size={14} color="#94a3b8" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            Alert.alert(
                                                "Delete Medication",
                                                `Are you sure you want to delete ${med.name}?`,
                                                [
                                                    { text: "Cancel", style: "cancel" },
                                                    { text: "Delete", style: "destructive", onPress: () => onDelete(med.id) }
                                                ]
                                            );
                                        }}
                                        className="p-1"
                                    >
                                        <FontAwesome5 name="trash-alt" size={14} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};
