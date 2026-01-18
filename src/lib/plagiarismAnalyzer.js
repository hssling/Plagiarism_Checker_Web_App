/**
 * PlagiarismGuard - Core Analysis Library
 * Multi-API plagiarism detection with local fallback
 */

import { searchPhrase } from './webSearch';
import { analyzeCitationsLocal } from './citationParser';
import {
    cleanText,
    calculateTFIDFSimilarity,
    calculateShingleOverlap,
    extractSmartPhrases
} from './shared/analysisShared';

/**
 * Main plagiarism analysis function (ENHANCED)
 */
export async function analyzePlagiarism(text, onProgress) {
    const results = {
        overallScore: 0,
        wordCount: 0,
        uniqueWords: 0,
        maxMatch: 0,
        sourcesChecked: 0,
        sources: [],
        keyPhrases: [],
        ngramMatches: [],
        citations: null  // Citation analysis results
    };

    // Step 1: Preprocessing
    onProgress(5);
    const words = cleanText(text).split(/\s+/).filter(w => w.length > 0);
    results.wordCount = words.length;
    results.uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

    await new Promise(resolve => setTimeout(resolve, 200));

    // Step 2: Smart Phrase Selection
    onProgress(10);
    // Dynamic depth: check 1 phrase for every 40 words, min 8, max 30
    const dynamicMax = Math.min(Math.max(8, Math.ceil(words.length / 40)), 30);
    const keyPhrases = extractSmartPhrases(text, dynamicMax);
    onProgress(15);

    // Step 3: Deep Web Search (OpenAlex, PubMed, etc.)
    onProgress(20);
    const potentialSources = new Map();

    for (let i = 0; i < keyPhrases.length; i++) {
        const phrase = keyPhrases[i];

        // Multi-API search
        const searchResult = await searchPhrase(phrase);

        results.keyPhrases.push({
            text: phrase,
            found: searchResult.found,
            source: searchResult.source
        });

        if (searchResult.found && searchResult.matches) {
            searchResult.matches.forEach(match => {
                const key = match.url || match.title;
                if (!potentialSources.has(key)) {
                    potentialSources.set(key, {
                        id: 'src_' + Math.random().toString(36).substr(2, 9),
                        name: match.title || 'Unknown Source',
                        type: match.type || match.source,     // e.g. "Medical Research"
                        text: (match.snippet || '') + ' ' + (match.title || ''),
                        url: match.url,
                        matches: 0
                    });
                }

                // Prioritize 'Book' type if found later
                if (match.type === 'Book') {
                    potentialSources.get(key).type = 'Book';
                }

                potentialSources.get(key).matches++;
            });
        }

        onProgress(20 + ((i + 1) / keyPhrases.length) * 60); // Up to 80%
        await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
    }

    onProgress(80);

    // Step 4: Advanced Source Analysis (Shingling & TF-IDF)
    const sourcesArray = Array.from(potentialSources.values());
    results.sourcesChecked = sourcesArray.length;

    for (let i = 0; i < sourcesArray.length; i++) {
        const source = sourcesArray[i];

        // 1. Shingling (Exact/Near-Exact Copy Detection) - Weight: 60%
        const shingleScore = calculateShingleOverlap(text, source.text, 3);

        // 2. TF-IDF (Topic/Keyword Similarity) - Weight: 20%
        const tfidfScore = calculateTFIDFSimilarity(text, source.text);

        // 3. Phrase Hits Boost - Weight: 20%
        // If we found this source via 3 different searches, it's very likely a match.
        const matchesBoost = Math.min(source.matches * 10, 30);

        // Combined Score
        // We prioritize Shingling because it proves structural similarity (plagiarism)
        // rather than just topical similarity.
        let combinedScore = (shingleScore * 2.5) + (tfidfScore * 0.3) + matchesBoost;

        // Boost for short text (less than 200 words) where shingling is harder
        if (words.length < 200) {
            combinedScore *= 1.5;
        }

        // Normalization & Cap
        if (combinedScore > 100) combinedScore = 100;

        if (combinedScore > 3) { // Lowered Threshold for better sensitivity
            results.sources.push({
                id: source.id,
                name: source.name,
                type: source.type,
                similarity: combinedScore,
                url: source.url
            });

            if (combinedScore > results.maxMatch) {
                results.maxMatch = combinedScore;
            }
        }
    }

    onProgress(90);

    // Step 5: Final Scoring
    results.sources.sort((a, b) => b.similarity - a.similarity);
    const topSources = results.sources.slice(0, 10);

    if (topSources.length > 0) {
        // Blended Scoring: Max match (most critical) + Weighted Average of others
        const maxScore = results.maxMatch;
        const avgScore = topSources.reduce((sum, s) => sum + s.similarity, 0) / topSources.length;

        // Final score leans heavily on the worst offender (max match)
        results.overallScore = (maxScore * 0.7) + (avgScore * 0.3);
    } else {
        results.overallScore = 0;
    }

    // Step 6: Citation Analysis (runs in parallel-ish, non-blocking)
    onProgress(92);
    try {
        results.citations = analyzeCitationsLocal(text);
    } catch (err) {
        console.warn('Citation analysis failed:', err);
        results.citations = { found: false, error: err.message };
    }

    await new Promise(resolve => setTimeout(resolve, 200));
    onProgress(100);

    return results;
}

/**
 * Generate Word-compatible HTML report with highlighting
 */
export function generateWordReport(results, originalText) {
    // 1. Highlight text
    let highlightedText = originalText;

    // Sort phrases by length (descending) to avoid partial replacement issues
    const uniquePhrases = [...new Set(results.keyPhrases.filter(p => p.found).map(p => p.text))];
    uniquePhrases.sort((a, b) => b.length - a.length);

    uniquePhrases.forEach(phrase => {
        // Simple case-insensitive replacement with highlighting span
        // Note: In a production app, we'd need more robust token-based matching to handle spacing/formatting variations
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        highlightedText = highlightedText.replace(regex, (match) =>
            `<span style="background-color: #fef08a; color: #000;">${match}</span>`
        );
    });

    // 2. Preserve paragraphs
    highlightedText = highlightedText.split('\n').map(p =>
        p.trim() ? `<p>${p}</p>` : '<br/>'
    ).join('');

    // 3. Generate HTML Document
    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset="utf-8">
        <title>Plagiarism Analysis Report</title>
        <style>
            body { font-family: 'Times New Roman', serif; padding: 2rem; }
            h1, h2, h3 { color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .score-box { 
                background: #f8fafc; 
                border: 2px solid #2563eb; 
                padding: 1rem; 
                text-align: center; 
                margin-bottom: 2rem;
            }
            .score-val { font-size: 24pt; font-weight: bold; color: #2563eb; }
            .footer { margin-top: 3rem; border-top: 1px solid #ccc; padding-top: 1rem; font-size: 9pt; color: #666; }
            .highlight { background-color: #fef08a; }
        </style>
    </head>
    <body>
        <h1>PlagiarismGuard Analysis Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <!-- Summary Section -->
        <div class="score-box">
            <div>Overall Similarity</div>
            <div class="score-val">${results.overallScore.toFixed(1)}%</div>
            <div style="margin-top: 10px;">
                Sources Found: ${results.sources.length} | 
                Analysis Status: ${results.overallScore < 15 ? 'Pass' : results.overallScore < 25 ? 'Review Needed' : 'Significant Plagiarism'}
            </div>
        </div>

        <!-- Sources Table -->
        <h2>Identified Sources</h2>
        <table>
            <thead>
                <tr>
                    <th>Source Name</th>
                    <th>Similarity</th>
                    <th>Type</th>
                    <th>Link</th>
                </tr>
            </thead>
            <tbody>
                ${results.sources.map(s => `
                <tr>
                    <td>${s.name}</td>
                    <td>${s.similarity.toFixed(1)}%</td>
                    <td>${s.type || 'Web/Academic'}</td>
                    <td><a href="${s.url}">${s.url ? 'View Source' : 'N/A'}</a></td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Highlighted Text -->
        <h2>Manuscript Analysis</h2>
        <p><em>Passages found in existing literature are highlighted below.</em></p>
        <hr/>
        <div class="manuscript-body">
            ${highlightedText}
        </div>

        <div class="footer">
            <p>Report generated by PlagiarismGuard Pro v1.0</p>
            <p><strong>Developed by Dr. Siddalingaiah H S</strong>, Professor, Community Medicine.</p>
        </div>
    </body>
    </html>
    `;
}

/**
 * Export report as HTML (Legacy, keeping for compatibility if needed)
 */
export function exportReportHTML(results) {
    // ... existing function implementation if needed, or redirect to new one ...
    return generateWordReport(results, "");
}
