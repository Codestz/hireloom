/**
 * AI engine types. A provider is the only thing you implement to wire a new backend
 * (on-device, Gemini, Anthropic, …) — register it in engine.ts and the whole resume AI
 * suite works through it unchanged. Open/closed: adding a provider touches no callers.
 */

export type EngineKind = 'device' | 'gemini'

/** Persisted engine selection + per-provider settings (stored in localStorage). */
export interface AiConfig {
  engine: EngineKind
  geminiKey: string
  geminiModel: string
}

/** Sampling controls for creative calls (improve, summary, …). */
export interface PromptOpts {
  temperature: number
  topK: number
}

/** A pluggable AI backend. Implement this once per provider. */
export interface AiProvider {
  readonly id: EngineKind
  readonly label: string
  /** Can this provider run a request with the given config? */
  ready: (cfg: AiConfig) => Promise<boolean>
  /** One-shot completion. */
  prompt: (prompt: string, cfg: AiConfig, opts?: PromptOpts) => Promise<string>
  /** Streaming completion; `onChunk` receives the growing text. Returns the final text. */
  promptStream: (
    prompt: string,
    onChunk: (partial: string) => void,
    cfg: AiConfig,
    opts?: PromptOpts,
  ) => Promise<string>
}
