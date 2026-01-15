# 📘 PlagiarismGuard User Guide

Welcome to **PlagiarismGuard**, an advanced, open-source tool designed for academic integrity analysis. This guide explains how the system works, the technologies involved, and the privacy measures in place.

---

## 🚀 Key Features

### 1. Multi-Modal Analysis
We go beyond simple text matching. PlagiarismGuard analyzes three types of content:

*   **📄 Text Analysis:** Scans the web and academic databases for identical or paraphrased text.
*   **💻 Code Analysis:** Uses the **Winnowing Algorithm (fingerprinting)** to detect copied code logic, even if variables are renamed.
*   **🖼️ Image Analysis:** Uses **Perceptual Hashing (pHash)** to find visual similarities in figures, diagrams, and charts.

### 2. "The Omni-Scanner" Engine
Our search engine is not limited to Google. We explicitly query **16+ Academic Databases** to ensure deep coverage:

| Category | Sources |
| :--- | :--- |
| **Core Academic** | Semantic Scholar, OpenAlex, CrossRef, CORE (Open Access) |
| **Biomedical** | Europe PMC (PubMed Central), ScienceDirect |
| **Preprints** | arXiv.org (Physics/CS/Math) |
| **Books** | Google Books, Open Library |
| **Technical** | StackExchange (StackOverflow), GitHub |
| **Deep Web** | IEEE Xplore, Springs, ResearchGate, Internet Archive |

### 3. Serverless Proxy Architecture
To respect user privacy and ensure reliability:
*   **No "Refusing Connection" Errors:** We use a custom **Serverless Proxy** to route requests securely.
*   **Bypassed Restrictions:** This allows us to query strict academic APIs (like arXiv or Semantic Scholar) without being blocked by your browser's security settings.

---

## 🔍 How It Works

### Step 1: Input
You can upload files (`.docx`, `.pdf`, `.txt`) or paste text directly. For images, we support Drag & Drop.

### Step 2: Analysis
*   **Text:** We break your text into "Search Phrases" using a smart Natural Language Processing (NLP) algorithm. These phrases are sent to our 16+ sources simultaneously.
*   **Smart Fallback:** If a direct database Query fails, we automatically use **Google Custom Search** as a backup to ensure you always get results.

### Step 3: Comparison
*   **Side-by-Side View:** Click on any result to see a split-screen view.
*   **Synchronized Scrolling:** Scroll your document, and the external source scrolls to match it automatically.

---

## 🛡️ Privacy & Security

*   **Local Processing:** Your documents are analyzed in your browser's memory. We do not store your essays or manuscripts on our servers.
*   **Ephemeral Proxies:** When we check external databases, we only send specific *search phrases*, not your entire document.
*   **Open Source:** Our code is transparent and available for audit.

---

## 👨‍💻 Developer Info

**Dr. Siddalingaiah H S**
*   Professor, Community Medicine
*   Shridevi Institute of Medical Sciences and Research Hospital
*   Tumkur, Karnataka, India
*   Email: hssling@yahoo.com

---

*Verified & Powered by PlagiarismGuard Engine v2.0*
