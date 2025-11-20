import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

// Initialize standard client
let aiClient: GoogleGenAI | null = null;

if (API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: API_KEY });
}

export const generateSubtasks = async (taskTitle: string): Promise<{ title: string }[]> => {
  if (!aiClient) {
    console.warn("Gemini API Key not found. Returning mock data.");
    return [];
  }

  try {
    const model = "gemini-2.5-flash";
    const prompt = `Break down the task "${taskTitle}" into 3 to 5 smaller, actionable subtasks. Keep them concise.`;

    const response = await aiClient.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The subtask title" }
            },
            required: ["title"]
          }
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return [];
    
    const result = JSON.parse(jsonStr) as { title: string }[];
    return result;

  } catch (error) {
    console.error("Error generating subtasks:", error);
    return [];
  }
};