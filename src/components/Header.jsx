import React from 'react';

function Header() {
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
                <span className="header-badge">v1.0 - Open Source</span>
            </div>
        </header>
    );
}

export default Header;
