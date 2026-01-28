import { GoogleGenAI, Type } from "@google/genai";
import { Category, ExpenseRecord, Language } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Suggests a category based on the description using Gemini Flash (fast).
 */
export const suggestCategory = async (description: string): Promise<Category | null> => {
  if (!description || description.length < 2) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Classify this expense description: "${description}" into one of these categories: ${Object.values(Category).join(', ')}. Return ONLY the category string enum value.`,
      config: {
        temperature: 0.1,
        maxOutputTokens: 20,
        // The effective token limit for the response is `maxOutputTokens` minus the `thinkingBudget`.
        // Since we want to limit output but don't need extensive thinking for classification, we disable thinking (budget 0).
        thinkingConfig: { thinkingBudget: 0 },
      }
    });

    const text = response.text?.trim().toLowerCase();
    const categories = Object.values(Category);
    
    // Find matching category
    const match = categories.find(c => text?.includes(c));
    return match || Category.OTHER;
  } catch (error) {
    console.error("Gemini suggestion failed:", error);
    return null;
  }
};

/**
 * Analyzes spending habits and provides advice in the target language.
 */
export const analyzeSpending = async (records: ExpenseRecord[], lang: Language): Promise<string> => {
  if (records.length === 0) return "No records to analyze.";

  // Simplify data to save tokens
  const simpleRecords = records.slice(0, 50).map(r => ({
    d: r.date,
    c: r.category,
    a: r.amount,
    desc: r.description
  }));

  const prompt = `
    Act as a friendly financial advisor. 
    Analyze these expense records (last 50 max): ${JSON.stringify(simpleRecords)}.
    
    1. Summarize the top spending category.
    2. Give one specific tip to save money based on this data.
    3. Keep the tone encouraging.
    4. Respond strictly in this language code: ${lang} (e.g., if zh-TW, use Traditional Chinese).
    5. Keep it under 100 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Unable to generate analysis at the moment.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "AI service is currently unavailable. Please try again later.";
  }
};