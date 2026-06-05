import { getAiConfig } from './config'
import { deviceProvider } from './providers/device'
import { geminiProvider } from './providers/gemini'
import type { AiConfig, AiProvider, EngineKind, PromptOpts } from './types'

/**
 * AI engine — the single seam the whole resume suite calls. It selects a provider from
 * config and delegates. To add a backend (e.g. Anthropic): implement AiProvider, add it
 * to PROVIDERS, and extend AiConfig — no caller changes. Local-first stays the default;
 * the promise is "nothing leaves your device unless you turn on a cloud provider."
 */

const PROVIDERS: Record<EngineKind, AiProvider> = {
  device: deviceProvider,
  gemini: geminiProvider,
}

export function getProvider(cfg: AiConfig = getAiConfig()): AiProvider {
  // cfg.engine comes from localStorage, so guard against a stale/unknown value.
  const registry: Partial<Record<EngineKind, AiProvider>> = PROVIDERS
  return registry[cfg.engine] ?? deviceProvider
}

export function engineLabel(cfg: AiConfig = getAiConfig()): string {
  return getProvider(cfg).label
}

/** Whether the currently selected engine can run a request. */
export function engineReady(cfg: AiConfig = getAiConfig()): Promise<boolean> {
  return getProvider(cfg).ready(cfg)
}

export function enginePrompt(
  prompt: string,
  opts?: PromptOpts,
): Promise<string> {
  const cfg = getAiConfig()
  return getProvider(cfg).prompt(prompt, cfg, opts)
}

export function enginePromptStream(
  prompt: string,
  onChunk: (partial: string) => void,
  opts?: PromptOpts,
): Promise<string> {
  const cfg = getAiConfig()
  return getProvider(cfg).promptStream(prompt, onChunk, cfg, opts)
}

export { getAiConfig, setAiConfig, AI_CONFIG_EVENT } from './config'
export type { AiConfig, EngineKind, PromptOpts, AiProvider } from './types'
