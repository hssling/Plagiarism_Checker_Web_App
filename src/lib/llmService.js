import { GoogleGenerativeAI } from "@google/generative-ai";

// Provider configs
let providers = {
    gemini: { key: null, model: null, name: "Gemini" },
    openai: { key: null, name: "OpenAI" },
    anthropic: { key: null, name: "Anthropic" },
    xai: { key: null, name: "xAI" },
    openrouter: { key: null, name: "OpenRouter" }
};

let primaryProvider = 'gemini';

/**
 * Initialize AI Providers
 */
export const initializeAI = (config = {}) => {
    const { gemini, openai, anthropic, xai, primary } = config;

    if (gemini) {
        providers.gemini.key = gemini.trim();
        try {
            const genAI = new GoogleGenerativeAI(providers.gemini.key);
            // Fix: Use stable model identifier to avoid 404
            providers.gemini.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        } catch (e) {
            console.error("Gemini initialization failed:", e);
        }
    }

    if (openai) providers.openai.key = openai.trim();
    if (anthropic) providers.anthropic.key = anthropic.trim();
    if (xai) providers.xai.key = xai.trim();
    if (openrouter) providers.openrouter.key = openrouter.trim();
    if (primary) primaryProvider = primary;

    return isAIInitialized();
};

/**
 * Check if at least one AI is initialized
 */
export const isAIInitialized = () => {
    return providers.gemini.model !== null || providers.openai.key || providers.anthropic.key || providers.xai.key || providers.openrouter.key;
};

/**
 * Primary AI Call with Fallbacks
 */
export const callAI = async (prompt, systemPrompt = "You are an academic integrity expert.") => {
    const order = [primaryProvider, 'gemini', 'openai', 'anthropic', 'xai', 'openrouter'].filter((v, i, a) => a.indexOf(v) === i);
    let lastError = null;

    for (const provider of order) {
        try {
            // Gemini (Direct SDK + Proxy REST Fallbacks)
            if (provider === 'gemini' && providers.gemini.key) {
                try {
                    // 1. Try SDK
                    if (providers.gemini.model) {
                        const result = await providers.gemini.model.generateContent(prompt);
                        const response = await result.response;
                        return response.text();
                    }
                } catch (sdkError) {
                    console.warn("Gemini SDK failed, trying Proxy-REST (v1beta)...");
                    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
                    for (const model of models) {
                        try {
                            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${providers.gemini.key}`;
                            const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }]
                                })
                            });
                            const wrapper = await res.json();
                            if (wrapper.upstreamOk) return wrapper.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        } catch (e) { continue; }
                    }
                    throw new Error("Gemini all models/endpoints failed");
                }
            }

            // OpenAI (Routed through Proxy)
            if (provider === 'openai' && providers.openai.key) {
                const tryOpenAI = async (model) => {
                    const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.openai.com/v1/chat/completions')}`;
                    const res = await fetch(proxyUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${providers.openai.key}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: prompt }
                            ],
                            temperature: 0.7
                        })
                    });
                    const wrapper = await res.json();
                    if (!wrapper.upstreamOk) throw wrapper;
                    return wrapper.data?.choices?.[0]?.message?.content || "";
                };

                try {
                    return await tryOpenAI("gpt-4o-mini");
                } catch (e1) {
                    console.warn("GPT-4o-mini failed, trying 3.5-turbo...", e1);
                    try {
                        return await tryOpenAI("gpt-3.5-turbo");
                    } catch (e2) {
                        const msg = e2.data?.error?.message || e2.upstreamStatus || "Unknown";
                        throw new Error(`OpenAI Error: ${msg}`);
                    }
                }
            }

            // Anthropic (Proxy)
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
                if (!wrapper.upstreamOk) {
                    throw new Error(`Anthropic Error: ${wrapper.data?.error?.message || wrapper.upstreamStatus}`);
                }
                return wrapper.data?.content?.[0]?.text || "";
            }

            // xAI (Proxy - Simplified Payload)
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
                            { role: "user", content: `${systemPrompt}\n\n${prompt}` }
                        ]
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`xAI Error: ${wrapper.data?.error?.message || wrapper.data?.detail || wrapper.upstreamStatus}`);
                }
                return wrapper.data?.choices?.[0]?.message?.content || "";
            }

            // OpenRouter (DeepSeek)
            if (provider === 'openrouter' && providers.openrouter.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://openrouter.ai/api/v1/chat/completions')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.openrouter.key}`,
                        'HTTP-Referer': 'https://plagiarism-checker-web-app.vercel.app',
                        'X-Title': 'PlagiarismGuard Pro'
                    },
                    body: JSON.stringify({
                        model: "deepseek/deepseek-r1:free",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`OpenRouter Error: ${wrapper.data?.error?.message || wrapper.upstreamStatus}`);
                }
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
