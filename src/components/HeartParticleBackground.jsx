import { useEffect, useRef } from 'react'

const PALETTE = [
  'rgba(251, 113, 133, 0.4)',
  'rgba(217, 70, 239, 0.34)',
  'rgba(103, 232, 249, 0.3)',
]

function drawHeart(context, x, y, size, color) {
  const half = size * 0.5
  context.beginPath()
  context.moveTo(x, y + half * 0.35)
  context.bezierCurveTo(x - half, y - half * 0.25, x - half * 0.75, y - size, x, y - half * 0.4)
  context.bezierCurveTo(x + half * 0.75, y - size, x + half, y - half * 0.25, x, y + half * 0.35)
  context.closePath()
  context.fillStyle = color
  context.fill()
}

export default function HeartParticleBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const context = canvas.getContext('2d')
    if (!context) return undefined

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 }

    let hearts = []
    let rafId = 0
    let resizeTimer = 0
    let frameTick = 0

    const getCount = () => {
      const area = window.innerWidth * window.innerHeight
      return Math.max(60, Math.min(90, Math.floor(area / 17000)))
    }

    const setCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const createHearts = () => {
      hearts = Array.from({ length: getCount() }, (_, index) => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 7 + 4,
        vy: Math.random() * 0.16 + 0.12,
        drift: (Math.random() - 0.5) * 0.45,
        phase: Math.random() * Math.PI * 2,
        color: PALETTE[index % PALETTE.length],
      }))
    }

    const resetHeart = (heart) => ({
      ...heart,
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + Math.random() * 80,
      phase: Math.random() * Math.PI * 2,
    })

    const render = (animate) => {
      frameTick += 1
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)

      hearts = hearts.map((heart) => {
        let next = heart
        if (animate) {
          const mouseDx = (pointer.x - window.innerWidth * 0.5) * 0.00035
          const wobble = Math.sin(frameTick * 0.012 + heart.phase) * heart.drift
          const lift = heart.y - heart.vy
          const horizontal = heart.x + wobble + mouseDx * (heart.size / 4)

          next = {
            ...heart,
            y: lift,
            x: horizontal,
          }

          if (next.y < -24) {
            next = resetHeart(next)
          }
        }

        drawHeart(context, next.x, next.y, next.size, next.color)
        return next
      })
    }

    const onPointerMove = (event) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
    }

    const animate = () => {
      render(true)
      rafId = window.requestAnimationFrame(animate)
    }

    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        setCanvasSize()
        createHearts()
        render(!reducedMotionQuery.matches)
      }, 120)
    }

    const onMotionChange = (event) => {
      window.cancelAnimationFrame(rafId)
      if (event.matches) {
        render(false)
      } else {
        rafId = window.requestAnimationFrame(animate)
      }
    }

    setCanvasSize()
    createHearts()
    render(!reducedMotionQuery.matches)

    if (!reducedMotionQuery.matches) {
      rafId = window.requestAnimationFrame(animate)
      window.addEventListener('pointermove', onPointerMove)
    }

    window.addEventListener('resize', onResize)
    reducedMotionQuery.addEventListener('change', onMotionChange)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      reducedMotionQuery.removeEventListener('change', onMotionChange)
      if (resizeTimer) window.clearTimeout(resizeTimer)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 opacity-80"
      aria-hidden="true"
      style={{
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
      }}
    />
  )
}
