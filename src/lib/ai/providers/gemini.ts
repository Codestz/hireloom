import type { AiConfig, AiProvider, PromptOpts } from '../types'

/**
 * Gemini provider — Google's Gemini API with the user's own key (opt-in cloud). The key
 * lives only in localStorage and goes browser→Google directly; we have no backend, so we
 * never see it. Streams via SSE (streamGenerateContent), falling back to a single call.
 */

function url(cfg: AiConfig, stream: boolean): string {
  const method = stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'
  return `https://generativelanguage.googleapis.com/v1beta/models/${cfg.geminiModel}:${method}key=${cfg.geminiKey}`
}

function body(prompt: string, opts?: PromptOpts): string {
  return JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: opts
      ? { temperature: opts.temperature, topK: opts.topK }
      : {},
  })
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}
function textOf(json: GeminiResponse): string {
  return (
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ??
    ''
  )
}

async function once(
  prompt: string,
  cfg: AiConfig,
  opts?: PromptOpts,
): Promise<string> {
  const res = await fetch(url(cfg, false), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body(prompt, opts),
  })
  if (!res.ok) {
    throw new Error(
      res.status === 400 || res.status === 403
        ? 'Gemini rejected the request — check your API key.'
        : `Gemini API error (${res.status}).`,
    )
  }
  return textOf((await res.json()) as GeminiResponse).trim()
}

export const geminiProvider: AiProvider = {
  id: 'gemini',
  label: 'Gemini (cloud)',

  async ready(cfg) {
    return cfg.geminiKey.trim().length > 0
  },

  prompt(prompt, cfg, opts) {
    if (!cfg.geminiKey)
      throw new Error('Add your Gemini API key in AI settings.')
    return once(prompt, cfg, opts)
  },

  async promptStream(prompt, onChunk, cfg, opts) {
    if (!cfg.geminiKey)
      throw new Error('Add your Gemini API key in AI settings.')
    const res = await fetch(url(cfg, true), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body(prompt, opts),
    })
    if (!res.ok || !res.body) {
      const out = await once(prompt, cfg, opts)
      onChunk(out)
      return out
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let acc = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
          const t = textOf(JSON.parse(data) as GeminiResponse)
          if (t) {
            acc += t
            onChunk(acc)
          }
        } catch {
          /* skip a partial SSE frame */
        }
      }
    }
    return acc.trim()
  },
}
