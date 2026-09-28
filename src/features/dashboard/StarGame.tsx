import { useEffect, useRef, useState } from 'react'
import { Play, RotateCcw, Star, Trophy, Timer } from 'lucide-react'
import { useI18n } from '@/app/i18n/useI18n'
import { Button } from '@/shared/ui/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/shadcn/card'
import { loadGameScores, saveGameScore } from './gameScores'

const DURATION = 20_000
function nextTarget(previous: number) {
  return (previous + 1 + Math.floor(Math.random() * 15)) % 16
}

export function StarGame() {
  const { t } = useI18n()
  const [scores, setScores] = useState(loadGameScores)
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [remaining, setRemaining] = useState(20)
  const [target, setTarget] = useState(5)
  const [result, setResult] = useState('')
  const deadline = useRef(0)
  const points = useRef(0)
  const active = useRef(false)
  const targetButton = useRef<HTMLButtonElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const finish = useRef(() => {})

  finish.current = () => {
    if (!active.current) return
    active.current = false
    setRunning(false)
    setRemaining(0)
    try { setScores(saveGameScore(points.current)); setResult(t('gameFinished')) }
    catch { setResult(t('scoresUnavailable')) }
  }

  useEffect(() => {
    if (!running) return
    const tick = () => {
      const ms = Math.max(0, deadline.current - Date.now())
      setRemaining(Math.ceil(ms / 1000))
      if (!ms) finish.current()
    }
    const interval = window.setInterval(tick, 100)
    return () => window.clearInterval(interval)
  }, [running])

  useEffect(() => {
    if (running) targetButton.current?.focus({ preventScroll: true })
    else if (result) startButton.current?.focus({ preventScroll: true })
  }, [running, result])

  function start() {
    points.current = 0
    deadline.current = Date.now() + DURATION
    active.current = true
    setScore(0); setRemaining(20); setTarget(nextTarget(target)); setResult(''); setRunning(true)
  }

  return (
    <Card className="min-w-0 gap-5 border-border shadow-none">
      <CardHeader>
        <CardTitle role="heading" aria-level={2} className="flex items-center gap-2 text-base"><Star className="size-4 text-primary" />{t('gameTitle')}</CardTitle>
        <CardDescription className="leading-6">{t('gameBody')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 p-3 text-sm">
          <span className="flex items-center gap-2"><Trophy className="size-4 text-primary" />{t('bestScore')} <strong>{scores.best}</strong></span>
          <span className="flex items-center gap-2 tabular-nums"><Timer className="size-4 text-muted-foreground" />{remaining}s</span>
        </div>
        <div className="relative grid aspect-[4/3] max-h-72 grid-cols-4 grid-rows-4 gap-2 overflow-hidden rounded-lg border border-border bg-[var(--app-panel-strong)] p-2">
          {Array.from({ length: 16 }, (_, index) => <div key={index} className="rounded-md border border-border/40 bg-background/30" />)}
          {running ? <button ref={targetButton} type="button" aria-label={t('gameTarget')}
            className="absolute grid h-1/4 w-1/4 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            style={{ left: `${(target % 4) * 25}%`, top: `${Math.floor(target / 4) * 25}%` }}
            onClick={() => {
              if (!active.current) return
              if (Date.now() >= deadline.current) { finish.current(); return }
              points.current += 1
              setScore(points.current)
              setTarget((current) => nextTarget(current))
            }}>
            <span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-md"><Star className="size-5 fill-current" /></span>
          </button> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 p-4 text-center">
            <Star className="size-7 text-primary" />
            <p className="text-sm font-medium" role="status">{result || t('gameReady')}</p>
            {!!result && <p className="text-2xl font-bold tabular-nums">{score} <span className="text-sm font-normal text-muted-foreground">{t('score').toLowerCase()}</span></p>}
            <Button ref={startButton} type="button" onClick={start}>{result ? <RotateCcw /> : <Play />}{t(result ? 'gameAgain' : 'gameStart')}</Button>
          </div>}
        </div>
        {running && <div className="flex items-center justify-between">
          <p className="text-sm tabular-nums">{t('score')}: <strong className="text-lg">{score}</strong></p>
          <Button type="button" size="sm" variant="ghost" onClick={() => { active.current = false; setRunning(false); setResult(t('gameAbandoned')) }}>{t('gameStop')}</Button>
        </div>}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">{t('scoreHistory')}</h3>
          {scores.history.length ? <ol className="divide-y divide-border">{scores.history.slice(0, 5).map((entry) => <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-xs text-muted-foreground">
            <time dateTime={entry.playedAt}>{new Date(entry.playedAt).toLocaleString()}</time><span className="shrink-0 font-semibold text-foreground">{entry.score} {t('score').toLowerCase()}</span>
          </li>)}</ol> : <p className="py-2 text-sm text-muted-foreground">{t('noScores')}</p>}
          <p className="text-xs leading-5 text-muted-foreground">{t('scoresLocal')}</p>
        </div>
      </CardContent>
    </Card>
  )
}
