/**
 * Backend AI Service
 * Handles Cognitive AI tasks (Intent, Authorship) for the API.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function analyzeIntentBackend(phrase, snippet, apiKey) {
    if (!apiKey) return null;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Compare "Suspect Text" with "Source Text". Determine INTENT.
    Suspect Text: "${phrase}"
    Source Context: "${snippet}"

    Classify as: "Direct Copy", "Paraphrasing Issue", or "Accidental".
    Respond with ONLY a JSON object:
    {
        "category": "Direct Copy" | "Paraphrasing Issue" | "Accidental",
        "explanation": "One sentence explanation"
    }`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
        console.error("Backend Intent Analysis Failed:", e);
        return null;
    }
}

export async function checkAuthorshipBackend(text, apiKey) {
    if (!apiKey) return null;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze this text for signs of AI generation.
    Focus on sentence length uniformity, tone, and lack of detail.
    Text: "${text.substring(0, 1500)}"

    Respond with ONLY a JSON object:
    {
        "isAI": boolean,
        "confidence": number (0-100),
        "reasoning": "string (max 20 words)"
    }`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        return JSON.parse(response.replace(/```json|```/g, '').trim());
    } catch (e) {
        console.error("Backend Authorship Check Failed:", e);
        return null;
    }
}

export async function translateTextBackend(text, targetLang, apiKey) {
    if (!apiKey) return text;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Translate the following text to ${targetLang}. 
    Only return the translated text without any explanation or extra symbols.
    Text: "${text}"`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (e) {
        console.error("Backend Translation Failed:", e);
        return text;
    }
}

export async function paraphraseBackend(text, context, style, apiKey) {
    if (!apiKey) return { error: "AI Key required" };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const styleInstructions = style === "formal"
        ? "Maintain a highly formal, academic, and objective tone."
        : "Ensure a smooth narrative flow while maintaining academic rigor.";

    const prompt = `You are an expert scientific editor. REWRITE the "Original Text" to reduce similarity while PRESERVING scientific meaning and citations.
    Original Text: "${text}"
    Source Context: "${context}"
    Instructions: ${styleInstructions} Keep ALL citations exactly as they are.
    Respond with ONLY a JSON object:
    {
        "paraphrased": "...",
        "changesMade": "...",
        "integrityScore": 0-100
    }`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        return JSON.parse(response.replace(/```json|```/g, '').trim());
    } catch (e) {
        console.error("Backend Paraphrase Failed:", e);
        return { error: e.message };
    }
}
