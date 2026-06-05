import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronRightIcon,
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon,
  UserRoundIcon,
} from 'lucide-react'
import { useState } from 'react'
import type { DocSection } from '#/lib/blocks/document'
import { getSection } from '#/lib/blocks/sections'
import type { FieldDef } from '#/lib/blocks'
import { headerBlock } from '#/lib/blocks/defs/header'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from '#/lib/utils.ts'
import type { useBlockDoc } from '#/components/blocks'

type Controller = ReturnType<typeof useBlockDoc>

function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Scroll to a specific field inside a container and drop the cursor into it. */
function focusField(containerId: string, fieldKey: string, part?: string) {
  const container = document.getElementById(containerId)
  const target = container?.querySelector<HTMLElement>(
    `[data-field="${fieldKey}"]`,
  )
  if (!target) {
    container?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const editable = part
    ? target.querySelector<HTMLElement>(`[data-part="${part}"]`)
    : target.matches('[contenteditable]')
      ? target
      : target.querySelector<HTMLElement>('[contenteditable]')
  editable?.focus()
}

function entryLabel(data: Record<string, unknown>): string {
  for (const k of [
    'title',
    'name',
    'institution',
    'company',
    'role',
    'organization',
  ]) {
    const v = data[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return 'Untitled'
}

// ── Tree primitives ────────────────────────────────────────────────────────

function Caret({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={open ? 'Collapse' : 'Expand'}
      onClick={onClick}
      className="flex size-4 items-center justify-center text-muted-foreground/60 hover:text-foreground"
    >
      <ChevronRightIcon
        className={cn('size-3.5 transition-transform', open && 'rotate-90')}
      />
    </button>
  )
}

const FIELD_LABELS: Record<string, string | undefined> = {
  period: 'Dates',
  url: 'Website',
  bullets: 'Highlights',
  tags: 'Items',
}

function fieldLabel(field: FieldDef): string {
  return (
    field.label ??
    FIELD_LABELS[field.key] ??
    field.key.charAt(0).toUpperCase() + field.key.slice(1)
  )
}

function FieldLeaf({
  containerId,
  fieldKey,
  label,
  part,
}: {
  containerId: string
  fieldKey: string
  label: string
  part?: string
}) {
  return (
    <button
      type="button"
      onClick={() => focusField(containerId, fieldKey, part)}
      className="flex w-full items-center gap-1.5 rounded-md py-0.5 pr-1 pl-1.5 text-left text-[12.5px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
    >
      <span className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
      {label}
    </button>
  )
}

/** Field leaves for a block — a daterange becomes two leaves (start / end). */
function fieldLeaves(containerId: string, fields: Array<FieldDef>) {
  return fields.flatMap((f) =>
    f.kind === 'daterange'
      ? [
          <FieldLeaf
            key={`${f.key}:start`}
            containerId={containerId}
            fieldKey={f.key}
            part="start"
            label="Start date"
          />,
          <FieldLeaf
            key={`${f.key}:end`}
            containerId={containerId}
            fieldKey={f.key}
            part="end"
            label="End date"
          />,
        ]
      : [
          <FieldLeaf
            key={f.key}
            containerId={containerId}
            fieldKey={f.key}
            label={fieldLabel(f)}
          />,
        ],
  )
}

function BasicsNode({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <div className="flex items-center gap-0.5 rounded-md py-1 pr-1 pl-0.5 hover:bg-background">
        <Caret open={open} onClick={onToggle} />
        <span className="flex size-5 items-center justify-center text-muted-foreground">
          <UserRoundIcon className="size-3.5" />
        </span>
        <button
          type="button"
          onClick={() => scrollToId('doc-header')}
          className="flex-1 truncate text-left text-sm font-medium text-foreground/90 hover:text-foreground"
        >
          Basics
        </button>
      </div>
      {open ? (
        <div className="mt-0.5 ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
          {fieldLeaves('doc-header', headerBlock.fields)}
        </div>
      ) : null}
    </div>
  )
}

function EntryNode({
  itemId,
  label,
  fields,
  open,
  onToggle,
  onRemove,
}: {
  itemId: string
  label: string
  fields: Array<FieldDef>
  open: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-50')}
    >
      <div className="group/e flex items-center gap-0.5 rounded-md py-1 pr-1 pl-0.5 hover:bg-background">
        <Caret open={open} onClick={onToggle} />
        <span
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex size-5 cursor-grab items-center justify-center text-muted-foreground/40 opacity-0 transition group-hover/e:opacity-100 hover:text-foreground"
        >
          <GripVerticalIcon className="size-3.5" />
        </span>
        <button
          type="button"
          onClick={() => scrollToId(`item-${itemId}`)}
          className="flex-1 truncate text-left text-[13px] text-muted-foreground hover:text-foreground"
          title={label}
        >
          {label}
        </button>
        <button
          type="button"
          aria-label="Delete entry"
          onClick={onRemove}
          className="flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity group-hover/e:opacity-100 hover:text-destructive"
        >
          <Trash2Icon className="size-3" />
        </button>
      </div>
      {open ? (
        <div className="mt-0.5 ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
          {fieldLeaves(`item-${itemId}`, fields)}
        </div>
      ) : null}
    </div>
  )
}

function SectionNode({
  section,
  expanded,
  toggle,
  controller,
}: {
  section: DocSection
  expanded: Set<string>
  toggle: (id: string) => void
  controller: Controller
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })
  const entrySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )
  const st = getSection(section.type)
  if (!st) return null
  const isCollection = st.kind === 'collection'
  const open = expanded.has(section.id)
  const fields = st.def.fields
  // Flat sections (skills, languages) have no entries — surface their tags as children.
  const flatTags = isCollection
    ? []
    : (((section.items.at(0)?.data.tags ?? section.items.at(0)?.data.lines) as
        | Array<string>
        | undefined) ?? [])
  const count = isCollection ? section.items.length : flatTags.length
  const expandable = isCollection || flatTags.length > 0

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-50')}
    >
      <div className="group/s flex items-center gap-0.5 rounded-md py-1 pr-1 pl-0.5 hover:bg-background">
        {expandable ? (
          <Caret open={open} onClick={() => toggle(section.id)} />
        ) : (
          <span className="size-4" />
        )}
        <span
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex size-5 cursor-grab items-center justify-center text-muted-foreground/40 hover:text-foreground"
        >
          <GripVerticalIcon className="size-3.5" />
        </span>
        <button
          type="button"
          onClick={() => scrollToId(`sec-${section.id}`)}
          className="flex-1 truncate text-left text-sm font-medium text-foreground/90 hover:text-foreground"
        >
          {section.heading ?? st.heading}
        </button>
        {count > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {count}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`Delete ${st.heading}`}
          onClick={() => controller.onRemoveSection(section.id)}
          className="flex size-5 items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-opacity group-hover/s:opacity-100 hover:text-destructive"
        >
          <Trash2Icon className="size-3" />
        </button>
      </div>

      {isCollection && open ? (
        <div className="mt-0.5 ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
          <DndContext
            sensors={entrySensors}
            collisionDetection={closestCenter}
            onDragEnd={(e: DragEndEvent) => {
              if (e.over && e.active.id !== e.over.id) {
                controller.onReorderItems(
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
                <EntryNode
                  key={item.id}
                  itemId={item.id}
                  label={entryLabel(item.data)}
                  fields={fields}
                  open={expanded.has(item.id)}
                  onToggle={() => toggle(item.id)}
                  onRemove={() => controller.onRemoveItem(section.id, item.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={() => controller.onAddItem(section.id)}
            className="flex items-center gap-1.5 rounded-md py-1 pl-1.5 text-[13px] text-muted-foreground transition-colors hover:text-primary"
          >
            <PlusIcon className="size-3.5" />
            {st.addLabel}
          </button>
        </div>
      ) : null}

      {!isCollection && open ? (
        <div className="mt-0.5 ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
          {flatTags.map((tag, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToId(`sec-${section.id}`)}
              className="flex items-center gap-1.5 rounded-md py-0.5 pr-1 pl-1.5 text-left text-[12.5px] text-muted-foreground hover:bg-background hover:text-foreground"
              title={tag}
            >
              <span className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
              <span className="truncate">{tag || 'Empty'}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function TreePanel({
  controller,
  availableSections,
}: {
  controller: Controller
  availableSections: Array<{ type: string; label: string }>
}) {
  const { doc } = controller
  // Sections open by default; Basics + individual entries start collapsed.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(doc.sections.map((s) => s.id)),
  )
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex flex-col gap-3 p-2">
      <div>
        <p className="px-1.5 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Structure
        </p>
        <BasicsNode
          open={expanded.has('basics')}
          onToggle={() => toggle('basics')}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e: DragEndEvent) => {
            if (e.over && e.active.id !== e.over.id) {
              controller.onReorderSections(
                String(e.active.id),
                String(e.over.id),
              )
            }
          }}
        >
          <SortableContext
            items={doc.sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {doc.sections.map((s) => (
              <SectionNode
                key={s.id}
                section={s}
                expanded={expanded}
                toggle={toggle}
                controller={controller}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {availableSections.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="justify-start">
              <PlusIcon data-icon="inline-start" />
              Add section
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {availableSections.map((s) => (
              <DropdownMenuItem
                key={s.type}
                onClick={() => controller.onAddSection(s.type)}
              >
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
