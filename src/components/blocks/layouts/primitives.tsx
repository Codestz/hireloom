import type { CSSProperties } from 'react'
import type { ResolvedTokens } from '#/lib/templates'

/** Shared layout primitives: the layout contract + ink palette + row/frame helpers. */

export interface LayoutProps<T> {
  data: T
  tokens: ResolvedTokens
  onChange: (key: string, value: unknown) => void
}

export const INK = '#171717'
export const SUB = '#525252'
export const MUTED = '#737373'
export const BODY = '#404040'
export const SEP = <span style={{ color: MUTED }}> · </span>

export function row(t: ResolvedTokens): CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    gap: t.space(8),
    alignItems: 'baseline',
  }
}

export function frame(t: ResolvedTokens): CSSProperties {
  return {
    fontFamily: t.fontBodyCss,
    fontSize: t.baseFontSize,
    color: BODY,
    // Match the PDF's defaultStyle line-height so the canvas preview reads at the
    // same density the exported PDF renders.
    lineHeight: 1.3,
  }
}
