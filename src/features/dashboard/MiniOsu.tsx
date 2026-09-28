import { useEffect, useRef, useState } from 'react'
import { Play, RotateCcw, Crosshair, Trophy, Timer } from 'lucide-react'
import { useI18n } from '@/app/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { Button } from '@/shared/ui/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/shadcn/card'
import { loadGameScores, saveGameScore } from './gameScores'
import { MiniOsuCanvas, type Point, type Target } from './MiniOsuCanvas'

const DURATION = 20_000
const TARGET_SIZES = { easy: 52, hard: 32 } as const
type Difficulty = keyof typeof TARGET_SIZES
// Keep both circles comfortably inside narrow phone screens.
const positions = [28, 50, 72].flatMap((y) => [22, 50, 78].map((x) => ({ x, y })))

function nextPoint(previous: Point, before?: Point): Point {
  const choices = positions.filter((point) => Math.hypot(point.x - previous.x, point.y - previous.y) >= 30
    && (point.x !== before?.x || point.y !== before?.y))
  return choices[Math.floor(Math.random() * choices.length)]
}

export function MiniOsu() {
  const { t } = useI18n()
  const play = useSoundFeedback()
  const [scores, setScores] = useState(loadGameScores)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const targetSize = TARGET_SIZES[difficulty]
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [remaining, setRemaining] = useState(20)
  const [target, setTarget] = useState<Target | null>(null)
  const [result, setResult] = useState('')
  const deadline = useRef(0)
  const points = useRef(0)
  const active = useRef(false)
  const currentTarget = useRef<Target | null>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const finish = useRef(() => {})

  finish.current = () => {
    if (!active.current) return
    active.current = false
    currentTarget.current = null
    setRunning(false)
    setRemaining(0)
    try { setScores(saveGameScore(points.current)); setResult(t('gameFinished')) }
    catch { setResult(t('scoresUnavailable')) }
  }

  function advance() {
    const previous = currentTarget.current
    if (!previous || !active.current) return
    const next = { current: previous.next, next: nextPoint(previous.next, previous.current), number: previous.number + 1 }
    currentTarget.current = next
    setTarget(next)
  }

  useEffect(() => {
    if (!running) return
    const tick = () => {
      const now = performance.now()
      const ms = Math.max(0, deadline.current - now)
      setRemaining(Math.ceil(ms / 1000))
      if (!ms) { finish.current(); return }
    }
    // Targets advance only on a hit, never on the timer.
    const interval = window.setInterval(tick, 200)
    const onVisibilityChange = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      active.current = false
    }
  }, [running])

  useEffect(() => {
    if (!running && result) startButton.current?.focus({ preventScroll: true })
  }, [running, result])

  function start() {
    const now = performance.now()
    const current = positions[Math.floor(Math.random() * positions.length)]
    const first = { current, next: nextPoint(current), number: 1 }
    points.current = 0
    deadline.current = now + DURATION
    active.current = true
    currentTarget.current = first
    setScore(0); setRemaining(20); setTarget(first)
    setResult(''); setRunning(true)
  }

  function hit(number: number) {
    const current = currentTarget.current
    if (!active.current || !current || current.number !== number) return
    const now = performance.now()
    if (now >= deadline.current) { finish.current(); return }
    points.current += 1
    setScore(points.current)
    play('tap')
    advance()
  }

  return (
    <Card className="min-w-0 gap-5 border-border shadow-none">
      <CardHeader>
        <CardTitle role="heading" aria-level={2} className="flex items-center gap-2 text-base"><Crosshair className="size-4 text-primary" />{t('gameTitle')}</CardTitle>
        <CardDescription className="leading-6">{t('gameBody')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t('gameDifficulty')}</p>
          <div role="group" aria-label={t('gameDifficulty')} className="flex gap-2">
            {(['easy', 'hard'] as const).map((level) => <Button key={level} type="button" size="sm"
              className="flex-1" variant={difficulty === level ? 'default' : 'outline'}
              aria-pressed={difficulty === level} disabled={running} onClick={() => setDifficulty(level)}>
              {t(level === 'easy' ? 'gameEasy' : 'gameHard')}
            </Button>)}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{t('gameDifficultyHint')}</p>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 p-3 text-sm">
          <span className="flex items-center gap-2"><Trophy className="size-4 text-primary" />{t('bestScore')} <strong>{scores.best}</strong></span>
          <span className="flex items-center gap-2 tabular-nums"><Timer className="size-4 text-muted-foreground" />{remaining}s</span>
        </div>
        <div className="relative aspect-[4/3] max-h-72 overflow-hidden rounded-lg border border-border bg-[var(--app-panel-strong)]"
          style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          {running && target ? <MiniOsuCanvas target={target} targetSize={targetSize}
            nextLabel={t('gameNext')} trailLabel={t('gameFollowTrail')}
            label={`${t('gameTarget')} ${target.number}. ${t('gameHint')}`} onHit={hit} />
            : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-4 text-center">
            <Crosshair className="size-7 text-primary" />
            <p className="text-sm font-medium" role="status">{result || t('gameReady')}</p>
            {!!result && <p className="text-2xl font-bold tabular-nums">{score} <span className="text-sm font-normal text-muted-foreground">{t(score === 1 ? 'gamePoint' : 'score').toLowerCase()}</span></p>}
            <Button ref={startButton} type="button" onClick={start}>{result ? <RotateCcw /> : <Play />}{t(result ? 'gameAgain' : 'gameStart')}</Button>
          </div>}
        </div>
        {running && <div className="flex items-center justify-between">
          <p className="text-sm tabular-nums">{t('score')}: <strong className="text-lg">{score}</strong></p>
          <Button type="button" size="sm" variant="ghost" onClick={() => { active.current = false; currentTarget.current = null; setRunning(false); setResult(t('gameAbandoned')) }}>{t('gameStop')}</Button>
        </div>}
        <p className="text-xs leading-5 text-muted-foreground">{t('gameHint')}</p>
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">{t('scoreHistory')}</h3>
          {scores.history.length ? <ol className="divide-y divide-border">{scores.history.slice(0, 5).map((entry) => <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-xs text-muted-foreground">
            <time dateTime={entry.playedAt}>{new Date(entry.playedAt).toLocaleString()}</time><span className="shrink-0 font-semibold text-foreground">{entry.score} {t(entry.score === 1 ? 'gamePoint' : 'score').toLowerCase()}</span>
          </li>)}</ol> : <p className="py-2 text-sm text-muted-foreground">{t('noScores')}</p>}
          <p className="text-xs leading-5 text-muted-foreground">{t('scoresLocal')}</p>
        </div>
      </CardContent>
    </Card>
  )
}
