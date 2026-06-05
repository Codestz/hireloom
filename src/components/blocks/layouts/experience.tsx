import { fieldOf } from '#/lib/blocks'
import { experienceBlock } from '#/lib/blocks/defs/experience'
import type { ExperienceData } from '#/lib/blocks/defs/experience'
import { INK, SUB, MUTED, SEP, row, frame } from './primitives'
import type { LayoutProps } from './primitives'
import { BlockField } from '#/components/blocks/fields/block-field'

// ── Experience ──────────────────────────────────────────────────────────────

function ExpTitle({ data, onChange }: LayoutProps<ExperienceData>) {
  return (
    <>
      <BlockField
        field={fieldOf(experienceBlock, 'title')}
        value={data.title}
        onChange={(v) => onChange('title', v)}
        style={{ fontWeight: 700, color: INK }}
      />
      {SEP}
      <BlockField
        field={fieldOf(experienceBlock, 'company')}
        value={data.company}
        onChange={(v) => onChange('company', v)}
        style={{ color: SUB }}
      />
    </>
  )
}

function ExpPeriod({ data, tokens, onChange }: LayoutProps<ExperienceData>) {
  return (
    <span
      style={{
        fontSize: tokens.baseFontSize * 0.9,
        color: MUTED,
        whiteSpace: 'nowrap',
      }}
    >
      <BlockField
        field={fieldOf(experienceBlock, 'period')}
        value={data.period}
        onChange={(v) => onChange('period', v)}
      />
    </span>
  )
}

function ExpLocation({ data, onChange }: LayoutProps<ExperienceData>) {
  return (
    <BlockField
      field={fieldOf(experienceBlock, 'location')}
      value={data.location}
      onChange={(v) => onChange('location', v)}
    />
  )
}

function ExpBullets({ data, onChange }: LayoutProps<ExperienceData>) {
  return (
    <BlockField
      field={fieldOf(experienceBlock, 'bullets')}
      value={data.bullets}
      onChange={(v) => onChange('bullets', v)}
    />
  )
}

export function ExperienceClassic(p: LayoutProps<ExperienceData>) {
  const { tokens } = p
  return (
    <div style={frame(tokens)}>
      <div style={row(tokens)}>
        <span>
          <ExpTitle {...p} />
        </span>
        <ExpPeriod {...p} />
      </div>
      <div
        style={{
          fontSize: tokens.baseFontSize * 0.9,
          color: MUTED,
          marginTop: tokens.space(1),
        }}
      >
        <ExpLocation {...p} />
      </div>
      <div style={{ marginTop: tokens.space(4) }}>
        <ExpBullets {...p} />
      </div>
    </div>
  )
}

export function ExperienceCompact(p: LayoutProps<ExperienceData>) {
  const { tokens } = p
  return (
    <div style={frame(tokens)}>
      <div style={row(tokens)}>
        <span>
          <ExpTitle {...p} />
          {SEP}
          <span style={{ fontSize: tokens.baseFontSize * 0.9, color: MUTED }}>
            <ExpLocation {...p} />
          </span>
        </span>
        <ExpPeriod {...p} />
      </div>
      <div style={{ marginTop: tokens.space(2) }}>
        <ExpBullets {...p} />
      </div>
    </div>
  )
}

export function ExperienceStacked(p: LayoutProps<ExperienceData>) {
  const { data, tokens, onChange } = p
  return (
    <div style={frame(tokens)}>
      <div
        style={{
          fontFamily: tokens.fontHeadingCss,
          fontSize: tokens.baseFontSize * 1.15,
          fontWeight: 700,
          color: INK,
        }}
      >
        <BlockField
          field={fieldOf(experienceBlock, 'title')}
          value={data.title}
          onChange={(v) => onChange('title', v)}
        />
      </div>
      <div
        style={{
          fontSize: tokens.baseFontSize * 0.9,
          color: SUB,
          marginTop: tokens.space(1),
        }}
      >
        <BlockField
          field={fieldOf(experienceBlock, 'company')}
          value={data.company}
          onChange={(v) => onChange('company', v)}
        />
        {SEP}
        <ExpLocation {...p} />
        {SEP}
        <BlockField
          field={fieldOf(experienceBlock, 'period')}
          value={data.period}
          onChange={(v) => onChange('period', v)}
        />
      </div>
      <div style={{ marginTop: tokens.space(3) }}>
        <ExpBullets {...p} />
      </div>
    </div>
  )
}

export function ExperienceTimeline(p: LayoutProps<ExperienceData>) {
  const { tokens } = p
  const accent = tokens.accent
  return (
    <div
      style={{
        ...frame(tokens),
        position: 'relative',
        paddingLeft: tokens.space(13),
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 3,
          top: 6,
          bottom: 0,
          width: 1.5,
          background: accent,
          opacity: 0.25,
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 5,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: accent,
        }}
      />
      <div style={row(tokens)}>
        <span>
          <ExpTitle {...p} />
        </span>
        <ExpPeriod {...p} />
      </div>
      <div
        style={{
          fontSize: tokens.baseFontSize * 0.9,
          color: MUTED,
          marginTop: tokens.space(1),
        }}
      >
        <ExpLocation {...p} />
      </div>
      <div style={{ marginTop: tokens.space(3) }}>
        <ExpBullets {...p} />
      </div>
    </div>
  )
}
