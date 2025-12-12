import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from 'openai';
import { Medication, InteractionResult } from '../types';

// Initialize the clients
const geminiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const googleAi = new GoogleGenAI({ apiKey: geminiKey || '' });

const openaiKey = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey: openaiKey,
    dangerouslyAllowBrowser: true // Required for React Native if not using a proxy
});

// Configuration
const USE_OPENAI = !!openaiKey;
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const OPENAI_MODEL = 'gpt-4o';

export const analyzeInteractions = async (medications: Medication[]): Promise<InteractionResult> => {
    if (medications.length < 2) {
        return {
            hasInteraction: false,
            status: 'Safe',
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
    1. 'hasInteraction': Set to TRUE if *any* risk, warning, or interaction is identified.
    2. 'interactions': You MUST list EVERY specific pair that represents a risk here. Do NOT list specific pairs in the summary.
    3. 'summary': High-level overview only. Do not use bullet points for specific interactions here.
    4. 'severity': Set to 'low', 'moderate', or 'high' based on the worst interaction.
    5. 'status': Choose one: 
        - 'Safe': No interactions found.
        - 'Risky': Moderate interactions or monitoring required.
        - 'Deadly': Severe, life-threatening, or major contraindications.
    IMPORTANT: If you describe a risk in text, 'hasInteraction' MUST be true and status must be 'Risky' or 'Deadly'.
  `;

    try {
        if (USE_OPENAI) {
            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: "You are a medical assistant." }, { role: "user", content: prompt }],
                model: OPENAI_MODEL,
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No response from OpenAI");

            return JSON.parse(content) as InteractionResult;
        } else {
            if (!geminiKey) throw new Error("Gemini API Key is missing");

            const response = await googleAi.models.generateContent({
                model: GEMINI_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            hasInteraction: { type: Type.BOOLEAN },
                            status: { type: Type.STRING, enum: ['Safe', 'Risky', 'Deadly'] },
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
                        required: ['hasInteraction', 'status', 'severity', 'summary', 'recommendation', 'interactions']
                    }
                }
            });

            const resultText = response.text;
            if (!resultText) throw new Error("No response from AI");

            return JSON.parse(resultText) as InteractionResult;
        }
    } catch (error: any) {
        console.error("AI Interaction Check Failed:", error);
        return {
            hasInteraction: false, // Default to safe fail state
            status: 'Safe',
            severity: 'none',
            summary: "Could not analyze interactions at this time due to a network or service error.",
            recommendation: "Please consult your pharmacist or doctor directly.",
            interactions: []
        };
    }
};

export const chatWithPillGuard = async (history: { role: string, parts: { text: string }[] }[], newMessage: string, medications: Medication[] = []) => {
    try {
        // Construct Context String
        let contextString = "";
        if (medications.length > 0) {
            const medDetails = medications.map(m => `- ${m.name} (${m.dosage}, ${m.frequency})`).join('\n');
            contextString = `\n\nCONTEXT - The user is currently taking the following medications:\n${medDetails}\n\nUse this information to answer questions relevant to their specific regimen.`;
        }

        const baseSystemInstruction = "You are PillGuard, a compassionate and knowledgeable medical adherence assistant. Your goal is to help patients understand their medications, remind them of importance, and answer general health questions. Always advise users to consult a doctor for specific medical advice. Be concise and empathetic.";
        const fullSystemInstruction = baseSystemInstruction + contextString;

        if (USE_OPENAI) {
            // Map history to OpenAI format
            const messages: any[] = [
                { role: "system", content: fullSystemInstruction },
                ...history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'assistant',
                    content: h.parts[0].text
                })),
                { role: "user", content: newMessage }
            ];

            const completion = await openai.chat.completions.create({
                messages: messages,
                model: OPENAI_MODEL,
            });

            return completion.choices[0].message.content || "";
        } else {
            if (!geminiKey) throw new Error("Gemini API Key is missing");

            const chat = googleAi.chats.create({
                model: GEMINI_MODEL,
                history: history,
                config: {
                    systemInstruction: fullSystemInstruction,
                }
            });

            const response = await chat.sendMessage({
                message: newMessage
            });

            return response.text;
        }
    } catch (error: any) {
        console.error("Chat Failed:", error);
        if (error.toString().includes("429") || error.toString().includes("quota")) {
            return "I'm currently receiving too many requests. Please try again in a minute.";
        }
        if (error.toString().includes("404") || error.toString().includes("not found")) {
            return "I'm having trouble connecting to my brain. Please check the developer console.";
        }
        throw error;
    }
};
