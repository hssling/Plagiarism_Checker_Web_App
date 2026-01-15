/**
 * Web Search Module - Omni-Search Architecture
 * Strategy: Broad Google Searches + Smart Post-Classification
 * Fixes: "Zero Results" bug from over-complex site filters
 */

const SEARCH_TIMEOUT = 10000; // 10 seconds

/**
 * Search for exact phrase using Omni-Search strategy
 */
export async function searchPhrase(phrase, options = {}) {
    const results = [];

    // Strategy: 
    // 1. Broad Web Search (Captures everything: arXiv, GitHub, Blogs, etc.)
    // 2. Academic Keyword Search (Bubbles up papers/journals)
    const searchPromises = [
        searchGoogleWithContext(phrase, ''), // General Web
        searchGoogleWithContext(phrase, 'research OR journal OR paper OR code OR thesis') // Academic/Code Bias
    ];

    const searchResults = await Promise.allSettled(searchPromises);

    searchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            results.push(...result.value);
        }
    });

    // Deduplicate by URL
    const uniqueResults = [];
    const seenUrls = new Set();

    for (const res of results) {
        if (seenUrls.has(res.url)) continue;
        seenUrls.add(res.url);

        // Enhance classification
        const classification = classifySource(res.url, res.snippet, res.title);
        uniqueResults.push({
            ...res,
            source: classification.source,
            type: classification.type
        });
    }

    return {
        phrase,
        found: uniqueResults.length > 0,
        matches: uniqueResults,
        source: uniqueResults.length > 0 ? uniqueResults[0].source : null
    };
}

/**
 * Robust Source Classification
 * Detects 18+ specific academic/code sources from URL patterns
 */
function classifySource(url, snippet, title) {
    const u = url.toLowerCase();

    // 1. Core Academic
    if (u.includes('semanticscholar.org')) return { source: 'Semantic Scholar', type: 'Academic Paper' };
    if (u.includes('scholar.google')) return { source: 'Google Scholar', type: 'Scholarly Article' };
    if (u.includes('researchgate.net')) return { source: 'ResearchGate', type: 'Research Paper' };
    if (u.includes('academia.edu')) return { source: 'Academia.edu', type: 'Academic Paper' };
    if (u.includes('openalex.org')) return { source: 'OpenAlex', type: 'Scholarly Work' };
    if (u.includes('core.ac.uk')) return { source: 'CORE', type: 'Open Access Paper' };
    if (u.includes('crossref.org') || u.includes('doi.org')) return { source: 'CrossRef', type: 'Metadata' };
    if (u.includes('link.springer.com') || u.includes('nature.com')) return { source: 'Springer/Nature', type: 'Journal Article' };
    if (u.includes('ieeexplore.ieee.org')) return { source: 'IEEE Xplore', type: 'Engineering Std' };
    if (u.includes('sciencedirect.com')) return { source: 'ScienceDirect', type: 'Journal Article' };
    if (u.includes('ncbi.nlm.nih.gov') || u.includes('pubmed')) return { source: 'PubMed/NCBI', type: 'Medical Research' };

    // 2. Preprints
    if (u.includes('arxiv.org')) return { source: 'arXiv', type: 'Preprint' };
    if (u.includes('biorxiv.org')) return { source: 'BioRxiv', type: 'Preprint' };
    if (u.includes('medrxiv.org')) return { source: 'MedRxiv', type: 'Preprint' };
    if (u.includes('europepmc.org')) return { source: 'Europe PMC', type: 'Medical Research' };

    // 3. Code & Books
    if (u.includes('github.com')) return { source: 'GitHub', type: 'Source Code' };
    if (u.includes('stackoverflow.com')) return { source: 'StackOverflow', type: 'Developer Q&A' };
    if (u.includes('archive.org')) return { source: 'Internet Archive', type: 'Archived Web' };
    if (u.includes('openlibrary.org')) return { source: 'Open Library', type: 'Book' };
    if (u.includes('books.google')) return { source: 'Google Books', type: 'Book' };

    // Default Fallback
    if (u.includes('.edu')) return { source: 'University Website', type: 'Academic Web' };
    if (u.includes('.gov')) return { source: 'Government Site', type: 'Official Document' };

    return { source: 'General Web', type: 'Web Result' };
}

/**
 * Core Google Search Function
 */
async function searchGoogleWithContext(phrase, extraTerms) {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const cseId = import.meta.env.VITE_GOOGLE_CSE_ID;

    if (!apiKey || !cseId) return null;

    try {
        // Construct query: "phrase" extraTerms
        let q = `"${phrase}"`;
        if (extraTerms) {
            q += ` ${extraTerms}`;
        }

        const encodedQuery = encodeURIComponent(q);
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodedQuery}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = await response.json();

        return (data.items || []).map(item => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet,
            source: 'Google', // Will be re-classified later
            type: 'Web'
        }));
    } catch (err) {
        return null;
    }
}

/**
 * Batch search - unchanged logic
 */
export async function searchPhrases(phrases, onProgress) {
    const results = [];

    for (let i = 0; i < phrases.length; i++) {
        const result = await searchPhrase(phrases[i]);
        results.push(result);

        if (onProgress) {
            onProgress((i + 1) / phrases.length * 100);
        }

        // Rate limiting - slight pause
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return results;
}

export default { searchPhrase, searchPhrases };
