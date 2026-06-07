import { useState } from 'react'
import { toast } from 'sonner'

/**
 * A one-shot AI action with output + busy state and uniform error handling — collapses the repeated
 * `setBusy(true); try { … } catch { toast } finally { setBusy(false) }` triples. `run` accepts a
 * function that either returns the result string or streams it via the passed setter (or both).
 */
export function useAiAction() {
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn: (set: (s: string) => void) => Promise<string | void>) {
    setBusy(true)
    setOutput('')
    try {
      const result = await fn(setOutput)
      if (typeof result === 'string') setOutput(result)
    } catch {
      toast.error('The AI request failed — check AI settings.')
    } finally {
      setBusy(false)
    }
  }

  return { output, busy, run, reset: () => setOutput('') }
}
