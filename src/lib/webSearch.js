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
 * Search Open Library API
 * Accesses millions of books and texts
 */
async function searchOpenLibrary(phrase) {
    try {
        const encodedQuery = encodeURIComponent(phrase);
        const url = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=3`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = await response.json();

        return (data.docs || []).map(doc => ({
            title: doc.title,
            url: `https://openlibrary.org${doc.key}`,
            snippet: doc.first_sentence ? doc.first_sentence.join(' ').substring(0, 300) : (doc.author_name ? `By ${doc.author_name.join(', ')}` : ''),
            source: 'Open Library',
            type: 'Book'
        }));
    } catch (err) {
        return null;
    }
}

/**
 * Perform a targeted Google Search (site:)
 * Helper to reuse the Google API for specific domains
 */
async function searchTargetedSite(phrase, site, type, sourceName) {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const cseId = import.meta.env.VITE_GOOGLE_CSE_ID;

    if (!apiKey || !cseId) return null;

    try {
        const query = `site:${site} "${phrase}"`;
        const encodedQuery = encodeURIComponent(query);
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
            source: sourceName,
            type: type
        }));
    } catch (err) {
        return null;
    }
}

// Targeted Search Wrappers
const searchGitHub = (phrase) => searchTargetedSite(phrase, 'github.com', 'Codebase', 'GitHub');
const searchResearchGate = (phrase) => searchTargetedSite(phrase, 'researchgate.net', 'Research Paper', 'ResearchGate');
const searchScholar = (phrase) => searchTargetedSite(phrase, 'scholar.google.com', 'Scholarly Article', 'Google Scholar');

/**
 * Search arXiv API (Preprints)
 * Returns Atom XML - requires parsing
 */
async function searchArxiv(phrase) {
    try {
        const encodedQuery = encodeURIComponent(`all:"${phrase}"`);
        const url = `https://export.arxiv.org/api/query?search_query=${encodedQuery}&start=0&max_results=3`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const entries = xmlDoc.getElementsByTagName("entry");

        return Array.from(entries).map(entry => {
            const title = entry.getElementsByTagName("title")[0]?.textContent?.trim().replace(/\n/g, ' ');
            const summary = entry.getElementsByTagName("summary")[0]?.textContent?.trim().replace(/\n/g, ' ');
            const id = entry.getElementsByTagName("id")[0]?.textContent;

            return {
                title: title,
                url: id,
                snippet: summary ? summary.substring(0, 300) : '',
                source: 'arXiv (Preprint)',
                type: 'Preprint'
            };
        });
    } catch (err) {
        return null;
    }
}

/**
 * Search StackExchange API (StackOverflow)
 * Great for code plagiarism checks
 */
async function searchStackExchange(phrase) {
    try {
        const encodedQuery = encodeURIComponent(phrase);
        const url = `https://api.stackexchange.com/2.3/search?order=desc&sort=relevance&intitle=${encodedQuery}&site=stackoverflow`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = await response.json();

        return (data.items || []).slice(0, 3).map(item => ({
            title: item.title,
            url: item.link,
            snippet: `Discussion by user ${item.owner?.display_name} (Score: ${item.score}). Tags: ${item.tags?.join(', ')}`,
            source: 'StackOverflow',
            type: 'Developer Q&A'
        }));
    } catch (err) {
        return null;
    }
}

/**
 * Search CORE API (Open Access Aggregator)
 * Note: strict rate limits without key, might fail silently
 */
async function searchCore(phrase) {
    try {
        // Fallback to simple site search if API key missing (common case)
        return await searchTargetedSite(phrase, 'core.ac.uk', 'Open Access Paper', 'CORE Aggregator');
    } catch (err) {
        return null;
    }
}

// Additional Targeted Searches
const searchIEEE = (phrase) => searchTargetedSite(phrase, 'ieeexplore.ieee.org', 'Engineering Std', 'IEEE Xplore');
const searchSpringer = (phrase) => searchTargetedSite(phrase, 'link.springer.com', 'Journal Article', 'Springer Link');
const searchArchive = (phrase) => searchTargetedSite(phrase, 'archive.org', 'Archived Web', 'Internet Archive');

/**
 * Search academic databases (16 Parallel Strategies)
 */
async function searchAcademic(phrase) {
    const results = [];

    // All Searches Executed in Parallel
    const searchPromises = [
        // 1. Core Academic APIs
        searchSemanticScholar(phrase),
        searchOpenAlex(phrase),
        searchCrossRef(phrase),

        // 2. Specialized APIs
        searchEuropePMC(phrase), // Medical
        searchArxiv(phrase),     // Preprints
        searchStackExchange(phrase), // Code

        // 3. Books
        searchGoogleBooks(phrase),
        searchOpenLibrary(phrase),

        // 4. Targeted Site Searches (Deep Web)
        searchResearchGate(phrase),
        searchScholar(phrase),
        searchGitHub(phrase),
        searchCore(phrase), // Using site:core.ac.uk fallback
        searchIEEE(phrase),
        searchSpringer(phrase),
        searchArchive(phrase)
    ];

    const searchResults = await Promise.allSettled(searchPromises);

    searchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            results.push(...result.value);
        }
    });

    return results.length > 0 ? results : null;
}

// ... existing searchGoogleBooks ...
async function searchGoogleBooks(phrase) {
    try {
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
        const encodedQuery = encodeURIComponent(`"${phrase}"`); // Exact phrase
        // Use key if available, otherwise anonymous (rate limited but works for demo)
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=3${apiKey ? `&key=${apiKey}` : ''}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = await response.json();

        return (data.items || []).map(item => {
            const info = item.volumeInfo || {};
            return {
                title: info.title,
                url: info.previewLink || info.infoLink,
                snippet: info.description ? info.description.substring(0, 300) : (info.authors ? `By ${info.authors.join(', ')}` : ''),
                source: 'Google Books',
                type: 'Book'
            };
        });
    } catch (err) {
        // console.warn('Google Books search failed:', err.message);
        return null;
    }
}

/**
 * Search Europe PMC (PubMed) - Excellent for medical/health research
 */
async function searchEuropePMC(phrase) {
    try {
        const encodedQuery = encodeURIComponent(`"${phrase}"`); // Exact phrase search
        const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodedQuery}&format=json&pageSize=3&resultType=core`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = await response.json();

        return (data.resultList?.result || []).map(item => ({
            title: item.title,
            url: `https://europepmc.org/article/${item.source}/${item.id}`,
            snippet: item.abstractText ? item.abstractText.replace(/<[^>]*>/g, '').substring(0, 300) : '',
            source: 'Europe PMC (PubMed)',
            type: 'Medical Research'
        }));
    } catch (err) {
        // console.warn('Europe PMC search failed:', err.message);
        return null;
    }
}

/**
 * Search OpenAlex - Huge index of global scholarship
 */
async function searchOpenAlex(phrase) {
    try {
        // OpenAlex encourages polite pool usage with email
        const email = 'plagiarismguard@example.com';
        const encodedQuery = encodeURIComponent(phrase);
        const url = `https://api.openalex.org/works?search=${encodedQuery}&per-page=3&mailto=${email}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = await response.json();

        return (data.results || []).map(item => {
            return {
                title: item.title || item.display_name,
                url: item.doi || (item.ids ? item.ids.openalex : null),
                snippet: item.type ? `${item.type} published in ${item.publication_year}` : '',
                source: 'OpenAlex',
                type: 'Scholarly Work'
            };
        });
    } catch (err) {
        // console.warn('OpenAlex search failed:', err.message);
        return null;
    }
}

/**
 * Search CrossRef API for academic papers
 */
async function searchCrossRef(phrase) {
    try {
        const encodedQuery = encodeURIComponent(phrase);
        // Request query using 'query.bibliographic' for better matching
        const url = `https://api.crossref.org/works?query.bibliographic=${encodedQuery}&rows=3&select=title,DOI,URL,abstract,score`;

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
            .map(item => {
                // CrossRef abstracts are often XML-escaped or missing
                // We prioritize title match
                return {
                    title: Array.isArray(item.title) ? item.title[0] : item.title,
                    url: item.URL || `https://doi.org/${item.DOI}`,
                    doi: item.DOI,
                    snippet: item.abstract ? item.abstract.substring(0, 300).replace(/<[^>]*>/g, '') : '', // Strip HTML tags
                    source: 'CrossRef',
                    type: 'Academic Paper'
                };
            });
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
        // Request specific fields for efficiency: title, url, abstract, tldr
        const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=4&fields=title,url,abstract,tldr,year,venue`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = await response.json();

        return (data.data || []).map(paper => {
            let snippet = paper.abstract || (paper.tldr ? paper.tldr.text : '');
            if (!snippet && paper.title) snippet = paper.title;

            return {
                title: paper.title,
                url: paper.url,
                snippet: snippet ? snippet.substring(0, 400) : '',
                source: 'Semantic Scholar',
                type: 'Academic Paper'
            };
        });
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
