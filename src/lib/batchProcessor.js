/**
 * Batch Processor
 * Handles ZIP file extraction and bulk document analysis
 */

import JSZip from 'jszip';
import { parseDocument } from './documentParser';
import { analyzePlagiarism } from './plagiarismAnalyzer';

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt'];

// Limits
const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_DOCUMENTS = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file

/**
 * Check if file extension is supported
 */
function isSupportedFormat(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Validate ZIP file before processing
 */
export function validateZipFile(file) {
    const errors = [];

    if (!file) {
        errors.push('No file provided');
        return { valid: false, errors };
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
        errors.push('File must be a ZIP archive');
        return { valid: false, errors };
    }

    if (file.size > MAX_ZIP_SIZE) {
        errors.push(`ZIP file exceeds ${MAX_ZIP_SIZE / 1024 / 1024}MB limit`);
        return { valid: false, errors };
    }

    return { valid: true, errors: [] };
}

/**
 * Extract and list documents from ZIP
 */
export async function extractDocuments(zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    const documents = [];

    for (const [path, file] of Object.entries(zip.files)) {
        // Skip directories and hidden files
        if (file.dir || path.startsWith('__MACOSX') || path.startsWith('.')) {
            continue;
        }

        const filename = path.split('/').pop();

        if (isSupportedFormat(filename)) {
            const size = file._data?.uncompressedSize || 0;

            documents.push({
                path,
                filename,
                size,
                extension: filename.split('.').pop().toLowerCase(),
                status: size > MAX_FILE_SIZE ? 'too_large' : 'pending'
            });
        }
    }

    // Limit number of documents
    if (documents.length > MAX_DOCUMENTS) {
        return {
            documents: documents.slice(0, MAX_DOCUMENTS),
            truncated: true,
            total: documents.length
        };
    }

    return {
        documents,
        truncated: false,
        total: documents.length
    };
}

/**
 * Process a batch of documents
 * @param {File} zipFile - The ZIP file to process
 * @param {Function} onProgress - Progress callback (0-100)
 * @param {Function} onDocumentComplete - Called when each document finishes
 * @returns {Promise<Array>} - Array of results
 */
export async function processBatch(zipFile, onProgress = () => { }, onDocumentComplete = () => { }) {
    const startTime = Date.now();
    const results = [];

    // Load ZIP
    onProgress(5);
    const zip = await JSZip.loadAsync(zipFile);

    // Get list of documents
    const { documents } = await extractDocuments(zipFile);
    const validDocs = documents.filter(d => d.status !== 'too_large');

    if (validDocs.length === 0) {
        throw new Error('No valid documents found in ZIP');
    }

    onProgress(10);

    // Process each document
    for (let i = 0; i < validDocs.length; i++) {
        const doc = validDocs[i];
        const progressBase = 10 + (i / validDocs.length * 80);

        try {
            // Extract file content
            const file = zip.file(doc.path);
            let content;

            if (doc.extension === 'txt') {
                content = await file.async('string');
            } else {
                // For PDF/DOCX, we need to get as blob and parse
                const blob = await file.async('blob');
                const fakeFile = new File([blob], doc.filename, { type: getFileType(doc.extension) });
                content = await parseDocument(fakeFile);
            }

            // Analyze
            onProgress(progressBase + 5);
            const analysis = await analyzePlagiarism(content, (p) => {
                onProgress(progressBase + (p * 0.7));
            });

            // Store result
            const result = {
                filename: doc.filename,
                path: doc.path,
                status: 'complete',
                score: analysis.overallScore,
                wordCount: analysis.wordCount,
                sourcesFound: analysis.sources.length,
                maxMatch: analysis.maxMatch,
                citations: analysis.citations,
                riskLevel: getRiskLevel(analysis.overallScore),
                processingTime: Date.now() - startTime
            };

            results.push(result);
            onDocumentComplete(result, i + 1, validDocs.length);

        } catch (error) {
            console.error(`Error processing ${doc.filename}:`, error);

            results.push({
                filename: doc.filename,
                path: doc.path,
                status: 'error',
                error: error.message,
                score: null,
                wordCount: 0,
                sourcesFound: 0
            });

            onDocumentComplete({
                filename: doc.filename,
                status: 'error',
                error: error.message
            }, i + 1, validDocs.length);
        }

        onProgress(10 + ((i + 1) / validDocs.length * 85));
    }

    onProgress(100);

    return {
        results,
        summary: generateSummary(results),
        processingTime: Date.now() - startTime
    };
}

/**
 * Get MIME type for file extension
 */
function getFileType(ext) {
    const types = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain'
    };
    return types[ext] || 'application/octet-stream';
}

/**
 * Get risk level from score
 */
function getRiskLevel(score) {
    if (score < 15) return 'low';
    if (score < 30) return 'moderate';
    return 'high';
}

/**
 * Generate batch summary
 */
function generateSummary(results) {
    const completed = results.filter(r => r.status === 'complete');
    const errors = results.filter(r => r.status === 'error');

    if (completed.length === 0) {
        return {
            totalDocuments: results.length,
            completed: 0,
            errors: errors.length,
            averageScore: 0,
            highRisk: 0,
            moderateRisk: 0,
            lowRisk: 0
        };
    }

    const scores = completed.map(r => r.score);

    return {
        totalDocuments: results.length,
        completed: completed.length,
        errors: errors.length,
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
        maxScore: Math.max(...scores),
        minScore: Math.min(...scores),
        highRisk: completed.filter(r => r.riskLevel === 'high').length,
        moderateRisk: completed.filter(r => r.riskLevel === 'moderate').length,
        lowRisk: completed.filter(r => r.riskLevel === 'low').length
    };
}

/**
 * Export results to CSV
 */
export function exportToCSV(results) {
    const headers = ['Filename', 'Score (%)', 'Risk Level', 'Word Count', 'Sources Found', 'Status'];
    const rows = results.map(r => [
        r.filename,
        r.score !== null ? r.score.toFixed(1) : 'N/A',
        r.riskLevel || 'N/A',
        r.wordCount || 0,
        r.sourcesFound || 0,
        r.status
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
}

/**
 * Export results to Excel (XLSX)
 */
export async function exportToExcel(results, summary) {
    const XLSX = await import('xlsx');

    // Create worksheet data
    const wsData = [
        ['PlagiarismGuard Batch Report'],
        ['Generated:', new Date().toLocaleString()],
        [],
        ['Summary'],
        ['Total Documents:', summary.totalDocuments],
        ['Completed:', summary.completed],
        ['Errors:', summary.errors],
        ['Average Score:', `${summary.averageScore}%`],
        [],
        ['Detailed Results'],
        ['Filename', 'Score (%)', 'Risk Level', 'Word Count', 'Sources Found', 'Status'],
        ...results.map(r => [
            r.filename,
            r.score !== null ? r.score : 'N/A',
            r.riskLevel || 'N/A',
            r.wordCount || 0,
            r.sourcesFound || 0,
            r.status
        ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Batch Results');

    // Generate file
    const xlsxData = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
