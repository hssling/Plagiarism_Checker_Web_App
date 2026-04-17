import React, { useEffect, useState } from 'react';
import { analyzeWritingStyle } from '../lib/styleAnalyzer';
import { detectTranslatedContent } from '../lib/crossLanguage';
import { analyzeLanguageQualityLocal, mergeLanguageQuality } from '../lib/languageQuality';
import { isAIInitialized, reviewLanguageQuality } from '../lib/llmService';

function ScorePill({ score, label }) {
    const color = score >= 85 ? 'var(--success)' : score >= 70 ? 'var(--warning)' : 'var(--danger)';
    return (
        <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            background: 'var(--bg-secondary)'
        }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color }}>{score}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</div>
        </div>
    );
}

function StyleReport({ text }) {
    const [styleData, setStyleData] = useState(null);
    const [translationData, setTranslationData] = useState(null);
    const [qualityData, setQualityData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [qualityLoading, setQualityLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('quality');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (text && text.length > 100) {
            runAnalysis();
        }
    }, [text]);

    const runAnalysis = async () => {
        setIsAnalyzing(true);

        try {
            const localQuality = analyzeLanguageQualityLocal(text);
            setQualityData(localQuality);

            const [style, translation] = await Promise.all([
                Promise.resolve(analyzeWritingStyle(text)),
                detectTranslatedContent(text)
            ]);

            setStyleData(style);
            setTranslationData(translation);

            if (isAIInitialized()) {
                setQualityLoading(true);
                const aiQuality = await reviewLanguageQuality(text, localQuality);
                if (aiQuality) {
                    setQualityData(mergeLanguageQuality(localQuality, aiQuality));
                }
            }
        } catch (error) {
            console.error('Style analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
            setQualityLoading(false);
        }
    };

    const rerunQuality = async () => {
        const localQuality = analyzeLanguageQualityLocal(text);
        setQualityData(localQuality);

        if (!isAIInitialized()) {
            return;
        }

        setQualityLoading(true);
        try {
            const aiQuality = await reviewLanguageQuality(text, localQuality);
            if (aiQuality) {
                setQualityData(mergeLanguageQuality(localQuality, aiQuality));
            }
        } catch (error) {
            console.error('Language QA refresh failed:', error);
        } finally {
            setQualityLoading(false);
        }
    };

    const handleCopyEdited = async () => {
        if (!qualityData?.editedText) return;
        await navigator.clipboard.writeText(qualityData.editedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    if (!text || text.length < 100) {
        return null;
    }

    if (isAnalyzing && !styleData && !translationData && !qualityData) {
        return (
            <div className="style-report loading">
                <div className="spinner"></div>
                <p>Analyzing writing quality...</p>
            </div>
        );
    }

    const getConsistencyLabel = (score) => {
        if (score >= 80) return 'Highly Consistent';
        if (score >= 60) return 'Consistent';
        if (score >= 40) return 'Some Variation';
        return 'Inconsistent';
    };

    return (
        <div className="style-report">
            <div className="style-tabs">
                <button className={`style-tab ${activeTab === 'quality' ? 'active' : ''}`} onClick={() => setActiveTab('quality')}>
                    Language QA
                </button>
                <button className={`style-tab ${activeTab === 'style' ? 'active' : ''}`} onClick={() => setActiveTab('style')}>
                    Writing Style
                </button>
                <button className={`style-tab ${activeTab === 'translation' ? 'active' : ''}`} onClick={() => setActiveTab('translation')}>
                    Language Check
                </button>
            </div>

            {activeTab === 'quality' && qualityData && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div className="score-card" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Professional Language QA</h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{qualityData.executiveSummary}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {qualityLoading && <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Refreshing editorial review...</span>}
                                <button className="btn btn-secondary" onClick={rerunQuality}>Refresh Review</button>
                                <button className="btn btn-primary" onClick={handleCopyEdited} disabled={!qualityData.editedText}>
                                    {copied ? 'Copied' : 'Copy Edited Text'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                        <ScorePill score={qualityData.overallScore} label="Overall" />
                        <ScorePill score={qualityData.grammarScore} label="Grammar" />
                        <ScorePill score={qualityData.clarityScore} label="Clarity" />
                        <ScorePill score={qualityData.readabilityScore} label="Readability" />
                        <ScorePill score={qualityData.toneScore} label="Tone" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.2fr)', gap: '1rem' }}>
                        <div className="score-card" style={{ marginBottom: 0 }}>
                            <h4 style={{ marginTop: 0 }}>Findings</h4>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {qualityData.issues?.length ? qualityData.issues.map((issue, index) => (
                                    <div key={index} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.35rem' }}>
                                            <strong>{issue.title}</strong>
                                            <span style={{ textTransform: 'capitalize', color: issue.severity === 'high' ? 'var(--danger)' : issue.severity === 'medium' ? 'var(--warning)' : 'var(--text-muted)' }}>
                                                {issue.severity}
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>{issue.detail}</div>
                                        {!!issue.examples?.length && (
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.86rem' }}>
                                                {issue.examples.map((example, itemIndex) => (
                                                    <div key={itemIndex} style={{ color: 'var(--text-secondary)' }}>"{example}"</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div style={{ color: 'var(--text-muted)' }}>No material language issues detected.</div>
                                )}
                            </div>
                        </div>

                        <div className="score-card" style={{ marginBottom: 0 }}>
                            <h4 style={{ marginTop: 0 }}>Edited Version</h4>
                            {qualityData.editedText ? (
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.65', fontSize: '0.95rem' }}>
                                    {qualityData.editedText}
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-muted)' }}>
                                    Connect an AI provider in Settings to generate a professional edited draft. Local QA findings are already available.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="score-card" style={{ marginBottom: 0 }}>
                        <h4 style={{ marginTop: 0 }}>Recommendations</h4>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {qualityData.recommendations?.map((item, index) => (
                                <div key={index} style={{ color: 'var(--text-secondary)' }}>{index + 1}. {item}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'style' && styleData && (
                <div className="style-content">
                    <div className="consistency-card">
                        <div className="consistency-score">
                            <span className="score-value">{styleData.consistencyScore}%</span>
                            <span className="score-label">{getConsistencyLabel(styleData.consistencyScore)}</span>
                        </div>
                        <p className="consistency-desc">Style consistency across the document</p>
                    </div>

                    <div className="style-metrics">
                        <div className="metric-card">
                            <div className="metric-value">{styleData.vocabularyRichness}%</div>
                            <div className="metric-label">Vocabulary Richness</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value">{styleData.avgSentenceLength}</div>
                            <div className="metric-label">Avg Sentence Length</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value">{styleData.complexityScore}</div>
                            <div className="metric-label">Complexity Score</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value">{styleData.passiveVoicePercentage}%</div>
                            <div className="metric-label">Passive Voice</div>
                        </div>
                    </div>

                    {styleData.summary?.length > 0 && (
                        <div className="style-summary">
                            <h4>Style Characteristics</h4>
                            <ul>
                                {styleData.summary.map((point, i) => <li key={i}>{point}</li>)}
                            </ul>
                        </div>
                    )}

                    {styleData.anomalies?.hasAnomalies && (
                        <div className="style-anomalies">
                            <h4>Style Anomalies Detected</h4>
                            <p>{styleData.anomalies.anomalyCount} section(s) with different writing style</p>
                            <div className="anomaly-list">
                                {styleData.anomalies.anomalySections.map((section, i) => (
                                    <div key={i} className="anomaly-item">
                                        <span className="anomaly-badge">{section.similarity}% match</span>
                                        <span className="anomaly-preview">{section.preview}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'translation' && translationData && (
                <div className="translation-content">
                    <div className={`translation-status ${translationData.isLikelyTranslated ? 'warning' : 'clear'}`}>
                        <div className="status-text">
                            <h3>{translationData.isLikelyTranslated ? 'Possible Translated Content' : 'Original English Text'}</h3>
                            <p>{translationData.summary}</p>
                        </div>
                        <div className="status-confidence">
                            <span className="confidence-value">{translationData.translationProbability}%</span>
                            <span className="confidence-label">Probability</span>
                        </div>
                    </div>

                    <div className="language-info">
                        <div className="language-card">
                            <span className="lang-name">{translationData.detectedLanguage}</span>
                            <span className="lang-confidence">{Math.round(translationData.languageConfidence * 100)}% confidence</span>
                        </div>
                    </div>

                    {translationData.artifacts?.length > 0 && (
                        <div className="artifacts-section">
                            <h4>Translation Artifacts Found</h4>
                            <div className="artifacts-list">
                                {translationData.artifacts.map((artifact, i) => (
                                    <div key={i} className={`artifact-item ${artifact.severity}`}>
                                        <span className="artifact-type">{artifact.message || artifact.type}</span>
                                        <span className={`artifact-severity ${artifact.severity}`}>{artifact.severity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default StyleReport;
