import type { CSSProperties } from 'react'
import { fieldOf } from '#/lib/blocks'
import { headerBlock } from '#/lib/blocks/defs/header'
import type { HeaderData } from '#/lib/blocks/defs/header'
import { INK, SUB, MUTED, BODY, SEP } from './primitives'
import type { LayoutProps } from './primitives'
import { BlockField } from '#/components/blocks/fields/block-field'

// ── Header ──────────────────────────────────────────────────────────────────

export function HeaderLayout({
  data,
  tokens,
  onChange,
}: LayoutProps<HeaderData>) {
  const fs = tokens.baseFontSize
  const variant = tokens.headerVariant
  const f = (key: keyof HeaderData, style?: CSSProperties) => (
    <BlockField
      field={fieldOf(headerBlock, key)}
      value={data[key]}
      onChange={(v) => onChange(key, v)}
      style={style}
    />
  )
  const contacts = (
    <>
      {f('email')}
      {SEP}
      {f('phone')}
      {SEP}
      {f('url')}
      {SEP}
      {f('location')}
    </>
  )
  const summary = (
    <div
      style={{
        fontSize: fs,
        color: BODY,
        lineHeight: 1.35,
        marginTop: tokens.space(8),
      }}
    >
      {f('summary')}
    </div>
  )

  if (variant === 'compact') {
    return (
      <header style={{ fontFamily: tokens.fontBodyCss, color: BODY }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: tokens.space(8),
          }}
        >
          <div
            style={{
              fontFamily: tokens.fontHeadingCss,
              fontSize: fs * 1.7,
              fontWeight: 700,
              color: INK,
            }}
          >
            {f('name')}
          </div>
          <div
            style={{ fontSize: fs * 0.85, color: MUTED, textAlign: 'right' }}
          >
            {contacts}
          </div>
        </div>
        <div
          style={{
            fontSize: fs * 1.05,
            color: SUB,
            marginTop: tokens.space(1),
          }}
        >
          {f('headline')}
        </div>
        {summary}
      </header>
    )
  }

  const centered = variant === 'centered'
  return (
    <header style={{ fontFamily: tokens.fontBodyCss, color: BODY }}>
      <div style={centered ? { textAlign: 'center' } : undefined}>
        <div
          style={{
            fontFamily: tokens.fontHeadingCss,
            fontSize: fs * 2,
            fontWeight: 700,
            color: INK,
          }}
        >
          {f('name')}
        </div>
        <div
          style={{ fontSize: fs * 1.1, color: SUB, marginTop: tokens.space(2) }}
        >
          {f('headline')}
        </div>
        <div
          style={{
            fontSize: fs * 0.9,
            color: MUTED,
            marginTop: tokens.space(3),
          }}
        >
          {contacts}
        </div>
      </div>
      {summary}
    </header>
  )
}

/** A bold accent header band — name + contacts reversed out on the accent color. */
export function HeaderBand({
  data,
  tokens,
  onChange,
}: LayoutProps<HeaderData>) {
  const fs = tokens.baseFontSize
  const sep = <span style={{ color: 'rgba(255,255,255,0.55)' }}> · </span>
  const field = (key: keyof HeaderData) => (
    <BlockField
      field={fieldOf(headerBlock, key)}
      value={data[key]}
      onChange={(v) => onChange(key, v)}
      style={{ color: 'rgba(255,255,255,0.9)' }}
    />
  )
  // Full-bleed: cancel the sheet's 48px (p-12) padding so the band spans edge-to-edge.
  return (
    <div style={{ fontFamily: tokens.fontBodyCss }}>
      <div
        style={{
          background: tokens.accent,
          margin: '-48px -48px 0',
          padding: `${tokens.space(10)}px 48px`,
          color: '#fff',
        }}
      >
        <div
          style={{
            fontFamily: tokens.fontHeadingCss,
            fontSize: fs * 2,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          <BlockField
            field={fieldOf(headerBlock, 'name')}
            value={data.name}
            onChange={(v) => onChange('name', v)}
            style={{ color: '#fff' }}
          />
        </div>
        <div
          style={{
            fontSize: fs * 1.05,
            color: 'rgba(255,255,255,0.85)',
            marginTop: tokens.space(1),
          }}
        >
          <BlockField
            field={fieldOf(headerBlock, 'headline')}
            value={data.headline}
            onChange={(v) => onChange('headline', v)}
            style={{ color: 'rgba(255,255,255,0.85)' }}
          />
        </div>
        <div style={{ fontSize: fs * 0.85, marginTop: tokens.space(3) }}>
          {field('email')}
          {sep}
          {field('phone')}
          {sep}
          {field('url')}
          {sep}
          {field('location')}
        </div>
      </div>
      <div
        style={{
          fontSize: fs,
          color: BODY,
          lineHeight: 1.35,
          marginTop: tokens.space(8),
        }}
      >
        <BlockField
          field={fieldOf(headerBlock, 'summary')}
          value={data.summary}
          onChange={(v) => onChange('summary', v)}
        />
      </div>
    </div>
  )
}
