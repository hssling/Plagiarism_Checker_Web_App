/**
 * BatchUpload Component
 * Handles ZIP file upload with drag-drop and file list preview
 */

import React, { useState, useCallback } from 'react';
import { validateZipFile, extractDocuments } from '../lib/batchProcessor';

function BatchUpload({ onFilesReady, disabled }) {
    const [isDragging, setIsDragging] = useState(false);
    const [zipFile, setZipFile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [error, setError] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        const file = e.dataTransfer.files[0];
        await processZipFile(file);
    }, [disabled]);

    const handleFileSelect = useCallback(async (e) => {
        const file = e.target.files[0];
        if (file) {
            await processZipFile(file);
        }
    }, []);

    const processZipFile = async (file) => {
        setError(null);
        setDocuments([]);

        // Validate
        const validation = validateZipFile(file);
        if (!validation.valid) {
            setError(validation.errors.join(', '));
            return;
        }

        setZipFile(file);
        setIsExtracting(true);

        try {
            // Extract document list
            const { documents: docs, truncated, total } = await extractDocuments(file);
            setDocuments(docs);

            if (truncated) {
                setError(`Only first 20 of ${total} documents will be processed`);
            }

            if (docs.length === 0) {
                setError('No supported documents found (PDF, DOCX, TXT)');
                setZipFile(null);
            } else {
                // Notify parent
                onFilesReady(file, docs);
            }
        } catch (err) {
            setError(`Failed to extract ZIP: ${err.message}`);
            setZipFile(null);
        } finally {
            setIsExtracting(false);
        }
    };

    const clearFile = () => {
        setZipFile(null);
        setDocuments([]);
        setError(null);
        onFilesReady(null, []);
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const getFileIcon = (ext) => {
        switch (ext) {
            case 'pdf': return '📄';
            case 'docx': return '📝';
            case 'txt': return '📃';
            default: return '📁';
        }
    };

    return (
        <div className="batch-upload">
            {!zipFile ? (
                <div
                    className={`batch-dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !disabled && document.getElementById('zip-input').click()}
                >
                    <input
                        type="file"
                        id="zip-input"
                        accept=".zip"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        disabled={disabled}
                    />

                    <div className="dropzone-icon">📦</div>
                    <h3>Drop ZIP file here</h3>
                    <p>or click to browse</p>
                    <p className="dropzone-hint">
                        Supports: PDF, DOCX, TXT • Max 50MB • Up to 20 documents
                    </p>
                </div>
            ) : (
                <div className="batch-file-info">
                    <div className="zip-header">
                        <div className="zip-icon">📦</div>
                        <div className="zip-details">
                            <h4>{zipFile.name}</h4>
                            <p>{formatSize(zipFile.size)} • {documents.length} documents</p>
                        </div>
                        <button className="btn-clear" onClick={clearFile} disabled={disabled}>
                            ✕
                        </button>
                    </div>

                    {isExtracting ? (
                        <div className="extracting">
                            <div className="spinner"></div>
                            <p>Extracting documents...</p>
                        </div>
                    ) : (
                        <div className="document-list">
                            {documents.map((doc, i) => (
                                <div key={i} className={`document-item ${doc.status}`}>
                                    <span className="doc-icon">{getFileIcon(doc.extension)}</span>
                                    <span className="doc-name">{doc.filename}</span>
                                    <span className="doc-size">{formatSize(doc.size)}</span>
                                    {doc.status === 'too_large' && (
                                        <span className="doc-warning">Too large</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="batch-error">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}

export default BatchUpload;
