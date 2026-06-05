import { createContext, useContext } from 'react'
import type { EditingActions } from '#/components/blocks/state/use-block-doc'

/**
 * Provides the stable BlockDoc editing actions to the document tree, so sections/entries
 * read the handlers they need instead of having ~14 callbacks prop-drilled through every
 * level. The value is memoized (stable identity), which lets entry rows be memoized.
 */
const BlockDocContext = createContext<EditingActions | null>(null)

export const BlockDocProvider = BlockDocContext.Provider

export function useBlockDocController(): EditingActions {
  const actions = useContext(BlockDocContext)
  if (!actions) {
    throw new Error(
      'useBlockDocController must be used within <BlockDocProvider>',
    )
  }
  return actions
}
