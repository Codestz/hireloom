import { fieldOf } from '#/lib/blocks'
import { projectBlock } from '#/lib/blocks/defs/project'
import type { ProjectData } from '#/lib/blocks/defs/project'
import { certificationBlock } from '#/lib/blocks/defs/certification'
import type { CertificationData } from '#/lib/blocks/defs/certification'
import { awardBlock } from '#/lib/blocks/defs/award'
import type { AwardData } from '#/lib/blocks/defs/award'
import { volunteerBlock } from '#/lib/blocks/defs/volunteer'
import type { VolunteerData } from '#/lib/blocks/defs/volunteer'
import { publicationBlock } from '#/lib/blocks/defs/publication'
import type { PublicationData } from '#/lib/blocks/defs/publication'
import { referenceBlock } from '#/lib/blocks/defs/reference'
import type { ReferenceData } from '#/lib/blocks/defs/reference'
import { customBlock } from '#/lib/blocks/defs/custom'
import type { CustomData } from '#/lib/blocks/defs/custom'
import { INK, SUB, MUTED, BODY, SEP, row, frame } from './primitives'
import type { LayoutProps } from './primitives'
import { BlockField } from '#/components/blocks/fields/block-field'

// ── Projects ────────────────────────────────────────────────────────────────

export function ProjectClassic({
  data,
  tokens,
  onChange,
}: LayoutProps<ProjectData>) {
  const fs = tokens.baseFontSize
  return (
    <div style={frame(tokens)}>
      <div>
        <BlockField
          field={fieldOf(projectBlock, 'name')}
          value={data.name}
          onChange={(v) => onChange('name', v)}
          style={{ fontWeight: 700, color: INK }}
        />
        {SEP}
        <BlockField
          field={fieldOf(projectBlock, 'url')}
          value={data.url}
          onChange={(v) => onChange('url', v)}
          style={{ fontSize: fs * 0.9, color: tokens.accent }}
        />
      </div>
      <div style={{ marginTop: tokens.space(2) }}>
        <BlockField
          field={fieldOf(projectBlock, 'description')}
          value={data.description}
          onChange={(v) => onChange('description', v)}
        />
      </div>
    </div>
  )
}

// ── Certifications ──────────────────────────────────────────────────────────

export function CertificationClassic({
  data,
  tokens,
  onChange,
}: LayoutProps<CertificationData>) {
  const fs = tokens.baseFontSize
  return (
    <div style={{ fontFamily: tokens.fontBodyCss, fontSize: fs, color: BODY }}>
      <div style={row(tokens)}>
        <span>
          <BlockField
            field={fieldOf(certificationBlock, 'name')}
            value={data.name}
            onChange={(v) => onChange('name', v)}
            style={{ fontWeight: 700, color: INK }}
          />
          {SEP}
          <BlockField
            field={fieldOf(certificationBlock, 'issuer')}
            value={data.issuer}
            onChange={(v) => onChange('issuer', v)}
            style={{ color: SUB }}
          />
        </span>
        <span
          style={{ fontSize: fs * 0.9, color: MUTED, whiteSpace: 'nowrap' }}
        >
          <BlockField
            field={fieldOf(certificationBlock, 'date')}
            value={data.date}
            onChange={(v) => onChange('date', v)}
          />
        </span>
      </div>
    </div>
  )
}

export function CertificationList({
  data,
  tokens,
  onChange,
}: LayoutProps<CertificationData>) {
  const fs = tokens.baseFontSize
  return (
    <div
      style={{
        fontFamily: tokens.fontBodyCss,
        fontSize: fs,
        color: BODY,
        display: 'flex',
        alignItems: 'baseline',
        gap: tokens.space(2),
      }}
    >
      <span aria-hidden style={{ color: tokens.accent }}>
        •
      </span>
      <BlockField
        field={fieldOf(certificationBlock, 'name')}
        value={data.name}
        onChange={(v) => onChange('name', v)}
        style={{ fontWeight: 600, color: INK }}
      />
      <span style={{ fontSize: fs * 0.9, color: MUTED }}>
        <BlockField
          field={fieldOf(certificationBlock, 'issuer')}
          value={data.issuer}
          onChange={(v) => onChange('issuer', v)}
        />
      </span>
    </div>
  )
}

// ── Awards ──────────────────────────────────────────────────────────────────

export function AwardClassic({
  data,
  tokens,
  onChange,
}: LayoutProps<AwardData>) {
  const fs = tokens.baseFontSize
  return (
    <div style={frame(tokens)}>
      <div style={row(tokens)}>
        <span>
          <BlockField
            field={fieldOf(awardBlock, 'title')}
            value={data.title}
            onChange={(v) => onChange('title', v)}
            style={{ fontWeight: 700, color: INK }}
          />
          {SEP}
          <BlockField
            field={fieldOf(awardBlock, 'awarder')}
            value={data.awarder}
            onChange={(v) => onChange('awarder', v)}
            style={{ color: SUB }}
          />
        </span>
        <span
          style={{ fontSize: fs * 0.9, color: MUTED, whiteSpace: 'nowrap' }}
        >
          <BlockField
            field={fieldOf(awardBlock, 'date')}
            value={data.date}
            onChange={(v) => onChange('date', v)}
          />
        </span>
      </div>
      <div style={{ marginTop: tokens.space(2) }}>
        <BlockField
          field={fieldOf(awardBlock, 'summary')}
          value={data.summary}
          onChange={(v) => onChange('summary', v)}
        />
      </div>
    </div>
  )
}

// ── Volunteering ──────────────────────────────────────────────────────────────

export function VolunteerClassic({
  data,
  tokens,
  onChange,
}: LayoutProps<VolunteerData>) {
  const fs = tokens.baseFontSize
  return (
    <div style={frame(tokens)}>
      <div style={row(tokens)}>
        <span>
          <BlockField
            field={fieldOf(volunteerBlock, 'role')}
            value={data.role}
            onChange={(v) => onChange('role', v)}
            style={{ fontWeight: 700, color: INK }}
          />
          {SEP}
          <BlockField
            field={fieldOf(volunteerBlock, 'organization')}
            value={data.organization}
            onChange={(v) => onChange('organization', v)}
            style={{ color: SUB }}
          />
        </span>
        <span
          style={{ fontSize: fs * 0.9, color: MUTED, whiteSpace: 'nowrap' }}
        >
          <BlockField
            field={fieldOf(volunteerBlock, 'period')}
            value={data.period}
            onChange={(v) => onChange('period', v)}
          />
        </span>
      </div>
      <div
        style={{ fontSize: fs * 0.9, color: MUTED, marginTop: tokens.space(1) }}
      >
        <BlockField
          field={fieldOf(volunteerBlock, 'location')}
          value={data.location}
          onChange={(v) => onChange('location', v)}
        />
      </div>
      <div style={{ marginTop: tokens.space(4) }}>
        <BlockField
          field={fieldOf(volunteerBlock, 'bullets')}
          value={data.bullets}
          onChange={(v) => onChange('bullets', v)}
        />
      </div>
    </div>
  )
}

// ── Publications ──────────────────────────────────────────────────────────────

export function PublicationClassic({
  data,
  tokens,
  onChange,
}: LayoutProps<PublicationData>) {
  const fs = tokens.baseFontSize
  return (
    <div style={frame(tokens)}>
      <div style={row(tokens)}>
        <span>
          <BlockField
            field={fieldOf(publicationBlock, 'name')}
            value={data.name}
            onChange={(v) => onChange('name', v)}
            style={{ fontWeight: 700, color: INK }}
          />
          {SEP}
          <BlockField
            field={fieldOf(publicationBlock, 'publisher')}
            value={data.publisher}
            onChange={(v) => onChange('publisher', v)}
            style={{ color: SUB }}
          />
        </span>
        <span
          style={{ fontSize: fs * 0.9, color: MUTED, whiteSpace: 'nowrap' }}
        >
          <BlockField
            field={fieldOf(publicationBlock, 'date')}
            value={data.date}
            onChange={(v) => onChange('date', v)}
          />
        </span>
      </div>
      <div style={{ fontSize: fs * 0.9, marginTop: tokens.space(1) }}>
        <BlockField
          field={fieldOf(publicationBlock, 'url')}
          value={data.url}
          onChange={(v) => onChange('url', v)}
          style={{ color: tokens.accent }}
        />
      </div>
      <div style={{ marginTop: tokens.space(2) }}>
        <BlockField
          field={fieldOf(publicationBlock, 'summary')}
          value={data.summary}
          onChange={(v) => onChange('summary', v)}
        />
      </div>
    </div>
  )
}

// ── References ──────────────────────────────────────────────────────────────

export function ReferenceClassic({
  data,
  tokens,
  onChange,
}: LayoutProps<ReferenceData>) {
  return (
    <div style={frame(tokens)}>
      <BlockField
        field={fieldOf(referenceBlock, 'name')}
        value={data.name}
        onChange={(v) => onChange('name', v)}
        style={{ fontWeight: 700, color: INK }}
      />
      <div
        style={{ marginTop: tokens.space(1), color: SUB, fontStyle: 'italic' }}
      >
        <BlockField
          field={fieldOf(referenceBlock, 'reference')}
          value={data.reference}
          onChange={(v) => onChange('reference', v)}
        />
      </div>
    </div>
  )
}

// ── Custom ──────────────────────────────────────────────────────────────────

export function CustomClassic({
  data,
  tokens,
  onChange,
}: LayoutProps<CustomData>) {
  return (
    <div style={frame(tokens)}>
      <BlockField
        field={fieldOf(customBlock, 'lines')}
        value={data.lines}
        onChange={(v) => onChange('lines', v)}
      />
    </div>
  )
}
