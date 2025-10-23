import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

// IMPORTANT: Do NOT commit your API key to version control.
// This key is retrieved from environment variables.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might show a more user-friendly error.
  // For this context, we assume the key is available.
  console.warn("Gemini API key not found. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateAiResponse = async (history: ChatMessage[], newPrompt: string): Promise<string> => {
  if (!API_KEY) {
    return "API-nøgle for Gemini er ikke konfigureret. AI-chat er ikke tilgængelig.";
  }

  try {
    const model = 'gemini-2.5-flash';

    // FIX: Use structured contents for chat history and a separate system instruction
    // for better model performance and clarity, instead of a single formatted string.
    const contents = [
      ...history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : ('model' as 'user' | 'model'),
        parts: [{ text: msg.text }],
      })),
      { role: 'user' as const, parts: [{ text: newPrompt }] },
    ];

    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction: "Du er en venlig og hjælpsom studieassistent for danske elever. Svar altid på dansk."
        }
    });
    
    return response.text;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Undskyld, der opstod en fejl i kommunikationen med AI-assistenten. Prøv venligst igen.";
  }
};
