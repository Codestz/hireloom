import { arrayMove } from '@dnd-kit/sortable'
import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { enginePrompt, engineReady } from '#/lib/ai/engine'
import { extractJson } from '#/lib/ai/json'
import { transformText } from '#/lib/ai/service'
import type { TextAction } from '#/lib/ai/service'
import { headerBlock } from '#/lib/blocks/defs/header'
import type { BlockDoc } from '#/lib/blocks/document'
import { getSection } from '#/lib/blocks/sections'
import { decompose } from '#/lib/canvas/decompose'
import type { BoxProps, CanvasBox, CanvasElement, CanvasNode } from '#/lib/canvas/model'
import {
  addChild,
  insertNode,
  moveNode,
  removeNode,
  setBoxRole,
  updateBoxProps,
  updateElementData,
  updateElementStyle,
} from '#/lib/canvas/tree-ops'

function mergeKnown(
  data: Record<string, unknown>,
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...data }
  for (const key of Object.keys(parsed)) {
    if (key in data) out[key] = parsed[key]
  }
  return out
}

function newItem(type: string): { id: string; data: Record<string, unknown> } {
  const def = getSection(type)?.def
  return {
    id: crypto.randomUUID(),
    data: (def?.default() ?? {}) as Record<string, unknown>,
  }
}

/**
 * All the editing handlers for a BlockDoc. Text edits are in-place; structural changes
 * (add/remove/reorder, list-length changes, AI) bump `rev` so the uncontrolled editors
 * re-sync (the consumer keys the document on it). Handlers are stable (`useCallback`) and
 * read current state via `docRef` / the `setDoc` updater, so they never close over a stale
 * `doc`; the memoized `actions` object lets the document tree be provided via context
 * without churning on every keystroke.
 */
export function useBlockDoc(initial: BlockDoc) {
  const [doc, setDoc] = useState<BlockDoc>(initial)
  const [rev, setRev] = useState(0)
  // Fresh doc for handlers that must read current state without depending on it.
  const docRef = useRef(doc)
  docRef.current = doc

  const bump = useCallback(() => setRev((r) => r + 1), [])

  const onHeaderChange = useCallback((key: string, value: unknown) => {
    setDoc((d) => ({ ...d, header: { ...d.header, [key]: value } }))
  }, [])

  const onItemChange = useCallback(
    (sectionId: string, itemId: string, key: string, value: unknown) => {
      // A list length change must re-sync the uncontrolled editors → bump.
      if (Array.isArray(value)) {
        const prev = docRef.current.sections
          .find((s) => s.id === sectionId)
          ?.items.find((i) => i.id === itemId)?.data[key]
        if (Array.isArray(prev) && prev.length !== value.length) bump()
      }
      setDoc((d) => ({
        ...d,
        sections: d.sections.map((s) =>
          s.id !== sectionId
            ? s
            : {
                ...s,
                items: s.items.map((it) =>
                  it.id !== itemId
                    ? it
                    : { ...it, data: { ...it.data, [key]: value } },
                ),
              },
        ),
      }))
    },
    [bump],
  )

  const onAddItem = useCallback(
    (sectionId: string) => {
      const sec = docRef.current.sections.find((s) => s.id === sectionId)
      if (!sec || !getSection(sec.type)) return
      const item = newItem(sec.type)
      setDoc((d) => ({
        ...d,
        sections: d.sections.map((s) =>
          s.id !== sectionId ? s : { ...s, items: [...s.items, item] },
        ),
      }))
      bump()
    },
    [bump],
  )

  const onRemoveItem = useCallback(
    (sectionId: string, itemId: string) => {
      setDoc((d) => ({
        ...d,
        sections: d.sections.map((s) =>
          s.id !== sectionId
            ? s
            : { ...s, items: s.items.filter((it) => it.id !== itemId) },
        ),
      }))
      bump()
    },
    [bump],
  )

  const onReorderItems = useCallback(
    (sectionId: string, fromId: string, toId: string) => {
      setDoc((d) => ({
        ...d,
        sections: d.sections.map((s) => {
          if (s.id !== sectionId) return s
          const from = s.items.findIndex((i) => i.id === fromId)
          const to = s.items.findIndex((i) => i.id === toId)
          if (from < 0 || to < 0) return s
          return { ...s, items: arrayMove(s.items, from, to) }
        }),
      }))
    },
    [],
  )

  const onInsertItem = useCallback(
    (sectionId: string, refItemId: string, where: 'above' | 'below') => {
      const sec = docRef.current.sections.find((s) => s.id === sectionId)
      if (!sec || !getSection(sec.type)) return
      const item = newItem(sec.type)
      setDoc((d) => ({
        ...d,
        sections: d.sections.map((s) => {
          if (s.id !== sectionId) return s
          const idx = s.items.findIndex((it) => it.id === refItemId)
          const at =
            idx < 0 ? s.items.length : where === 'above' ? idx : idx + 1
          return {
            ...s,
            items: [...s.items.slice(0, at), item, ...s.items.slice(at)],
          }
        }),
      }))
      bump()
    },
    [bump],
  )

  const onAddSection = useCallback(
    (type: string) => {
      if (!getSection(type)) return
      if (docRef.current.sections.some((s) => s.type === type)) return // unique
      const section = { id: makeSectionId(type), type, items: [newItem(type)] }
      setDoc((d) => ({ ...d, sections: [...d.sections, section] }))
      bump()
    },
    [bump],
  )

  const onInsertSection = useCallback(
    (type: string, atIndex: number) => {
      if (!getSection(type)) return
      if (docRef.current.sections.some((s) => s.type === type)) return // unique
      const section = { id: makeSectionId(type), type, items: [newItem(type)] }
      setDoc((d) => {
        const at = Math.max(0, Math.min(atIndex, d.sections.length))
        return {
          ...d,
          sections: [
            ...d.sections.slice(0, at),
            section,
            ...d.sections.slice(at),
          ],
        }
      })
      bump()
    },
    [bump],
  )

  const onRemoveSection = useCallback(
    (id: string) => {
      setDoc((d) => ({ ...d, sections: d.sections.filter((s) => s.id !== id) }))
      bump()
    },
    [bump],
  )

  const onSetVariant = useCallback(
    (id: string, variantId: string) => {
      setDoc((d) => ({
        ...d,
        sections: d.sections.map((s) =>
          s.id === id ? { ...s, variant: variantId } : s,
        ),
      }))
      bump()
    },
    [bump],
  )

  const onSetColumn = useCallback(
    (id: string, column: 'side' | 'main') => {
      setDoc((d) => ({
        ...d,
        sections: d.sections.map((s) => (s.id === id ? { ...s, column } : s)),
      }))
      bump()
    },
    [bump],
  )

  const onRenameSection = useCallback((id: string, heading: string) => {
    // Text-only — no bump (the heading editor is uncontrolled; bumping would remount
    // it and drop the cursor). Autosave persists it.
    setDoc((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, heading } : s)),
    }))
  }, [])

  const onApplyVariants = useCallback(
    (variants: Record<string, string>) => {
      setDoc((d) => ({
        ...d,
        sections: d.sections.map((s) =>
          variants[s.type] ? { ...s, variant: variants[s.type] } : s,
        ),
      }))
      bump()
    },
    [bump],
  )

  const onReorderSections = useCallback((fromId: string, toId: string) => {
    setDoc((d) => {
      const from = d.sections.findIndex((s) => s.id === fromId)
      const to = d.sections.findIndex((s) => s.id === toId)
      if (from < 0 || to < 0) return d
      return { ...d, sections: arrayMove(d.sections, from, to) }
    })
  }, [])

  const improveWith = useCallback(
    async (
      prompt: string | undefined,
      apply: (parsed: Record<string, unknown>) => void,
    ) => {
      if (!prompt) return
      const id = toast.loading('Improving with AI…')
      try {
        if (!(await engineReady())) {
          throw new Error('No AI engine is ready — check AI settings.')
        }
        const parsed = extractJson<Record<string, unknown>>(
          await enginePrompt(prompt),
        )
        if (!parsed) throw new Error('Could not parse the AI response.')
        apply(parsed)
        bump()
        toast.success('Improved with AI', { id })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'AI failed', { id })
      }
    },
    [bump],
  )

  const onImproveHeader = useCallback(() => {
    void improveWith(headerBlock.ai?.improve(docRef.current.header), (parsed) =>
      setDoc((d) => ({
        ...d,
        header: { ...d.header, ...mergeKnown(d.header, parsed) },
      })),
    )
  }, [improveWith])

  const onImproveItem = useCallback(
    (sectionId: string, itemId: string) => {
      const sec = docRef.current.sections.find((s) => s.id === sectionId)
      const item = sec?.items.find((i) => i.id === itemId)
      const st = sec ? getSection(sec.type) : undefined
      if (!item || !st?.def.ai) return
      void improveWith(st.def.ai.improve(item.data), (parsed) =>
        setDoc((d) => ({
          ...d,
          sections: d.sections.map((s) =>
            s.id !== sectionId
              ? s
              : {
                  ...s,
                  items: s.items.map((it) =>
                    it.id !== itemId
                      ? it
                      : { ...it, data: mergeKnown(it.data, parsed) },
                  ),
                },
          ),
        })),
      )
    },
    [improveWith],
  )

  // Rewrite every bullet in a section in one shot, with the chosen tone/length action.
  // Same transform the inline ✨ uses, fanned across the section. Undo restores it whole.
  const onImproveSection = useCallback(
    (sectionId: string, action: TextAction) => {
      const sec = docRef.current.sections.find((s) => s.id === sectionId)
      if (!sec) return
      const snapshot = sec.items
      const targets = sec.items.flatMap((item) =>
        (Array.isArray(item.data.bullets)
          ? (item.data.bullets as Array<unknown>)
          : []
        )
          .map((b, i) => ({ itemId: item.id, i, text: String(b ?? '') }))
          .filter((t) => t.text.trim()),
      )
      if (!targets.length) {
        toast.error('No bullet text in this section to improve yet.')
        return
      }
      void (async () => {
        const id = toast.loading('Improving section on your device…')
        try {
          if (!(await engineReady())) {
            throw new Error('No AI engine is ready — check AI settings.')
          }
          const rewrites = await Promise.all(
            targets.map(async (t) => ({
              ...t,
              text: await transformText(t.text, action),
            })),
          )
          const byItem = new Map<string, Map<number, string>>()
          for (const r of rewrites) {
            const m = byItem.get(r.itemId) ?? new Map<number, string>()
            m.set(r.i, r.text)
            byItem.set(r.itemId, m)
          }
          setDoc((d) => ({
            ...d,
            sections: d.sections.map((s) =>
              s.id !== sectionId
                ? s
                : {
                    ...s,
                    items: s.items.map((it) => {
                      const m = byItem.get(it.id)
                      if (!m || !Array.isArray(it.data.bullets)) return it
                      return {
                        ...it,
                        data: {
                          ...it.data,
                          bullets: (it.data.bullets as Array<unknown>).map(
                            (b, i) => m.get(i) ?? String(b ?? ''),
                          ),
                        },
                      }
                    }),
                  },
            ),
          }))
          bump()
          toast.success('Section improved', {
            id,
            action: {
              label: 'Undo',
              onClick: () => {
                setDoc((d) => ({
                  ...d,
                  sections: d.sections.map((s) =>
                    s.id === sectionId ? { ...s, items: snapshot } : s,
                  ),
                }))
                bump()
              },
            },
          })
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'AI failed', { id })
        }
      })()
    },
    [bump],
  )

  // Canvas builder mode: presence of `doc.canvas` IS the mode (renderer branches on it).
  // Enabling synthesizes a primitive tree from the current typed sections (migration);
  // disabling drops back to the typed editor. Autosave persists it via meta.hireloom.canvas.
  const onEnableCanvas = useCallback(() => {
    setDoc((d) => (d.canvas ? d : { ...d, canvas: decompose(d) }))
    bump()
  }, [bump])

  const onDisableCanvas = useCallback(() => {
    setDoc((d) => {
      if (!d.canvas) return d
      const { canvas: _drop, ...rest } = d
      return rest
    })
    bump()
  }, [bump])

  // ── Canvas builder mutations (operate on doc.canvas via pure tree-ops) ──────────────────
  // Text/data edits do NOT bump (EditableText is uncontrolled — bumping drops the caret);
  // structural/style/prop changes bump so the keyed canvas re-syncs.
  const mutateCanvas = useCallback((fn: (root: CanvasBox) => CanvasBox) => {
    setDoc((d) => (d.canvas ? { ...d, canvas: fn(d.canvas) } : d))
  }, [])

  const onCanvasUpdateData = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      mutateCanvas((root) => updateElementData(root, id, patch))
    },
    [mutateCanvas],
  )

  const onCanvasUpdateStyle = useCallback(
    (id: string, patch: CanvasElement['style']) => {
      mutateCanvas((root) => updateElementStyle(root, id, patch))
      bump()
    },
    [mutateCanvas, bump],
  )

  const onCanvasUpdateProps = useCallback(
    (id: string, patch: Partial<BoxProps>) => {
      mutateCanvas((root) => updateBoxProps(root, id, patch))
      bump()
    },
    [mutateCanvas, bump],
  )

  const onCanvasSetRole = useCallback(
    (id: string, role: string | undefined) => {
      mutateCanvas((root) => setBoxRole(root, id, role))
      bump()
    },
    [mutateCanvas, bump],
  )

  const onCanvasAddNode = useCallback(
    (containerId: string, node: CanvasNode) => {
      mutateCanvas((root) => addChild(root, containerId, node))
      bump()
    },
    [mutateCanvas, bump],
  )

  const onCanvasInsertNode = useCallback(
    (containerId: string, node: CanvasNode, index?: number) => {
      mutateCanvas((root) => insertNode(root, containerId, node, index))
      bump()
    },
    [mutateCanvas, bump],
  )

  const onCanvasRemoveNode = useCallback(
    (id: string) => {
      mutateCanvas((root) => removeNode(root, id))
      bump()
    },
    [mutateCanvas, bump],
  )

  const onCanvasMoveNode = useCallback(
    (id: string, toParentId: string, index?: number) => {
      mutateCanvas((root) => moveNode(root, id, toParentId, index))
      bump()
    },
    [mutateCanvas, bump],
  )

  // The stable editing surface — provided to the document tree via context.
  const actions = useMemo(
    () => ({
      onHeaderChange,
      onImproveHeader,
      onItemChange,
      onAddItem,
      onInsertItem,
      onRemoveItem,
      onReorderItems,
      onAddSection,
      onInsertSection,
      onRemoveSection,
      onReorderSections,
      onSetVariant,
      onSetColumn,
      onRenameSection,
      onApplyVariants,
      onImproveItem,
      onImproveSection,
      onCanvasUpdateData,
      onCanvasUpdateStyle,
      onCanvasUpdateProps,
      onCanvasSetRole,
      onCanvasAddNode,
      onCanvasInsertNode,
      onCanvasRemoveNode,
      onCanvasMoveNode,
    }),
    [
      onHeaderChange,
      onImproveHeader,
      onItemChange,
      onAddItem,
      onInsertItem,
      onRemoveItem,
      onReorderItems,
      onAddSection,
      onInsertSection,
      onRemoveSection,
      onReorderSections,
      onSetVariant,
      onSetColumn,
      onRenameSection,
      onApplyVariants,
      onImproveItem,
      onImproveSection,
      onCanvasUpdateData,
      onCanvasUpdateStyle,
      onCanvasUpdateProps,
      onCanvasSetRole,
      onCanvasAddNode,
      onCanvasInsertNode,
      onCanvasRemoveNode,
      onCanvasMoveNode,
    ],
  )

  return { doc, rev, bump, actions, onEnableCanvas, onDisableCanvas, ...actions }
}

function makeSectionId(type: string): string {
  return `sec-${type}-${crypto.randomUUID().slice(0, 8)}`
}

/** The full controller (state + actions). Consumers destructure what they need. */
export type BlockDocController = ReturnType<typeof useBlockDoc>

/** The stable editing-action surface provided to the document tree via context. */
export type EditingActions = BlockDocController['actions']
