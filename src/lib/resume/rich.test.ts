import { describe, expect, it } from 'vitest'
import { plainTextToRich, richToPlainText, isRichText } from './rich'

const doc = {
  type: 'doc' as const,
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Led the team.' }] },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Shipped X' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Cut cost 30%' }],
            },
          ],
        },
      ],
    },
  ],
}

describe('rich text', () => {
  it('passes through plain strings', () => {
    expect(richToPlainText('just text')).toBe('just text')
    expect(richToPlainText(undefined)).toBe('')
  })

  it('projects a rich doc to plain text with bullets', () => {
    expect(richToPlainText(doc)).toBe(
      'Led the team.\n- Shipped X\n- Cut cost 30%',
    )
  })

  it('round-trips plain text → rich → plain', () => {
    const text = 'Intro line\n- first\n- second'
    const rich = plainTextToRich(text)
    expect(isRichText(rich)).toBe(true)
    expect(richToPlainText(rich)).toBe(text)
  })

  it('isRichText distinguishes docs from strings', () => {
    expect(isRichText(doc)).toBe(true)
    expect(isRichText('text')).toBe(false)
    expect(isRichText(null)).toBe(false)
  })
})
