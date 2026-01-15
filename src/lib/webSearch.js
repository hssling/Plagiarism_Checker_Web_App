/**
 * Web Search Module - Aggregated Search Architecture
 * Fixes CORS and Rate Limits by using Google CSE as a unified proxy
 */

const SEARCH_TIMEOUT = 10000; // 10 seconds

/**
 * Search for exact phrase using Consolidated Hubs
 */
export async function searchPhrase(phrase, options = {}) {
    const results = [];

    // Execute Hub Searches in Parallel
    // This reduces 16+ separate API calls to just 3 highly targeted Google calls per phrase
    const hubPromises = [
        searchAcademicHub(phrase),  // Papers (Scholar, Semantic, OpenAlex, ResearchGate)
        searchPreprintHub(phrase),  // Preprints (ArXiv, BioRxiv, PubMed)
        searchCodeLegacyHub(phrase) // Code & Books (GitHub, SO, Archive, OpenLibrary)
    ];

    const searchResults = await Promise.allSettled(hubPromises);

    searchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            results.push(...result.value);
        }
    });

    // Also include general web search for non-academic hits
    const webResults = await searchGoogleWeb(phrase);
    if (webResults) {
        results.push(...webResults);
    }

    return {
        phrase,
        found: results.length > 0,
        matches: results,
        source: results.length > 0 ? results[0].source : null
    };
}

/**
 * Hub 1: Core Academic Search
 * Targets: Semantic Scholar, OpenAlex, ResearchGate, Academia, Springer, IEEE, CrossRef
 */
async function searchAcademicHub(phrase) {
    // Powerful OR query to check all major academic repositories at once
    const sites = [
        'semanticscholar.org',
        'openalex.org',
        'researchgate.net',
        'academia.edu',
        'link.springer.com',
        'ieeexplore.ieee.org',
        'crossref.org',
        'scholar.google.com'
    ];

    // Construct query: "phrase" (site:A OR site:B ...)
    const siteQuery = sites.map(s => `site:${s}`).join(' OR ');
    return searchGoogleAggregated(phrase, siteQuery, 'Academic Paper', 'Academic Database');
}

/**
 * Hub 2: Preprints & Medical
 * Targets: arXiv, EuropePMC, BioRxiv, MedRxiv
 */
async function searchPreprintHub(phrase) {
    const sites = [
        'arxiv.org',
        'europepmc.org',
        'biorxiv.org',
        'medrxiv.org'
    ];

    const siteQuery = sites.map(s => `site:${s}`).join(' OR ');
    return searchGoogleAggregated(phrase, siteQuery, 'Preprint', 'Preprint Server');
}

/**
 * Hub 3: Code, Books & Legacy
 * Targets: GitHub, StackOverflow, Internet Archive, Open Library, Google Books
 */
async function searchCodeLegacyHub(phrase) {
    const sites = [
        'github.com',
        'stackoverflow.com',
        'archive.org',
        'openlibrary.org',
        'books.google.com'
    ];

    const siteQuery = sites.map(s => `site:${s}`).join(' OR ');
    return searchGoogleAggregated(phrase, siteQuery, 'Source Code/Book', 'Code/Book DB');
}

/**
 * General Web Search (Fallback)
 * Excludes the sites we already checked to avoid duplicates? 
 * Actually, redundancy is fine, but we keep it simple.
 */
async function searchGoogleWeb(phrase) {
    return searchGoogleAggregated(phrase, '', 'Web Result', 'Google Web');
}

/**
 * Core Google Search Function
 */
async function searchGoogleAggregated(phrase, siteFilters, defaultType, defaultSource) {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const cseId = import.meta.env.VITE_GOOGLE_CSE_ID;

    if (!apiKey || !cseId) return null;

    try {
        // Construct advanced query
        let q = `"${phrase}"`;
        if (siteFilters) {
            q += ` (${siteFilters})`;
        }

        const encodedQuery = encodeURIComponent(q);
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodedQuery}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = await response.json();

        return (data.items || []).map(item => {
            // Smart Source Detection based on URL
            let source = defaultSource;
            let type = defaultType;

            if (item.link.includes('arxiv.org')) { source = 'arXiv'; type = 'Preprint'; }
            else if (item.link.includes('github.com')) { source = 'GitHub'; type = 'Source Code'; }
            else if (item.link.includes('stackoverflow.com')) { source = 'StackOverflow'; type = 'Developer Q&A'; }
            else if (item.link.includes('semanticscholar.org')) { source = 'Semantic Scholar'; type = 'Academic Paper'; }
            else if (item.link.includes('ieeexplore')) { source = 'IEEE Xplore'; type = 'Engineering Std'; }
            else if (item.link.includes('books.google')) { source = 'Google Books'; type = 'Book'; }
            else if (item.link.includes('openlibrary.org')) { source = 'Open Library'; type = 'Book'; }
            else if (item.link.includes('researchgate')) { source = 'ResearchGate'; type = 'Research Paper'; }

            return {
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                source: source,
                type: type
            };
        });
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
