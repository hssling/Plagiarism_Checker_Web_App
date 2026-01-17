/**
 * Document Parser - Extracts text from various file formats
 * Supports: TXT, PDF, DOCX
 */

/**
 * Parse uploaded file and extract text content
 */
export async function parseDocument(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    switch (extension) {
        case 'txt':
            return await parseTxt(file);
        case 'pdf':
            return await parsePdf(file);
        case 'docx':
            return await parseDocx(file);
        case 'doc':
            throw new Error('Legacy .doc format not fully supported. Please convert to .docx');
        default:
            throw new Error(`Unsupported file format: .${extension}`);
    }
}

/**
 * Parse plain text file
 */
async function parseTxt(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
    });
}

/**
 * Parse PDF file using pdf.js
 */
async function parsePdf(file) {
    // Dynamic import of pdf.js
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
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }

                resolve(fullText.trim());
            } catch (err) {
                reject(new Error('Failed to parse PDF: ' + err.message));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read PDF file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Parse DOCX file using mammoth
 */
async function parseDocx(file) {
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
}

/**
 * Get file info
 */
export function getFileInfo(file) {
    return {
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        type: file.type || 'application/octet-stream',
        extension: file.name.split('.').pop().toLowerCase(),
        lastModified: new Date(file.lastModified)
    };
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
