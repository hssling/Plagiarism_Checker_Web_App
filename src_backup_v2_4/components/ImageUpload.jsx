import React, { useState, useCallback } from 'react';

function ImageUpload({ label, imageSrc, onImageSelect }) {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (file) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (PNG, JPG, JPEG)');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => onImageSelect(e.target.result);
        reader.readAsDataURL(file);
    };

    return (
        <div className="image-upload-wrapper" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', textAlign: 'center' }}>{label}</h3>

            <div
                className={`upload-card ${isDragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    minHeight: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={() => document.getElementById(`file-input-${label}`).click()}
            >
                <input
                    type="file"
                    id={`file-input-${label}`}
                    accept="image/*"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                />

                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt="Preview"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            borderRadius: '8px',
                            objectFit: 'contain',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    />
                ) : (
                    <>
                        <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</span>
                        <p style={{ margin: 0, fontWeight: 500 }}>Drag & Drop Image</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>or click to browse</p>
                    </>
                )}
            </div>

            <div style={{ marginTop: '1rem' }}>
                <input
                    type="text"
                    placeholder="Or paste Image URL..."
                    value={imageSrc && imageSrc.startsWith('http') ? imageSrc : ''}
                    onChange={(e) => onImageSelect(e.target.value)}
                    className="text-input"
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)'
                    }}
                />
            </div>
        </div>
    );
}

export default ImageUpload;
