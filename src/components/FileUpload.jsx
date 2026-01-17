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
        const extension = uploadedFile.name.split('.').pop().toLowerCase();

        try {
            let content = '';

            if (extension === 'txt') {
                // Plain text - read directly
                content = await readAsText(uploadedFile);
            } else if (extension === 'docx') {
                // DOCX - use mammoth
                content = await parseDocx(uploadedFile);
            } else if (extension === 'pdf') {
                // PDF - use pdf.js
                content = await parsePdf(uploadedFile);
            } else if (extension === 'doc') {
                // Legacy .doc - try as text, may not work
                content = 'Error: Legacy .doc format is not fully supported. Please save as .docx and try again.';
            } else {
                content = 'Error: Unsupported file format.';
            }

            onFileUpload(uploadedFile, content);
        } catch (error) {
            console.error('File parsing error:', error);
            onFileUpload(uploadedFile, `Error parsing file: ${error.message}`);
        }
    };

    const readAsText = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    };

    const parseDocx = async (file) => {
        const mammoth = await import('mammoth');
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    resolve(result.value);
                } catch (err) {
                    reject(new Error('Failed to parse DOCX: ' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read DOCX file'));
            reader.readAsArrayBuffer(file);
        });
    };

    const parsePdf = async (file) => {
        const pdfjsLib = await import('pdfjs-dist/build/pdf');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;

                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();

                        // Smarter text joining: handle spacing and line breaks based on coordinates
                        let lastY = -1;
                        let pageText = '';

                        for (const item of textContent.items) {
                            if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                                pageText += '\n';
                            } else if (lastY !== -1 && item.str.length > 0) {
                                pageText += ' ';
                            }
                            pageText += item.str;
                            lastY = item.transform[5];
                        }

                        fullText += pageText + '\n\n';
                    }

                    resolve(fullText.trim());
                } catch (err) {
                    reject(new Error('Failed to parse PDF: ' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read PDF file'));
            reader.readAsArrayBuffer(file);
        });
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
