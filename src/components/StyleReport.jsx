/**
 * StyleReport Component
 * Displays writing style analysis and cross-language detection results
 */

import React, { useState, useEffect } from 'react';
import { analyzeWritingStyle } from '../lib/styleAnalyzer';
import { detectTranslatedContent } from '../lib/crossLanguage';

function StyleReport({ text }) {
    const [styleData, setStyleData] = useState(null);
    const [translationData, setTranslationData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState('style');

    useEffect(() => {
        if (text && text.length > 100) {
            runAnalysis();
        }
    }, [text]);

    const runAnalysis = async () => {
        setIsAnalyzing(true);

        try {
            // Style analysis (synchronous)
            const style = analyzeWritingStyle(text);
            setStyleData(style);

            // Translation detection (async - uses AI)
            const translation = await detectTranslatedContent(text);
            setTranslationData(translation);
        } catch (error) {
            console.error('Style analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!text || text.length < 100) {
        return null;
    }

    if (isAnalyzing) {
        return (
            <div className="style-report loading">
                <div className="spinner"></div>
                <p>Analyzing writing style...</p>
            </div>
        );
    }

    const getScoreClass = (score) => {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'moderate';
        return 'low';
    };

    const getConsistencyLabel = (score) => {
        if (score >= 80) return 'Highly Consistent';
        if (score >= 60) return 'Consistent';
        if (score >= 40) return 'Some Variation';
        return 'Inconsistent';
    };

    return (
        <div className="style-report">
            {/* Tab Navigation */}
            <div className="style-tabs">
                <button
                    className={`style-tab ${activeTab === 'style' ? 'active' : ''}`}
                    onClick={() => setActiveTab('style')}
                >
                    ✍️ Writing Style
                </button>
                <button
                    className={`style-tab ${activeTab === 'translation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('translation')}
                >
                    🌐 Language Check
                </button>
            </div>

            {/* Style Analysis Tab */}
            {activeTab === 'style' && styleData && (
                <div className="style-content">
                    {/* Consistency Score */}
                    <div className="consistency-card">
                        <div className={`consistency-score ${getScoreClass(styleData.consistencyScore)}`}>
                            <span className="score-value">{styleData.consistencyScore}%</span>
                            <span className="score-label">{getConsistencyLabel(styleData.consistencyScore)}</span>
                        </div>
                        <p className="consistency-desc">
                            Style consistency across the document
                        </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="style-metrics">
                        <div className="metric-card">
                            <div className="metric-value">{styleData.vocabularyRichness}%</div>
                            <div className="metric-label">Vocabulary Richness</div>
                            <div className="metric-bar">
                                <div className="metric-fill" style={{ width: `${styleData.vocabularyRichness}%` }}></div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-value">{styleData.avgSentenceLength}</div>
                            <div className="metric-label">Avg Sentence Length</div>
                            <div className="metric-hint">
                                words/sentence
                                <span className={styleData.avgSentenceLength > 25 ? 'warning' : 'good'} style={{ marginLeft: '5px', fontSize: '0.8em', fontWeight: 'bold' }}>
                                    ({styleData.avgSentenceLength > 25 ? 'Long' : styleData.avgSentenceLength < 15 ? 'Short' : 'Standard'})
                                </span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-value">{styleData.complexityScore}</div>
                            <div className="metric-label">Complexity Score</div>
                            <div className="metric-hint">
                                syllables/word
                                <span className={styleData.complexityScore > 2.0 ? 'warning' : 'good'} style={{ marginLeft: '5px', fontSize: '0.8em', fontWeight: 'bold' }}>
                                    ({styleData.complexityScore > 2.0 ? 'Complex' : styleData.complexityScore < 1.4 ? 'Simple' : 'Standard'})
                                </span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-value">{styleData.passiveVoicePercentage}%</div>
                            <div className="metric-label">Passive Voice</div>
                            <div className="metric-bar">
                                <div
                                    className="metric-fill warning"
                                    style={{ width: `${Math.min(100, styleData.passiveVoicePercentage * 2)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Style Summary */}
                    {styleData.summary && styleData.summary.length > 0 && (
                        <div className="style-summary">
                            <h4>Style Characteristics</h4>
                            <ul>
                                {styleData.summary.map((point, i) => (
                                    <li key={i}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Anomalies */}
                    {styleData.anomalies?.hasAnomalies && (
                        <div className="style-anomalies">
                            <h4>⚠️ Style Anomalies Detected</h4>
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

                    {/* Fingerprint Visualization */}
                    <div className="fingerprint-section">
                        <h4>Style Fingerprint</h4>
                        <div className="fingerprint-chart">
                            {styleData.fingerprint && Object.entries(styleData.fingerprint).map(([key, value]) => (
                                <div key={key} className="fingerprint-bar">
                                    <span className="fp-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <div className="fp-track">
                                        <div
                                            className="fp-fill"
                                            style={{ width: `${value * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="fp-value">{Math.round(value * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Translation Detection Tab */}
            {activeTab === 'translation' && translationData && (
                <div className="translation-content">
                    {/* Translation Status */}
                    <div className={`translation-status ${translationData.isLikelyTranslated ? 'warning' : 'clear'}`}>
                        <div className="status-icon">
                            {translationData.isLikelyTranslated ? '⚠️' : '✅'}
                        </div>
                        <div className="status-text">
                            <h3>
                                {translationData.isLikelyTranslated
                                    ? 'Possible Translated Content'
                                    : 'Original English Text'}
                            </h3>
                            <p>{translationData.summary}</p>
                        </div>
                        <div className="status-confidence">
                            <span className="confidence-value">{translationData.translationProbability}%</span>
                            <span className="confidence-label">Probability</span>
                        </div>
                    </div>

                    {/* Language Detection */}
                    <div className="language-info">
                        <div className="language-card">
                            <span className="lang-icon">🌍</span>
                            <span className="lang-name">{translationData.detectedLanguage}</span>
                            <span className="lang-confidence">{Math.round(translationData.languageConfidence * 100)}% confidence</span>
                        </div>
                    </div>

                    {/* Artifacts */}
                    {translationData.artifacts && translationData.artifacts.length > 0 && (
                        <div className="artifacts-section">
                            <h4>Translation Artifacts Found</h4>
                            <div className="artifacts-list">
                                {translationData.artifacts.map((artifact, i) => (
                                    <div key={i} className={`artifact-item ${artifact.severity}`}>
                                        <span className="artifact-type">{artifact.message || artifact.type}</span>
                                        <span className={`artifact-severity ${artifact.severity}`}>
                                            {artifact.severity}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Analysis */}
                    {translationData.aiAnalysis && (
                        <div className="ai-analysis">
                            <h4>🤖 AI Analysis</h4>
                            <p>{translationData.aiAnalysis.explanation}</p>
                            {translationData.aiAnalysis.sourceLanguage && (
                                <p className="source-lang">
                                    Possible source language: <strong>{translationData.aiAnalysis.sourceLanguage}</strong>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default StyleReport;
