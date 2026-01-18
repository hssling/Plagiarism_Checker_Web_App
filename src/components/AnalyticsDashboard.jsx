import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { getHistory, clearHistory, deleteEntry } from '../lib/historyService';

const AnalyticsDashboard = () => {
    const [history, setHistory] = React.useState([]);

    React.useEffect(() => {
        setHistory(getHistory());
    }, []);

    if (history.length === 0) {
        return (
            <div className="score-card" style={{ textAlign: 'center', padding: '4rem' }}>
                <h2 style={{ color: 'var(--text-muted)' }}>📊 No Analytics Data Yet</h2>
                <p>Perform a few scans to see trends and statistics here.</p>
            </div>
        );
    }

    // Process data for charts
    const trendData = [...history].reverse().map(item => ({
        date: new Date(item.timestamp).toLocaleDateString(),
        score: item.overallScore
    }));

    const langData = history.reduce((acc, item) => {
        const lang = item.language.toUpperCase();
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
    }, {});

    const pieData = Object.entries(langData).map(([name, value]) => ({ name, value }));

    const riskData = history.reduce((acc, item) => {
        const level = item.overallScore < 10 ? 'Safe' : item.overallScore < 25 ? 'Warning' : 'Critical';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
    }, { Safe: 0, Warning: 0, Critical: 0 });

    const riskPieData = Object.entries(riskData).map(([name, value]) => ({ name, value }));

    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const RISK_COLORS = { Safe: '#10b981', Warning: '#f59e0b', Critical: '#ef4444' };

    const avgSimilarity = (history.reduce((sum, item) => sum + item.overallScore, 0) / history.length).toFixed(1);

    const handleExportCSV = () => {
        const headers = ['ID', 'Timestamp', 'Similarity Score', 'Word Count', 'Language', 'Authorship Confidence'];
        const rows = history.map(item => [
            item.id,
            item.timestamp,
            item.overallScore.toFixed(1),
            item.wordCount,
            item.language.toUpperCase(),
            `${item.authorship?.confidence || 0}%`
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `plagiarism_guard_audit_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="analytics-dashboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>📊 Teacher/Admin Analytics</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={handleExportCSV}
                    >
                        📥 Export Audit CSV
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { if (confirm('Clear all history?')) { clearHistory(); setHistory([]); } }}
                    >
                        Clear Records
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="score-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL SCANS</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{history.length}</div>
                </div>
                <div className="score-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AVG SIMILARITY</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{avgSimilarity}%</div>
                </div>
                <div className="score-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CRITICAL RISK</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{riskData.Critical}</div>
                </div>
                <div className="score-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>INTEGRITY PASS</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{riskData.Safe}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* Trend Chart */}
                <div className="score-card" style={{ padding: '2rem', height: '400px' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Similarity Trends (Latest 50)</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Risk Distribution */}
                <div className="score-card" style={{ padding: '2rem', height: '400px' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Risk Status Distribution</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                            <Pie
                                data={riskPieData}
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {riskPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* History Table */}
            <div className="score-card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>📜 Recent Activity</h3>
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Preview</th>
                            <th>Score</th>
                            <th>Language</th>
                            <th>Type</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map(item => (
                            <tr key={item.id}>
                                <td style={{ fontSize: '0.8rem' }}>{new Date(item.timestamp).toLocaleString()}</td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.textPreview}</td>
                                <td>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: item.overallScore > 25 ? 'var(--danger)' : item.overallScore > 10 ? 'var(--warning)' : 'var(--success)'
                                    }}>
                                        {item.overallScore.toFixed(1)}%
                                    </span>
                                </td>
                                <td>{item.language.toUpperCase()}</td>
                                <td>{item.authorship?.confidence > 50 ? '🤖 AI' : '✍️ Human'}</td>
                                <td>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => { deleteEntry(item.id); setHistory(getHistory()); }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
