import React, { useState } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisProgress from './components/AnalysisProgress';
import ResultsDashboard from './components/ResultsDashboard';
import { analyzePlagiarism } from './lib/plagiarismAnalyzer';

function App() {
    const [file, setFile] = useState(null);
    const [text, setText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleFileUpload = (uploadedFile, extractedText) => {
        setFile(uploadedFile);
        setText(extractedText);
        setResults(null);
        setError(null);
    };

    const handleTextInput = (inputText) => {
        setText(inputText);
        setFile(null);
        setResults(null);
        setError(null);
    };

    const handleAnalyze = async () => {
        if (!text.trim()) {
            setError('Please upload a file or enter text to analyze.');
            return;
        }

        setIsAnalyzing(true);
        setProgress(0);
        setError(null);

        try {
            const analysisResults = await analyzePlagiarism(text, (p) => setProgress(p));
            setResults(analysisResults);
        } catch (err) {
            setError(err.message || 'Analysis failed. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setText('');
        setResults(null);
        setError(null);
        setProgress(0);
    };

    return (
        <div className="app">
            <Header />

            <main className="main-content">
                {!results ? (
                    <div className="upload-section">
                        <FileUpload
                            onFileUpload={handleFileUpload}
                            onTextInput={handleTextInput}
                            file={file}
                            text={text}
                        />

                        {text && !isAnalyzing && (
                            <div className="action-buttons">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAnalyze}
                                >
                                    🔍 Analyze for Plagiarism
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleReset}
                                >
                                    Clear
                                </button>
                            </div>
                        )}

                        {isAnalyzing && (
                            <AnalysisProgress progress={progress} />
                        )}

                        {error && (
                            <div className="error-message">
                                ❌ {error}
                            </div>
                        )}
                    </div>
                ) : (
                    <ResultsDashboard
                        results={results}
                        onReset={handleReset}
                    />
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
                    <p>PlagiarismGuard v1.0 | Open Source Academic Plagiarism Checker</p>
                </div>
            </footer>
        </div>
    );
}

export default App;
