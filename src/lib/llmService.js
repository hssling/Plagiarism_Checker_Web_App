import { GoogleGenerativeAI } from "@google/generative-ai";

// Provider configs
let providers = {
    gemini: { key: null, model: null, name: "Gemini" },
    openai: { key: null, name: "OpenAI" },
    anthropic: { key: null, name: "Anthropic" },
    xai: { key: null, name: "xAI" }
};

let primaryProvider = 'gemini';

/**
 * Initialize AI Providers
 */
export const initializeAI = (config = {}) => {
    const { gemini, openai, anthropic, xai, primary } = config;

    if (gemini) {
        providers.gemini.key = gemini;
        try {
            const genAI = new GoogleGenerativeAI(gemini);
            // Fix: Use stable model identifier to avoid 404
            providers.gemini.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        } catch (e) {
            console.error("Gemini initialization failed:", e);
        }
    }

    if (openai) providers.openai.key = openai;
    if (anthropic) providers.anthropic.key = anthropic;
    if (xai) providers.xai.key = xai;
    if (primary) primaryProvider = primary;

    return isAIInitialized();
};

/**
 * Check if at least one AI is initialized
 */
export const isAIInitialized = () => {
    return providers.gemini.model !== null || providers.openai.key || providers.anthropic.key || providers.xai.key;
};

/**
 * Primary AI Call with Fallbacks
 */
export const callAI = async (prompt, systemPrompt = "You are an academic integrity expert.") => {
    const order = [primaryProvider, 'gemini', 'openai', 'anthropic', 'xai'].filter((v, i, a) => a.indexOf(v) === i);
    let lastError = null;

    for (const provider of order) {
        try {
            // Gemini (Direct SDK Call - Usually safe from CORS if key is valid)
            if (provider === 'gemini' && providers.gemini.model) {
                const result = await providers.gemini.model.generateContent(prompt);
                const response = await result.response;
                if (!response) throw new Error("Empty Gemini response");
                return response.text();
            }

            // OpenAI (Routed through Proxy to skip CORS)
            if (provider === 'openai' && providers.openai.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.openai.com/v1/chat/completions')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.openai.key}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) throw new Error(`OpenAI Proxy Error: ${wrapper.upstreamStatus}`);
                return wrapper.data?.choices?.[0]?.message?.content || "";
            }

            // Anthropic (Routed through Proxy to skip CORS)
            if (provider === 'anthropic' && providers.anthropic.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.anthropic.com/v1/messages')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': providers.anthropic.key,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: "claude-3-haiku-20240307",
                        max_tokens: 1024,
                        system: systemPrompt,
                        messages: [{ role: "user", content: prompt }]
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) throw new Error(`Anthropic Proxy Error: ${wrapper.upstreamStatus}`);
                return wrapper.data?.content?.[0]?.text || "";
            }

            // xAI (Routed through Proxy to skip CORS)
            if (provider === 'xai' && providers.xai.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.x.ai/v1/chat/completions')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.xai.key}`
                    },
                    body: JSON.stringify({
                        model: "grok-beta",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) throw new Error(`xAI Proxy Error: ${wrapper.upstreamStatus}`);
                return wrapper.data?.choices?.[0]?.message?.content || "";
            }
        } catch (e) {
            console.warn(`${provider} failed, trying next...`, e);
            lastError = e;
        }
    }

    throw new Error(lastError ? lastError.message : "No AI providers available or all failed");
};

/**
 * AI Authorship Detection
 */
export const checkAIAuthorship = async (text) => {
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
        const result = await callAI(prompt, "You are a stylometrics expert.");
        const clean = result.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        console.error("AI Authorship Check Failed:", e);
        return { isAI: false, confidence: 0, reasoning: e.message };
    }
};

/**
 * Plagiarism Intent Analysis
 */
export const analyzeIntent = async (match) => {
    const prompt = `Compare the "Suspect Text" with the "Source Text". Determine INTENT.
    Suspect Text: "${match.phrase}"
    Source Context: "${match.snippet}"

    Classify as: "Direct Copy", "Paraphrasing Issue", or "Accidental".
    Respond with ONLY a JSON object:
    {
        "category": "Direct Copy" | "Paraphrasing Issue" | "Accidental",
        "explanation": "One sentence explanation"
    }`;

    try {
        const result = await callAI(prompt);
        return JSON.parse(result.replace(/```json|```/g, '').trim());
    } catch (e) {
        return null;
    }
};

/**
 * Smart Summary
 */
export const generateSummary = async (text) => {
    try {
        return await callAI(`Summarize this text in 3 bullet points:\n\n${text.substring(0, 2000)}`);
    } catch (e) {
        return `Failed to generate summary: ${e.message}`;
    }
};
/**
 * Integrity AI: Remediation Pro
 * Paraphrases text to reduce similarity while preserving academic accuracy.
 */
export const paraphraseAcademic = async (text, context = "", style = "formal") => {
    if (!isAIInitialized()) return { error: "AI Hub not configured. Please add an API key in Settings." };

    const styleInstructions = style === "formal"
        ? "Maintain a highly formal, academic, and objective tone. Use technical terminology appropriate for a scientific journal."
        : "Ensure a smooth narrative flow while maintaining academic rigor. Focus on logical transitions between ideas.";

    const prompt = `You are an expert scientific editor. Your task is to REWRITE the "Original Text" below to reduce its similarity with existing literature, while PRESERVING its exact scientific meaning and technical citations.

    Original Text: \"${text}\"
    Source Context (for reference): \"${context}\"

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
        const result = await callAI(prompt, "You are an expert scientific editor.");
        const rawText = result.replace(/```json|```/g, '').trim();
        return JSON.parse(rawText);
    } catch (e) {
        console.error("Paraphrasing Failed:", e);
        return { error: e.message || "Failed to paraphrase" };
    }
};
