import React, { useState } from 'react';

/**
 * CitationResults - Display citation analysis results
 */
function CitationResults({ citationData, onValidate }) {
    const [isValidating, setIsValidating] = useState(false);
    const [validationProgress, setValidationProgress] = useState(0);
    const [expandedRef, setExpandedRef] = useState(null);

    if (!citationData) {
        return (
            <div className="citation-results citation-empty">
                <div className="citation-empty-icon">📚</div>
                <p>No citation data available</p>
            </div>
        );
    }

    if (!citationData.found) {
        return (
            <div className="citation-results citation-not-found">
                <div className="citation-empty-icon">🔍</div>
                <h3>No References Section Found</h3>
                <p>We couldn't locate a references or bibliography section in this document.</p>
                <p className="citation-hint">Tip: Make sure your document has a clearly labeled "References" or "Bibliography" section.</p>
            </div>
        );
    }

    const { style, styleConfidence, references, inTextCitations, issues, stats, validationResults } = citationData;

    const handleValidate = async () => {
        if (onValidate && !isValidating) {
            setIsValidating(true);
            setValidationProgress(0);
            await onValidate((progress) => setValidationProgress(progress));
            setIsValidating(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'valid': return '✅';
            case 'partial': return '⚠️';
            case 'suspicious': return '🚨';
            case 'unverified': return '❓';
            case 'skipped': return '⏭️';
            case 'error': return '❌';
            default: return '📄';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'valid': return 'citation-status-valid';
            case 'partial': return 'citation-status-warning';
            case 'suspicious':
            case 'error': return 'citation-status-error';
            default: return 'citation-status-neutral';
        }
    };

    const getIssueIcon = (severity) => {
        switch (severity) {
            case 'error': return '🔴';
            case 'warning': return '🟡';
            case 'info': return '🔵';
            default: return '⚪';
        }
    };

    return (
        <div className="citation-results">
            {/* Summary Card */}
            <div className="citation-summary-card">
                <div className="citation-summary-header">
                    <h3>📚 Citation Analysis</h3>
                    <span className={`citation-style-badge style-${style}`}>
                        {style?.toUpperCase() || 'UNKNOWN'} Style
                        {styleConfidence > 0 && <span className="confidence">({styleConfidence}%)</span>}
                    </span>
                </div>

                <div className="citation-stats-grid">
                    <div className="citation-stat">
                        <div className="stat-value">{stats?.totalReferences || 0}</div>
                        <div className="stat-label">References</div>
                    </div>
                    <div className="citation-stat">
                        <div className="stat-value">{stats?.totalCitations || 0}</div>
                        <div className="stat-label">In-Text Citations</div>
                    </div>
                    <div className="citation-stat">
                        <div className="stat-value">{stats?.withDOI || 0}</div>
                        <div className="stat-label">With DOI</div>
                    </div>
                    <div className="citation-stat">
                        <div className="stat-value">{stats?.uncitedCount || 0}</div>
                        <div className="stat-label">Uncited</div>
                    </div>
                </div>

                {/* Validate Button */}
                {onValidate && !validationResults && (
                    <button
                        className="citation-validate-btn"
                        onClick={handleValidate}
                        disabled={isValidating || references.length === 0}
                    >
                        {isValidating ? (
                            <>
                                <span className="spinner"></span>
                                Validating... {validationProgress}%
                            </>
                        ) : (
                            <>🔍 Validate References Against CrossRef/OpenAlex</>
                        )}
                    </button>
                )}

                {/* Validation Summary */}
                {validationResults && (
                    <div className="validation-summary">
                        <div className="validation-summary-title">Validation Results</div>
                        <div className="validation-stats">
                            <span className="validation-stat valid">✅ {validationResults.summary?.valid || 0} Valid</span>
                            <span className="validation-stat partial">⚠️ {validationResults.summary?.partial || 0} Partial</span>
                            <span className="validation-stat suspicious">🚨 {validationResults.summary?.suspicious || 0} Suspicious</span>
                            <span className="validation-stat unverified">❓ {validationResults.summary?.unverified || 0} Unverified</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Issues Section */}
            {issues && issues.length > 0 && (
                <div className="citation-issues-card">
                    <h4>⚠️ Issues Found</h4>
                    <ul className="citation-issues-list">
                        {issues.map((issue, idx) => (
                            <li key={idx} className={`citation-issue issue-${issue.severity}`}>
                                <span className="issue-icon">{getIssueIcon(issue.severity)}</span>
                                <div className="issue-content">
                                    <div className="issue-message">{issue.message}</div>
                                    {issue.details && <div className="issue-details">{issue.details}</div>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* References List */}
            <div className="citation-references-card">
                <h4>📖 References ({references?.length || 0})</h4>

                {references && references.length > 0 ? (
                    <ul className="citation-references-list">
                        {references.map((ref, idx) => {
                            const validation = validationResults?.results?.find(r => r.referenceNumber === ref.number);
                            const isExpanded = expandedRef === idx;

                            return (
                                <li
                                    key={idx}
                                    className={`citation-reference ${validation ? getStatusClass(validation.status) : ''}`}
                                    onClick={() => setExpandedRef(isExpanded ? null : idx)}
                                >
                                    <div className="ref-header">
                                        <span className="ref-number">#{ref.number}</span>
                                        {validation && (
                                            <span className="ref-status" title={validation.status}>
                                                {getStatusIcon(validation.status)}
                                            </span>
                                        )}
                                        <span className="ref-expand">{isExpanded ? '▼' : '▶'}</span>
                                    </div>

                                    <div className="ref-text">{ref.original}</div>

                                    {isExpanded && (
                                        <div className="ref-details">
                                            {ref.authors && ref.authors.length > 0 && (
                                                <div className="ref-field">
                                                    <strong>Authors:</strong> {ref.authors.join(', ')}
                                                </div>
                                            )}
                                            {ref.year && (
                                                <div className="ref-field">
                                                    <strong>Year:</strong> {ref.year}
                                                </div>
                                            )}
                                            {ref.title && (
                                                <div className="ref-field">
                                                    <strong>Title:</strong> {ref.title}
                                                </div>
                                            )}
                                            {ref.journal && (
                                                <div className="ref-field">
                                                    <strong>Journal:</strong> {ref.journal}
                                                </div>
                                            )}
                                            {ref.doi && (
                                                <div className="ref-field">
                                                    <strong>DOI:</strong>{' '}
                                                    <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer">
                                                        {ref.doi}
                                                    </a>
                                                </div>
                                            )}
                                            {ref.url && !ref.doi && (
                                                <div className="ref-field">
                                                    <strong>URL:</strong>{' '}
                                                    <a href={ref.url} target="_blank" rel="noopener noreferrer">
                                                        {ref.url.substring(0, 50)}...
                                                    </a>
                                                </div>
                                            )}

                                            {/* Validation Details */}
                                            {validation && (
                                                <div className="ref-validation">
                                                    <div className="validation-status">
                                                        <strong>Verification:</strong>{' '}
                                                        <span className={getStatusClass(validation.status)}>
                                                            {validation.status.toUpperCase()}
                                                        </span>
                                                        {validation.confidence > 0 && (
                                                            <span className="validation-confidence">
                                                                ({validation.confidence}% confidence)
                                                            </span>
                                                        )}
                                                    </div>

                                                    {validation.issues && validation.issues.length > 0 && (
                                                        <ul className="validation-issues">
                                                            {validation.issues.map((issue, i) => (
                                                                <li key={i} className="validation-issue">
                                                                    {issue.message}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}

                                                    {validation.verification?.data && (
                                                        <div className="verified-data">
                                                            <strong>Verified Source:</strong>
                                                            <div className="verified-title">
                                                                {validation.verification.data.title}
                                                            </div>
                                                            {validation.verification.data.url && (
                                                                <a
                                                                    href={validation.verification.data.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="verified-link"
                                                                >
                                                                    View Publication →
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="no-references">No references found in this document.</p>
                )}
            </div>

            {/* In-Text Citations Overview */}
            {inTextCitations && inTextCitations.length > 0 && (
                <div className="citation-intext-card">
                    <h4>📝 In-Text Citations ({inTextCitations.length})</h4>
                    <div className="intext-citations-preview">
                        {inTextCitations.slice(0, 20).map((cite, idx) => (
                            <span key={idx} className={`intext-citation type-${cite.type}`}>
                                {cite.text}
                            </span>
                        ))}
                        {inTextCitations.length > 20 && (
                            <span className="intext-more">+{inTextCitations.length - 20} more</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CitationResults;
