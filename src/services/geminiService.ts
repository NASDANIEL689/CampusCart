import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const getCampusAssistantResponse = async (prompt: string, context?: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `You are the CampusCart Assistant, a helpful AI designed to help students at campus. 
          
          CURRENT APP CONTEXT (Listings and Vendors):
          ${context || "No specific context provided."}
          
          INSTRUCTIONS:
          - Use the provided context to answer questions about specific items or food.
          - If someone asks for "books", look at the context for any books.
          - If someone asks for "food", suggest vendors from the context.
          - Be concise, friendly, and use student-friendly language.
          - If you don't see something in the context, say you don't see it currently but suggest they check back later.
          
          User question: ${prompt}`
        }
      ],
      config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later!";
  }
};
