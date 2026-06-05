import type { AiProvider, PromptOpts } from '../types'

/**
 * On-device provider — Chrome's built-in Prompt API (Gemini Nano). Fully private, no
 * network, no key. Default engine. Sampling params are passed to create(); if a Chrome
 * build rejects them we retry without (older builds).
 */

interface LMSession {
  prompt: (input: string) => Promise<string>
  promptStreaming?: (input: string) => AsyncIterable<string>
  destroy?: () => void
}
interface LMApi {
  availability?: () => Promise<string>
  create?: (opts?: unknown) => Promise<LMSession>
}

function languageModel(): LMApi | undefined {
  return (globalThis as { LanguageModel?: LMApi }).LanguageModel
}

async function session(opts?: PromptOpts): Promise<LMSession> {
  const lm = languageModel()
  if (!lm?.create)
    throw new Error("On-device AI isn't available in this browser.")
  if (!opts) return lm.create()
  try {
    return await lm.create(opts)
  } catch {
    return lm.create()
  }
}

export const deviceProvider: AiProvider = {
  id: 'device',
  label: 'On-device',

  async ready() {
    const lm = languageModel()
    if (!lm?.availability) return false
    try {
      return (await lm.availability()) !== 'unavailable'
    } catch {
      return false
    }
  },

  async prompt(prompt, _cfg, opts) {
    const s = await session(opts)
    try {
      return (await s.prompt(prompt)).trim()
    } finally {
      s.destroy?.()
    }
  },

  async promptStream(prompt, onChunk, _cfg, opts) {
    const s = await session(opts)
    try {
      if (typeof s.promptStreaming === 'function') {
        let acc = ''
        for await (const chunk of s.promptStreaming(prompt)) {
          // Chrome's stream may emit deltas or cumulative text — handle both.
          acc = chunk.startsWith(acc) ? chunk : acc + chunk
          onChunk(acc)
        }
        return acc.trim()
      }
      const out = (await s.prompt(prompt)).trim()
      onChunk(out)
      return out
    } finally {
      s.destroy?.()
    }
  },
}
