export interface DiffLine {
  t: 'same' | 'del' | 'add'
  text: string
}

/**
 * Minimal line-level diff (LCS) — enough for résumé bullets/lines. Returns the lines in order,
 * each tagged same/del/add, so the UI can render a GitHub-style before/after.
 */
export function diffLines(a: ReadonlyArray<string>, b: ReadonlyArray<string>): Array<DiffLine> {
  const n = a.length
  const m = b.length
  // dp[i][j] = LCS length of a[i:] and b[j:]
  const dp: Array<Array<number>> = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: Array<DiffLine> = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ t: 'same', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ t: 'del', text: a[i] })
      i++
    } else {
      out.push({ t: 'add', text: b[j] })
      j++
    }
  }
  while (i < n) out.push({ t: 'del', text: a[i++] })
  while (j < m) out.push({ t: 'add', text: b[j++] })
  return out
}
