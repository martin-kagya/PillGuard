// import { GoogleGenAI, Type } from "@google/genai/web";
import { Medication, InteractionResult } from '../types';

// Initialize the client
// Using process.env.EXPO_PUBLIC_API_KEY for Expo
// const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

export const analyzeInteractions = async (medications: Medication[]): Promise<InteractionResult> => {
    /*
    if (medications.length < 2) {
        return {
            hasInteraction: false,
            severity: 'none',
            summary: "Not enough medications to check for interactions.",
            recommendation: "Add more medications to your list to check for potential interactions.",
            interactions: []
        };
    }

    const medList = medications.map(m => `${m.name} (${m.dosage})`).join(', ');

    const prompt = `
    Analyze the following list of medications for potential drug-drug interactions: ${medList}.
    Return a structured JSON response. 
    If interactions exist, list each specific pair in the 'interactions' array.
    Provide an overall summary and a general recommendation.
    Focus on clinical relevance but keep language accessible to a patient.
  `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        hasInteraction: { type: Type.BOOLEAN },
                        severity: { type: Type.STRING, enum: ['low', 'moderate', 'high', 'none'] },
                        summary: { type: Type.STRING },
                        recommendation: { type: Type.STRING },
                        interactions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    med1: { type: Type.STRING },
                                    med2: { type: Type.STRING },
                                    severity: { type: Type.STRING, enum: ['low', 'moderate', 'high'] },
                                    description: { type: Type.STRING }
                                },
                                required: ['med1', 'med2', 'severity', 'description']
                            }
                        }
                    },
                    required: ['hasInteraction', 'severity', 'summary', 'recommendation', 'interactions']
                }
            }
        });

        const resultText = response.text;
        if (!resultText) throw new Error("No response from AI");

        return JSON.parse(resultText) as InteractionResult;
    } catch (error) {
        console.error("Gemini Interaction Check Failed:", error);
        return {
            hasInteraction: false, // Default to safe fail state
            severity: 'none',
            summary: "Could not analyze interactions at this time due to a network or service error.",
            recommendation: "Please consult your pharmacist or doctor directly.",
            interactions: []
        };
    }
    */
    console.log("Gemini API is currently disabled.");
    return {
        hasInteraction: false,
        severity: 'none',
        summary: "AI Interaction checking is temporarily unavailable.",
        recommendation: "Please check with your healthcare provider.",
        interactions: []
    };
};

export const chatWithPillGuard = async (history: { role: string, parts: { text: string }[] }[], newMessage: string) => {
    /*
    try {
        const chat = ai.chats.create({
            model: MODEL_NAME,
            history: history,
            config: {
                systemInstruction: "You are PillGuard, a compassionate and knowledgeable medical adherence assistant. Your goal is to help patients understand their medications, remind them of importance, and answer general health questions. Always advise users to consult a doctor for specific medical advice. Be concise and empathetic.",
            }
        });

        const response = await chat.sendMessage({
            message: newMessage
        });

        return response.text;
    } catch (error) {
        console.error("Gemini Chat Failed:", error);
        throw error;
    }
    */
    console.log("Gemini Chat is currently disabled.");
    return "I'm sorry, I'm currently offline for maintenance. Please check back later.";
};
