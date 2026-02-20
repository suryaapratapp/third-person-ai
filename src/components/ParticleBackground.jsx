import { useEffect, useRef } from 'react'

export default function ParticleBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const context = canvas.getContext('2d')
    if (!context) return undefined

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4 }

    let particles = []
    let rafId = 0
    let isAnimating = false

    const getCount = () => {
      const area = window.innerWidth * window.innerHeight
      return Math.max(70, Math.min(126, Math.floor(area / 16500)))
    }

    const setCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const createParticles = () => {
      particles = Array.from({ length: getCount() }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.8 + 0.9,
      }))
    }

    const drawFrame = (animate) => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)

      particles.forEach((particle) => {
        if (animate) {
          const dx = pointer.x - particle.x
          const dy = pointer.y - particle.y
          const distSq = dx * dx + dy * dy

          if (distSq < 26000) {
            particle.vx += dx * 0.000004
            particle.vy += dy * 0.000004
          }

          particle.vx *= 0.985
          particle.vy *= 0.985
          particle.x += particle.vx
          particle.y += particle.vy

          if (particle.x < -8) particle.x = window.innerWidth + 8
          if (particle.x > window.innerWidth + 8) particle.x = -8
          if (particle.y < -8) particle.y = window.innerHeight + 8
          if (particle.y > window.innerHeight + 8) particle.y = -8
        }

        context.beginPath()
        context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
        context.shadowBlur = 8
        context.shadowColor = 'rgba(103, 232, 249, 0.22)'
        context.fillStyle = 'rgba(203, 213, 225, 0.28)'
        context.fill()
      })
      context.shadowBlur = 0

      const maxDist = 115
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.11
            context.strokeStyle = `rgba(125, 211, 252, ${alpha})`
            context.lineWidth = 1
            context.beginPath()
            context.moveTo(a.x, a.y)
            context.lineTo(b.x, b.y)
            context.stroke()
          }
        }
      }
    }

    const startAnimation = () => {
      if (isAnimating) return
      isAnimating = true
      const frame = () => {
        drawFrame(true)
        rafId = window.requestAnimationFrame(frame)
      }
      rafId = window.requestAnimationFrame(frame)
      window.addEventListener('pointermove', onPointerMove)
    }

    const stopAnimation = () => {
      if (!isAnimating) return
      isAnimating = false
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onPointerMove)
      drawFrame(false)
    }

    const onPointerMove = (event) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
    }

    const onResize = () => {
      setCanvasSize()
      createParticles()
      drawFrame(!reducedMotionQuery.matches)
    }

    const onMotionPreferenceChange = (event) => {
      if (event.matches) {
        stopAnimation()
      } else {
        startAnimation()
      }
    }

    setCanvasSize()
    createParticles()

    if (reducedMotionQuery.matches) {
      drawFrame(false)
    } else {
      startAnimation()
    }

    window.addEventListener('resize', onResize)
    reducedMotionQuery.addEventListener('change', onMotionPreferenceChange)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      reducedMotionQuery.removeEventListener('change', onMotionPreferenceChange)
    }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0 opacity-55" aria-hidden="true" />
}
