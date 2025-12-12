import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Medication, ChatMessage, InteractionResult } from '../types';
import * as GeminiService from '../services/gemini';
import { FontAwesome5 } from '@expo/vector-icons';

interface AIConsultProps {
    medications: Medication[];
}

export const AIConsult: React.FC<AIConsultProps> = ({ medications }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', role: 'model', text: 'Hello! I am PillGuard. How can I help you with your medications today?', timestamp: Date.now() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [interactionResult, setInteractionResult] = useState<InteractionResult | null>(null);
    const [checkingInteractions, setCheckingInteractions] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Scroll to bottom
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const responseText = await GeminiService.chatWithPillGuard(history, userMsg.text, medications);

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText || "I couldn't generate a response.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (e) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "I'm having trouble connecting right now. Please try again later.",
                timestamp: Date.now(),
                isError: true
            }]);
        } finally {
            setIsLoading(false);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const checkInteractions = async () => {
        setCheckingInteractions(true);
        const result = await GeminiService.analyzeInteractions(medications);

        // Safety Net: If AI says "safe" but summary contains danger words, force a warning state
        const dangerKeywords = ['danger', 'risk', 'avoid', 'severe', 'monitor', 'interaction', 'counteract', 'worsen'];
        const summaryLower = result.summary.toLowerCase();
        const hasTextWarning = dangerKeywords.some(w => summaryLower.includes(w));

        if (hasTextWarning && !result.hasInteraction && result.interactions.length === 0) {
            // Force it to look like an interaction if the text implies it
            result.hasInteraction = true;
            result.status = 'Risky';
            result.severity = 'moderate'; // Assume moderate if text is scary but AI missed flag
        }

        setInteractionResult(result);
        setCheckingInteractions(false);
    };

    const getStatusStyle = (status: 'Safe' | 'Risky' | 'Deadly' | undefined) => {
        switch (status) {
            case 'Deadly': return { bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-300 dark:border-red-700', text: 'text-red-900 dark:text-red-100', icon: '#ef4444' };
            case 'Risky': return { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-200', icon: '#f97316' };
            case 'Safe': return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-800 dark:text-emerald-200', icon: '#10b981' };
            default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', icon: '#64748b' };
        }
    };

    const styles = interactionResult ? getStatusStyle(interactionResult.status) : getStatusStyle('Safe');

    return (
        <View className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 pb-20">

            {/* Interaction Check */}
            <View className="mb-4">
                {!interactionResult ? (
                    <TouchableOpacity
                        onPress={checkInteractions}
                        disabled={checkingInteractions}
                        className="w-full bg-indigo-600 p-4 rounded-lg flex-row items-center justify-center shadow-sm"
                    >
                        {checkingInteractions ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /> : <FontAwesome5 name="user-md" size={16} color="white" style={{ marginRight: 8 }} />}
                        <Text className="text-white font-bold">Check for Drug Interactions</Text>
                    </TouchableOpacity>
                ) : (
                    <View className={`p-4 rounded-lg border relative ${styles.bg} ${styles.border}`}>
                        <TouchableOpacity onPress={() => setInteractionResult(null)} className="absolute top-2 right-2 p-2">
                            <FontAwesome5 name="times" size={14} color={styles.icon} />
                        </TouchableOpacity>

                        <View className="flex-row items-center mb-2">
                            {interactionResult.status === 'Deadly' && <FontAwesome5 name="skull-crossbones" size={18} color={styles.icon} style={{ marginRight: 8 }} />}
                            {interactionResult.status === 'Risky' && <FontAwesome5 name="exclamation-triangle" size={18} color={styles.icon} style={{ marginRight: 8 }} />}
                            {interactionResult.status === 'Safe' && <FontAwesome5 name="check-circle" size={18} color={styles.icon} style={{ marginRight: 8 }} />}

                            <Text className={`font-bold text-lg ${styles.text}`}>
                                {interactionResult.status === 'Deadly' ? 'SEVERE WARNING' :
                                    interactionResult.status === 'Risky' ? 'Potential Risks Found' :
                                        'No Interactions Found'}
                            </Text>
                        </View>

                        <Text className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed indent-0 mb-3">{interactionResult.summary}</Text>

                        {interactionResult.interactions.length > 0 && (
                            <View className="bg-white/60 dark:bg-black/20 p-3 rounded-lg">
                                {interactionResult.interactions.map((i, idx) => (
                                    <View key={idx} className="mb-2 last:mb-0">
                                        <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">{i.med1} + {i.med2}</Text>
                                        <Text className="text-xs text-slate-600 dark:text-slate-400">{i.description}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Chat Area */}
            <View className="flex-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <ScrollView
                    ref={scrollViewRef}
                    className="flex-1 p-4"
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    {messages.map((msg) => (
                        <View key={msg.id} className={`mb-4 flex-row ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <View className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user'
                                ? 'bg-primary-600 rounded-br-none'
                                : (msg.isError ? 'bg-red-100 dark:bg-red-900/30 rounded-bl-none' : 'bg-slate-100 dark:bg-slate-700 rounded-bl-none')
                                }`}>
                                {msg.role === 'model' && !msg.isError && (
                                    <View className="flex-row items-center mb-1">
                                        <FontAwesome5 name="robot" size={12} color="#0ea5e9" style={{ marginRight: 6 }} />
                                        <Text className="text-xs font-bold text-slate-400">PillGuard AI</Text>
                                    </View>
                                )}
                                <Text className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : (msg.isError ? 'text-red-800 dark:text-red-200' : 'text-slate-800 dark:text-slate-200')}`}>
                                    {msg.text}
                                </Text>
                            </View>
                        </View>
                    ))}
                    {isLoading && (
                        <View className="items-start mb-4">
                            <View className="bg-slate-100 dark:bg-slate-700 p-3 rounded-2xl rounded-bl-none">
                                <ActivityIndicator size="small" color="#94a3b8" />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Input */}
                <View className="p-3 border-t border-slate-100 dark:border-slate-700 flex-row items-center bg-white dark:bg-slate-800">
                    <TextInput
                        className="flex-1 bg-slate-100 dark:bg-slate-700 px-4 py-3 rounded-full text-slate-800 dark:text-white"
                        placeholder="Ask about your medications..."
                        placeholderTextColor="#94a3b8"
                        value={input}
                        onChangeText={setInput}
                        onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="ml-2 w-10 h-10 items-center justify-center bg-primary-100 dark:bg-primary-900/30 rounded-full"
                    >
                        <FontAwesome5 name="paper-plane" size={16} color={!input.trim() ? "#cbd5e1" : "#0284c7"} />
                    </TouchableOpacity>
                </View>
            </View>

        </View>
    );
};
