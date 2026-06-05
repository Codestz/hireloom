import { createContext } from 'react'

/**
 * Whether on-device AI can run, provided once near the canvas so deeply-nested fields
 * (bullets, summary) can show their AI affordances without prop-drilling.
 */
export const AiEnabledContext = createContext(false)
