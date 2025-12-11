import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { AppView } from '../types';
import { FontAwesome5 } from '@expo/vector-icons';

interface LayoutProps {
    children: React.ReactNode;
    currentView: AppView;
    onNavigate: (view: AppView) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, isDarkMode, toggleDarkMode }) => {
    const navItems = [
        { id: AppView.DASHBOARD, icon: 'home', label: 'Home' },
        { id: AppView.MEDICATIONS, icon: 'pills', label: 'Meds' },
        { id: AppView.AI_CONSULT, icon: 'user-md', label: 'Ask AI' },
    ];

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            {/* Header */}
            <View className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex-row justify-between items-center shadow-sm">
                <View className="flex-row items-center space-x-2">
                    <View className="w-8 h-8 bg-primary-600 rounded-lg items-center justify-center shadow-sm mr-2">
                        <FontAwesome5 name="heartbeat" size={16} color="white" />
                    </View>
                    <Text className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">PillGuard</Text>
                </View>
                <TouchableOpacity
                    onPress={toggleDarkMode}
                    className="w-10 h-10 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-700"
                >
                    <FontAwesome5 name={isDarkMode ? 'sun' : 'moon'} size={18} color={isDarkMode ? '#fbbf24' : '#94a3b8'} />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View className="flex-1 w-full max-w-3xl self-center pb-20">
                {children}
            </View>

            {/* Bottom Navigation */}
            <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 h-20 pb-5 flex-row justify-around items-center z-20">
                {navItems.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        onPress={() => onNavigate(item.id)}
                        className="items-center justify-center w-20"
                    >
                        <FontAwesome5
                            name={item.icon}
                            size={20}
                            color={currentView === item.id ? '#0284c7' : '#94a3b8'}
                        />
                        <Text className={`text-xs font-medium mt-1 ${currentView === item.id ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'
                            }`}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
};
