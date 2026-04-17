import { GoogleGenerativeAI } from "@google/generative-ai";

// Provider configs
let providers = {
    gemini: { key: null, model: null, name: "Gemini" },
    openai: { key: null, name: "OpenAI" },
    anthropic: { key: null, name: "Anthropic" },
    xai: { key: null, name: "xAI" },
    openrouter: { key: null, name: "OpenRouter" },
    groq: { key: null, name: "Groq" },
    huggingface: { key: null, name: "Hugging Face" },
    cohere: { key: null, name: "Cohere" },
    cerebras: { key: null, name: "Cerebras" },
    mistral: { key: null, name: "Mistral" },
    together: { key: null, name: "Together AI" },
    hf_qwen: { key: null, name: "HF Qwen" }
};

let primaryProvider = 'gemini';

/**
 * Initialize AI Providers
 */
export const initializeAI = (config = {}) => {
    const { gemini, openai, anthropic, xai, openrouter, groq, huggingface, cohere, cerebras, mistral, together, hf_qwen, primary } = config;

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
    if (groq) providers.groq.key = groq.trim();
    if (huggingface) providers.huggingface.key = huggingface.trim();
    if (cohere) providers.cohere.key = cohere.trim();
    if (cerebras) providers.cerebras.key = cerebras.trim();
    if (mistral) providers.mistral.key = mistral.trim();
    if (together) providers.together.key = together.trim();
    if (hf_qwen) providers.hf_qwen.key = hf_qwen.trim();
    if (primary) primaryProvider = primary;

    return isAIInitialized();
};

/**
 * Check if at least one AI is initialized
 */
export const isAIInitialized = () => {
    return providers.gemini.model !== null || providers.openai.key || providers.anthropic.key || providers.xai.key || providers.openrouter.key || providers.groq.key || providers.huggingface.key || providers.cohere.key || providers.cerebras.key || providers.mistral.key || providers.together.key || providers.hf_qwen.key;
};

/**
 * Primary AI Call with Fallbacks
 */
export const callAI = async (prompt, systemPrompt = "You are an academic integrity expert.") => {
    const order = [primaryProvider, 'gemini', 'openai', 'anthropic', 'xai', 'openrouter', 'groq', 'huggingface', 'hf_qwen', 'together', 'cohere', 'cerebras', 'mistral'].filter((v, i, a) => a.indexOf(v) === i);
    let lastError = null;

    // Debug: Show which providers have keys configured
    console.log('🔑 AI Providers Status:', {
        gemini: !!providers.gemini.key,
        openai: !!providers.openai.key,
        anthropic: !!providers.anthropic.key,
        xai: !!providers.xai.key,
        openrouter: !!providers.openrouter.key,
        groq: !!providers.groq.key,
        huggingface: !!providers.huggingface.key,
        cohere: !!providers.cohere.key,
        cerebras: !!providers.cerebras.key,
        mistral: !!providers.mistral.key,
        together: !!providers.together.key,
        hf_qwen: !!providers.hf_qwen.key
    });

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
                    const models = [
                        "gemini-2.0-flash-exp",
                        "gemini-2.0-flash",
                        "gemini-1.5-flash-latest",
                        "gemini-1.5-flash",
                        "gemini-1.5-pro-latest",
                        "gemini-1.5-pro",
                        "gemini-pro"
                    ];
                    for (const model of models) {
                        try {
                            // Try both v1beta and v1
                            for (const version of ['v1beta', 'v1']) {
                                const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${providers.gemini.key}`;
                                const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }]
                                    })
                                });
                                const wrapper = await res.json();
                                if (wrapper.upstreamOk) return wrapper.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                                console.warn(`Gemini ${version}/${model} failed:`, wrapper.data?.error?.message || wrapper.upstreamStatus);
                            }
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
                        const msg = e2.data?.error?.message || e2.upstreamStatusText || e2.upstreamStatus || "Unknown";
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
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
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
                    throw new Error(`Anthropic Error: ${wrapper.data?.error?.message || wrapper.upstreamStatusText || wrapper.upstreamStatus}`);
                }
                return wrapper.data?.content?.[0]?.text || "";
            }

            // xAI (Proxy)
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
                        ],
                        temperature: 0,
                        stream: false
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`xAI Error: ${wrapper.data?.error?.message || wrapper.data?.detail || wrapper.upstreamStatusText || wrapper.upstreamStatus}`);
                }
                return wrapper.data?.choices?.[0]?.message?.content || "";
            }

            // OpenRouter (Free models via API)
            if (provider === 'openrouter' && providers.openrouter.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://openrouter.ai/api/v1/chat/completions')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.openrouter.key}`,
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'PlagiarismGuard'
                    },
                    body: JSON.stringify({
                        model: "google/gemma-2-9b-it:free",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`OpenRouter Error: ${wrapper.data?.error?.message || JSON.stringify(wrapper.data?.error) || wrapper.upstreamStatus}`);
                }
                return wrapper.data?.choices?.[0]?.message?.content || "";
            }

            // Groq (Free Tier - OpenAI-compatible)
            if (provider === 'groq' && providers.groq.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.groq.com/openai/v1/chat/completions')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.groq.key}`
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ],
                        temperature: 0.7
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`Groq Error: ${wrapper.data?.error?.message || wrapper.upstreamStatus}`);
                }
                return wrapper.data?.choices?.[0]?.message?.content || "";
            }

            // Hugging Face Serverless Inference (Free Tier)
            if (provider === 'huggingface' && providers.huggingface.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-1.5B-Instruct')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.huggingface.key}`
                    },
                    body: JSON.stringify({
                        inputs: `System: ${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
                        parameters: { max_new_tokens: 1024, temperature: 0.7 }
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`Hugging Face Error: ${wrapper.data?.error || wrapper.upstreamStatus}`);
                }
                // HF returns array or object depending on model
                const text = Array.isArray(wrapper.data) ? wrapper.data[0]?.generated_text : wrapper.data?.generated_text;
                return text?.replace(/^System:.*?Assistant:\s*/s, '').trim() || "";
            }

            // Cohere (Free Trial) - Updated to latest model
            if (provider === 'cohere' && providers.cohere.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.cohere.ai/v1/chat')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.cohere.key}`
                    },
                    body: JSON.stringify({
                        model: "command-a-03-2025",
                        message: prompt,
                        preamble: systemPrompt
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`Cohere Error: ${wrapper.data?.message || wrapper.upstreamStatus}`);
                }
                return wrapper.data?.text || "";
            }

            // Cerebras (Free Tier - 14K requests/day, available in India)
            if (provider === 'cerebras' && providers.cerebras.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.cerebras.ai/v1/chat/completions')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.cerebras.key}`
                    },
                    body: JSON.stringify({
                        model: "llama3.1-8b",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`Cerebras Error: ${wrapper.data?.error?.message || wrapper.upstreamStatus}`);
                }
                return wrapper.data?.choices?.[0]?.message?.content || "";
            }

            // Mistral AI (Free Tier - 500K tokens/min, available in India)
            if (provider === 'mistral' && providers.mistral.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.mistral.ai/v1/chat/completions')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.mistral.key}`
                    },
                    body: JSON.stringify({
                        model: "open-mistral-7b",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`Mistral Error: ${wrapper.data?.message || wrapper.upstreamStatus}`);
                }
                return wrapper.data?.choices?.[0]?.message?.content || "";
            }

            // Together AI Provider
            if (provider === 'together' && providers.together.key) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.together.xyz/v1/chat/completions')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.together.key}`
                    },
                    body: JSON.stringify({
                        model: "meta-llama/Llama-3-70b-chat-hf", // using a reliable fast model from together
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`Together AI Error: ${wrapper.data?.error?.message || wrapper.upstreamStatus}`);
                }
                return wrapper.data?.choices?.[0]?.message?.content || "";
            }

            // Hugging Face Qwen Provider (using Inference Client Chat Completions endpoint)
            if (provider === 'hf_qwen' && providers.hf_qwen.key) {
                // HF chat completions API
                const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api-inference.huggingface.co/models/Qwen/Qwen3.5-397B-A17B:fastest/v1/chat/completions')}`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${providers.hf_qwen.key}`
                    },
                    body: JSON.stringify({
                        model: "Qwen/Qwen3.5-397B-A17B:fastest",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ],
                        max_tokens: 1024,
                        stream: false
                    })
                });
                const wrapper = await res.json();
                if (!wrapper.upstreamOk) {
                    throw new Error(`HF Qwen Error: ${wrapper.data?.error?.message || wrapper.data?.error || wrapper.upstreamStatus}`);
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

export const getProviderKey = (provider) => providers[provider]?.key || null;

export const createOpenAIEmbeddings = async (inputs, options = {}) => {
    const apiKey = providers.openai.key;
    const normalizedInputs = Array.isArray(inputs) ? inputs.filter(Boolean) : [inputs].filter(Boolean);

    if (!apiKey || normalizedInputs.length === 0) {
        return null;
    }

    const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.openai.com/v1/embeddings')}`;
    const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: options.model || 'text-embedding-3-large',
            input: normalizedInputs
        })
    });

    const wrapper = await res.json();
    if (!wrapper.upstreamOk) {
        throw new Error(wrapper.data?.error?.message || `OpenAI embeddings failed with status ${wrapper.upstreamStatus}`);
    }

    return wrapper.data?.data?.map(item => item.embedding) || null;
};

export const callOpenAIResponsesJson = async ({
    instructions,
    input,
    schemaName = 'structured_response',
    schema,
    model = 'gpt-5-mini'
}) => {
    const apiKey = providers.openai.key;
    if (!apiKey) {
        return null;
    }

    const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://api.openai.com/v1/responses')}`;
    const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            instructions,
            input,
            text: {
                format: {
                    type: 'json_schema',
                    name: schemaName,
                    strict: true,
                    schema
                }
            }
        })
    });

    const wrapper = await res.json();
    if (!wrapper.upstreamOk) {
        throw new Error(wrapper.data?.error?.message || `OpenAI structured response failed with status ${wrapper.upstreamStatus}`);
    }

    const outputText = wrapper.data?.output_text;
    if (!outputText) {
        throw new Error('OpenAI structured response returned no output text');
    }

    return JSON.parse(outputText);
};

export const reviewLanguageQuality = async (text, localReview = null) => {
    const schema = {
        type: 'object',
        additionalProperties: false,
        required: [
            'overallScore',
            'readabilityScore',
            'grammarScore',
            'clarityScore',
            'toneScore',
            'issueCount',
            'executiveSummary',
            'issues',
            'recommendations',
            'editedText'
        ],
        properties: {
            overallScore: { type: 'number' },
            readabilityScore: { type: 'number' },
            grammarScore: { type: 'number' },
            clarityScore: { type: 'number' },
            toneScore: { type: 'number' },
            issueCount: { type: 'number' },
            executiveSummary: { type: 'string' },
            editedText: { type: 'string' },
            recommendations: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 6
            },
            highlights: {
                type: 'array',
                items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['category', 'severity', 'text'],
                    properties: {
                        category: { type: 'string' },
                        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                        text: { type: 'string' }
                    }
                },
                maxItems: 8
            },
            issues: {
                type: 'array',
                items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['category', 'severity', 'title', 'detail', 'examples'],
                    properties: {
                        category: { type: 'string' },
                        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                        title: { type: 'string' },
                        detail: { type: 'string' },
                        examples: {
                            type: 'array',
                            items: { type: 'string' },
                            maxItems: 3
                        }
                    }
                },
                maxItems: 8
            }
        }
    };

    try {
        const promptInput = [
            {
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text: `Review the following academic or professional document for language quality and provide an edited version that improves clarity, grammar, concision, and tone without changing meaning.\n\nLocal diagnostic context:\n${JSON.stringify(localReview || {}, null, 2)}\n\nDocument:\n${text.substring(0, 12000)}`
                    }
                ]
            }
        ];

        return await callOpenAIResponsesJson({
            instructions: 'You are a senior academic editor. Produce a rigorous language-quality review suitable for journal or thesis submission. Keep domain-specific meaning intact. Do not invent citations or facts.',
            input: promptInput,
            schemaName: 'language_quality_review',
            schema
        });
    } catch (error) {
        console.warn('Structured language review failed, using fallback prompt:', error);
    }

    try {
        const fallback = await callAI(
            `Review this text for language quality. Return JSON only with keys overallScore, readabilityScore, grammarScore, clarityScore, toneScore, issueCount, executiveSummary, issues, recommendations, editedText.\n\nLocal diagnostic context:\n${JSON.stringify(localReview || {}, null, 2)}\n\nText:\n${text.substring(0, 5000)}`,
            'You are a senior academic editor.'
        );
        const jsonMatch = fallback.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
        console.error('Fallback language review failed:', error);
        return null;
    }
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
        "aiProbability": number (0-100), // 0 = Definitely Human, 100 = Definitely AI
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
