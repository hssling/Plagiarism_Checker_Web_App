/**
 * Code Plagiarism Detection using Winnowing Algorithm
 * (Robust against renaming, whitespace, and reordering)
 */

/**
 * Preprocess code: Remove comments, whitespace, and normalize
 */
function tokenize(code, language = 'javascript') {
    // Basic regex for removing comments (C-style)
    let clean = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove whitespace and newlines
    clean = clean.replace(/\s+/g, '');

    // Normalize casing (optional, but helps if variable case changes)
    return clean.toLowerCase();
}

/**
 * Rolling Hash (Simple content hash for k-grams)
 */
function stringHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Generate Fingerprints using Winnowing
 * k = noise threshold (k-gram length)
 * w = window size (guarantee to pick 1 hash every w chars)
 */
export function generateFingerprints(code, k = 50, w = 100) {
    const tokenized = tokenize(code);
    const hashes = [];

    // 1. Generate k-gram hashes
    for (let i = 0; i <= tokenized.length - k; i++) {
        const kgram = tokenized.substring(i, i + k);
        hashes.push({
            hash: stringHash(kgram),
            pos: i
        });
    }

    // 2. Winnowing (Select min hash in each window)
    const fingerprints = [];
    let minPos = -1;

    for (let i = 0; i <= hashes.length - w; i++) {
        let minHash = Infinity;
        let currentMinPos = -1;

        // Scan window
        for (let j = 0; j < w; j++) {
            if (hashes[i + j].hash <= minHash) {
                minHash = hashes[i + j].hash;
                currentMinPos = i + j;
            }
        }

        // Record if it's new
        if (currentMinPos !== minPos) {
            minPos = currentMinPos;
            fingerprints.push(hashes[minPos].hash); // Store just the hash
        }
    }

    return fingerprints;
}

/**
 * Calculate similarity between two code snippets
 */
export function calculateCodeSimilarity(code1, code2) {
    const fp1 = new Set(generateFingerprints(code1));
    const fp2 = new Set(generateFingerprints(code2));

    if (fp1.size === 0 || fp2.size === 0) return 0;

    // Jaccard Index of Fingerprints
    let intersection = 0;
    fp1.forEach(hash => {
        if (fp2.has(hash)) intersection++;
    });

    const union = new Set([...fp1, ...fp2]).size;
    return (intersection / union) * 100;
}
