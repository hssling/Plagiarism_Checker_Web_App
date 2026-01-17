# Restore Point v2.1 (After Header Fix)
**Timestamp:** 2026-01-17T21:20:00+05:30
**Commit:** e6395bf

## State Summary
- Vercel build blocker (null char in Header.jsx) fixed.
- Version v2.1 live on Vercel.
- Current Issues:
  - 429 Too Many Requests (Google Search API).
  - 404 Model Not Found (Gemini API).
  - CORS blocks (arXiv API).
  - PDF table overflow.

## File List (Key Files)
- `src/lib/llmService.js` (Current model: `gemini-pro`)
- `src/lib/webSearch.js` (16+ search strategies, many hitting Google)
- `api/proxy.js` (Vercel proxy)
- `src/lib/pdfGenerator.js` (PDF layout)
