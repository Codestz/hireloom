import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  createResume,
  deleteResume,
  duplicateResume,
  getOrCreateLatestResume,
  listResumes,
  renameResume,
  updateResumeData,
} from './resumes'

afterEach(async () => {
  await db.resumes.clear()
})

// distinct wall-clock ms so updatedAt ordering is deterministic in fast tests
const tick = () => new Promise((r) => setTimeout(r, 5))

describe('resume repository (IndexedDB)', () => {
  it('creates and lists resumes', async () => {
    const a = await createResume({ title: 'First' })
    expect(a.id).toBeTruthy()
    expect(a.title).toBe('First')

    const list = await listResumes()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(a.id)
  })

  it('blank title falls back to a default', async () => {
    const r = await createResume({ title: '   ' })
    expect(r.title).toBe('Untitled resume')
  })

  it('updates content and bumps updatedAt; orders by recency', async () => {
    const a = await createResume({ title: 'A' })
    await tick()
    const b = await createResume({ title: 'B' })
    await tick()
    await updateResumeData(a.id, {
      basics: { name: 'Updated' },
    })

    const list = await listResumes()
    // a was updated last → should be first
    expect(list[0].id).toBe(a.id)
    expect(list[0].data.basics?.name).toBe('Updated')
    expect(list[1].id).toBe(b.id)
  })

  it('renames and deletes', async () => {
    const a = await createResume({ title: 'Old' })
    await renameResume(a.id, 'New')
    await deleteResume(a.id)
    expect(await listResumes()).toHaveLength(0)
  })

  it('duplicates with a deep copy', async () => {
    const a = await createResume({
      title: 'Orig',
      data: { basics: { name: 'Ada' }, skills: [{ name: 'X' }] },
    })
    const copy = await duplicateResume(a.id)
    expect(copy?.title).toBe('Orig (copy)')
    expect(copy?.id).not.toBe(a.id)

    // mutate copy, original must be untouched (deep clone)
    await updateResumeData(copy!.id, { basics: { name: 'Changed' } })
    const orig = (await listResumes()).find((r) => r.id === a.id)
    expect(orig?.data.basics?.name).toBe('Ada')
  })

  it('getOrCreateLatestResume seeds an empty resume when store is empty', async () => {
    const created = await getOrCreateLatestResume()
    expect(created.id).toBeTruthy()
    expect(await listResumes()).toHaveLength(1)

    // second call returns the same (latest) record, does not create another
    const again = await getOrCreateLatestResume()
    expect(again.id).toBe(created.id)
    expect(await listResumes()).toHaveLength(1)
  })
})
