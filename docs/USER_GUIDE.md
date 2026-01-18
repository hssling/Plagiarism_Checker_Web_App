# 📘 PlagiarismGuard v3.2.0 User Guide

Welcome to **PlagiarismGuard**, industry-standard software for advanced plagiarism detection. This guide covers all features and usage instructions.

---

## 🚀 Getting Started

### Option 1: Web App
Visit [plagiarism-checker-web-app.vercel.app](https://plagiarism-checker-web-app.vercel.app)

### Option 2: Install as PWA

| Platform | Steps |
|----------|-------|
| **Android** | Chrome → Menu (⋮) → "Add to Home Screen" |
| **iOS** | Safari → Share (⬆) → "Add to Home Screen" |
| **Windows** | Edge/Chrome → Install icon (⊕) in address bar |
| **Mac** | Chrome → Menu (⋮) → "Install PlagiarismGuard..." |

---

## 📄 Analyzing Documents

### Supported Formats
- **PDF** - Research papers, manuscripts
- **DOCX/DOC** - Word documents
- **TXT** - Plain text files
- **Direct paste** - Copy-paste text directly

### How to Scan
1. **Upload** a file or paste text
2. Click **"Analyze for Plagiarism"**
3. Wait for multi-source analysis (10-30 seconds)
4. Review results dashboard

---

## 🧠 AI Features (v3.0+)

### Setting Up AI Hub
1. Click **⚙️ Settings** (gear icon in header)
2. Add your API keys:
   - **Gemini** (recommended) - Free tier available
   - **OpenAI, Claude, xAI** - Alternative providers
   - **Groq, Cerebras, Mistral** - Free alternatives
3. Save settings

### AI Capabilities
- **Authorship Detection**: Analyzes if text was AI-generated
- **Intent Analysis**: Distinguishes accidental from malicious copying
- **Smart Summary**: Auto-generates executive summary

---

## 🔧 Remediation Pro (v3.2.0 - NEW!)

Fix plagiarism issues with AI-powered paraphrasing.

### Using Remediation
1. Run a scan and view results
2. Click **"Remediate"** button next to any flagged section
3. Choose style:
   - **Formal**: Academic journals (BMJ, Nature)
   - **Narrative**: Literature reviews, discussions
4. Review side-by-side comparison
5. Click **"Copy Fixed Text"** to use

> **Important:** Always verify that paraphrased text accurately represents your research conclusions.

---

## 👩‍🏫 Teacher/Admin Dashboard (v3.2.0)

For educators and institutional oversight:

### Accessing Analytics
1. Click **"Analytics"** tab in the main app
2. View aggregated metrics:
   - Risk distribution charts
   - Similarity trends over time
   - Common plagiarism types

### Exporting Audit Data
1. Click **"Export CSV"** button
2. Download includes:
   - All scan records
   - Timestamps
   - Similarity scores
   - Source matches

---

## 📄 PDF Certificate

### Generating Reports
1. After analysis, click **"Export PDF"**
2. Certificate includes:
   - **Page 1**: Executive dashboard, QR code
   - **Page 2**: Detailed findings table
   - **Page 3**: Source contribution breakdown

### Certificate Features
- Unique verification ID
- QR code with scan metadata
- Professional formatting for journal submission

---

## 🌐 Supported Sources (16+ Databases)

### Academic & Scientific
| Source | Specialty |
|--------|-----------|
| **Semantic Scholar** | AI-driven literature search |
| **OpenAlex** | 250M+ research works |
| **Europe PMC / PubMed** | Biomedical & Life Sciences |
| **CrossRef** | DOI registration data |
| **CORE** | Open Access papers |
| **arXiv** | Physics, Math, CS preprints |

### Technical & Reference
- IEEE Xplore, GitHub, StackExchange, Springer

### Books & Archives
- Google Books, Open Library, Internet Archive

---

## 🔬 Detection Algorithms

### Text Analysis
- **TF-IDF Cosine Similarity** - Term frequency comparison
- **N-gram Shingling (Rabin-Karp)** - Exact phrase detection
- **Semantic Search** - Meaning-based matching

### Code Analysis
- **Winnowing Algorithm** - Structure-aware code fingerprinting

### Image Analysis
- **Perceptual Hash (pHash)** - Visual fingerprinting

---

## 📊 Understanding Results

### Similarity Scores

| Score | Rating | Meaning |
|-------|--------|---------|
| 0-10% | 🟢 Excellent | Highly original |
| 10-20% | 🟢 Good | Acceptable, mostly citations |
| 20-30% | 🟡 Moderate | Review recommended |
| 30-50% | 🟠 Fair | Significant similarity |
| 50%+ | 🔴 High | Major revision required |

### Match Types
- **Identical**: Exact copy-paste
- **Similar**: Minor word changes
- **Cross-Language**: Translated content match

---

## 📱 Browser Extension

### Installation
1. Download from `extension/` folder
2. Open Chrome → `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" → Select extension folder

### Usage
1. Select text on any webpage
2. Right-click → "Check with PlagiarismGuard"
3. View results in floating panel
4. Click "Remediate" to fix flagged sections

---

## ⚙️ Settings Reference

| Setting | Description |
|---------|-------------|
| **AI Provider** | Primary AI for analysis |
| **Gemini Key** | Google AI API key |
| **OpenAI Key** | OpenAI API key |
| **Anthropic Key** | Claude API key |
| **Analysis Depth** | Quick/Standard/Deep scan |

---

## 🆘 Troubleshooting

### Common Issues

**"AI features not working"**
- Check API key in Settings
- Verify key has credits/quota remaining
- Try alternative provider

**"No matches found"**
- Text may be highly original
- Try different analysis depth
- Ensure text is in English/supported language

**"PDF export fails"**
- Clear browser cache
- Try different browser
- Check for browser extensions blocking

---

## 👨‍💻 Support

**Dr. Siddalingaiah H S**  
📧 [hssling@yahoo.com](mailto:hssling@yahoo.com)  
🐙 [@hssling](https://github.com/hssling)

---

*Powered by PlagiarismGuard Engine v3.2.0 - Enterprise & Remediation Edition*
