# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-01-17

### Added
- ✅ **Citation Detection**: Automatic validation for Vancouver and APA styles.
- ✅ **Batch Processing**: Simultaneous analysis of up to 10 documents.
- ✅ **Authorship Fingerprinting**: Stylometric analysis to detect mixed writing styles.
- ✅ **Academic Fallback Mode**: Intelligent search fallback for keyless operation.
- ✅ **Vercel Proxy Fixes**: Enhanced stability for academic API requests.

### Fixed
- 🐛 Gemini API initialization bug (object vs string).
- 🐛 Vercel build configuration (removed legacy runtime).
- 🐛 Analysis progress bar visibility.

---

## [1.0.0] - 2026-01-15

### Added
- 🎉 Initial release
- File upload support (PDF, DOCX, TXT)
- Text paste input option
- TF-IDF cosine similarity analysis
- N-gram (3-5 word) phrase matching
- Web search integration
- Academic reference corpus comparison
- Detailed similarity reports
- PDF/HTML/JSON export options
- Modern dark theme UI with glassmorphism
- Responsive mobile design
- Real-time analysis progress tracking
- GitHub Actions CI/CD workflows
- Vercel deployment configuration
- Supabase integration for analytics
- Comprehensive documentation

### Technical
- React 18 with Vite 5
- Custom CSS design system
- Python analysis scripts
- Multi-API architecture (Copyleaks, ZeroGPT, Google)
- MIT License

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 1.0.0 | 2026-01-15 | Initial public release |

---

## Contributors

- **Dr. Siddalingaiah H S** - Creator & Maintainer

---

[Keep a Changelog]: https://keepachangelog.com/en/1.0.0/
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html
