import type { ResolvedTokens } from '#/lib/templates'
import { EditableText } from '#/components/blocks/fields/editable-text'
import { useBlockDocController } from '#/components/blocks/state/block-doc-context'
import type { CanvasElement } from '#/lib/canvas/model'
import { FONT_CSS } from '#/lib/canvas/fonts'
import type { FontChoice } from '#/lib/canvas/fonts'
import { SEPARATOR_GLYPH, asText, elementStyle, separatorVariant } from './node-style'

/**
 * Renders a single leaf element. Text-like kinds (heading/text/list) are inline-editable via
 * EditableText → onCanvasUpdateData (caret-safe, no rev bump). Other kinds are display-only and
 * edited through the inspector.
 */
export function ElementView({
  el,
  tokens,
  inheritedFont,
}: {
  el: CanvasElement
  tokens: ResolvedTokens
  inheritedFont?: FontChoice
}) {
  const { onCanvasUpdateData } = useBlockDocController()
  const style = elementStyle(el.style)
  // Effective font: own override → inherited (ancestor box / document) → token default.
  const font = el.style?.fontFamily ?? inheritedFont
  const fontCss = font ? FONT_CSS[font] : undefined

  switch (el.kind) {
    case 'heading': {
      const level = el.data.level === 1 ? 1 : el.data.level === 3 ? 3 : 2
      // H1 = the name (large, bold). H2 = section label (small, uppercase, accent, regular).
      // H3 = a subheading (bold ink, not uppercase) — visibly distinct from H2.
      return (
        <div
          style={{
            fontFamily: fontCss ?? tokens.fontHeadingCss,
            fontWeight: level === 2 ? 400 : 700,
            fontSize:
              level === 1
                ? tokens.baseFontSize * 1.8
                : level === 3
                  ? tokens.baseFontSize * 1.05
                  : tokens.baseFontSize * 0.85,
            textTransform: level === 2 ? 'uppercase' : undefined,
            letterSpacing: level === 2 ? 1 : undefined,
            color: level === 2 ? tokens.accent : undefined,
            ...style,
          }}
        >
          <EditableText
            value={asText(el.data.text)}
            placeholder="Heading"
            onChange={(text) => onCanvasUpdateData(el.id, { text })}
          />
        </div>
      )
    }
    case 'text':
      return (
        <div style={{ whiteSpace: 'pre-wrap', ...(fontCss ? { fontFamily: fontCss } : {}), ...style }}>
          <EditableText
            value={asText(el.data.text)}
            placeholder="Text"
            onChange={(text) => onCanvasUpdateData(el.id, { text })}
          />
        </div>
      )
    case 'list': {
      const items = Array.isArray(el.data.items)
        ? el.data.items.filter((x): x is string => typeof x === 'string')
        : []
      const setItem = (i: number, text: string) =>
        onCanvasUpdateData(el.id, { items: items.map((v, j) => (j === i ? text : v)) })
      // Mirror the classic list (block-field.tsx): paddingLeft 16, manual • bullet in a
      // baseline flex row with a 6px gap — so indentation matches the typed layout exactly.
      return (
        <ul
          style={{
            margin: 0,
            paddingLeft: 16,
            listStyle: 'none',
            ...(fontCss ? { fontFamily: fontCss } : {}),
            ...style,
          }}
        >
          {items.map((it, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                marginBottom: tokens.space(1),
              }}
            >
              <span aria-hidden>•</span>
              <EditableText value={it} onChange={(text) => setItem(i, text)} />
            </li>
          ))}
        </ul>
      )
    }
    case 'separator':
      return (
        <span style={{ color: '#9ca3af', ...style }}>
          {SEPARATOR_GLYPH[separatorVariant(el.data.variant)]}
        </span>
      )
    case 'divider':
      return <hr style={{ border: 0, borderTop: '1px solid #d4d4d4', width: '100%', ...style }} />
    case 'spacer': {
      const size = typeof el.data.size === 'number' ? el.data.size : tokens.space(4)
      return <div style={{ height: size }} />
    }
    case 'image':
      return (
        <img src={asText(el.data.src)} alt={asText(el.data.alt)} style={{ maxWidth: '100%', ...style }} />
      )
    case 'icon':
      return <span style={style}>{asText(el.data.name)}</span>
    case 'button':
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: 4,
            background: tokens.accent,
            color: '#fff',
            ...style,
          }}
        >
          {asText(el.data.label)}
        </span>
      )
    default:
      return null
  }
}
