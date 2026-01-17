import React, { useState, useEffect } from 'react';
import { LucideShieldCheck, LucideRefreshCcw, LucideCopy, LucideCheck, LucideX, LucideInfo, LucideSplit } from 'lucide-react';
import { paraphraseAcademic, isAIInitialized } from '../lib/llmService';

const RemediationTool = ({ isOpen, onClose, originalText, sourceContext, onApply }) => {
    const [paraphrased, setParaphrased] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [style, setStyle] = useState('formal');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (isOpen && originalText && !paraphrased) {
            handleParaphrase();
        }
    }, [isOpen]);

    const handleParaphrase = async () => {
        if (!originalText) return;

        setIsProcessing(true);
        setError(null);

        try {
            const result = await paraphraseAcademic(originalText, sourceContext, style);
            if (result.error) {
                setError(result.error);
            } else {
                setParaphrased(result.paraphrased);
                setStats({
                    changes: result.changesMade,
                    integrity: result.integrityScore
                });
            }
        } catch (err) {
            setError("Failed to connect to Integrity AI. Please check your settings.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(paraphrased);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay remediate-overlay">
            <div className="remediate-modal glass">
                <div className="remediate-header">
                    <div className="header-title">
                        <LucideShieldCheck className="icon-primary" />
                        <h2>Remediation Pro <span className="badge-ai">Integrity AI</span></h2>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <LucideX size={20} />
                    </button>
                </div>

                <div className="remediate-body">
                    <div className="remediate-hero">
                        <div className="remediate-info">
                            <LucideInfo size={16} />
                            <p>Rewriting to reduce similarity while preserving scientific meaning and citations.</p>
                        </div>
                        <div className="style-selector">
                            <button
                                className={`style-btn ${style === 'formal' ? 'active' : ''}`}
                                onClick={() => setStyle('formal')}
                            >
                                Formal/Medical
                            </button>
                            <button
                                className={`style-btn ${style === 'flow' ? 'active' : ''}`}
                                onClick={() => setStyle('flow')}
                            >
                                Narrative Flow
                            </button>
                            <button
                                className="btn btn-primary btn-sm refresh-btn"
                                onClick={handleParaphrase}
                                disabled={isProcessing}
                            >
                                <LucideRefreshCcw size={14} className={isProcessing ? 'spin' : ''} />
                                Regenerate
                            </button>
                        </div>
                    </div>

                    <div className="remediate-split">
                        <div className="split-panel original">
                            <div className="panel-label">Original Flagged Text</div>
                            <div className="content-box">
                                {originalText}
                            </div>
                            <div className="source-context">
                                <strong>Source Context:</strong> {sourceContext || 'External literature match.'}
                            </div>
                        </div>

                        <div className="split-divider">
                            <LucideSplit size={20} />
                        </div>

                        <div className="split-panel proposed">
                            <div className="panel-label">Integrity AI Proposal</div>
                            <div className="content-box proposed-box">
                                {isProcessing ? (
                                    <div className="ai-loader">
                                        <div className="pulse-ring"></div>
                                        <span>Analyzing linguistic patterns...</span>
                                    </div>
                                ) : error ? (
                                    <div className="error-box">
                                        <p>⚠️ {error}</p>
                                    </div>
                                ) : (
                                    <div className="fade-in">
                                        {paraphrased}
                                    </div>
                                )}
                            </div>
                            {stats && !isProcessing && (
                                <div className="ai-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Integrity Score:</span>
                                        <span className="stat-value">{stats.integrity}%</span>
                                    </div>
                                    <div className="stat-desc">{stats.changes}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="remediate-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Discard</button>
                    <div className="footer-actions">
                        <button className="btn btn-secondary" onClick={handleCopy} disabled={!paraphrased || isProcessing}>
                            {copied ? <LucideCheck size={16} /> : <LucideCopy size={16} />}
                            {copied ? 'Copied' : 'Copy Text'}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => onApply(paraphrased)}
                            disabled={!paraphrased || isProcessing}
                        >
                            Apply Fix
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RemediationTool;
