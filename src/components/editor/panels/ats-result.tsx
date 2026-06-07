/** The deterministic keyword-match display: score, matched/missing chips, coverage by section. */

interface Match {
  score: number
  matched: Array<{ term: string }>
  missing: Array<{ term: string }>
}

function Chips({ terms, tone }: { terms: Array<string>; tone: 'ok' | 'miss' }) {
  return (
    <div className="flex flex-wrap gap-1">
      {terms.map((t) => (
        <span
          key={t}
          className={
            tone === 'ok'
              ? 'rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary'
              : 'rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700'
          }
        >
          {t}
        </span>
      ))}
    </div>
  )
}

export function MatchResult({
  result,
  coverage,
  scoreColor,
}: {
  result: Match
  coverage: Array<{ name: string; hits: number }>
  scoreColor: string
}) {
  return (
    <>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums" style={{ color: scoreColor }}>
          {result.score}%
        </span>
        <span className="text-xs text-muted-foreground">
          {result.matched.length} of {result.matched.length + result.missing.length} keywords present
        </span>
      </div>

      {result.missing.length ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Missing ({result.missing.length})
          </span>
          <Chips terms={result.missing.map((k) => k.term)} tone="miss" />
        </div>
      ) : null}

      {result.matched.length ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Matched ({result.matched.length})
          </span>
          <Chips terms={result.matched.map((k) => k.term)} tone="ok" />
        </div>
      ) : null}

      {coverage.length ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Coverage by section
          </span>
          {coverage.map((s) => (
            <div key={s.name} className="flex items-center justify-between text-[11px]">
              <span className="text-foreground/90">{s.name}</span>
              <span className="text-muted-foreground">
                {s.hits} keyword{s.hits === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}
