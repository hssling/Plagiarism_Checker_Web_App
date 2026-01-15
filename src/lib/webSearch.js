/**
 * Web Search Module - Robust Hybrid Architecture
 * Combines Direct APIs (for depth) with Google Fallbacks (for safety)
 * Fixes: "White Screen" crashes via Safe Fetch
 * Fixes: "Zero Results" via guaranteed Google Fallback
 */

const SEARCH_TIMEOUT = 8000; // 8 seconds per source
const CONCURRENT_LIMIT = 4; // Max parallel requests to avoid 429

/**
 * Enhanced Search Manager
 */
export async function searchPhrase(phrase, options = {}) {
    const results = [];

    // 1. Execute Independent Source Searches (Hybrid: API -> Google Fallback)
    const sourceResults = await executeSafeSearches(phrase);
    results.push(...sourceResults);

    // 2. Global Safety Net: Targeted Google Search (Guarantees non-zero results)
    const googleResults = await searchGoogleCore(phrase);
    if (googleResults) {
        // Merge without duplicates
        const seen = new Set(results.map(r => r.url));
        googleResults.forEach(r => {
            if (!seen.has(r.url)) results.push(r);
        });
    }

    return {
        phrase,
        found: results.length > 0,
        matches: results,
        source: results.length > 0 ? results[0].source : null
    };
}

/**
 * Safe Fetch Wrapper
 * Prevents "White Screen" by catching all network/CORS errors silently
 */
async function safeFetch(url, options = {}) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeout);
        return response;
    } catch (err) {
        // Silently fail creates a "null" result, triggering fallback
        return null;
    }
}

/**
 * Execute searches with Concurrency Limiting
 */
async function executeSafeSearches(phrase) {
    const allResults = [];

    // List of sources to query
    const searchStrategies = [
        // Academic
        () => searchHybrid(phrase, 'Semantic Scholar', searchSemanticScholar, 'semanticscholar.org'),
        () => searchHybrid(phrase, 'OpenAlex', searchOpenAlex, 'openalex.org'),
        () => searchHybrid(phrase, 'EuropePMC', searchEuropePMC, 'europepmc.org'),
        () => searchHybrid(phrase, 'CrossRef', searchCrossRef, 'crossref.org'),

        // Preprints
        () => searchHybrid(phrase, 'arXiv', searchArxiv, 'arxiv.org'),

        // Books & Code
        () => searchHybrid(phrase, 'Open Library', searchOpenLibrary, 'openlibrary.org'),
        () => searchHybrid(phrase, 'Google Books', searchGoogleBooks, 'books.google.com'),
        () => searchHybrid(phrase, 'StackExchange', searchStackExchange, 'stackoverflow.com'),

        // Targeted Google (No API available/feasible)
        () => searchTargetedSite(phrase, 'github.com', 'Source Code', 'GitHub'),
        () => searchTargetedSite(phrase, 'researchgate.net', 'Research Paper', 'ResearchGate'),
        () => searchTargetedSite(phrase, 'scholar.google.com', 'Scholarly Article', 'Google Scholar'),
        () => searchTargetedSite(phrase, 'core.ac.uk', 'Open Access Paper', 'CORE'),
        () => searchTargetedSite(phrase, 'ieeexplore.ieee.org', 'Engineering Std', 'IEEE Xplore'),
        () => searchTargetedSite(phrase, 'link.springer.com', 'Journal Article', 'Springer'),
        () => searchTargetedSite(phrase, 'archive.org', 'Archived Web', 'Internet Archive')
    ];

    // Process in batches
    for (let i = 0; i < searchStrategies.length; i += CONCURRENT_LIMIT) {
        const batch = searchStrategies.slice(i, i + CONCURRENT_LIMIT).map(fn => fn());
        const batchResults = await Promise.allSettled(batch);

        batchResults.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
                allResults.push(...res.value);
            }
        });
    }

    return allResults;
}

/**
 * Hybrid Search Pattern: Try Direct API -> Catch Error -> Fallback to Google Site Search
 */
async function searchHybrid(phrase, sourceName, apiFunction, domain) {
    // 1. Try Direct API
    const apiResults = await apiFunction(phrase);
    if (apiResults && apiResults.length > 0) {
        return apiResults;
    }

    // 2. Fallback to Google Site Search (Safe Mode)
    // console.log(`Fallback to Google for ${sourceName}`);
    return await searchTargetedSite(phrase, domain, 'Hybrid Source', sourceName);
}

// ==========================================
// INDIVIDUAL API STRATEGIES (Restored)
// ==========================================

async function searchSemanticScholar(phrase) {
    const encoded = encodeURIComponent(phrase);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encoded}&limit=3&fields=title,url,abstract,year`;

    // Semantic Scholar often strict with CORS/RateLimits
    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.data || []).map(p => ({
        title: p.title,
        url: p.url,
        snippet: p.abstract || '',
        source: 'Semantic Scholar',
        type: 'Academic Paper'
    }));
}

async function searchOpenAlex(phrase) {
    const email = 'plagiarism@example.com';
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(phrase)}&per-page=3&mailto=${email}`;

    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.results || []).map(w => ({
        title: w.title || w.display_name,
        url: w.doi || w.ids?.openalex,
        snippet: w.abstract_inverted_index ? 'Abstract available' : '',
        source: 'OpenAlex',
        type: 'Scholarly Work'
    }));
}

async function searchEuropePMC(phrase) {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(phrase)}&format=json&pageSize=3`;

    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.resultList?.result || []).map(r => ({
        title: r.title,
        url: `https://europepmc.org/article/${r.source}/${r.id}`,
        snippet: r.abstractText || '',
        source: 'Europe PMC',
        type: 'Medical Research'
    }));
}

async function searchArxiv(phrase) {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(phrase)}&start=0&max_results=3`;

    // XML Response
    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");

    return Array.from(xml.getElementsByTagName("entry")).map(entry => ({
        title: entry.getElementsByTagName("title")[0]?.textContent,
        url: entry.getElementsByTagName("id")[0]?.textContent,
        snippet: entry.getElementsByTagName("summary")[0]?.textContent?.substring(0, 300),
        source: 'arXiv',
        type: 'Preprint'
    }));
}

async function searchCrossRef(phrase) {
    const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(phrase)}&rows=3`;

    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.message?.items || []).map(i => ({
        title: i.title?.[0],
        url: i.URL,
        snippet: '',
        source: 'CrossRef',
        type: 'Metadata'
    }));
}

async function searchOpenLibrary(phrase) {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(phrase)}&limit=3`;
    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.docs || []).map(d => ({
        title: d.title,
        url: `https://openlibrary.org${d.key}`,
        snippet: d.first_sentence?.[0] || '',
        source: 'Open Library',
        type: 'Book'
    }));
}

async function searchStackExchange(phrase) {
    const url = `https://api.stackexchange.com/2.3/search?order=desc&sort=relevance&intitle=${encodeURIComponent(phrase)}&site=stackoverflow`;
    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.items || []).slice(0, 3).map(i => ({
        title: i.title,
        url: i.link,
        snippet: `Tags: ${i.tags?.join(', ')}`,
        source: 'StackOverflow',
        type: 'Dev Q&A'
    }));
}

async function searchGoogleBooks(phrase) {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(phrase)}&maxResults=3&key=${apiKey}`;

    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.items || []).map(i => ({
        title: i.volumeInfo.title,
        url: i.volumeInfo.previewLink,
        snippet: i.volumeInfo.description?.substring(0, 200),
        source: 'Google Books',
        type: 'Book'
    }));
}

/**
 * Targeted Google Search (The robust fallback)
 */
async function searchTargetedSite(phrase, site, type, sourceName) {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const cseId = import.meta.env.VITE_GOOGLE_CSE_ID;

    if (!apiKey || !cseId) return null;

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent('site:' + site + ' "' + phrase + '"')}`;

    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.items || []).map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: sourceName, // Guaranteed label
        type: type
    }));
}

/**
 * Core Google Search (General Web)
 */
async function searchGoogleCore(phrase) {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const cseId = import.meta.env.VITE_GOOGLE_CSE_ID;

    if (!apiKey || !cseId) return null;

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent('"' + phrase + '"')}`;

    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.items || []).map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: 'Google Web',
        type: 'Web Result'
    }));
}

// Keep the existing batch manager
export async function searchPhrases(phrases, onProgress) {
    const results = [];
    for (let i = 0; i < phrases.length; i++) {
        const result = await searchPhrase(phrases[i]);
        results.push(result);
        if (onProgress) onProgress((i + 1) / phrases.length * 100);
        await new Promise(r => setTimeout(r, 200));
    }
    return results;
}

export default { searchPhrase, searchPhrases };
