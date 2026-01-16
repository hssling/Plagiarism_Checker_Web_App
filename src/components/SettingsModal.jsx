import React, { useState, useEffect } from 'react';

function SettingsModal({ isOpen, onClose, onSave }) {
    const [apiKey, setApiKey] = useState('');
    const [searchApiKey, setSearchApiKey] = useState('');
    const [searchCx, setSearchCx] = useState('');

    useEffect(() => {
        const savedKey = localStorage.getItem('gemini_api_key');
        const savedSearchKey = localStorage.getItem('google_search_api_key');
        const savedCx = localStorage.getItem('google_search_cx');

        if (savedKey) setApiKey(savedKey);
        if (savedSearchKey) setSearchApiKey(savedSearchKey);
        if (savedCx) setSearchCx(savedCx);
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        localStorage.setItem('google_search_api_key', searchApiKey);
        localStorage.setItem('google_search_cx', searchCx);

        onSave({ apiKey, searchApiKey, searchCx });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content" style={{
                background: 'var(--bg-primary)', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
                <h2 style={{ marginTop: 0 }}>⚙️ AI Settings</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    To enable <strong>Cognitive Analysis</strong> (Authorship Detection & Intent), please enter your Google Gemini API Key.
                </p>
                <div style={{ margin: '1.5rem 0' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Google Gemini API Key</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="text-input"
                        style={{ width: '100%' }}
                    />
                    <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                        Don't have one? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Get a free key here</a>.
                    </small>
                </div>

                <div style={{ margin: '1.5rem 0', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🌐 Web Search Settings</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Required for checking plagiarism against the open web.
                    </p>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Google Custom Search API Key</label>
                        <input
                            type="password"
                            value={searchApiKey}
                            onChange={(e) => setSearchApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="text-input"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Search Engine ID (CX)</label>
                        <input
                            type="text"
                            value={searchCx}
                            onChange={(e) => setSearchCx(e.target.value)}
                            placeholder="0123456789..."
                            className="text-input"
                            style={{ width: '100%' }}
                        />
                        <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                            <a href="https://programmablesearchengine.google.com/controlpanel/create" target="_blank" rel="noopener noreferrer">Create a Search Engine</a> (select "Search the entire web").
                        </small>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>Save & Enable AI</button>
                </div>
            </div>
        </div >
    );
}

export default SettingsModal;
