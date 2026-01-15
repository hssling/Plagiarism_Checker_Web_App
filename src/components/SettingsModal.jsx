import React, { useState, useEffect } from 'react';

function SettingsModal({ isOpen, onClose, onSave }) {
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) setApiKey(savedKey);
    }, []);

    const handleSave = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        onSave(apiKey);
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>Save & Enable AI</button>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
