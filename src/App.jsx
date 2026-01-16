import React, { useState } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisProgress from './components/AnalysisProgress';
import ResultsDashboard from './components/ResultsDashboard';
import BatchUpload from './components/BatchUpload';
import BatchResults from './components/BatchResults';
import { analyzePlagiarism } from './lib/plagiarismAnalyzer';
import { processBatch } from './lib/batchProcessor';
import { calculateCodeSimilarity } from './lib/codePlagiarism';
import { generateImageHash, calculateImageSimilarity } from './lib/imagePlagiarism';
import ImageUpload from './components/ImageUpload';
import SettingsModal from './components/SettingsModal';
import { initializeAI } from './lib/llmService';

function App() {
    // Mode: 'text' | 'code' | 'image' | 'batch'
    const [mode, setMode] = useState('text');

    // Text Mode State
    const [file, setFile] = useState(null);
    const [text, setText] = useState('');

    // Code Mode State
    const [code1, setCode1] = useState('');
    const [code2, setCode2] = useState('');

    // Image Mode State
    const [imgUrl1, setImgUrl1] = useState('');
    const [imgUrl2, setImgUrl2] = useState('');

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null); // Text Results
    const [comparisonResult, setComparisonResult] = useState(null); // Code/Image Results
    const [error, setError] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Batch Mode State
    const [batchFile, setBatchFile] = useState(null);
    const [batchDocs, setBatchDocs] = useState([]);
    const [batchResults, setBatchResults] = useState([]);
    const [batchSummary, setBatchSummary] = useState(null);
    const [currentDoc, setCurrentDoc] = useState('');

    // Initialize AI on load
    React.useEffect(() => {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (apiKey) initializeAI(apiKey);
    }, []);

    // ... (Handlers for Text Mode) ...
    const handleFileUpload = (uploadedFile, extractedText) => {
        setFile(uploadedFile);
        setText(extractedText);
        setResults(null);
    };

    const handleTextInput = (inputText) => {
        setText(inputText);
        setResults(null);
    };

    const handleReset = () => {
        setFile(null);
        setText('');
        setCode1(''); setCode2('');
        setImgUrl1(''); setImgUrl2('');
        setResults(null);
        setComparisonResult(null);
        setBatchFile(null);
        setBatchDocs([]);
        setBatchResults([]);
        setBatchSummary(null);
        setCurrentDoc('');
        setError(null);
        setProgress(0);
    };

    // Batch Mode Handlers
    const handleBatchFilesReady = (file, docs) => {
        setBatchFile(file);
        setBatchDocs(docs);
        setBatchResults([]);
        setBatchSummary(null);
    };

    const handleBatchAnalyze = async () => {
        if (!batchFile) return;

        setIsAnalyzing(true);
        setProgress(0);
        setError(null);
        setBatchResults([]);

        try {
            const { results: bResults, summary } = await processBatch(
                batchFile,
                (p) => setProgress(p),
                (doc, completed, total) => {
                    setCurrentDoc(`Processing ${completed}/${total}: ${doc.filename}`);
                    setBatchResults(prev => [...prev, doc]);
                }
            );

            setBatchResults(bResults);
            setBatchSummary(summary);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsAnalyzing(false);
            setCurrentDoc('');
        }
    };

    // Main Analysis Router
    const handleAnalyze = async () => {
        // 1. Logic: If keys are missing, we will warn but continue (allows academic fallback)
        if (mode === 'text') {
            const searchKey = localStorage.getItem('google_search_api_key') || import.meta.env.VITE_GOOGLE_API_KEY;
            const searchCx = localStorage.getItem('google_search_cx') || import.meta.env.VITE_GOOGLE_CSE_ID;

            if (!searchKey || !searchCx) {
                console.warn("Analysis running in Academic Fallback mode (No Google Key).");
            }
        }

        setIsAnalyzing(true);
        setProgress(10);
        setError(null);
        setResults(null);
        setComparisonResult(null);

        // Auto-scroll to progress (Fix UI visibility issue)
        setTimeout(() => {
            const progressElement = document.getElementById('analysis-progress-section');
            if (progressElement) {
                progressElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);

        try {
            if (mode === 'text') {
                if (!text.trim()) throw new Error('Please enter text to analyze.');
                const analysisResults = await analyzePlagiarism(text, (p) => setProgress(p));
                setResults(analysisResults);
            }
            else if (mode === 'code') {
                if (!code1.trim() || !code2.trim()) throw new Error('Please enter both code snippets.');
                setProgress(50);
                await new Promise(r => setTimeout(r, 500)); // Fake visual delay
                const score = calculateCodeSimilarity(code1, code2);
                setComparisonResult({ score, type: 'Code' });
                setProgress(100);
            }
            else if (mode === 'image') {
                if (!imgUrl1.trim() || !imgUrl2.trim()) throw new Error('Please enter both image URLs.');
                setProgress(30);
                const hash1 = await generateImageHash(imgUrl1);
                setProgress(60);
                const hash2 = await generateImageHash(imgUrl2);
                const score = calculateImageSimilarity(hash1, hash2);
                setComparisonResult({ score, type: 'Image' });
                setProgress(100);
            }
        } catch (err) {
            setError(err.message || 'Analysis failed.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="app">
            <Header onOpenSettings={() => setIsSettingsOpen(true)} />

            <main className="main-content">
                {/* MODE TABS */}
                <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['text', 'code', 'image', 'batch'].map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); handleReset(); }}
                            className={`btn ${mode === m ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ textTransform: 'capitalize', minWidth: '120px' }}
                        >
                            {m === 'text' ? '📄 Text' : m === 'code' ? '💻 Code' : m === 'image' ? '🖼️ Image' : '📦 Batch'}
                        </button>
                    ))}
                </div>

                {/* TEXT MODE UI */}
                {mode === 'text' && !results && (
                    <div className="upload-section">
                        <FileUpload
                            onFileUpload={handleFileUpload}
                            onTextInput={handleTextInput}
                            file={file}
                            text={text}
                        />
                    </div>
                )}

                {/* CODE MODE UI */}
                {mode === 'code' && !comparisonResult && (
                    <div className="comparison-inputs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <textarea
                            placeholder="Paste Original Code Here..."
                            value={code1}
                            onChange={e => setCode1(e.target.value)}
                            style={{ height: '300px', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                        />
                        <textarea
                            placeholder="Paste Suspect Code Here..."
                            value={code2}
                            onChange={e => setCode2(e.target.value)}
                            style={{ height: '300px', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                        />
                    </div>
                )}

                {/* IMAGE MODE UI */}
                {mode === 'image' && !comparisonResult && (
                    <div className="comparison-inputs" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                            <ImageUpload
                                label="Reference Image (Original)"
                                imageSrc={imgUrl1}
                                onImageSelect={setImgUrl1}
                            />
                            <ImageUpload
                                label="Suspect Image (To Check)"
                                imageSrc={imgUrl2}
                                onImageSelect={setImgUrl2}
                            />
                        </div>
                        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)' }}>
                            Note: Uses Perceptual Hashing (pHash) to detect visual similarity. Resized or slightly modified images will still match.
                        </p>
                    </div>
                )}

                {/* BATCH MODE UI */}
                {mode === 'batch' && !batchSummary && (
                    <div className="batch-section">
                        <BatchUpload
                            onFilesReady={handleBatchFilesReady}
                            disabled={isAnalyzing}
                        />
                        {batchDocs.length > 0 && !isAnalyzing && (
                            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                <button className="btn btn-primary" onClick={handleBatchAnalyze}>
                                    🚀 Analyze {batchDocs.filter(d => d.status !== 'too_large').length} Documents
                                </button>
                            </div>
                        )}
                        {isAnalyzing && (
                            <BatchResults
                                results={batchResults}
                                isProcessing={true}
                                progress={progress}
                                currentDoc={currentDoc}
                            />
                        )}
                    </div>
                )}

                {/* BATCH RESULTS */}
                {mode === 'batch' && batchSummary && (
                    <div className="batch-section">
                        <BatchResults
                            results={batchResults}
                            summary={batchSummary}
                            isProcessing={false}
                        />
                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                            <button className="btn btn-secondary" onClick={handleReset}>
                                New Batch Analysis
                            </button>
                        </div>
                    </div>
                )}

                {/* ANALYZE BUTTON */}
                {((mode === 'text' && text) || (mode !== 'text' && !comparisonResult)) && !isAnalyzing && mode !== 'batch' && (
                    <div className="action-buttons" style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button className="btn btn-primary" onClick={handleAnalyze}>
                            🔍 Analyze {mode === 'text' ? 'Internet' : 'Similarity'}
                        </button>
                        <button className="btn btn-secondary" onClick={handleReset} style={{ marginLeft: '1rem' }}>
                            Reset
                        </button>
                    </div>
                )}

                {/* PROGRESS & ERROR */}
                {isAnalyzing && (
                    <div id="analysis-progress-section" style={{ margin: '2rem 0' }}>
                        <AnalysisProgress progress={progress} />
                    </div>
                )}
                {error && <div className="error-message">❌ {error}</div>}

                {/* RESULTS DASHBOARD (TEXT) */}
                {mode === 'text' && results && (
                    <ResultsDashboard results={results} onReset={handleReset} text={text} />
                )}

                {/* COMPARISON RESULTS (CODE/IMAGE) */}
                {comparisonResult && (
                    <div className="score-card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
                        <h2>{comparisonResult.type} Similarity Analysis</h2>
                        <div className="main-score" style={{ margin: '2rem 0' }}>
                            <div className="value" style={{ fontSize: '4rem', color: comparisonResult.score > 50 ? 'var(--danger)' : 'var(--success)' }}>
                                {comparisonResult.score.toFixed(1)}%
                            </div>
                            <div className="label">Similarity Score</div>
                        </div>
                        <p>
                            {comparisonResult.score > 80 ? '🔴 High Probability of Plagiarism' :
                                comparisonResult.score > 40 ? '🟡 Moderate Similarity' : '🟢 Low Similarity'}
                        </p>
                        <button className="btn btn-secondary" onClick={handleReset}>New Analysis</button>
                    </div>
                )}
            </main>

            <footer className="footer">
                <div className="developer-info">
                    <p className="developed-by">Developed by</p>
                    <h3 className="developer-name">Dr. Siddalingaiah H S</h3>
                    <p className="developer-designation">Professor, Community Medicine</p>
                    <p className="developer-institute">Shridevi Institute of Medical Sciences and Research Hospital</p>
                    <p className="developer-address">NH-4, Sira Road, Tumkur - 572106, Karnataka, India</p>
                    <div className="developer-contact">
                        <a href="mailto:hssling@yahoo.com">hssling@yahoo.com</a>
                        <span className="separator">•</span>
                        <span>+91-8941087719</span>
                    </div>
                </div>
                <div className="footer-meta">
                    <p>PlagiarismGuard v2.1 | Open Source Academic Plagiarism Checker</p>
                    <a
                        href="https://github.com/hssling/Plagiarism_Checker_Web_App/blob/main/docs/USER_GUIDE.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text-muted)', textDecoration: 'underline', marginTop: '0.5rem', display: 'inline-block' }}
                    >
                        📘 How it Works (User Guide)
                    </a>
                </div>
            </footer>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={({ apiKey }) => initializeAI(apiKey)}
            />
        </div>
    );
}

export default App;
