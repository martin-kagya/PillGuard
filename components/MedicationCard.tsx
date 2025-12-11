import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Medication, Frequency } from '../types';
import { ScheduleManager } from '../services/schedule';
import { FontAwesome5 } from '@expo/vector-icons';
import clsx from 'clsx'; // Assuming standard React setup, but for RN + NativeWind, standard CSS classes work.
// I'll stick to direct class strings or interpolation since clsx needs install.
// NativeWind allows `className`.

interface MedicationCardProps {
    medication: Medication;
    onTake?: (id: string) => void;
    onInfo?: (name: string) => void;
    takenCount?: number;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({ medication, onTake, onInfo, takenCount = 0 }) => {
    const [showNotes, setShowNotes] = useState(false);

    const schedule = medication.times || (medication.time ? [medication.time] : []);
    const totalDoses = medication.frequency === Frequency.EVERY_X_HOURS ? -1 : Math.max(1, schedule.length);
    const isCompleted = totalDoses !== -1 && takenCount >= totalDoses;

    const isLowStock = medication.stock <= medication.refillThreshold;
    const displayTime = ScheduleManager.getDisplayTime(medication, takenCount);
    const isDifferentZone = ScheduleManager.isDifferentTimezone(medication);
    const isInterval = medication.frequency === Frequency.EVERY_X_HOURS;

    return (
        <View className={`rounded-lg border mb-3 overflow-hidden transition-all ${isCompleted
                ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 opacity-75'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
            }`}>
            <View className="flex-row p-4">
                {/* Color Indicator */}
                <View className={`w-1.5 rounded-full mr-4 ${medication.color}`} />

                <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                                <Text className={`font-bold text-lg ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {medication.name}
                                </Text>

                                {isCompleted ? (
                                    <View className="flex-row items-center bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-200">
                                        <FontAwesome5 name="check" size={10} className="text-emerald-700 dark:text-emerald-400 mr-1" color={isCompleted ? "#047857" : ""} />
                                        <Text className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">Done</Text>
                                    </View>
                                ) : (totalDoses > 1 && (
                                    <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full border border-blue-100">
                                        <Text className="text-blue-600 dark:text-blue-400 text-[10px] font-bold">Dose {takenCount + 1}/{totalDoses}</Text>
                                    </View>
                                ))}

                                {isLowStock && !isCompleted && (
                                    <View className="flex-row items-center bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full border border-orange-100">
                                        <FontAwesome5 name="exclamation-triangle" size={10} className="text-orange-600 mr-1" color="#c2410c" />
                                        <Text className="text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase">Low Stock</Text>
                                    </View>
                                )}
                            </View>

                            <View className="flex-row items-center gap-2 mt-1">
                                <Text className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                    {medication.dosage} • {isInterval ? `Every ${medication.intervalHours}h` : medication.frequency}
                                </Text>

                                {medication.notes ? (
                                    <TouchableOpacity
                                        onPress={() => setShowNotes(!showNotes)}
                                        className={`w-6 h-6 items-center justify-center rounded-full ${showNotes
                                                ? 'bg-primary-100'
                                                : 'bg-slate-100 dark:bg-slate-700'
                                            }`}
                                    >
                                        <FontAwesome5 name="info" size={10} color={showNotes ? "#0284c7" : "#94a3b8"} />
                                    </TouchableOpacity>
                                ) : null}

                                {onInfo && (
                                    <TouchableOpacity
                                        onPress={() => onInfo(medication.rxNormName || medication.name)}
                                        className="w-6 h-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700"
                                    >
                                        <FontAwesome5 name="book-medical" size={10} color="#94a3b8" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Time Display */}
                        <View className={`items-end px-2 py-1 rounded-md ml-2 min-w-[80px] ${isInterval ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-slate-50 dark:bg-slate-700'} ${isDifferentZone ? 'bg-amber-100' : ''}`}>
                            <View className="flex-row items-center">
                                <FontAwesome5
                                    name={isInterval ? 'hourglass-half' : 'clock'}
                                    size={12}
                                    color={isInterval ? '#4f46e5' : (isDifferentZone ? '#d97706' : '#94a3b8')}
                                    style={{ marginRight: 4 }}
                                />
                                <Text className={`text-xs font-bold ${isInterval ? 'text-indigo-600 dark:text-indigo-300' : (isDifferentZone ? 'text-amber-700' : 'text-slate-400 dark:text-slate-300')}`}>
                                    {displayTime}
                                </Text>
                            </View>
                            {isDifferentZone && !isInterval && <Text className="text-[9px] text-amber-700 opacity-70">LOCAL</Text>}
                            <Text className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                {isCompleted
                                    ? 'Completed'
                                    : (isInterval ? 'Next Dose' : (takenCount === 0 ? 'First Dose' : 'Next Dose'))
                                }
                            </Text>
                        </View>
                    </View>

                    {medication.notes && showNotes && (
                        <View className="mt-3 p-3 rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-700/30 flex-row items-start">
                            <FontAwesome5 name="sticky-note" size={12} color="#60a5fa" style={{ marginTop: 2, marginRight: 6 }} />
                            <Text className="text-xs text-slate-600 dark:text-slate-300 italic flex-1">{medication.notes}</Text>
                        </View>
                    )}

                    <View className="mt-4 flex-row justify-between items-center">
                        <Text className="text-xs text-slate-400 font-medium">
                            Stock: <Text className={`${isLowStock ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>{medication.stock} left</Text>
                        </Text>

                        {onTake && !isCompleted && (
                            <TouchableOpacity
                                onPress={() => onTake(medication.id)}
                                className="bg-primary-50 dark:bg-primary-900/20 flex-row items-center px-4 py-2 rounded-lg"
                            >
                                <FontAwesome5 name="check" size={12} color="#0284c7" style={{ marginRight: 6 }} />
                                <Text className="text-primary-600 dark:text-primary-400 text-sm font-bold">
                                    {totalDoses > 1 ? `Take Dose ${takenCount + 1}` : 'Take'}
                                </Text>
                            </TouchableOpacity>
                        )}
                        {isCompleted && (
                            <View className="flex-row items-center px-4 py-2">
                                <FontAwesome5 name="check-circle" size={14} color="#059669" style={{ marginRight: 6 }} />
                                <Text className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">All Taken</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};
