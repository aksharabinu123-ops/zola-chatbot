# Zola Chatbot — High-Performance Neural Reasoning Platform

> Powered by **NVIDIA Nemotron 3 Ultra 550B**, Material 3 Expressive UI, and Client-Side Zero-Database Persistence.  
> **Lead Architect & Creator:** Akshara (`aksharabinu123-ops`)

[![Next.js 16](https://img.shields.io/badge/Next.js-16.0.9-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.2-blue?logo=react)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-Nemotron_3_Ultra_550B-76b900?logo=nvidia)](https://build.nvidia.com/)
[![Deployment](https://img.shields.io/badge/Deploy-GitHub_Pages-22c55e?logo=github)](https://aksharabinu123-ops.github.io/zola-chatbot/)

---

## 🌟 Overview

**Zola Chatbot** is a production-grade conversational artificial intelligence platform engineered by **Akshara**. Built on top of NVIDIA's state-of-the-art **Nemotron 3 Ultra 550B** (`nvidia/nemotron-3-ultra-550b-a55b`), Zola exposes the full internal chain-of-thought (CoT) reasoning sequence in real time through an interactive, collapsible thinking accordion.

### Key Highlights
- **Flagship 550B Foundation Model**: Direct inference via NVIDIA DGX Cloud NIM microservices.
- **Native Chain-of-Thought (CoT)**: Real-time Server-Sent Events (SSE) demultiplexing `delta.reasoning_content` with live elapsed chronometer.
- **Material 3 Expressive Design**: Default high-contrast Light Theme with instant obsidian Dark Mode switcher.
- **Zero-Database Client Persistence**: Multi-session conversation management stored securely in browser `localStorage`.
- **Live Context Telemetry**: Dynamic token utilization gauge calibrated to Nemotron's 16,384 token window with interactive modal audit.
- **Academic Productivity Suite**: One-click Markdown transcript export (`export.md`), language-tagged code block headers with copy triggers, and browser-native voice dictation.

---

## 🚀 Live Demo

- **Production Static Site**: [https://aksharabinu123-ops.github.io/zola-chatbot/](https://aksharabinu123-ops.github.io/zola-chatbot/)
- **Project Report**: Comprehensive 33-page academic and internship report available in `Zola_Chatbot_Project_Report.html`.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router & Turbopack) |
| **UI Library** | React 19, Radix UI Primitives, Lucide Icons |
| **Styling** | Tailwind CSS v4, Google Material 3 Expressive Tokens |
| **Animation** | Motion (Framer Motion v12) |
| **Inference Engine** | NVIDIA NIM Cloud APIs (`nvidia/nemotron-3-ultra-550b-a55b`) |
| **Persistence** | HTML5 Web Storage (`localStorage`) |
| **CI/CD & Hosting** | GitHub Actions & GitHub Pages |

---

## 💻 Local Development

### 1. Clone the Repository
```bash
git clone https://github.com/aksharabinu123-ops/zola-chatbot.git
cd zola-chatbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env.local` file in the project root:
```env
NVIDIA_API_KEY=nvapi-your-key-here
```
*(Alternatively, enter your API key directly inside the in-app Preferences modal; keys are strictly stored on the client side).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view Zola Chatbot.

---

## 📦 Building for Production

```bash
npm run build
```
For static export deployment:
```bash
GITHUB_PAGES=true npm run build
```
This generates the standalone `./out` directory configured for GitHub Pages edge delivery.

---

## 📄 License & Attribution

Designed and engineered by **Akshara** as part of the Full Stack Web Development Internship (2026–2027) with **Zephyr Technologies & Solutions Pvt. Ltd.** and **Vidyalakshmi Group of Institution**.
