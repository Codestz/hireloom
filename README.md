<div align="center">

# HireLoom

### A résumé you actually own.

A private, local-first CV builder with on-device AI. Your career data never leaves your machine — no account, no upload, no server.

[**Try it →**](https://hireloom.codestz.dev) &nbsp;·&nbsp; [Architecture](./ARCHITECTURE.md) &nbsp;·&nbsp; [Contributing](./CONTRIBUTING.md) &nbsp;·&nbsp; AGPL-3.0

</div>

---

## The story

I'm a software engineer. For years I've applied for jobs with one carefully-built résumé — clean, ATS-parseable, never once bounced by an applicant-tracking robot. But every tool I used to maintain it wanted the same thing in return: an account, an upload, my work history sitting on someone else's server, behind a paywall when I wanted a PDF.

That's backwards. Your résumé is the most personal professional document you have. It should be a file **you** own — editable anywhere, private by default, yours forever.

So I built HireLoom: the résumé tool I actually wanted. The kind that runs entirely in your browser, uses AI that lives **on your device**, and exports the same parse-clean PDF that's quietly passed every ATS I've thrown it at.

## What makes it different

**🔒 Private by architecture.** Everything — your data, the AI, the PDF rendering — runs client-side. Résumés live in your browser's IndexedDB. There is no backend to leak, sell, or shut down. Back your data up to a JSON file and take it anywhere.

**🤖 AI that never phones home.** HireLoom uses **Chrome's built-in AI** (Gemini Nano) to improve bullets, draft summaries, mine skills from your experience, tailor your CV to a job, and even *chat with your résumé* — all on your machine. No key, no cloud, no telemetry. Don't have on-device AI? Bring your own Gemini key (stored only in your browser) and it works in any browser. The engine is pluggable — Anthropic and others are a single adapter away.

**🎯 ATS-smart, for real.** A deterministic, on-device keyword match scores your CV against any job post and shows exactly what's missing — then one click tailors your summary and projects the score lift. The PDF export is a true text layout (not a screenshot): selectable, parse-safe, the same recipe behind a résumé that's gone years with zero ATS rejections.

**✍️ A genuinely nice editor.** A block-based canvas with inline editing, drag-to-reorder, live page-break guides that match the exported PDF, and real templates — single column, two-column (you choose the split), header band.

## Features at a glance

| | |
|---|---|
| **Editor** | Block canvas, inline editing, reorder, live preview, page-break guides |
| **Templates** | Single / two-column / header-band layouts · fonts · density · accent color |
| **AI (on-device or your key)** | Inline ✨ improve/shorten/expand/grammar · summary · skills · cover letter · CV chat · tailor-to-JD |
| **ATS** | Deterministic keyword match + gap analysis + score-lift tailoring |
| **Import** | Any résumé PDF (AI-structured) · LinkedIn "Save to PDF" · JSON Resume |
| **Export** | ATS-safe PDF (embedded fonts) · JSON Resume |
| **Data** | 100% local (IndexedDB) · one-click backup/restore · installable offline PWA |

## Run it locally

Requires **Node 20+** and **pnpm**.

```bash
pnpm install
pnpm dev          # → http://localhost:3000
```

```bash
pnpm build        # production build
pnpm test         # vitest
pnpm lint         # eslint
pnpm format       # prettier + eslint --fix
```

### On-device AI (optional)

The AI features use **Chrome's built-in Prompt API** (Gemini Nano). To enable it locally in **Chrome 128+**:

1. `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled**
2. `chrome://flags/#optimization-guide-on-device-model` → **Enabled BypassPerfRequirement**
3. Relaunch Chrome.
4. `chrome://components` → **Optimization Guide On Device Model** → *Check for update* (downloads ~2–4 GB once).

No on-device AI (other browsers, or don't want the download)? Add your own **Gemini key** in the app at *AI Studio → Engine* — stored only in your browser. Everything non-AI (editing, ATS match, PDF/JSON export, JSON/LinkedIn import) works with **no AI at all**.

## Built with

[TanStack Start](https://tanstack.com/start) (React 19 · Vite) · TanStack Router & Query · Dexie/IndexedDB · Tailwind CSS v4 · Zod · pdfmake · pdf.js · Vitest.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design: a declarative block model over the [JSON Resume](https://jsonresume.org/) schema and a pluggable AI engine.

## Privacy promise

Private **by default**. Your résumé never leaves your device — period — unless *you* opt into the cloud AI engine with your own key, in which case your prompts go from your browser straight to your provider (never through us; there is no "us" server). No accounts, no analytics, no tracking.

## License

[AGPL-3.0-only](./LICENSE) — free and open. Run a modified version as a service, and you must share its source.

<div align="center"><sub>Built with care by <a href="https://codestz.dev">Esteban Estrada</a> — because your résumé should be yours.</sub></div>
