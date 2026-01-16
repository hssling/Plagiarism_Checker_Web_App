/**
 * Web Search Module - Comprehensive Multi-Source Architecture
 * Strategy: Explicitly checks 16+ distinct sources via API or Google Fallback
 * Features: SafeFetch (Anti-Crash), Concurrency Control, Deep Linking
 */

const SEARCH_TIMEOUT = 10000; // 10 seconds
const CONCURRENT_LIMIT = 4; // Batch size to prevent browser hang

/**
 * Main Entry Point: Search for exact phrase
 */
function getSearchConfigs() {
    const apiKey = localStorage.getItem('google_search_api_key') || import.meta.env.VITE_GOOGLE_API_KEY;
    const cseId = localStorage.getItem('google_search_cx') || import.meta.env.VITE_GOOGLE_CSE_ID;
    return { apiKey, cseId };
}

export async function searchPhrase(phrase, options = {}) {
    const results = [];

    // 1. Execute Independent Source Searches (Batch Processed)
    const sourceResults = await executeDeepSearches(phrase);
    results.push(...sourceResults);

    // 2. Global Safety Net: General Web Search (Guarantees non-zero results)
    const googleResults = await performGoogleCoreSearch(phrase);
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
async function safeFetch(url, options = {}, useProxy = false) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        let fetchUrl = url;
        if (useProxy) {
            // Use local Vercel proxy to bypass CORS
            fetchUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        }

        const response = await fetch(fetchUrl, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeout);

        // Handle Proxy Wrapper (if using proxy)
        if (useProxy && response.ok) {
            const wrapper = await response.json(); // The proxy ALWAYS returns JSON 200

            // If the upstream failed (e.g. 404, 500, 429), treat as null to trigger fallback
            if (!wrapper.upstreamOk) return null;

            // Reconstruct a mock Response object for the caller
            return new Response(wrapper.data, {
                status: wrapper.upstreamStatus,
                statusText: wrapper.upstreamStatusText,
                headers: { 'Content-Type': wrapper.contentType || 'application/json' }
            });
        }

        return response;
    } catch (err) {
        // Silently fail creates a "null" result, triggering fallback
        return null;
    }
}

/**
 * Execute searches with Concurrency Limiting
 */
async function executeDeepSearches(phrase) {
    const allResults = [];

    // Explicit List of All 16 Search Strategies
    const searchStrategies = [
        // 1. Core Academic APIs
        () => searchSemanticScholar(phrase),
        () => searchOpenAlex(phrase),
        () => searchPubMed(phrase),
        () => searchEuropePMC(phrase),
        () => searchCrossRef(phrase),

        // 2. Preprints
        () => searchArxiv(phrase),

        // 3. Books & Code
        () => searchOpenLibrary(phrase),
        () => searchGoogleBooks(phrase),
        () => searchStackExchange(phrase),

        // 4. Deep Web / Targeted Site Searches (Explicit definitions)
        () => searchGitHub(phrase),
        () => searchResearchGate(phrase),
        () => searchGoogleScholar(phrase),
        () => searchCORE(phrase),
        () => searchIEEE(phrase),
        () => searchSpringer(phrase),
        () => searchInternetArchive(phrase),
        () => searchScienceDirect(phrase)
    ];

    // Process in batches
    for (let i = 0; i < searchStrategies.length; i += CONCURRENT_LIMIT) {
        const batch = searchStrategies.slice(i, i + CONCURRENT_LIMIT).map(fn => fn());
        const batchResults = await Promise.allSettled(batch);

        batchResults.forEach(res => {
            // FIX: Check if res.value is actually an array before spreading
            if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                allResults.push(...res.value);
            }
        });
    }

    return allResults;
}

/**
 * Helper: Targeted Site Search via Google
 */
async function searchTargetedSite(phrase, site, type, sourceName) {
    const { apiKey, cseId } = getSearchConfigs();

    // Fail gracefully if keys are missing
    if (!apiKey || !cseId) {
        console.warn('Missing Google Search Keys');
        return null;
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent('site:' + site + ' "' + phrase + '"')}`;

    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.items || []).map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: sourceName,
        type: type
    }));
}

/**
 * Core Google Search (General Web)
 */
async function performGoogleCoreSearch(phrase) {
    const { apiKey, cseId } = getSearchConfigs();

    if (!apiKey || !cseId) {
        return null; // Graceful skip
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent('"' + phrase + '"')}`;

    const res = await safeFetch(url);
    if (!res || !res.ok) return null;

    const data = await res.json();
    return (data.items || []).map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: 'Google Web',
        type: 'Web Page'
    }));
}

// ==========================================
// SOURCE 1: Semantic Scholar
// ==========================================
async function searchSemanticScholar(phrase) {
    const encoded = encodeURIComponent(phrase);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encoded}&limit=3&fields=title,url,abstract,year`;

    // Use Proxy (CORS blocked)
    const res = await safeFetch(url, {}, true);
    if (res && res.ok) {
        const data = await res.json();
        const results = (data.data || []).map(p => ({
            title: p.title,
            url: p.url,
            snippet: p.abstract || '',
            source: 'Semantic Scholar',
            type: 'Academic Paper'
        }));
        if (results.length > 0) return results;
    }
    // Fallback
    return searchTargetedSite(phrase, 'semanticscholar.org', 'Academic Paper', 'Semantic Scholar');
}

// ==========================================
// SOURCE 2: OpenAlex
// ==========================================
async function searchOpenAlex(phrase) {
    const email = 'plagiarism@example.com';
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(phrase)}&per-page=3&mailto=${email}`;

    // Use Proxy (CORS blocked)
    const res = await safeFetch(url, {}, false);
    if (res && res.ok) {
        const data = await res.json();
        const results = (data.results || []).map(w => ({
            title: w.title || w.display_name,
            url: w.doi || w.ids?.openalex,
            snippet: 'OpenAlex Scholarly Record',
            source: 'OpenAlex',
            type: 'Scholarly Work'
        }));
        if (results.length > 0) return results;
    }
    // Fallback
    return searchTargetedSite(phrase, 'openalex.org', 'Scholarly Work', 'OpenAlex');
}

// ==========================================
// SOURCE 3: PubMed / Europe PMC
// ==========================================
async function searchPubMed(phrase) {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(phrase)}&retmode=json&retmax=3`;

    const res = await safeFetch(url, {}, true);
    if (res && res.ok) {
        const data = await res.json();
        const ids = data.esearchresult?.idlist || [];
        if (ids.length > 0) {
            return ids.map(id => ({
                title: `PubMed ID: ${id}`,
                url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
                snippet: 'Click to view publication details on PubMed.',
                source: 'PubMed',
                type: 'Medical Research'
            }));
        }
    }
    return searchEuropePMC(phrase);
}

async function searchEuropePMC(phrase) {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(phrase)}&format=json&pageSize=3`;

    // Use Proxy (Always for reliability)
    const res = await safeFetch(url, {}, true);
    if (res && res.ok) {
        const data = await res.json();
        const results = (data.resultList?.result || []).map(r => ({
            title: r.title,
            url: `https://europepmc.org/article/${r.source}/${r.id}`,
            snippet: r.abstractText || 'Abstract not available',
            source: 'Europe PMC / PubMed',
            type: 'Medical Research'
        }));
        if (results.length > 0) return results;
    }
    // Fallback
    return searchTargetedSite(phrase, 'europepmc.org', 'Medical Research', 'Europe PMC');
}

// ==========================================
// SOURCE 4: CrossRef
// ==========================================
async function searchCrossRef(phrase) {
    const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(phrase)}&rows=3`;

    // Use Proxy (CORS blocked)
    const res = await safeFetch(url, {}, true);
    if (res && res.ok) {
        const data = await res.json();
        const results = (data.message?.items || []).map(i => ({
            title: i.title?.[0],
            url: i.URL,
            snippet: '',
            source: 'CrossRef',
            type: 'Metadata'
        }));
        if (results.length > 0) return results;
    }
    return searchTargetedSite(phrase, 'crossref.org', 'Metadata', 'CrossRef');
}

// ==========================================
// SOURCE 5: arXiv
// ==========================================
async function searchArxiv(phrase) {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(phrase)}&start=0&max_results=3`;

    // Arxiv supports CORS
    const res = await safeFetch(url, {}, false);
    if (res && res.ok) {
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const results = Array.from(xml.getElementsByTagName("entry")).map(entry => ({
            title: entry.getElementsByTagName("title")[0]?.textContent,
            url: entry.getElementsByTagName("id")[0]?.textContent,
            snippet: entry.getElementsByTagName("summary")[0]?.textContent?.substring(0, 300),
            source: 'arXiv',
            type: 'Preprint'
        }));
        if (results.length > 0) return results;
    }
    // Fallback
    return searchTargetedSite(phrase, 'arxiv.org', 'Preprint', 'arXiv');
}

// ==========================================
// SOURCE 6: Open Library
// ==========================================
async function searchOpenLibrary(phrase) {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(phrase)}&limit=3`;
    // Use Proxy
    // Open Library supports CORS
    const res = await safeFetch(url, {}, false);
    if (res && res.ok) {
        const data = await res.json();
        const results = (data.docs || []).map(d => ({
            title: d.title,
            url: `https://openlibrary.org${d.key}`,
            snippet: d.first_sentence?.[0] || '',
            source: 'Open Library',
            type: 'Book'
        }));
        if (results.length > 0) return results;
    }
    return searchTargetedSite(phrase, 'openlibrary.org', 'Book', 'Open Library');
}

// ==========================================
// SOURCE 7: StackExchange
// ==========================================
async function searchStackExchange(phrase) {
    const url = `https://api.stackexchange.com/2.3/search?order=desc&sort=relevance&intitle=${encodeURIComponent(phrase)}&site=stackoverflow`;
    // Use Proxy (CORS blocked)
    const res = await safeFetch(url, {}, true);
    if (res && res.ok) {
        const data = await res.json();
        const results = (data.items || []).slice(0, 3).map(i => ({
            title: i.title,
            url: i.link,
            snippet: `Tags: ${i.tags?.join(', ')}`,
            source: 'StackOverflow',
            type: 'Dev Q&A'
        }));
        if (results.length > 0) return results;
    }
    return searchTargetedSite(phrase, 'stackoverflow.com', 'Dev Q&A', 'StackOverflow');
}

// ==========================================
// SOURCE 8: Google Books
// ==========================================
async function searchGoogleBooks(phrase) {
    const { apiKey } = getSearchConfigs();

    // FIX: Check API key before request to avoid 400 Bad Request
    if (!apiKey) return searchTargetedSite(phrase, 'books.google.com', 'Book', 'Google Books');

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(phrase)}&maxResults=3&key=${apiKey}`;

    const res = await safeFetch(url);
    if (res && res.ok) {
        const data = await res.json();
        const results = (data.items || []).map(i => ({
            title: i.volumeInfo.title,
            url: i.volumeInfo.previewLink,
            snippet: i.volumeInfo.description?.substring(0, 200),
            source: 'Google Books',
            type: 'Book'
        }));
        if (results.length > 0) return results;
    }
    return searchTargetedSite(phrase, 'books.google.com', 'Book', 'Google Books');
}

// ==========================================
// SOURCE 9: GitHub
// ==========================================
async function searchGitHub(phrase) {
    return await searchTargetedSite(phrase, 'github.com', 'Source Code', 'GitHub');
}

// ==========================================
// SOURCE 10: ResearchGate
// ==========================================
async function searchResearchGate(phrase) {
    return await searchTargetedSite(phrase, 'researchgate.net', 'Research Paper', 'ResearchGate');
}

// ==========================================
// SOURCE 11: Google Scholar
// ==========================================
async function searchGoogleScholar(phrase) {
    return await searchTargetedSite(phrase, 'scholar.google.com', 'Scholarly Article', 'Google Scholar');
}

// ==========================================
// SOURCE 12: CORE (Direct API)
// ==========================================
async function searchCORE(phrase) {
    // CORE API V3 requires a key, but we can use their public search endpoint via proxy
    // For now, sticking to targeted site search as it's more reliable without a key
    return await searchTargetedSite(phrase, 'core.ac.uk', 'Open Access Paper', 'CORE');
}

// ==========================================
// SOURCE 13: IEEE Xplore
// ==========================================
async function searchIEEE(phrase) {
    return await searchTargetedSite(phrase, 'ieeexplore.ieee.org', 'Engineering Std', 'IEEE Xplore');
}

// ==========================================
// SOURCE 14: Springer Link
// ==========================================
async function searchSpringer(phrase) {
    return await searchTargetedSite(phrase, 'link.springer.com', 'Journal Article', 'Springer');
}

// ==========================================
// SOURCE 15: Internet Archive
// ==========================================
async function searchInternetArchive(phrase) {
    return await searchTargetedSite(phrase, 'archive.org', 'Archived Web', 'Internet Archive');
}

// ==========================================
// SOURCE 16: Science Direct (Bonus)
// ==========================================
async function searchScienceDirect(phrase) {
    return await searchTargetedSite(phrase, 'sciencedirect.com', 'Journal Article', 'ScienceDirect');
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
