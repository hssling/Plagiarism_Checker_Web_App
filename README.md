# 🔍 PlagiarismGuard Pro

<div align="center">

![PlagiarismGuard Pro](https://img.shields.io/badge/PlagiarismGuard-Pro-2563eb?style=for-the-badge&logo=shield&logoColor=white)
![Version](https://img.shields.io/badge/Version-3.2.0-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite)

**Academic-Grade Plagiarism Detection • Free & Open Source • No Login Required**

[🚀 Live Demo](https://plagiarism-checker-web-app.vercel.app) • [📖 User Guide](docs/USER_GUIDE.md) • [🤝 Contributing](#contributing)

</div>

---

## ✨ What's New in v3.2.0

### 🧠 Remediation Pro (NEW!)
Fix plagiarism issues without ever leaving the webpage:
- **AI-Powered Paraphrasing**: Side-by-side original vs improved text
- **Citation Preservation**: Scientific terms and references remain intact
- **One-Click Copy**: Instantly copy fixed text to clipboard

### 👩‍🏫 Teacher/Admin Dashboard
Institutional-level oversight for educators:
- **Risk Distribution Charts**: Visualize Safe vs Critical scans
- **Multi-Scan Analytics**: Track trends across all analyzed documents
- **CSV Audit Export**: Full scan history for reporting

### 🔌 Browser Extension
Analyze any webpage content directly:
- **Context Menu Integration**: Right-click to analyze selected text
- **Floating Results Panel**: Non-intrusive overlay with full results
- **Remediate In-Place**: Fix issues directly on the webpage

---

## 🌍 Universal "Omni-Scanner"

Works for **ALL** research fields:
- **⚖️ Law & Humanities** - Google Books, Open Library, JSTOR
- **🛠️ Engineering & CS** - IEEE Xplore, GitHub, arXiv
- **🎨 Arts & Literature** - Internet Archive, Project Gutenberg
- **🧬 Science & Medicine** - Europe PMC, PubMed, CrossRef

---

## 🧠 Cognitive AI Features

Powered by **Multi-AI Hub** (Gemini, OpenAI, Anthropic, and more):
- **🤖 AI Authorship Detection** - Detects AI-generated content
- **🧐 Intent Analysis** - Distinguishes accidental from malicious copying
- **📝 Smart Summary** - Auto-generates executive summary

---

## 🚀 Quick Start

### Use Online (Recommended)
Visit [plagiarism-checker-web-app.vercel.app](https://plagiarism-checker-web-app.vercel.app)

### Run Locally

```bash
git clone https://github.com/hssling/Plagiarism_Checker_Web_App.git
cd Plagiarism_Checker_Web_App
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy on Multiple Platforms

### Option 1: Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hssling/Plagiarism_Checker_Web_App)

**Manual CLI Deployment:**
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Environment Variables (Vercel Dashboard → Settings → Environment Variables):**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

---

### Option 2: Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/hssling/Plagiarism_Checker_Web_App)

**Manual Deployment:**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

**`netlify.toml` (create in project root):**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

> **Note:** Netlify does not support Vercel's `/api` serverless functions. For full API functionality, deploy API routes separately to Netlify Functions or use Vercel.

---

### Option 3: Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select your repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 20.x
5. Add environment variables in Settings

**Using Wrangler CLI:**
```bash
npm install -g wrangler
npm run build
wrangler pages deploy dist --project-name=plagiarism-guard
```

---

### Option 4: GitHub Pages (Static Only)

> **Note:** GitHub Pages only hosts static files. API endpoints (`/api/*`) will not work. Use for demo/portfolio purposes only.

1. Update `vite.config.js`:
```javascript
export default defineConfig({
  base: '/Plagiarism_Checker_Web_App/',
  // ... rest of config
});
```

2. Add deploy script to `package.json`:
```json
{
  "scripts": {
    "deploy:gh": "npm run build && npx gh-pages -d dist"
  }
}
```

3. Run:
```bash
npm run deploy:gh
```

---

### Option 5: Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

1. Connect your GitHub repository
2. Railway auto-detects Vite configuration
3. Set environment variables in dashboard
4. Deploy!

**Using Railway CLI:**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

### Option 6: AWS Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Connect your GitHub repository
4. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
5. Add environment variables and deploy

---

### Option 7: Docker (Self-Hosted)

**Create `Dockerfile`:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Create `nginx.conf`:**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Build and Run:**
```bash
docker build -t plagiarism-guard .
docker run -p 8080:80 plagiarism-guard
```

---

## 📁 Project Structure

```
Plagiarism_Checker_Web_App/
├── api/                        # Serverless API functions
│   ├── analyze.js              # Main analysis endpoint
│   ├── remediate.js            # AI paraphrasing endpoint
│   ├── proxy.js                # CORS proxy
│   └── _lib/                   # Shared utilities
├── src/
│   ├── components/             # React components
│   ├── lib/                    # Core analysis engines
│   └── styles/                 # CSS stylesheets
├── extension/                  # Browser extension
├── docs/                       # Documentation
├── public/                     # Static assets
├── vercel.json                 # Vercel config
└── package.json
```

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | No | Supabase project URL for analytics |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `VERCEL_TOKEN` | CI/CD | For automated deployments |

---

## 🗺️ Roadmap

### v3.2.0 (Current)
- ✅ Remediation Pro with AI paraphrasing
- ✅ Teacher/Admin Analytics Dashboard
- ✅ CSV Audit Export
- ✅ Browser Extension with in-page remediation

### v3.3.0 (Planned)
- 🔲 Cloud sync for scan history
- 🔲 Team collaboration features
- 🔲 Enhanced image OCR analysis

---

## 👨‍💻 Author

**Dr. Siddalingaiah H S**  
Professor, Community Medicine  
Shridevi Institute of Medical Sciences  
📧 [hssling@yahoo.com](mailto:hssling@yahoo.com) • 🐙 [@hssling](https://github.com/hssling)

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">

**Made with ❤️ for the academic community**

[⬆ Back to Top](#-plagiarismguard-pro)

</div>
