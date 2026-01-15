import React from 'react';

function ResultsDashboard({ results, onReset }) {
    const getStatusClass = (score) => {
        if (score < 10) return 'status-excellent';
        if (score < 20) return 'status-good';
        if (score < 30) return 'status-moderate';
        return 'status-high';
    };

    const getStatusLabel = (score) => {
        if (score < 10) return '🟢 Excellent';
        if (score < 20) return '🟢 Good';
        if (score < 30) return '🟡 Moderate';
        return '🔴 High';
    };

    const getProgressColor = (score) => {
        if (score < 15) return 'var(--success)';
        if (score < 25) return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <div className="results-dashboard">
            <div className="results-header">
                <h2>📊 Analysis Results</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={onReset}>
                        ← New Analysis
                    </button>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        📥 Export Report
                    </button>
                </div>
            </div>

            {/* Main Score Card */}
            <div className="score-card">
                <div className="main-score">
                    <div className="value" style={{ color: getProgressColor(results.overallScore) }}>
                        {results.overallScore.toFixed(1)}%
                    </div>
                    <div className="label">Overall Similarity</div>
                    <span className={`status ${getStatusClass(results.overallScore)}`}>
                        {getStatusLabel(results.overallScore)}
                    </span>
                </div>

                <div className="metrics-grid">
                    <div className="metric-item">
                        <div className="label">Word Count</div>
                        <div className="value">{results.wordCount.toLocaleString()}</div>
                    </div>
                    <div className="metric-item">
                        <div className="label">Unique Words</div>
                        <div className="value">{results.uniqueWords.toLocaleString()}</div>
                    </div>
                    <div className="metric-item">
                        <div className="label">Max Single Match</div>
                        <div className="value">{results.maxMatch.toFixed(1)}%</div>
                    </div>
                    <div className="metric-item">
                        <div className="label">Sources Checked</div>
                        <div className="value">{results.sourcesChecked}</div>
                    </div>
                </div>
            </div>

            {/* Source Matches Table */}
            <div className="results-table-card">
                <h3>📚 Source-by-Source Analysis</h3>
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>Source</th>
                            <th>Similarity</th>
                            <th>Visual</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.sources.map((source, index) => (
                            <tr key={index}>
                                <td>
                                    {source.url ? (
                                        <a
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                                            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                        >
                                            {source.name} ↗
                                        </a>
                                    ) : (
                                        <strong>{source.name}</strong>
                                    )}
                                    {source.type && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({source.type})</span>}
                                </td>
                                <td>{source.similarity.toFixed(1)}%</td>
                                <td>
                                    <div className="progress-mini">
                                        <div
                                            className="progress-mini-fill"
                                            style={{
                                                width: `${Math.min(source.similarity, 100)}%`,
                                                background: getProgressColor(source.similarity)
                                            }}
                                        />
                                    </div>
                                </td>
                                <td>
                                    <span
                                        className="phrase-badge"
                                        style={{
                                            background: source.similarity < 15
                                                ? 'rgba(22, 163, 74, 0.2)'
                                                : source.similarity < 25
                                                    ? 'rgba(245, 158, 11, 0.2)'
                                                    : 'rgba(220, 38, 38, 0.2)',
                                            color: source.similarity < 15
                                                ? 'var(--success-light)'
                                                : source.similarity < 25
                                                    ? 'var(--warning)'
                                                    : 'var(--danger)'
                                        }}
                                    >
                                        {source.similarity < 15 ? '✓ Pass' : source.similarity < 25 ? '⚠ Review' : '✗ Flag'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Key Phrases */}
            {results.keyPhrases && results.keyPhrases.length > 0 && (
                <div className="phrases-card">
                    <h3>🔍 Key Phrases Analyzed</h3>
                    <div className="phrase-list">
                        {results.keyPhrases.slice(0, 10).map((phrase, index) => (
                            <div key={index} className="phrase-item">
                                <span className="phrase-text">"{phrase.text}"</span>
                                <span className={`phrase-badge ${phrase.found ? 'warning' : 'pass'}`}>
                                    {phrase.found ? 'Match Found' : 'Unique'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            <div className="score-card" style={{ background: 'var(--bg-secondary)' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '1rem' }}>📝 Recommendations</h3>
                    {results.overallScore < 15 ? (
                        <p style={{ color: 'var(--success-light)' }}>
                            ✅ <strong>Ready for Submission</strong> - Your document shows very low similarity
                            and should pass standard plagiarism checks.
                        </p>
                    ) : results.overallScore < 25 ? (
                        <p style={{ color: 'var(--warning)' }}>
                            ⚠️ <strong>Review Recommended</strong> - Some similarity detected. Check the
                            flagged sources above and consider paraphrasing matched content.
                        </p>
                    ) : (
                        <p style={{ color: 'var(--danger)' }}>
                            ❌ <strong>Revision Required</strong> - Significant similarity detected. Please
                            review and rewrite the matched sections before submission.
                        </p>
                    )}
                </div>
            </div>

            {/* Timestamp */}
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Report generated: {new Date().toLocaleString()} | PlagiarismGuard v1.0
            </div>
        </div>
    );
}

export default ResultsDashboard;
