import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowLeftRightIcon, SparklesIcon, Trash2Icon } from 'lucide-react'
import { Fragment, useContext } from 'react'
import type { CSSProperties } from 'react'
import { headerBlock } from '#/lib/blocks/defs/header'
import type { BlockDoc, DocItem, DocSection } from '#/lib/blocks/document'
import { defaultColumn } from '#/lib/templates'
import type { LayoutKind, ResolvedTokens } from '#/lib/templates'
import { cn } from '#/lib/utils.ts'
import { AiEnabledContext } from '#/components/blocks/ai/ai-context'
import { SectionAiMenu } from '#/components/blocks/ai/section-ai-menu'
import type { TextAction } from '#/lib/ai/service'
import { Block } from '#/components/blocks/entry/block'
import { useBlockDocController } from '#/components/blocks/state/block-doc-context'
import { EditableText } from '#/components/blocks/fields/editable-text'
import { AddButton } from '#/components/blocks/fields/field-controls'
import { DesignPicker } from '#/components/blocks/design/design-picker'
import { HeaderBand, HeaderLayout } from '#/components/blocks/layouts'
import {
  getSectionType,
  getSectionVariant,
} from '#/components/blocks/registry/section-registry'
import { SortableEntry } from '#/components/blocks/entry/sortable-entry'

function headingStyle(tokens: ResolvedTokens): CSSProperties {
  return {
    fontFamily: tokens.fontHeadingCss,
    fontSize: tokens.baseFontSize * 0.85,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: tokens.accent,
    borderBottom: '1px solid #d4d4d4',
    paddingBottom: tokens.space(2),
    marginBottom: tokens.space(6),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }
}

function SectionHeading({
  title,
  type,
  variantId,
  sampleData,
  tokens,
  column,
  onSetColumn,
  onImprove,
  onRename,
  onSetVariant,
  onDelete,
}: {
  title: string
  type: string
  variantId?: string
  sampleData: Record<string, unknown>
  tokens: ResolvedTokens
  /** When set, show the Left/Right column toggle (two-column layout only). */
  column?: 'side' | 'main'
  onSetColumn?: (column: 'side' | 'main') => void
  /** When set, show the section-level ✨ improve menu (AI on + section has bullets). */
  onImprove?: (action: TextAction) => void
  onRename: (heading: string) => void
  onSetVariant: (variantId: string) => void
  onDelete: () => void
}) {
  return (
    <div className="group/sec" style={headingStyle(tokens)}>
      <EditableText
        value={title}
        placeholder="Section"
        onChange={onRename}
        className="outline-none"
      />
      <span
        contentEditable={false}
        style={{
          display: 'inline-flex',
          gap: 2,
          zoom: 'var(--chrome-zoom, 1)' as unknown as number,
        }}
      >
        {column && onSetColumn ? (
          <button
            type="button"
            aria-label="Move column"
            title={
              column === 'side' ? 'Move to main column' : 'Move to side column'
            }
            onClick={() => onSetColumn(column === 'side' ? 'main' : 'side')}
            className="flex size-5 items-center justify-center rounded text-neutral-400 outline-none transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <ArrowLeftRightIcon className="size-3.5" />
          </button>
        ) : null}
        {onImprove ? <SectionAiMenu onImprove={onImprove} /> : null}
        <DesignPicker
          type={type}
          variantId={variantId}
          sampleData={sampleData}
          tokens={tokens}
          onSelect={onSetVariant}
        />
        <button
          type="button"
          aria-label="Delete section"
          title="Delete section"
          onClick={onDelete}
          className="flex size-5 items-center justify-center rounded text-neutral-400 outline-none transition-colors hover:bg-red-500 hover:text-white"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </span>
    </div>
  )
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return <AddButton label={label} onClick={onClick} className="mt-2" />
}

/** A drop zone between sections — expands while a block is being dragged in. */
function GapDrop({ index, active }: { index: number; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `gap:${index}` })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-[height] duration-150',
        active ? 'h-5' : 'h-0',
      )}
    >
      {active ? (
        <div
          className={cn(
            'absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full transition-colors',
            isOver ? 'bg-primary' : 'bg-primary/15',
          )}
        />
      ) : null}
    </div>
  )
}

export interface BlockDocumentProps {
  doc: BlockDoc
  tokens: ResolvedTokens
  layout?: LayoutKind
  dropActive?: boolean
}

export function BlockDocument({
  doc,
  tokens,
  layout = 'single',
  dropActive,
}: BlockDocumentProps) {
  // Editing handlers come from context (provided by the canvas) rather than ~14 props.
  const {
    onHeaderChange,
    onImproveHeader,
    onItemChange,
    onAddItem,
    onInsertItem,
    onRemoveItem,
    onReorderItems,
    onRemoveSection,
    onSetVariant,
    onSetColumn,
    onRenameSection,
    onImproveItem,
    onImproveSection,
  } = useBlockDocController()
  // Whether on-device AI is available — gates the per-block "Improve" button.
  const aiEnabled = useContext(AiEnabledContext)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const renderSection = (section: DocSection) => {
    const st = getSectionType(section.type)
    if (!st) return null
    const flat = section.items.at(0)
    const Layout =
      getSectionVariant(section.type, section.variant)?.Layout ??
      st.variants[0].Layout
    const sampleData =
      section.items.at(0)?.data ?? (st.def.default() as Record<string, unknown>)
    // Section-level improve only makes sense where there's prose (bullets) to rewrite.
    const hasBullets = section.items.some((it) =>
      Array.isArray(it.data.bullets),
    )
    return (
      <>
        <section
          id={`sec-${section.id}`}
          style={{ marginTop: tokens.space(16), scrollMarginTop: 24 }}
        >
          <SectionHeading
            title={section.heading ?? st.heading}
            type={section.type}
            variantId={section.variant}
            sampleData={sampleData}
            tokens={tokens}
            column={
              layout === 'sidebar'
                ? (section.column ?? defaultColumn(section.type))
                : undefined
            }
            onSetColumn={
              layout === 'sidebar'
                ? (c) => onSetColumn(section.id, c)
                : undefined
            }
            onImprove={
              aiEnabled && hasBullets
                ? (action) => onImproveSection(section.id, action)
                : undefined
            }
            onRename={(h) => onRenameSection(section.id, h)}
            onSetVariant={(v) => onSetVariant(section.id, v)}
            onDelete={() => onRemoveSection(section.id)}
          />
          {st.kind === 'collection' ? (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e: DragEndEvent) => {
                  if (e.over && e.active.id !== e.over.id) {
                    onReorderItems(
                      section.id,
                      String(e.active.id),
                      String(e.over.id),
                    )
                  }
                }}
              >
                <SortableContext
                  items={section.items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {section.items.map((item) => (
                    <SortableEntry
                      key={item.id}
                      id={item.id}
                      htmlId={`item-${item.id}`}
                      onImprove={
                        aiEnabled && st.def.ai
                          ? () => onImproveItem(section.id, item.id)
                          : undefined
                      }
                      onInsertAbove={() =>
                        onInsertItem(section.id, item.id, 'above')
                      }
                      onInsertBelow={() =>
                        onInsertItem(section.id, item.id, 'below')
                      }
                      onDelete={() => onRemoveItem(section.id, item.id)}
                    >
                      <Layout
                        data={item.data}
                        tokens={tokens}
                        onChange={(k, v) =>
                          onItemChange(section.id, item.id, k, v)
                        }
                      />
                    </SortableEntry>
                  ))}
                </SortableContext>
              </DndContext>
              <AddRow
                label={st.addLabel}
                onClick={() => onAddItem(section.id)}
              />
            </>
          ) : flat ? (
            <Layout
              data={flat.data}
              tokens={tokens}
              onChange={(k, v) => onItemChange(section.id, flat.id, k, v)}
            />
          ) : null}
        </section>
      </>
    )
  }

  // The band header is full-bleed (spans the sheet padding), so it's rendered without
  // the hover Block wrapper; other layouts keep the Block (AI-improve toolbar).
  const header =
    layout === 'band' ? (
      <div id="doc-header" style={{ scrollMarginTop: 24 }}>
        <HeaderBand
          data={doc.header}
          tokens={tokens}
          onChange={onHeaderChange}
        />
      </div>
    ) : (
      <div id="doc-header" style={{ scrollMarginTop: 24 }}>
        {/* Key on the variant: the header's contentEditable fields are uncontrolled, so
            switching layout must remount them (else React reuses DOM nodes in the wrong
            slots — duplicated/scrambled fields). */}
        {aiEnabled && headerBlock.ai ? (
          <Block>
            <Block.Toolbar>
              <Block.Action
                icon={SparklesIcon}
                label="Improve with AI"
                onClick={onImproveHeader}
              />
            </Block.Toolbar>
            <HeaderLayout
              key={`hdr-${tokens.headerVariant}`}
              data={doc.header}
              tokens={tokens}
              onChange={onHeaderChange}
            />
          </Block>
        ) : (
          <HeaderLayout
            key={`hdr-${tokens.headerVariant}`}
            data={doc.header}
            tokens={tokens}
            onChange={onHeaderChange}
          />
        )}
      </div>
    )

  const docStyle = {
    fontFamily: tokens.fontBodyCss,
    fontSize: tokens.baseFontSize,
    color: '#404040',
  }

  if (layout === 'sidebar') {
    const isSide = (s: DocSection) =>
      (s.column ?? defaultColumn(s.type)) === 'side'
    const sideSections = doc.sections.filter(isSide)
    const mainSections = doc.sections.filter((s) => !isSide(s))
    return (
      <div className="resume-doc" style={docStyle}>
        {header}
        <div
          style={{
            display: 'flex',
            gap: tokens.space(16),
            marginTop: tokens.space(4),
            alignItems: 'flex-start',
          }}
        >
          <div style={{ width: '34%' }}>
            {sideSections.map((s) => (
              <Fragment key={s.id}>{renderSection(s)}</Fragment>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {mainSections.map((s) => (
              <Fragment key={s.id}>{renderSection(s)}</Fragment>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="resume-doc" style={docStyle}>
      {header}
      <GapDrop index={0} active={!!dropActive} />
      {doc.sections.map((section, sectionIndex) => (
        <Fragment key={section.id}>
          {renderSection(section)}
          <GapDrop index={sectionIndex + 1} active={!!dropActive} />
        </Fragment>
      ))}
    </div>
  )
}
