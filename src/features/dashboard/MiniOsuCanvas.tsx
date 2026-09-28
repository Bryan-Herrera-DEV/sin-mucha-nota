import { useEffect, useRef } from 'react'

export type Point = { x: number; y: number }
export type Target = { current: Point; next: Point; number: number }

type Props = {
  target: Target
  targetSize: number
  nextLabel: string
  trailLabel: string
  label: string
  onHit: (number: number) => void
}

export function MiniOsuCanvas({ target, targetSize, nextLabel, trailLabel, label, onHit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<HTMLSpanElement>(null)
  const mutedRef = useRef<HTMLSpanElement>(null)
  const previous = useRef<Target | null>(null)

  useEffect(() => {
    canvasRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const last = previous.current
    previous.current = target
    const burst = last && last.number !== target.number ? last.current : null
    const started = performance.now()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0

    function draw() {
      if (!canvas || !context) return
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      const ratio = window.devicePixelRatio || 1
      const pixelWidth = Math.round(width * ratio)
      const pixelHeight = Math.round(height * ratio)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
      context.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0)
      context.clearRect(0, 0, width, height)
      const primary = getComputedStyle(canvas).color
      const ink = inkRef.current ? getComputedStyle(inkRef.current).color : '#fff'
      const muted = mutedRef.current ? getComputedStyle(mutedRef.current).color : primary
      const x = target.current.x * width / 100
      const y = target.current.y * height / 100
      const nextX = target.next.x * width / 100
      const nextY = target.next.y * height / 100
      const radius = targetSize / 2

      const trail = () => {
        context.beginPath()
        context.moveTo(x, y)
        context.quadraticCurveTo(width / 2, (y + nextY) / 2 - height * 0.12, nextX, nextY)
      }
      context.strokeStyle = primary
      context.globalAlpha = 0.15
      context.lineWidth = 6
      trail(); context.stroke()
      context.globalAlpha = 0.7
      context.lineWidth = 2
      context.setLineDash([4, 5])
      trail(); context.stroke()

      context.globalAlpha = 0.6
      context.beginPath()
      context.arc(nextX, nextY, radius - 1, 0, Math.PI * 2)
      context.stroke()
      context.setLineDash([])
      context.globalAlpha = 1
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = '600 14px system-ui, sans-serif'
      context.fillStyle = muted
      context.fillText(String(target.number + 1), nextX, nextY)
      context.font = '500 10px system-ui, sans-serif'
      context.fillText(nextLabel, nextX, nextY + radius + 10)

      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fillStyle = primary
      context.shadowColor = primary
      context.shadowBlur = 14
      context.fill()
      context.shadowBlur = 0
      context.fillStyle = ink
      context.font = '700 14px system-ui, sans-serif'
      context.fillText(String(target.number), x, y)
      context.fillStyle = primary
      context.textAlign = 'left'
      context.font = '500 11px system-ui, sans-serif'
      context.fillText(trailLabel, 12, 14)

      const progress = (performance.now() - started) / 350
      if (burst && !reducedMotion && progress < 1) {
        context.globalAlpha = 0.7 * (1 - progress)
        context.beginPath()
        context.arc(burst.x * width / 100, burst.y * height / 100, radius * (1 + 0.7 * progress), 0, Math.PI * 2)
        context.stroke()
        context.globalAlpha = 1
        frame = requestAnimationFrame(draw)
      }
    }

    const redraw = () => { cancelAnimationFrame(frame); draw() }
    const resize = new ResizeObserver(redraw)
    resize.observe(canvas)
    // Theme changes must update canvas pixels as well as the surrounding UI.
    const theme = new MutationObserver(redraw)
    theme.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] })
    window.addEventListener('resize', redraw)
    draw()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      theme.disconnect()
      window.removeEventListener('resize', redraw)
    }
  }, [target, targetSize, nextLabel, trailLabel])

  return <>
    <span ref={inkRef} aria-hidden="true" className="hidden text-primary-foreground" />
    <span ref={mutedRef} aria-hidden="true" className="hidden text-muted-foreground" />
    <canvas ref={canvasRef} role="img" aria-label={label} tabIndex={0} draggable={false}
      className="absolute inset-0 size-full touch-none select-none text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      onDragStart={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        // Keyboard activation must never score or scroll the game surface.
        if (event.key === 'Enter' || event.key === ' ') event.preventDefault()
      }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return
        event.preventDefault()
        event.currentTarget.focus({ preventScroll: true })
        const bounds = event.currentTarget.getBoundingClientRect()
        const x = event.clientX - bounds.left
        const y = event.clientY - bounds.top
        // Use CSS pixels for both drawing and hit testing, including high-DPI screens.
        const distance = Math.hypot(x - target.current.x * bounds.width / 100, y - target.current.y * bounds.height / 100)
        if (distance <= targetSize / 2) onHit(target.number)
      }} />
  </>
}
