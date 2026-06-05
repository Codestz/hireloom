import type { AiConfig } from './types'

/**
 * Engine configuration — the user's chosen provider + per-provider settings, persisted in
 * localStorage. Keys live only in the browser (we have no backend). A change broadcasts
 * AI_CONFIG_EVENT so the UI can re-check availability without a reload.
 */

const STORAGE_KEY = 'hireloom.ai.config'
const DEFAULT_CONFIG: AiConfig = {
  engine: 'device',
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
}

export const AI_CONFIG_EVENT = 'hireloom:ai-config'

export function getAiConfig(): AiConfig {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_CONFIG }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw
      ? { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AiConfig>) }
      : { ...DEFAULT_CONFIG }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function setAiConfig(patch: Partial<AiConfig>): void {
  const next = { ...getAiConfig(), ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode — config just won't persist */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AI_CONFIG_EVENT))
  }
}
