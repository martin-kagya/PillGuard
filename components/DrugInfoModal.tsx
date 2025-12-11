import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as OpenFDAService from '../services/openFDA';

interface DrugInfoModalProps {
    drugName: string;
    onClose: () => void;
}

export const DrugInfoModal: React.FC<DrugInfoModalProps> = ({ drugName, onClose }) => {
    const [details, setDetails] = useState<OpenFDAService.DrugDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchInfo = async () => {
            setLoading(true);
            const data = await OpenFDAService.getDrugDetails(drugName);
            if (data) {
                setDetails(data);
            } else {
                setError(true);
            }
            setLoading(false);
        };
        fetchInfo();
    }, [drugName]);

    return (
        <Modal animationType="slide" transparent={true} visible={true} onRequestClose={onClose}>
            <View className="flex-1 bg-slate-900/60 justify-center p-4">
                <View className="bg-white dark:bg-slate-800 rounded-xl w-full max-h-[80%] flex-col shadow-2xl overflow-hidden">

                    {/* Header */}
                    <View className="p-4 border-b border-slate-200 dark:border-slate-700 flex-row justify-between items-center bg-slate-50 dark:bg-slate-900">
                        <View className="flex-row items-center gap-3 flex-1">
                            <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center">
                                <FontAwesome5 name="book-medical" size={18} color="#2563eb" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-slate-800 dark:text-white" numberOfLines={1}>{drugName}</Text>
                                <Text className="text-xs text-slate-500 dark:text-slate-400">FDA Label Information</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                            <FontAwesome5 name="times" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView className="flex-1 p-6">
                        {loading && (
                            <View className="items-center justify-center py-12">
                                <ActivityIndicator size="large" color="#0ea5e9" />
                                <Text className="text-slate-500 text-sm mt-3">Fetching official records...</Text>
                            </View>
                        )}

                        {!loading && error && (
                            <View className="items-center py-12">
                                <View className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full items-center justify-center mb-3">
                                    <FontAwesome5 name="file-medical" size={24} color="#94a3b8" />
                                </View>
                                <Text className="text-slate-600 dark:text-slate-300 font-medium">Information unavailable</Text>
                                <Text className="text-slate-400 text-sm mt-1 text-center">We couldn't retrieve the FDA label for this specific drug name.</Text>
                            </View>
                        )}

                        {!loading && details && (
                            <View className="space-y-6 pb-6">
                                <View>
                                    <View className="flex-row items-center mb-2">
                                        <FontAwesome5 name="stethoscope" size={12} color="#0284c7" style={{ marginRight: 8 }} />
                                        <Text className="text-sm font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide">Indications & Usage</Text>
                                    </View>
                                    <View className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <Text className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {details.indications || 'No data provided.'}
                                        </Text>
                                    </View>
                                </View>

                                <View>
                                    <View className="flex-row items-center mb-2">
                                        <FontAwesome5 name="exclamation-triangle" size={12} color="#ea580c" style={{ marginRight: 8 }} />
                                        <Text className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Warnings</Text>
                                    </View>
                                    <View className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg border border-orange-100 dark:border-orange-900/30">
                                        <Text className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {details.warnings || 'No data provided.'}
                                        </Text>
                                    </View>
                                </View>

                                <View>
                                    <View className="flex-row items-center mb-2">
                                        <FontAwesome5 name="notes-medical" size={12} color="#64748b" style={{ marginRight: 8 }} />
                                        <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Adverse Reactions</Text>
                                    </View>
                                    <Text className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {details.reactions ? details.reactions.slice(0, 500) + (details.reactions.length > 500 ? '...' : '') : 'No data available.'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
