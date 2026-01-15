import React from 'react';
import { generateWordReport } from '../lib/plagiarismAnalyzer';
import { generatePDF } from '../lib/pdfGenerator';

function ResultsDashboard({ results, onReset, text }) {
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

    const [selectedSource, setSelectedSource] = React.useState(null);

    const handleSourceClick = (source) => {
        setSelectedSource(source);
    };

    const handleExport = () => {
        const reportContent = generateWordReport(results, text || "");

        // Create a blob and triggers download
        const blob = new Blob([reportContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Plagiarism_Report_${new Date().toISOString().slice(0, 10)}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePDFExport = () => {
        generatePDF(results, text || "", {
            title: "Analysis Report",
            author: "PlagiarismGuard User"
        });
    };

    return (
        <div className="results-dashboard">
            <div className="results-header">
                <h2>📊 Analysis Results</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={onReset}>
                        ← New Analysis
                    </button>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        📥 Word Report
                    </button>
                    <button className="btn btn-primary" onClick={handlePDFExport} style={{ backgroundColor: '#2980b9' }}>
                        📄 Official PDF Report
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

            {/* SPLIT VIEW COMPARISON (THE AUDITOR UI) */}
            <div className="auditor-split-view" style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)',
                gap: '1.5rem',
                marginTop: '2rem',
                height: '600px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                {/* Left Pane: User Text (Highlighted) */}
                <div className="left-pane" style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    background: 'var(--bg-secondary)',
                    borderRight: '1px solid var(--border-color)'
                }}>
                    <h3 style={{ marginBottom: '1rem', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                        📝 Your Document
                    </h3>
                    <div className="document-content" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                        {/* 
                           We render the text. 
                           Ideally, we'd use a regex here to inject highlights dynamically based on the selectedSource.
                           For simplicity in this version, we highlight ALL phrases found in results.
                        */}
                        {text.split(new RegExp(`(${results.keyPhrases.filter(p => p.found && p.text).map(p => p.text.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join('|')})`, 'gi')).map((part, i) => {
                            const isMatch = part && results.keyPhrases.some(p => p.found && p.text && p.text.toLowerCase() === part.toLowerCase());
                            return isMatch ?
                                <span key={i} style={{ backgroundColor: 'rgba(253, 224, 71, 0.3)', borderBottom: '2px solid var(--warning)' }}>{part}</span>
                                : part;
                        })}
                    </div>
                </div>

                {/* Right Pane: Source Viewer */}
                <div className="right-pane" style={{ padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-primary)' }}>
                    <h3 style={{ marginBottom: '1rem', position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
                        📚 Matched Source
                    </h3>

                    {selectedSource ? (
                        <div className="source-viewer">
                            <div className="source-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                <h4 style={{ color: 'var(--primary)' }}>{selectedSource.name}</h4>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Match: <strong>{selectedSource.similarity.toFixed(1)}%</strong> | Type: {selectedSource.type || 'Web Source'}
                                </div>
                                {selectedSource.url && (
                                    <a href={selectedSource.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                                        View Original Source ↗
                                    </a>
                                )}
                            </div>

                            <div className="source-content" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '4px', borderLeft: '4px solid var(--primary)' }}>
                                <p style={{ fontStyle: 'italic', color: '#475569' }}>
                                    "{selectedSource.text || selectedSource.snippet || "Available preview text for this source is limited. Please visit the original URL for full content."}"
                                </p>
                            </div>

                            <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                <p><strong>Comparison Tip:</strong> The highlighted text on the left matches content found in this source.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👈</div>
                            <p>Select a source from the list below<br />to compare it side-by-side.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Source Matches Table */}
            <div className="results-table-card" style={{ marginTop: '2rem' }}>
                <h3>📚 Detected Sources</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Click on a source to view details.</p>
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>Source</th>
                            <th>Similarity</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.sources.map((source, index) => (
                            <tr key={index}
                                onClick={() => handleSourceClick(source)}
                                style={{
                                    cursor: 'pointer',
                                    background: selectedSource === source ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                                    borderLeft: selectedSource === source ? '3px solid var(--primary)' : '3px solid transparent'
                                }}
                            >
                                <td>
                                    <strong>{source.name}</strong>
                                    {source.type && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>({source.type})</span>}
                                </td>
                                <td>
                                    <span style={{ fontWeight: 'bold', color: getProgressColor(source.similarity) }}>
                                        {source.similarity.toFixed(1)}%
                                    </span>
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
                                        {source.similarity < 15 ? 'Pass' : source.similarity < 25 ? 'Review' : 'Flag'}
                                    </span>
                                </td>
                                <td>
                                    <button className="btn btn-sm btn-secondary">
                                        Compare &gt;
                                    </button>
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
