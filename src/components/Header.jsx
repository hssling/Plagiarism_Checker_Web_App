import React from 'react';

function Header({ onOpenSettings }) {
    return (
        <header className="header">
            <div className="header-content">
                <div className="logo">
                    <span className="logo-icon">🔍</span>
                    <div>
                        <h1>PlagiarismGuard</h1>
                        <p className="logo-tagline">Academic Plagiarism Checker</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="header-badge">v3.0.0-alpha.5 - Open Source</span>
                    <button
                        onClick={onOpenSettings}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}
                        title="Settings"
                    >
                        ⚙️
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Header;