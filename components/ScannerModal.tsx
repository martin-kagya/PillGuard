import React, { useState, useEffect } from 'react';
import { DrugForm } from '../types';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { FontAwesome5 } from '@expo/vector-icons';
import { parseQRData } from '../utils/qr';

interface ScannerModalProps {
    visible: boolean;
    onClose: () => void;
    onScan: (data: any) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ visible, onClose, onScan }) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [isSimulator, setIsSimulator] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');

            // Basic detection for simulator - usually camera status might be granted but camera won't init
            // Or we check Device info appropriately.
            // For simplicity, we just rely on permission or user intent.
            // But we will ALWAYS show the "Simulate" button for dev convenience.
        })();
    }, []);

    const handleBarCodeScanned = ({ type, data }: any) => {
        setScanned(true);
        const parsed = parseQRData(data);
        if (parsed) {
            onScan(parsed);
            onClose();
        } else {
            alert('Invalid QR Code');
            setScanned(false);
        }
    };

    const handleSimulateScan = () => {
        // Mock Data
        const mockData = {
            name: "Amoxicillin (Suspension)",
            dosage: "5ml",
            form: "LIQUID",
            frequency: "daily",
            notes: "Simulated Scan Result - Liquid Form"
        };
        onScan(mockData);
        onClose();
    };

    if (hasPermission === null) {
        return <View />;
    }
    if (hasPermission === false) {
        return <Text>No access to camera</Text>;
    }

    return (
        <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
            <View className="flex-1 bg-black">
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                />

                <View className="flex-1 justify-between p-10">
                    <TouchableOpacity onPress={onClose} className="self-end mt-10 bg-black/50 p-2 rounded-full">
                        <FontAwesome5 name="times" size={24} color="white" />
                    </TouchableOpacity>

                    <View className="items-center">
                        <View className="w-64 h-64 border-2 border-white/50 rounded-xl bg-transparent mb-10 items-center justify-center">
                            <Text className="text-white/70">Align QR Code here</Text>
                        </View>

                        {/* Simulator / Test Button always visible for dev */}
                        <TouchableOpacity
                            onPress={handleSimulateScan}
                            className="bg-white/20 p-4 rounded-lg flex-row gap-2"
                        >
                            <FontAwesome5 name="magic" size={16} color="white" />
                            <Text className="text-white font-bold">Simulate Scan (Dev)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
