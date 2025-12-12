import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MedicationList } from './components/MedicationList';
import { AddMedicationModal } from './components/AddMedicationModal';
import { DrugInfoModal } from './components/DrugInfoModal';
import { AIConsult } from './components/AIConsult';
import { AppView, Medication } from './types';
import * as StorageService from './services/storage';
import * as NotificationService from './services/notifications';
import * as InventoryService from './services/inventory';
import * as AdherenceService from './services/adherence';
import { ScheduleManager } from './services/schedule';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'nativewind';
import * as Linking from 'expo-linking';
import { ScannerModal } from './components/ScannerModal';
import { parseQRData } from './utils/qr';
import './global.css';

export default function App() {
    const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [takenLog, setTakenLog] = useState<Record<string, number>>({});
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
    const [selectedDrugForInfo, setSelectedDrugForInfo] = useState<string | null>(null);

    // Scanner & Deep Link State
    const [showScanner, setShowScanner] = useState(false);
    const [initialMedicationData, setInitialMedicationData] = useState<Partial<Medication> | undefined>(undefined);

    const [isLoading, setIsLoading] = useState(true);
    const [timezoneChanged, setTimezoneChanged] = useState(false);
    const [statsRange, setStatsRange] = useState<number>(30);
    const [adherenceStats, setAdherenceStats] = useState({ rate: 100, totalTaken: 0, totalScheduled: 0 });

    // NativeWind / Tailwind Dark Mode
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Deep Link Listener
    useEffect(() => {
        const handleDeepLink = ({ url }: { url: string }) => {
            const data = parseQRData(url);
            if (data) {
                setInitialMedicationData(data);
                setIsAddModalOpen(true);
            }
        };

        const sub = Linking.addEventListener('url', handleDeepLink);

        Linking.getInitialURL().then(url => {
            if (url) handleDeepLink({ url });
        });

        return () => sub.remove();
    }, []);

    useEffect(() => {
        const init = async () => {
            // Load Meds
            const data = await StorageService.seedInitialData();
            setMedications(data);

            // Load Log
            const today = new Date().toISOString().split('T')[0];
            const savedLog = await AsyncStorage.getItem(`pillguard_log_${today}`);
            if (savedLog) {
                setTakenLog(JSON.parse(savedLog));
            }

            await NotificationService.requestNotificationPermission();

            // Timezone Check
            const lastTz = await AsyncStorage.getItem('pillguard_last_timezone');
            const currentTz = ScheduleManager.getCurrentTimezone();
            if (lastTz && lastTz !== currentTz) {
                setTimezoneChanged(true);
            }
            await AsyncStorage.setItem('pillguard_last_timezone', currentTz);

            setIsLoading(false);
        };
        init();
    }, []);

    // Compute Adherence when dependent data changes
    useEffect(() => {
        const compute = async () => {
            const stats = await AdherenceService.calculateAdherenceStats(medications, statsRange);
            setAdherenceStats(stats);
        };
        if (!isLoading) {
            compute();
        }
    }, [medications, takenLog, statsRange, isLoading]);

    // Monitor for alarms (Every 30 seconds -> 5 for debug)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            medications.forEach(med => {
                const takenCount = takenLog[med.id] || 0;
                const next = ScheduleManager.getNextOccurrence(med, takenCount);
                if (!next) return;
                const timeDiff = next.getTime() - now.getTime();
                if (timeDiff <= 0 && timeDiff > -5000) {
                    NotificationService.playAlarmSound(med.name);
                }
            });
        }, 30000); // 30s check loop
        return () => clearInterval(interval);
    }, [medications, takenLog]);

    const handleTakeMedication = async (id: string) => {
        const now = Date.now();
        const currentCount = takenLog[id] || 0;
        const newCount = currentCount + 1;
        const newLog = { ...takenLog, [id]: newCount };
        setTakenLog(newLog);

        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem(`pillguard_log_${today}`, JSON.stringify(newLog));

        const updatedMeds = medications.map(m => {
            if (m.id === id) {
                const newStock = InventoryService.decrementStock(m);
                if (newStock <= m.refillThreshold) {
                    NotificationService.sendNotification('Refill Warning', `Your ${m.name} stock is low (${newStock} left).`);
                }
                const updatedMed = { ...m, stock: newStock, lastTaken: now };
                NotificationService.scheduleReminders(updatedMed);
                return updatedMed;
            }
            return m;
        });
        setMedications(updatedMeds);
        await StorageService.saveMedications(updatedMeds);
    };

    const handleRefill = async (id: string) => {
        const updatedMeds = medications.map(m => {
            if (m.id === id) {
                return { ...m, stock: m.stock + 30 };
            }
            return m;
        });
        setMedications(updatedMeds);
        await StorageService.saveMedications(updatedMeds);
    };

    const handleSaveMedication = async (medData: Omit<Medication, 'id'>) => {
        let updatedMeds: Medication[];

        if (editingMedication) {
            updatedMeds = medications.map(m =>
                m.id === editingMedication.id
                    ? { ...medData, id: m.id }
                    : m
            );
        } else {
            const newMed: Medication = {
                ...medData,
                id: Date.now().toString()
            };
            updatedMeds = [...medications, newMed];
        }

        setMedications(updatedMeds);
        await StorageService.saveMedications(updatedMeds);

        if (medData.time || medData.times) {
            const target = editingMedication ? updatedMeds.find(m => m.id === editingMedication.id) : updatedMeds[updatedMeds.length - 1];
            if (target) NotificationService.scheduleReminders(target);
        }

        // Notify user of success (especially important for scan flows)
        const successTitle = editingMedication ? 'Medication Updated' : 'Medication Added';
        const successBody = `${medData.name} has been successfully saved to your schedule.`;
        NotificationService.sendNotification(successTitle, successBody);

        setEditingMedication(null);
        setInitialMedicationData(undefined);
    };

    const handleDeleteMedication = async (id: string) => {
        const medToDelete = medications.find(m => m.id === id);
        if (medToDelete) {
            await ScheduleManager.CalendarService.deleteMedicationEvents(medToDelete);
        }

        const updatedMeds = medications.filter(m => m.id !== id);
        setMedications(updatedMeds);
        await StorageService.saveMedications(updatedMeds);

        const newLog = { ...takenLog };
        delete newLog[id];
        setTakenLog(newLog);
        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem(`pillguard_log_${today}`, JSON.stringify(newLog));

        // Refresh Notifications: Cancel all and re-schedule remaining
        await NotificationService.cancelAllNotifications();
        for (const med of updatedMeds) {
            await NotificationService.scheduleReminders(med);
        }
    };

    const handleScanResult = (data: any) => {
        setInitialMedicationData(data);
        setShowScanner(false);
        setTimeout(() => setIsAddModalOpen(true), 500);
    };

    const renderView = () => {
        switch (currentView) {
            case AppView.DASHBOARD:
                return (
                    <Dashboard
                        medications={medications}
                        takenLog={takenLog}
                        onTake={handleTakeMedication}
                        onRefill={handleRefill}
                        onInfo={(name) => setSelectedDrugForInfo(name)}
                        timezoneChanged={timezoneChanged}
                        adherenceStats={adherenceStats}
                        setStatsRange={setStatsRange}
                        statsRange={statsRange}
                        onScanPress={() => setShowScanner(true)}
                    />
                );
            case AppView.MEDICATIONS:
                return (
                    <MedicationList
                        medications={medications}
                        onAdd={() => {
                            setEditingMedication(null);
                            setInitialMedicationData(undefined);
                            setIsAddModalOpen(true);
                        }}
                        onEdit={(med) => {
                            setEditingMedication(med);
                            setInitialMedicationData(undefined);
                            setIsAddModalOpen(true);
                        }}
                        onDelete={handleDeleteMedication}
                    />
                );
            case AppView.AI_CONSULT:
                return <AIConsult medications={medications} />;
            default:
                return <View><Text>View not found</Text></View>;
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
                <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
        );
    }

    // Determine initial data for modal: either edit data or scanned data
    const modalInitialData = editingMedication || initialMedicationData;

    return (
        <Layout
            currentView={currentView}
            onNavigate={setCurrentView}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleColorScheme}
        >
            {renderView()}

            {isAddModalOpen && (
                <AddMedicationModal
                    visible={isAddModalOpen}
                    initialData={modalInitialData as any}
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setEditingMedication(null);
                        setInitialMedicationData(undefined);
                    }}
                    onSave={handleSaveMedication}
                />
            )}

            {selectedDrugForInfo && (
                <DrugInfoModal
                    drugName={selectedDrugForInfo}
                    onClose={() => setSelectedDrugForInfo(null)}
                />
            )}

            <ScannerModal
                visible={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScanResult}
            />
        </Layout>
    );
}
