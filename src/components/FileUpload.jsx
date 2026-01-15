import React, { useCallback, useState } from 'react';

function FileUpload({ onFileUpload, onTextInput, file, text }) {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    }, []);

    const handleFileInput = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    const processFile = async (uploadedFile) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            onFileUpload(uploadedFile, content);
        };
        reader.readAsText(uploadedFile);
    };

    const handleTextChange = (e) => {
        onTextInput(e.target.value);
    };

    const wordCount = text ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

    return (
        <div className="upload-card-container">
            <div
                className={`upload-card ${isDragActive ? 'active' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="dropzone" onClick={() => document.getElementById('file-input').click()}>
                    <span className="dropzone-icon">📄</span>
                    <h3>Drag & Drop your document here</h3>
                    <p>Supports .txt, .doc, .docx, .pdf files</p>
                    <input
                        type="file"
                        id="file-input"
                        accept=".txt,.doc,.docx,.pdf"
                        onChange={handleFileInput}
                        style={{ display: 'none' }}
                    />
                </div>

                {file && (
                    <div className="file-info">
                        <span className="file-icon">📎</span>
                        <div className="file-details">
                            <h4>{file.name}</h4>
                            <p>{(file.size / 1024).toFixed(1)} KB • {wordCount.toLocaleString()} words</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="text-input-section">
                <div className="divider">
                    <span>OR paste your text directly</span>
                </div>

                <textarea
                    className="text-area"
                    placeholder="Paste your manuscript, essay, or research paper text here..."
                    value={text}
                    onChange={handleTextChange}
                />

                <div className="word-count">
                    {wordCount.toLocaleString()} words
                </div>
            </div>
        </div>
    );
}

export default FileUpload;
