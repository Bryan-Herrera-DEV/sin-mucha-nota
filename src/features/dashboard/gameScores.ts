export type GameScore = { id: string; score: number; playedAt: string }
export type GameScores = { best: number; history: GameScore[] }
const STORAGE_KEY = 'sin-mucha-nota-star-scores-v1'
const MAX_HISTORY = 30

export function loadGameScores(): GameScores {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return { best: 0, history: [] }
    const saved = value as Partial<GameScores>
    const history = Array.isArray(saved.history) ? saved.history.filter((entry): entry is GameScore =>
      !!entry && typeof entry.id === 'string' && Number.isInteger(entry.score) && entry.score >= 0 &&
      typeof entry.playedAt === 'string' && Number.isFinite(Date.parse(entry.playedAt)),
    ).slice(0, MAX_HISTORY) : []
    const best = Number.isInteger(saved.best) && (saved.best ?? 0) >= 0 ? saved.best! : 0
    return { best: Math.max(best, ...history.map((entry) => entry.score)), history }
  } catch { return { best: 0, history: [] } }
}

export function saveGameScore(score: number): GameScores {
  const current = loadGameScores()
  const result = {
    best: Math.max(current.best, score),
    history: [{ id: crypto.randomUUID(), score, playedAt: new Date().toISOString() }, ...current.history].slice(0, MAX_HISTORY),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
  return result
}
