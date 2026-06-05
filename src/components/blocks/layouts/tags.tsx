import { fieldOf } from '#/lib/blocks'
import { skillsBlock } from '#/lib/blocks/defs/skills'
import type { SkillsData } from '#/lib/blocks/defs/skills'
import { languagesBlock } from '#/lib/blocks/defs/languages'
import type { LanguagesData } from '#/lib/blocks/defs/languages'
import { BODY } from './primitives'
import type { LayoutProps } from './primitives'
import { BlockField } from '#/components/blocks/fields/block-field'
import type { TagStyle } from '#/components/blocks/fields/field-types'

// ── Skills ──────────────────────────────────────────────────────────────────

function SkillsTags({
  data,
  tokens,
  onChange,
  tagStyle,
}: LayoutProps<SkillsData> & { tagStyle: TagStyle }) {
  return (
    <div
      style={{
        fontFamily: tokens.fontBodyCss,
        fontSize: tokens.baseFontSize,
        color: BODY,
      }}
    >
      <BlockField
        field={fieldOf(skillsBlock, 'tags')}
        value={data.tags}
        onChange={(v) => onChange('tags', v)}
        tagStyle={tagStyle}
        accent={tokens.accent}
      />
    </div>
  )
}

export const SkillsInline = (p: LayoutProps<SkillsData>) => (
  <SkillsTags {...p} tagStyle="inline" />
)
export const SkillsPills = (p: LayoutProps<SkillsData>) => (
  <SkillsTags {...p} tagStyle="pills" />
)
export const SkillsList = (p: LayoutProps<SkillsData>) => (
  <SkillsTags {...p} tagStyle="list" />
)

// ── Languages ───────────────────────────────────────────────────────────────

function LanguagesTags({
  data,
  tokens,
  onChange,
  tagStyle,
}: LayoutProps<LanguagesData> & { tagStyle: TagStyle }) {
  return (
    <div
      style={{
        fontFamily: tokens.fontBodyCss,
        fontSize: tokens.baseFontSize,
        color: BODY,
      }}
    >
      <BlockField
        field={fieldOf(languagesBlock, 'tags')}
        value={data.tags}
        onChange={(v) => onChange('tags', v)}
        tagStyle={tagStyle}
        accent={tokens.accent}
      />
    </div>
  )
}

export const LanguagesInline = (p: LayoutProps<LanguagesData>) => (
  <LanguagesTags {...p} tagStyle="inline" />
)
export const LanguagesPills = (p: LayoutProps<LanguagesData>) => (
  <LanguagesTags {...p} tagStyle="pills" />
)
