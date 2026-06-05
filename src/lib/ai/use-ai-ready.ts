import { useEffect, useState } from 'react'
import { AI_CONFIG_EVENT, engineReady } from './engine'

/**
 * Reactive "can the selected AI engine run?" — re-checks whenever the engine/key changes
 * (AI_CONFIG_EVENT), so AI affordances appear/disappear the moment the user switches to
 * Gemini or back, without a reload.
 */
export function useAiReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    const check = () => {
      void engineReady().then((v) => {
        if (alive) setReady(v)
      })
    }
    check()
    window.addEventListener(AI_CONFIG_EVENT, check)
    return () => {
      alive = false
      window.removeEventListener(AI_CONFIG_EVENT, check)
    }
  }, [])
  return ready
}
