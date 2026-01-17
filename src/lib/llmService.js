import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;
let model = null;

export const initializeAI = (apiKey) => {
    if (!apiKey) return false;
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        // Resilient model selection: using gemini-1.5-flash-latest as default
        try {
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        } catch (e) {
            console.warn("Gemini Flash Latest failed, trying Pro...");
            model = genAI.getGenerativeModel({ model: "gemini-pro" });
        }
        return true;
    } catch (e) {
        console.error("Failed to initialize AI:", e);
        return false;
    }
};

/**
 * Check if AI is initialized
 */
export const isAIInitialized = () => {
    return model !== null;
};

/**
 * Generic call to Gemini
 */
export const callGemini = async (prompt) => {
    if (!model) throw new Error("AI not initialized");
    const result = await model.generateContent(prompt);
    return result.response.text();
};

/**
 * AI Authorship Detection
 * Estimates the probability that text was written by AI.
 */
export const checkAIAuthorship = async (text) => {
    if (!model) return { error: "AI not configured" };

    const prompt = `Analyze the following text for signs of AI generation. 
    Focus on:
    1. Uniformity of sentence length (Low Burstiness).
    2. Overly polite or neutral tone.
    3. Lack of specific, anecdotal details.
    
    Text: "${text.substring(0, 1000)}..." (truncated)

    Respond with ONLY a JSON object:
    {
        "isAI": boolean,
        "confidence": number (0-100),
        "reasoning": "string (max 20 words)"
    }`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;

        // Check for safety blocks
        if (response.candidates && response.candidates[0].finishReason === "SAFETY") {
            return { isAI: false, confidence: 0, reasoning: "Blocked by Safety Filters" };
        }

        const text = response.text().replace(/```json|```/g, '').trim();
        try {
            return JSON.parse(text);
        } catch (parseError) {
            console.error("JSON Parse Error:", text);
            // Return raw text if it's short, otherwise generic error
            const reason = text.length < 50 ? text : "Invalid JSON Response";
            return { isAI: false, confidence: 0, reasoning: reason };
        }
    } catch (e) {
        console.error("AI Authorship Check Failed:", e);
        let errorMsg = "AI Analysis Failed";

        if (e.message) {
            if (e.message.includes('API key')) errorMsg = "Invalid API Key";
            else if (e.message.includes('403')) errorMsg = "Access Denied (403)";
            else if (e.message.includes('429')) errorMsg = "Quota Exceeded";
            else if (e.message.includes('404')) errorMsg = "Key lacks Gemini Access"; // Specific fix
            else errorMsg = e.message.substring(0, 40) + "...";
        }

        return { isAI: false, confidence: 0, reasoning: errorMsg };
    }
};

/**
 * Plagiarism Intent Analysis
 * Explains WHY the text was flagged.
 */
export const analyzeIntent = async (match) => {
    if (!model) return null;

    const prompt = `You are an academic integrity expert. Compare the "Suspect Text" with the "Source Text".
    Determine the INTENT of the plagiarism.

    Suspect Text: "${match.phrase}"
    Source Context: "${match.snippet}"

    Classify as one of:
    - "Direct Copy" (Identical or near identical)
    - "Paraphrasing Issue" (Tried to rewrite but failed)
    - "Accidental" (Common phrase or coincidence)
    
    Respond with ONLY a JSON object:
    {
        "category": "Direct Copy" | "Paraphrasing Issue" | "Accidental",
        "explanation": "One sentence explanation"
    }`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text().replace(/```json|```/g, '').trim());
    } catch (e) {
        return null;
    }
};

/**
 * Smart Summary
 */
export const generateSummary = async (text) => {
    if (!model) return null;
    try {
        const result = await model.generateContent(`Summarize this text in 3 bullet points:\n\n${text.substring(0, 2000)}`);
        return result.response.text();
    } catch (e) {
        return `Failed to generate summary: ${e.message || "Unknown error"}`;
    }
};
/**
 * Integrity AI: Remediation Pro
 * Paraphrases text to reduce similarity while preserving academic accuracy.
 */
export const paraphraseAcademic = async (text, context = "", style = "formal") => {
    if (!model) return { error: "AI not configured" };

    const styleInstructions = style === "formal"
        ? "Maintain a highly formal, academic, and objective tone. Use technical terminology appropriate for a scientific journal."
        : "Ensure a smooth narrative flow while maintaining academic rigor. Focus on logical transitions between ideas.";

    const prompt = `You are an expert scientific editor. Your task is to REWRITE the "Original Text" below to reduce its similarity with existing literature, while PRESERVING its exact scientific meaning and technical citations.

    Original Text: "${text}"
    Source Context (for reference): "${context}"

    Instructions:
    1. ${styleInstructions}
    2. Keep ALL scientific terms, numbers, and citations (e.g., "[1]", "(Smith et al., 2023)") EXACTLY as they are.
    3. Change the sentence structure, word choice, and phrasing significantly.
    4. Do not add any new information or remove existing findings.
    
    Respond with ONLY a JSON object:
    {
        "paraphrased": "The newly written text here",
        "changesMade": "Brief summary of what was changed",
        "integrityScore": number (0-100 indicating how well scientific meaning was preserved)
    }`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;

        if (response.candidates && response.candidates[0].finishReason === "SAFETY") {
            return { error: "Blocked by Safety Filters - Content may be too sensitive for AI rewriting." };
        }

        const rawText = response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(rawText);
    } catch (e) {
        console.error("Paraphrasing Failed:", e);
        return { error: e.message || "Failed to paraphrase" };
    }
};
