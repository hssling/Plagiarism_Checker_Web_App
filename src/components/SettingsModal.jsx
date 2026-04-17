import React, { useState, useEffect } from 'react';

function SettingsModal({ isOpen, onClose, onSave }) {
    const [apiKey, setApiKey] = useState('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [anthropicKey, setAnthropicKey] = useState('');
    const [xaiKey, setXaiKey] = useState('');
    const [openrouterKey, setOpenrouterKey] = useState('');
    const [groqKey, setGroqKey] = useState('');
    const [huggingfaceKey, setHuggingfaceKey] = useState('');
    const [cohereKey, setCohereKey] = useState('');
    const [cerebrasKey, setCerebrasKey] = useState('');
    const [mistralKey, setMistralKey] = useState('');
    const [togetherKey, setTogetherKey] = useState('');
    const [hfQwenKey, setHfQwenKey] = useState('');
    const [primaryAI, setPrimaryAI] = useState('gemini');

    const [searchApiKey, setSearchApiKey] = useState('');
    const [searchCx, setSearchCx] = useState('');

    useEffect(() => {
        const savedKey = localStorage.getItem('gemini_api_key');
        const savedOpenAI = localStorage.getItem('openai_api_key');
        const savedAnthropic = localStorage.getItem('anthropic_api_key');
        const savedXAI = localStorage.getItem('xai_api_key');
        const savedOpenRouter = localStorage.getItem('openrouter_api_key');
        const savedGroq = localStorage.getItem('groq_api_key');
        const savedHuggingface = localStorage.getItem('huggingface_api_key');
        const savedCohere = localStorage.getItem('cohere_api_key');
        const savedCerebras = localStorage.getItem('cerebras_api_key');
        const savedMistral = localStorage.getItem('mistral_api_key');
        const savedTogether = localStorage.getItem('together_api_key');
        const savedHfQwen = localStorage.getItem('hf_qwen_api_key');
        const savedPrimary = localStorage.getItem('primary_ai_provider') || 'gemini';

        const savedSearchKey = localStorage.getItem('google_search_api_key');
        const savedCx = localStorage.getItem('google_search_cx');

        if (savedKey) setApiKey(savedKey);
        if (savedOpenAI) setOpenaiKey(savedOpenAI);
        if (savedAnthropic) setAnthropicKey(savedAnthropic);
        if (savedXAI) setXaiKey(savedXAI);
        if (savedOpenRouter) setOpenrouterKey(savedOpenRouter);
        if (savedGroq) setGroqKey(savedGroq);
        if (savedHuggingface) setHuggingfaceKey(savedHuggingface);
        if (savedCohere) setCohereKey(savedCohere);
        if (savedCerebras) setCerebrasKey(savedCerebras);
        if (savedMistral) setMistralKey(savedMistral);
        if (savedTogether) setTogetherKey(savedTogether);
        if (savedHfQwen) setHfQwenKey(savedHfQwen);
        setPrimaryAI(savedPrimary);

        if (savedSearchKey) setSearchApiKey(savedSearchKey);
        if (savedCx) setSearchCx(savedCx);
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        localStorage.setItem('openai_api_key', openaiKey);
        localStorage.setItem('anthropic_api_key', anthropicKey);
        localStorage.setItem('xai_api_key', xaiKey);
        localStorage.setItem('openrouter_api_key', openrouterKey);
        localStorage.setItem('groq_api_key', groqKey);
        localStorage.setItem('huggingface_api_key', huggingfaceKey);
        localStorage.setItem('cohere_api_key', cohereKey);
        localStorage.setItem('cerebras_api_key', cerebrasKey);
        localStorage.setItem('mistral_api_key', mistralKey);
        localStorage.setItem('together_api_key', togetherKey);
        localStorage.setItem('hf_qwen_api_key', hfQwenKey);
        localStorage.setItem('primary_ai_provider', primaryAI);

        localStorage.setItem('google_search_api_key', searchApiKey);
        localStorage.setItem('google_search_cx', searchCx);

        onSave({
            gemini: apiKey,
            openai: openaiKey,
            anthropic: anthropicKey,
            xai: xaiKey,
            openrouter: openrouterKey,
            groq: groqKey,
            huggingface: huggingfaceKey,
            cohere: cohereKey,
            cerebras: cerebrasKey,
            mistral: mistralKey,
            together: togetherKey,
            hf_qwen: hfQwenKey,
            primary: primaryAI,
            searchApiKey,
            searchCx
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="modal-content glass" style={{
                background: 'var(--bg-primary)', padding: '2rem', borderRadius: '1.5rem', width: '95%', maxWidth: '600px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid var(--border)',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚙️ Cognitive AI Hub</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Configure multiple AI providers for maximum resiliency. If your primary AI fails, the system will automatically fall back to the next available one.
                </p>

                <div className="section" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>🤖 AI Providers</h3>

                    {/* Gemini */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>Google Gemini</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'gemini'} onChange={() => setPrimaryAI('gemini')} />
                            </div>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Gemini API Key (AIzaSy...)"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* OpenAI */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>OpenAI (ChatGPT)</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'openai'} onChange={() => setPrimaryAI('openai')} />
                            </div>
                            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={openaiKey}
                            onChange={(e) => setOpenaiKey(e.target.value)}
                            placeholder="OpenAI API Key (sk-...)"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* Anthropic */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>Anthropic (Claude)</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'anthropic'} onChange={() => setPrimaryAI('anthropic')} />
                            </div>
                            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={anthropicKey}
                            onChange={(e) => setAnthropicKey(e.target.value)}
                            placeholder="Anthropic API Key (sk-ant-...)"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* xAI */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>xAI (Grok)</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'xai'} onChange={() => setPrimaryAI('xai')} />
                            </div>
                            <a href="https://console.x.ai/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={xaiKey}
                            onChange={(e) => setXaiKey(e.target.value)}
                            placeholder="xAI API Key"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* OpenRouter */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>OpenRouter (DeepSeek R1)</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'openrouter'} onChange={() => setPrimaryAI('openrouter')} />
                            </div>
                            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={openrouterKey}
                            onChange={(e) => setOpenrouterKey(e.target.value)}
                            placeholder="OpenRouter API Key (sk-or-...)"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* Free AI Fallbacks Section */}
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.25rem' }}>🆓 Free AI Fallbacks</h4>

                    {/* Groq */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>Groq (Llama 3.3)</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'groq'} onChange={() => setPrimaryAI('groq')} />
                            </div>
                            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={groqKey}
                            onChange={(e) => setGroqKey(e.target.value)}
                            placeholder="Groq API Key (gsk_...)"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* Hugging Face */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>Hugging Face (Mistral)</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'huggingface'} onChange={() => setPrimaryAI('huggingface')} />
                            </div>
                            <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={huggingfaceKey}
                            onChange={(e) => setHuggingfaceKey(e.target.value)}
                            placeholder="Hugging Face Token (hf_...)"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* Cohere */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>Cohere (Command-R)</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'cohere'} onChange={() => setPrimaryAI('cohere')} />
                            </div>
                            <a href="https://dashboard.cohere.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={cohereKey}
                            onChange={(e) => setCohereKey(e.target.value)}
                            placeholder="Cohere API Key"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* Cerebras (India-friendly) */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>Cerebras (Llama 3.1) 🇮🇳</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'cerebras'} onChange={() => setPrimaryAI('cerebras')} />
                            </div>
                            <a href="https://inference.cerebras.ai/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={cerebrasKey}
                            onChange={(e) => setCerebrasKey(e.target.value)}
                            placeholder="Cerebras API Key"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* Mistral (India-friendly) */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>Mistral AI (Open-Mistral) 🇮🇳</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'mistral'} onChange={() => setPrimaryAI('mistral')} />
                            </div>
                            <a href="https://console.mistral.ai/api-keys/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={mistralKey}
                            onChange={(e) => setMistralKey(e.target.value)}
                            placeholder="Mistral API Key"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* Together AI */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>Together AI</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'together'} onChange={() => setPrimaryAI('together')} />
                            </div>
                            <a href="https://api.together.xyz/settings/api-keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={togetherKey}
                            onChange={(e) => setTogetherKey(e.target.value)}
                            placeholder="Together AI API Key"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>

                    {/* HF Qwen */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>HF Qwen (Inference API)</span>
                                <input type="radio" name="primaryAI" checked={primaryAI === 'hf_qwen'} onChange={() => setPrimaryAI('hf_qwen')} />
                            </div>
                            <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </label>
                        <input
                            type="password"
                            value={hfQwenKey}
                            onChange={(e) => setHfQwenKey(e.target.value)}
                            placeholder="HF API Key for Qwen"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>🇮🇳 = Available in India. Radio button selects the default (Primary) provider.</small>
                </div>

                <div className="section" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>🌐 Web Search Engine</h3>
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label style={{ fontWeight: 500 }}>Google Search API Key</label>
                            <a href="https://developers.google.com/custom-search/v1/overview" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Get Key ↗</a>
                        </div>
                        <input
                            type="password"
                            value={searchApiKey}
                            onChange={(e) => setSearchApiKey(e.target.value)}
                            placeholder="Search API Key"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label style={{ fontWeight: 500 }}>Search Engine ID (CX)</label>
                            <a href="https://programmablesearchengine.google.com/controlpanel/create" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Create Engine ↗</a>
                        </div>
                        <input
                            type="text"
                            value={searchCx}
                            onChange={(e) => setSearchCx(e.target.value)}
                            placeholder="CX ID"
                            className="text-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', opacity: 0.8 }}
                        onClick={async () => {
                            const btn = document.activeElement;
                            const originalText = btn.innerText;
                            btn.innerText = "⏳ Testing...";
                            try {
                                const { callAI } = await import('../lib/llmService');
                                const result = await callAI("Say 'Connection Successful'", "Connection Test");
                                alert(`✅ Hub Response: ${result}`);
                            } catch (e) {
                                alert(`❌ Error: ${e.message}`);
                            } finally {
                                btn.innerText = originalText;
                            }
                        }}
                    >
                        🩺 Run Diagnostic
                    </button>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Verify & Save All</button>
                    </div>
                </div>
            </div>
        </div >
    );
}

export default SettingsModal;
