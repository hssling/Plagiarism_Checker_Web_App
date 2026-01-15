/**
 * Web Search Module - Searches for phrases across the internet
 * Integrates with Google Custom Search and academic databases
 */

const SEARCH_TIMEOUT = 10000; // 10 seconds

/**
 * Search for exact phrase match on the web
 */
export async function searchPhrase(phrase, options = {}) {
    const results = [];

    // Try Google Custom Search if configured
    const googleResults = await searchGoogle(phrase);
    if (googleResults) {
        results.push(...googleResults);
    }

    // Try academic databases
    const academicResults = await searchAcademic(phrase);
    if (academicResults) {
        results.push(...academicResults);
    }

    return {
        phrase,
        found: results.length > 0,
        matches: results,
        source: results.length > 0 ? results[0].source : null
    };
}

/**
 * Search Google Custom Search API
 */
async function searchGoogle(phrase) {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const cseId = import.meta.env.VITE_GOOGLE_CSE_ID;

    if (!apiKey || !cseId) {
        return null;
    }

    try {
        const encodedPhrase = encodeURIComponent(`"${phrase}"`);
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodedPhrase}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            console.warn('Google search failed:', response.status);
            return null;
        }

        const data = await response.json();

        return (data.items || []).map(item => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet,
            source: 'Google'
        }));
    } catch (err) {
        if (err.name === 'AbortError') {
            console.warn('Google search timed out');
        } else {
            console.warn('Google search error:', err.message);
        }
        return null;
    }
}

/**
 * Search academic databases (CrossRef, Semantic Scholar)
 */
async function searchAcademic(phrase) {
    const results = [];

    // CrossRef API (free, no key required)
    try {
        const crossRefResults = await searchCrossRef(phrase);
        if (crossRefResults) {
            results.push(...crossRefResults);
        }
    } catch (err) {
        console.warn('CrossRef search failed:', err.message);
    }

    // Semantic Scholar API (free, no key required)
    try {
        const ssResults = await searchSemanticScholar(phrase);
        if (ssResults) {
            results.push(...ssResults);
        }
    } catch (err) {
        console.warn('Semantic Scholar search failed:', err.message);
    }

    return results.length > 0 ? results : null;
}

/**
 * Search CrossRef API for academic papers
 */
async function searchCrossRef(phrase) {
    try {
        const encodedQuery = encodeURIComponent(phrase);
        const url = `https://api.crossref.org/works?query=${encodedQuery}&rows=5`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'PlagiarismGuard/1.0 (mailto:plagiarismguard@example.com)'
            }
        });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = await response.json();

        return (data.message?.items || [])
            .filter(item => item.title)
            .map(item => ({
                title: Array.isArray(item.title) ? item.title[0] : item.title,
                url: item.URL || `https://doi.org/${item.DOI}`,
                doi: item.DOI,
                source: 'CrossRef',
                type: 'Academic Paper'
            }));
    } catch (err) {
        return null;
    }
}

/**
 * Search Semantic Scholar API
 */
async function searchSemanticScholar(phrase) {
    try {
        const encodedQuery = encodeURIComponent(phrase);
        const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=5&fields=title,url,abstract`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = await response.json();

        return (data.data || []).map(paper => ({
            title: paper.title,
            url: paper.url,
            snippet: paper.abstract?.substring(0, 200),
            source: 'Semantic Scholar',
            type: 'Academic Paper'
        }));
    } catch (err) {
        return null;
    }
}

/**
 * Batch search multiple phrases
 */
export async function searchPhrases(phrases, onProgress) {
    const results = [];

    for (let i = 0; i < phrases.length; i++) {
        const result = await searchPhrase(phrases[i]);
        results.push(result);

        if (onProgress) {
            onProgress((i + 1) / phrases.length * 100);
        }

        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
}

export default { searchPhrase, searchPhrases };
