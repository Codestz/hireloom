import type { BlockDef, FieldDef } from './types'

/**
 * Block registry. `defineBlock` registers a type as a side effect at import; the rest
 * of the app reads definitions by type. Add a block file → import it once (index.ts)
 * → it's available everywhere.
 */

const registry = new Map<string, BlockDef<unknown>>()

export function defineBlock<T>(def: BlockDef<T>): BlockDef<T> {
  registry.set(def.type, def as unknown as BlockDef<unknown>)
  return def
}

export function getBlockDef(type: string): BlockDef<unknown> | undefined {
  return registry.get(type)
}

export function blockDefs(): Array<BlockDef<unknown>> {
  return [...registry.values()]
}

/** Look up a field def by key (for template layouts). */
export function fieldOf<T>(def: BlockDef<T>, key: string): FieldDef {
  const field = def.fields.find((f) => f.key === key)
  if (!field) throw new Error(`Unknown field "${key}" on block "${def.type}"`)
  return field
}
