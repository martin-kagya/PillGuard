import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator, Alert } from 'react-native';
import { Medication, Frequency, DrugForm } from '../types';
import * as RxNavService from '../services/rxnav';
import { ScheduleManager } from '../services/schedule';
import { CalendarService } from '../services/calendar';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

interface AddMedicationModalProps {
    visible: boolean;
    initialData?: Medication | null;
    onClose: () => void;
    onSave: (med: Omit<Medication, 'id'>) => void;
}

export const AddMedicationModal: React.FC<AddMedicationModalProps> = ({ visible, initialData, onClose, onSave }) => {
    const [step, setStep] = useState(1);
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<RxNavService.RxNavResult[]>([]);
    const [searching, setSearching] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [rxNormName, setRxNormName] = useState('');
    const [form, setForm] = useState<DrugForm>(DrugForm.TABLET);
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState<Frequency>(Frequency.DAILY);
    const [intervalHours, setIntervalHours] = useState<string>('6');

    const [time, setTime] = useState('09:00');
    const [secondTime, setSecondTime] = useState('21:00');

    const [stock, setStock] = useState('30');
    const [threshold, setThreshold] = useState('7');
    const [color, setColor] = useState('bg-blue-500'); // Keeping class string for consistency, though purely visual
    const [notes, setNotes] = useState('');

    // Date Picker State
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'time1' | 'time2'>('time1');

    useEffect(() => {
        if (initialData) {
            setStep(2);
            setName(initialData.name || '');
            setRxNormName(initialData.rxNormName || '');
            setForm(initialData.form || DrugForm.TABLET);
            setDosage(initialData.dosage || '');
            setFrequency(initialData.frequency || Frequency.DAILY);
            setStock(initialData.stock ? initialData.stock.toString() : '30');
            setThreshold(initialData.refillThreshold ? initialData.refillThreshold.toString() : '7');
            setColor(initialData.color || 'bg-blue-500');
            setNotes(initialData.notes || '');

            if (initialData.frequency === Frequency.EVERY_X_HOURS && initialData.intervalHours) {
                setIntervalHours(initialData.intervalHours.toString());
                const startTime = initialData.times?.[0] || initialData.time || '09:00';
                setTime(startTime);
            } else if (initialData.frequency === Frequency.TWICE_DAILY && initialData.times && initialData.times.length > 1) {
                setTime(initialData.times[0]);
                setSecondTime(initialData.times[1]);
            } else {
                const t = initialData.times?.[0] || initialData.time || '09:00';
                setTime(t);
            }
        } else {
            setStep(1);
            setQuery('');
            setName('');
            setRxNormName('');
            setForm(DrugForm.TABLET);
            setDosage('');
            setFrequency(Frequency.DAILY);
            setTime('09:00');
            setStock('30');
            setThreshold('7');
            setNotes('');
        }
    }, [initialData]);

    // Debounced Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length >= 3) {
                setSearching(true);
                try {
                    let results = await RxNavService.searchDrugs(query);
                    if (results.length === 0) {
                        results = RxNavService.getFallbackDrugs(query);
                    }
                    setSearchResults(results);
                } catch (e) {
                    setSearchResults(RxNavService.getFallbackDrugs(query));
                } finally {
                    setSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelectDrug = (result: RxNavService.RxNavResult) => {
        setName(result.name);
        setRxNormName(result.name);
        setStep(2);
    };

    const handleSave = async () => {
        let timesArray = [time];
        if (frequency === Frequency.TWICE_DAILY) {
            timesArray = [time, secondTime].sort();
        }

        const medData: Omit<Medication, 'id'> = {
            name,
            rxNormName,
            form,
            dosage,
            frequency,
            time: timesArray[0],
            times: timesArray,
            timezone: initialData?.timezone || ScheduleManager.getCurrentTimezone(),
            stock: parseInt(stock) || 0,
            refillThreshold: parseInt(threshold) || 0,
            color,
            notes,
            lastTaken: initialData?.lastTaken,
            lastNotified: initialData?.lastNotified
        };

        if (frequency === Frequency.EVERY_X_HOURS) {
            medData.intervalHours = parseInt(intervalHours) || 6;
            medData.times = undefined;
            medData.time = time;
        }

        // Sync to Device Calendar
        await CalendarService.syncMedication(medData as Medication);

        onSave(medData);
        onClose();
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }

        if (selectedDate) {
            const timeStr = selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            if (pickerMode === 'time1') {
                setTime(timeStr);
            } else {
                setSecondTime(timeStr);
            }
        }
    };

    const showPicker = (mode: 'time1' | 'time2') => {
        setPickerMode(mode);
        setShowTimePicker(true);
    };

    const parseTime = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
                <View className="flex-1 bg-slate-900/50 justify-center p-4">
                    <View className="bg-white dark:bg-slate-800 rounded-xl w-full max-h-[90%] flex-col shadow-2xl overflow-hidden">

                        {/* Header */}
                        <View className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 p-4 flex-row justify-between items-center">
                            <Text className="text-lg font-bold text-slate-800 dark:text-white">
                                {initialData ? 'Edit Medication' : (step === 1 ? 'Find Medication' : 'Configure Schedule')}
                            </Text>
                            <TouchableOpacity onPress={onClose} className="p-1">
                                <FontAwesome5 name="times" size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {/* Step 1: Search */}
                        {step === 1 && (
                            <ScrollView className="p-4" keyboardShouldPersistTaps="handled">
                                <View className="relative">
                                    <FontAwesome5 name="search" size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 14, zIndex: 1 }} />
                                    <TextInput
                                        autoFocus
                                        className="w-full bg-slate-100 dark:bg-slate-700 rounded-lg py-3 pl-10 pr-4 font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                                        placeholder="Type drug name..."
                                        placeholderTextColor="#94a3b8"
                                        value={query}
                                        onChangeText={setQuery}
                                    />
                                </View>

                                <View className="min-h-[200px] mt-2">
                                    {searching && (
                                        <View className="items-center p-4">
                                            <ActivityIndicator size="small" color="#0ea5e9" />
                                            <Text className="text-slate-400 mt-2">Searching RxNav...</Text>
                                        </View>
                                    )}

                                    {!searching && searchResults.length > 0 && (
                                        <View className="mt-2">
                                            {searchResults.map((res, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    onPress={() => handleSelectDrug(res)}
                                                    className="w-full flex-row items-center p-3 rounded-lg bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 active:bg-primary-50 dark:active:bg-primary-900/20"
                                                >
                                                    <View className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 items-center justify-center mr-3">
                                                        <FontAwesome5 name="prescription-bottle" size={14} color="#64748b" />
                                                    </View>
                                                    <Text className="font-medium text-slate-700 dark:text-slate-200">{res.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    {!searching && query.length > 2 && searchResults.length === 0 && (
                                        <View className="items-center p-4">
                                            <Text className="text-slate-400 dark:text-slate-500 text-center mb-2">No exact matches found.</Text>
                                            <TouchableOpacity onPress={() => { setName(query); setRxNormName(query); setStep(2); }}>
                                                <Text className="text-primary-600 dark:text-primary-400 font-semibold">Use "{query}" anyway</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        )}

                        {/* Step 2: Details */}
                        {step === 2 && (
                            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 20 }}>
                                {/* Name Fields */}
                                <View className="mb-4 bg-slate-50/50 dark:bg-slate-700/20 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <View className="mb-3">
                                        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nickname</Text>
                                        <TextInput
                                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-bold"
                                            value={name}
                                            onChangeText={setName}
                                            placeholder="e.g. Morning Pill"
                                            placeholderTextColor="#94a3b8"
                                        />
                                    </View>
                                    <View>
                                        <View className="flex-row items-center mb-1">
                                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">Official Name</Text>
                                            {rxNormName ? <View className="bg-emerald-100 px-1 ml-2 rounded"><Text className="text-emerald-700 text-[10px] font-bold">VERIFIED</Text></View> : null}
                                        </View>
                                        <TextInput
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 text-sm"
                                            value={rxNormName}
                                            onChangeText={setRxNormName}
                                            placeholder="e.g. Lisinopril"
                                        />
                                    </View>
                                </View>


                                {/* Form */}
                                <View className="mb-4">
                                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Form</Text>
                                    <View className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg">
                                        <Picker
                                            selectedValue={form}
                                            onValueChange={(itemValue) => {
                                                const newForm = itemValue as DrugForm;
                                                setForm(newForm);
                                                if (newForm === DrugForm.LIQUID || newForm === DrugForm.INJECTION) {
                                                    if (stock === '30') setStock('0');
                                                }
                                            }}
                                            style={{ color: '#000' }}
                                        >
                                            {Object.values(DrugForm).map(f => <Picker.Item key={f} label={f} value={f} />)}
                                        </Picker>
                                    </View>
                                </View>

                                <View className="mb-4">
                                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dosage</Text>
                                    <TextInput
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                                        placeholder={
                                            form === DrugForm.LIQUID ? "e.g. 5ml" :
                                                form === DrugForm.INJECTION ? "e.g. 10 units" :
                                                    "e.g. 10mg"
                                        }
                                        value={dosage}
                                        onChangeText={setDosage}
                                    />
                                </View>

                                {/* Frequency & Time */}
                                <View className="mb-4">
                                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Frequency</Text>
                                    <View className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg">
                                        <Picker
                                            selectedValue={frequency}
                                            onValueChange={(itemValue) => setFrequency(itemValue as Frequency)}
                                            style={{ color: '#000' }} // Adjust for dark mode needed usually
                                        >
                                            {Object.values(Frequency).map(f => <Picker.Item key={f} label={f} value={f} />)}
                                        </Picker>
                                    </View>
                                </View>

                                {frequency === Frequency.EVERY_X_HOURS && (
                                    <View className="flex-row gap-4 mb-4">
                                        <View className="flex-1">
                                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hours Between</Text>
                                            <TextInput
                                                keyboardType="numeric"
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                                                value={intervalHours}
                                                onChangeText={setIntervalHours}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Start Time</Text>
                                            <TouchableOpacity
                                                onPress={() => showPicker('time1')}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                            >
                                                <Text className="text-slate-800 dark:text-white font-medium">{time}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {(frequency !== Frequency.EVERY_X_HOURS) && (
                                    <View className="flex-row gap-4 mb-4">
                                        <View className="flex-1">
                                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{frequency === Frequency.TWICE_DAILY ? 'Dose 1' : 'Time'}</Text>
                                            <TouchableOpacity
                                                onPress={() => showPicker('time1')}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                            >
                                                <Text className="text-slate-800 dark:text-white font-medium">{time}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {frequency === Frequency.TWICE_DAILY && (
                                            <View className="flex-1">
                                                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dose 2</Text>
                                                <TouchableOpacity
                                                    onPress={() => showPicker('time2')}
                                                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                                >
                                                    <Text className="text-slate-800 dark:text-white font-medium">{secondTime}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {showTimePicker && (
                                    <DateTimePicker
                                        value={parseTime(pickerMode === 'time1' ? time : secondTime)}
                                        mode="time"
                                        is24Hour={true}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onTimeChange}
                                    />
                                )}

                                {/* Inventory */}
                                <View className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
                                    <Text className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Inventory Tracking</Text>
                                    <View className="flex-row gap-4">
                                        <View className="flex-1">
                                            <Text className="text-xs text-slate-500 mb-1">
                                                {form === DrugForm.LIQUID ? "Current (ml)" :
                                                    form === DrugForm.INJECTION ? "Current (units)" :
                                                        "Current Stock"}
                                            </Text>
                                            <TextInput
                                                keyboardType="numeric"
                                                className="w-full p-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-center font-bold text-slate-800 dark:text-white"
                                                value={stock}
                                                onChangeText={setStock}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-xs text-slate-500 mb-1">Alert Below</Text>
                                            <TextInput
                                                keyboardType="numeric"
                                                className="w-full p-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-center font-bold text-orange-600 dark:text-orange-400"
                                                value={threshold}
                                                onChangeText={setThreshold}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Notes */}
                                <View className="mb-4">
                                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</Text>
                                    <TextInput
                                        multiline
                                        numberOfLines={2}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white align-top"
                                        style={{ height: 80 }}
                                        placeholder="Take with food..."
                                        placeholderTextColor="#94a3b8"
                                        value={notes}
                                        onChangeText={setNotes}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={!dosage}
                                    className={`w-full bg-primary-600 py-3.5 rounded-lg shadow-sm ${!dosage ? 'opacity-50' : ''}`}
                                >
                                    <Text className="text-white font-bold text-center text-lg">{initialData ? 'Update Medication' : 'Save Medication'}</Text>
                                </TouchableOpacity>

                            </ScrollView>
                        )}

                    </View>
                </View>
            </KeyboardAvoidingView >
        </Modal >
    );
};
