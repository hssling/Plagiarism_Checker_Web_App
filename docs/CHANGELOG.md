# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.0] - 2026-01-18

### Added
- ✨ **Remediation Pro**: AI-powered paraphrasing for flagged content with side-by-side comparison
- 👩‍🏫 **Teacher/Admin Dashboard**: Aggregate analytics and risk distribution charts
- 📥 **CSV Export**: Full scan history export for auditing
- 🔌 **Browser Extension**: In-page plagiarism checking and remediation
- 📄 **Multi-Platform Deployment Guide**: Instructions for Vercel, Netlify, Cloudflare, Railway, AWS, Docker

### Fixed
- 🐛 PDF character encoding issues (replaced Unicode symbols with ASCII)
- 🐛 Text overflow in recommendation box
- 🐛 ESM import extensions for Vercel compatibility
- 🐛 Missing `translateTextBackend` import in analyze.js
- 🐛 Test suite failures with `--passWithNoTests`

### Changed
- 📝 Updated README with comprehensive deployment options
- 📝 Updated USER_GUIDE with v3.2.0 features
- 🔄 Version synchronization from package.json to header/footer

---

## [3.0.0] - 2026-01-17

### Added
- 🧠 **Multi-AI Hub**: Support for Gemini, OpenAI, Claude, xAI, Groq, Cerebras, Mistral
- 🔄 **Automatic Fallback**: Intelligent routing when AI providers fail
- 🛡️ **Stability Hotfix**: Resolved Gemini 404 model errors

---

## [2.4.0] - 2026-01-17

### Added
- 📄 Coordinated PDF extraction with spatial awareness
- ⚡ Gemini 1.5 Flash integration
- 🎨 Professional PDF certificates with zero overflow

---

## [2.1.0] - 2026-01-17

### Added
- ✅ Citation Detection (Vancouver/APA validation)
- ✅ Batch Processing (up to 10 documents)
- ✅ Authorship Fingerprinting (stylometric analysis)
- ✅ Academic Fallback Mode (keyless operation)

### Fixed
- 🐛 Gemini API initialization bug
- 🐛 Vercel build configuration

---

## [1.0.0] - 2026-01-15

### Added
- 🎉 Initial release
- File upload support (PDF, DOCX, TXT)
- TF-IDF cosine similarity analysis
- Web search integration
- PDF/HTML/JSON export options
- Dark theme UI with glassmorphism

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 3.2.0 | 2026-01-18 | Remediation Pro, Admin Dashboard |
| 3.0.0 | 2026-01-17 | Multi-AI Hub |
| 2.4.0 | 2026-01-17 | PDF improvements, Gemini 1.5 |
| 2.1.0 | 2026-01-17 | Citation detection, Batch processing |
| 1.0.0 | 2026-01-15 | Initial public release |

---

## Contributors

- **Dr. Siddalingaiah H S** - Creator & Maintainer
