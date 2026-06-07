import { isBox, isHorizontal } from '#/lib/canvas/model'
import type { CanvasBox, CanvasElement, CanvasNode } from '#/lib/canvas/model'
import type { ResolvedTokens } from '#/lib/templates'
import { FONT_CSS } from '#/lib/canvas/fonts'
import type { FontChoice } from '#/lib/canvas/fonts'
import { SEPARATOR_GLYPH, asText, boxStyle, childFlex, elementStyle, separatorVariant } from './node-style'

/**
 * A READ-ONLY canvas renderer — the same visual rules as the editor (element-view), minus the
 * Selectable wrapper, DnD, contexts, and editing. Used for template gallery thumbnails: render a
 * decomposed sample to true HTML, then scale it down. No controller required.
 */

function StaticElement({
  el,
  tokens,
  inheritedFont,
}: {
  el: CanvasElement
  tokens: ResolvedTokens
  inheritedFont?: FontChoice
}) {
  const style = elementStyle(el.style)
  const font = el.style?.fontFamily ?? inheritedFont
  const fontCss = font ? FONT_CSS[font] : undefined
  const fs = tokens.baseFontSize

  switch (el.kind) {
    case 'heading': {
      const level = el.data.level === 1 ? 1 : el.data.level === 3 ? 3 : 2
      return (
        <div
          style={{
            fontFamily: fontCss ?? tokens.fontHeadingCss,
            fontWeight: level === 2 ? 400 : 700,
            fontSize: level === 1 ? fs * 1.8 : level === 3 ? fs * 1.05 : fs * 0.85,
            textTransform: level === 2 ? 'uppercase' : undefined,
            letterSpacing: level === 2 ? 1 : undefined,
            color: level === 2 ? tokens.accent : undefined,
            ...style,
          }}
        >
          {asText(el.data.text)}
        </div>
      )
    }
    case 'text':
      return <div style={{ whiteSpace: 'pre-wrap', ...(fontCss ? { fontFamily: fontCss } : {}), ...style }}>{asText(el.data.text)}</div>
    case 'list': {
      const items = Array.isArray(el.data.items) ? el.data.items.map((x) => String(x)) : []
      return (
        <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'none', ...(fontCss ? { fontFamily: fontCss } : {}), ...style }}>
          {items.map((it, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: tokens.space(1) }}>
              <span aria-hidden>•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )
    }
    case 'separator':
      return <span style={style}>{SEPARATOR_GLYPH[separatorVariant(el.data.variant)]}</span>
    case 'divider':
      return <div style={{ borderTop: '1px solid #e5e7eb', ...style }} />
    case 'spacer':
      return <div style={{ height: typeof el.data.size === 'number' ? el.data.size : 8 }} />
    case 'image': {
      const src = asText(el.data.src)
      return src ? (
        <img src={src} alt="" style={{ maxWidth: '100%', width: typeof el.data.width === 'number' ? el.data.width : undefined, ...style }} />
      ) : null
    }
    default:
      return <span style={style}>{asText(el.data.text)}</span>
  }
}

function StaticNode({
  node,
  tokens,
  inheritedFont,
}: {
  node: CanvasNode
  tokens: ResolvedTokens
  inheritedFont?: FontChoice
}) {
  if (!isBox(node)) return <StaticElement el={node} tokens={tokens} inheritedFont={inheritedFont} />
  const font = node.props.fontFamily ?? inheritedFont
  const horizontal = isHorizontal(node)
  return (
    <div style={boxStyle(node)}>
      {node.children.map((c) => (
        <div key={c.id} style={horizontal ? childFlex(c) : undefined}>
          <StaticNode node={c} tokens={tokens} inheritedFont={font} />
        </div>
      ))}
    </div>
  )
}

/** A full, non-interactive render of a canvas (an A4-ish page). Scale it down in the host. */
export function CanvasPreview({ root, tokens }: { root: CanvasBox; tokens: ResolvedTokens }) {
  return (
    <div
      style={{
        width: 612,
        padding: tokens.space(28),
        background: '#fff',
        color: '#171717',
        fontFamily: tokens.fontBodyCss,
        fontSize: tokens.baseFontSize,
        lineHeight: 1.4,
      }}
    >
      <StaticNode node={root} tokens={tokens} inheritedFont={root.props.fontFamily} />
    </div>
  )
}
