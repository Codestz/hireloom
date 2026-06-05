import { fieldOf } from '#/lib/blocks'
import { educationBlock } from '#/lib/blocks/defs/education'
import type { EducationData } from '#/lib/blocks/defs/education'
import { INK, SUB, MUTED, SEP, row, frame } from './primitives'
import type { LayoutProps } from './primitives'
import { BlockField } from '#/components/blocks/fields/block-field'

// ── Education ───────────────────────────────────────────────────────────────

function EduInstitution({ data, onChange }: LayoutProps<EducationData>) {
  return (
    <>
      <BlockField
        field={fieldOf(educationBlock, 'institution')}
        value={data.institution}
        onChange={(v) => onChange('institution', v)}
        style={{ fontWeight: 700, color: INK }}
      />
      {SEP}
      <BlockField
        field={fieldOf(educationBlock, 'degree')}
        value={data.degree}
        onChange={(v) => onChange('degree', v)}
        style={{ color: SUB }}
      />
    </>
  )
}

function EduPeriod({ data, tokens, onChange }: LayoutProps<EducationData>) {
  return (
    <span
      style={{
        fontSize: tokens.baseFontSize * 0.9,
        color: MUTED,
        whiteSpace: 'nowrap',
      }}
    >
      <BlockField
        field={fieldOf(educationBlock, 'period')}
        value={data.period}
        onChange={(v) => onChange('period', v)}
      />
    </span>
  )
}

function EduArea({ data, onChange }: LayoutProps<EducationData>) {
  return (
    <BlockField
      field={fieldOf(educationBlock, 'area')}
      value={data.area}
      onChange={(v) => onChange('area', v)}
    />
  )
}

export function EducationClassic(p: LayoutProps<EducationData>) {
  const { tokens } = p
  return (
    <div style={frame(tokens)}>
      <div style={row(tokens)}>
        <span>
          <EduInstitution {...p} />
        </span>
        <EduPeriod {...p} />
      </div>
      <div
        style={{
          fontSize: tokens.baseFontSize * 0.9,
          color: MUTED,
          marginTop: tokens.space(1),
        }}
      >
        <EduArea {...p} />
      </div>
    </div>
  )
}

export function EducationCompact(p: LayoutProps<EducationData>) {
  const { tokens } = p
  return (
    <div style={frame(tokens)}>
      <div style={row(tokens)}>
        <span>
          <EduInstitution {...p} />
          {SEP}
          <span style={{ fontSize: tokens.baseFontSize * 0.9, color: MUTED }}>
            <EduArea {...p} />
          </span>
        </span>
        <EduPeriod {...p} />
      </div>
    </div>
  )
}

export function EducationStacked(p: LayoutProps<EducationData>) {
  const { data, tokens, onChange } = p
  return (
    <div style={frame(tokens)}>
      <div
        style={{
          fontFamily: tokens.fontHeadingCss,
          fontSize: tokens.baseFontSize * 1.1,
          fontWeight: 700,
          color: INK,
        }}
      >
        <BlockField
          field={fieldOf(educationBlock, 'institution')}
          value={data.institution}
          onChange={(v) => onChange('institution', v)}
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
          field={fieldOf(educationBlock, 'degree')}
          value={data.degree}
          onChange={(v) => onChange('degree', v)}
        />
        {SEP}
        <EduArea {...p} />
        {SEP}
        <BlockField
          field={fieldOf(educationBlock, 'period')}
          value={data.period}
          onChange={(v) => onChange('period', v)}
        />
      </div>
    </div>
  )
}
