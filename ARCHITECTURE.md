# Architecture

HireLoom is a **fully client-side** app: a [TanStack Start](https://tanstack.com/start) (React 19 + Vite) frontend with no backend. Everything — storage, AI, PDF rendering — runs in the browser.

## Data flow

```
JSON Resume (Zod schema)  ⟷  BlockDoc (editor model)  ⟶  PDF / canvas
        ↕                          ↕
   IndexedDB (Dexie)         AI engine (providers)
```

- **`src/lib/resume`** — the canonical model: the [JSON Resume](https://jsonresume.org/) schema as Zod (`schema.ts`), the single source of truth. Lenient by design so a partial import never blocks editing. Parsing/validation at the import/export boundary (`validate.ts`).
- **`src/lib/blocks`** — the editor's content model. A **declarative block registry**: each section type is a `defineBlock(...)` (fields, variants, AI prompt, ATS projection) in `defs/`. The editor renders any registered block generically — adding a section type touches no UI.
- **`src/lib/blocks/json-resume.ts`** — the bridge: `resumeToDoc` / `docToResume`. HireLoom-specific editor state (section order, variants, columns, page breaks, custom headings) is round-tripped through `meta.hireloom`, so exports stay valid JSON Resume.
- **`src/lib/db`** — Dexie/IndexedDB. CRUD in `resumes.ts`, TanStack Query hooks in `queries.ts`. Includes backup/restore (export/import all resumes as JSON).
- **`src/lib/templates`** — layouts (`single` / `sidebar` / `band`), design tokens, and presets.

## The AI engine

`src/lib/ai` is a small, swappable engine:

- **`types.ts`** — the `AiProvider` interface (`ready` / `prompt` / `promptStream`).
- **`providers/`** — `device.ts` (Chrome built-in Prompt API, default, fully private) and `gemini.ts` (opt-in, bring-your-own-key, streams via SSE). Adding **Anthropic** = one more file here.
- **`engine.ts`** — a provider registry + the `enginePrompt` / `enginePromptStream` / `engineReady` seam every feature calls. Selects the provider from `config.ts` (persisted in localStorage). Callers never know which engine ran.
- **`service.ts`** — resume-specific prompts (improve, summarize, cover letter, chat actions, tailor-to-JD, PDF→JSON structuring), all engine-agnostic.
- **`use-ai-ready.ts`** — a reactive hook so AI affordances appear/disappear when the engine changes.

Everything AI flows through this seam — there is no second AI path.

## Rendering

- **Canvas** (`src/components/blocks`) — the live, inline-editable document. Page-break guides are measured from real DOM block heights so the preview matches the PDF.
- **PDF** (`src/components/blocks/pdf-export.ts`) — a custom [pdfmake](http://pdfmake.org/) renderer with vendored, subset, embedded fonts. Selectable, ATS-safe text — not a screenshot.
- **Import** (`src/lib/import`) — pdf.js text extraction; LinkedIn's two-column layout has a dedicated parser, and any other PDF is structured by the AI engine.

## Conventions

- The Zod resume schema is the source of truth; TS types are `z.infer`'d from it — never hand-written in parallel.
- Client-only modules (Dexie, pdf.js, the AI APIs) are imported dynamically so they stay out of the SSR/route bundle.
- No network call carries user content — your resume never leaves the device. The only egress is opt-in cloud AI (your key) and anonymous, cookie-less page-view analytics (Vercel; no PII). Private by default.
