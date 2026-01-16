/**
 * BatchResults Component
 * Displays batch processing results with progress and export options
 */

import React, { useState } from 'react';
import { exportToCSV, exportToExcel } from '../lib/batchProcessor';

function BatchResults({ results, summary, isProcessing, progress, currentDoc }) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExportCSV = () => {
        const csv = exportToCSV(results);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plagiarism-batch-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const blob = await exportToExcel(results, summary);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `plagiarism-batch-${Date.now()}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const getRiskClass = (level) => {
        switch (level) {
            case 'high': return 'risk-high';
            case 'moderate': return 'risk-moderate';
            case 'low': return 'risk-low';
            default: return '';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'complete': return '✅';
            case 'error': return '❌';
            case 'processing': return '⏳';
            default: return '⬜';
        }
    };

    if (isProcessing) {
        return (
            <div className="batch-results processing">
                <div className="processing-header">
                    <h3>Processing Batch...</h3>
                    <p>{currentDoc || 'Initializing...'}</p>
                </div>

                <div className="progress-container">
                    <div
                        className="progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="progress-text">{Math.round(progress)}% complete</p>

                {results.length > 0 && (
                    <div className="live-results">
                        <h4>Completed: {results.length}</h4>
                        <div className="mini-results">
                            {results.slice(-3).map((r, i) => (
                                <div key={i} className="mini-result">
                                    <span>{getStatusIcon(r.status)}</span>
                                    <span>{r.filename}</span>
                                    {r.score !== null && (
                                        <span className={getRiskClass(r.riskLevel)}>
                                            {r.score.toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (!results || results.length === 0) {
        return null;
    }

    return (
        <div className="batch-results complete">
            {/* Summary Cards */}
            <div className="batch-summary">
                <div className="summary-card total">
                    <div className="summary-value">{summary.totalDocuments}</div>
                    <div className="summary-label">Documents</div>
                </div>
                <div className="summary-card average">
                    <div className="summary-value">{summary.averageScore}%</div>
                    <div className="summary-label">Avg Score</div>
                </div>
                <div className="summary-card high">
                    <div className="summary-value">{summary.highRisk}</div>
                    <div className="summary-label">High Risk</div>
                </div>
                <div className="summary-card moderate">
                    <div className="summary-value">{summary.moderateRisk}</div>
                    <div className="summary-label">Moderate</div>
                </div>
                <div className="summary-card low">
                    <div className="summary-value">{summary.lowRisk}</div>
                    <div className="summary-label">Low Risk</div>
                </div>
            </div>

            {/* Results Table */}
            <div className="batch-table-container">
                <table className="batch-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Filename</th>
                            <th>Score</th>
                            <th>Risk</th>
                            <th>Words</th>
                            <th>Sources</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((result, i) => (
                            <tr key={i} className={result.status}>
                                <td>{getStatusIcon(result.status)}</td>
                                <td className="filename">{result.filename}</td>
                                <td className={`score ${getRiskClass(result.riskLevel)}`}>
                                    {result.score !== null ? `${result.score.toFixed(1)}%` : '—'}
                                </td>
                                <td>
                                    <span className={`risk-badge ${getRiskClass(result.riskLevel)}`}>
                                        {result.riskLevel || '—'}
                                    </span>
                                </td>
                                <td>{result.wordCount || '—'}</td>
                                <td>{result.sourcesFound || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Export Buttons */}
            <div className="batch-export">
                <button
                    className="btn-export csv"
                    onClick={handleExportCSV}
                    disabled={isExporting}
                >
                    📄 Export CSV
                </button>
                <button
                    className="btn-export excel"
                    onClick={handleExportExcel}
                    disabled={isExporting}
                >
                    {isExporting ? '⏳ Exporting...' : '📊 Export Excel'}
                </button>
            </div>
        </div>
    );
}

export default BatchResults;
