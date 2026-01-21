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
    getShingleMatches,
    extractSmartPhrases,
    isCommonChain
} from './shared/analysisShared';

/**
 * Main plagiarism analysis function (SCIENTIFIC & ENHANCED)
 * Updated to be less aggressive and support exclusions.
 */
export async function analyzePlagiarism(text, onProgress, options = { excludeCitations: true, excludeCommonPhrases: true }) {
    const results = {
        overallScore: 0,
        wordCount: 0,
        uniqueWords: 0,
        maxMatch: 0,
        sourcesChecked: 0,
        sources: [],
        keyPhrases: [],
        ngramMatches: [],
        citations: null,
        excludedRanges: []
    };

    // Step 0: Citation Analysis (First, to define exclusions)
    onProgress(5);
    try {
        results.citations = analyzeCitationsLocal(text);

        // Define Excluded Ranges
        if (options.excludeCitations && results.citations.inTextCitations) {
            results.excludedRanges = results.citations.inTextCitations.map(c => ({
                start: c.start,
                end: c.end
            }));

            // Also exclude the References section if found
            const refSection = results.citations.found ? results.citations : null;
            // Note: analyzeCitationsLocal calls extractReferencesSection but returns summary. 
            // We trust the parser would separate it, but here we might want to ensure we don't scan the biblio.
            // For now, inTextCitations ranges are the main focus for inline exclusions.
        }
    } catch (err) {
        console.warn('Citation analysis warning:', err);
    }

    // Step 1: Preprocessing
    onProgress(10);
    const words = cleanText(text).split(/\s+/).filter(w => w.length > 0);
    results.wordCount = words.length;
    results.uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 2: Smart Phrase Selection (Aligned with new 5-word logic)
    onProgress(15);
    // Dynamic depth: check 1 phrase for every 50 words (less frequent)
    const dynamicMax = Math.min(Math.max(6, Math.ceil(words.length / 50)), 25);
    const initialKeyPhrases = extractSmartPhrases(text, dynamicMax);

    // Filter common phrases if requested
    const keyPhrases = options.excludeCommonPhrases
        ? initialKeyPhrases.filter(p => !isCommonChain(p))
        : initialKeyPhrases;

    onProgress(20);

    // Step 3: Deep Web Search (OpenAlex, PubMed, etc.)
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
                        type: match.type || match.source,
                        text: (match.snippet || '') + ' ' + (match.title || ''),
                        url: match.url,
                        matches: 0
                    });
                }
                potentialSources.get(key).matches++;
            });
        }

        onProgress(20 + ((i + 1) / keyPhrases.length) * 60); // Up to 80%
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    onProgress(85);

    // Step 4: Advanced Source Analysis (Shingling & TF-IDF)
    const sourcesArray = Array.from(potentialSources.values());
    results.sourcesChecked = sourcesArray.length;

    for (let i = 0; i < sourcesArray.length; i++) {
        const source = sourcesArray[i];

        // 1. Shingling (Exact/Near-Exact Copy Detection)
        // Updated: k=5, and PASSING excludedRanges
        const shingleScore = calculateShingleOverlap(text, source.text, 5, results.excludedRanges);

        // 2. TF-IDF (Topic/Keyword Similarity)
        const tfidfScore = calculateTFIDFSimilarity(text, source.text);

        // 3. Phrase Hits Boost (Reduced significantly)
        // Cap at 15% bonus
        const matchesBoost = Math.min(source.matches * 3, 15);

        // Combined Score - SCIENTIFIC FORMULA
        // No arbitrary multipliers > 1. 
        // We weight shingling heavily as it proves *copying*, but we don't multiply it.
        // Formula: 60% Shingling + 20% TF-IDF + 20% Boost

        let combinedScore = (shingleScore * 0.6) + (tfidfScore * 0.2) + matchesBoost;

        if (combinedScore > 100) combinedScore = 100;

        // Threshold: Only report if score > 5% (filtering noise)
        if (combinedScore > 5) {
            results.sources.push({
                id: source.id,
                name: source.name,
                type: source.type,
                similarity: combinedScore,
                url: source.url,
                // Passing snippet back for highlighting if needed
                snippet: source.text.substring(0, 200) + '...'
            });

            if (combinedScore > results.maxMatch) {
                results.maxMatch = combinedScore;
            }
        }
    }

    // Step 5: Final Scoring
    results.sources.sort((a, b) => b.similarity - a.similarity);
    const topSources = results.sources.slice(0, 10);

    if (topSources.length > 0) {
        // Weighted Average: 80% Max Match + 20% Avg of Top 5
        // This prevents one high score from being diluted too much, but also prevents 10 low scores from looking like 0.
        const maxScore = results.maxMatch;
        const avgTop5 = topSources.slice(0, 5).reduce((sum, s) => sum + s.similarity, 0) / Math.min(topSources.length, 5);

        results.overallScore = (maxScore * 0.8) + (avgTop5 * 0.2);
    } else {
        results.overallScore = 0;
    }

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
