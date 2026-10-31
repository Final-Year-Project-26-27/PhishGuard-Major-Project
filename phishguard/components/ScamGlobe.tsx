'use client'

import createGlobe from 'cobe'
import { useEffect, useRef } from 'react'

// NMAMIT, Nitte: where PhishGuard is built. Arcs run from here to student cities.
const HOME: [number, number] = [13.1856, 74.9378]
const CITIES: [number, number][] = [
  [12.9716, 77.5946], // Bengaluru
  [19.076, 72.8777], // Mumbai
  [28.6139, 77.209], // Delhi
  [17.385, 78.4867], // Hyderabad
  [13.0827, 80.2707], // Chennai
  [22.5726, 88.3639], // Kolkata
  [18.5204, 73.8567], // Pune
  [25.2048, 55.2708], // Dubai
  [1.3521, 103.8198], // Singapore
  [51.5072, -0.1276], // London
  [40.7128, -74.006], // New York
]
const TEAL: [number, number, number] = [0.18, 0.83, 0.75]
// cobe's phi for a longitude so that it faces the viewer
const facing = (lon: number) => Math.PI - ((lon * Math.PI) / 180 - Math.PI / 2)

export default function ScamGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = canvas.offsetWidth
    // start west of India so it turns into view rather than away
    let phi = facing(HOME[1]) - 0.7
    let dragFrom: number | null = null
    let dragged = 0
    let visible = false
    let frame = 0

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi,
      theta: 0.28,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 5,
      baseColor: [0.2, 0.21, 0.23],
      markerColor: TEAL,
      glowColor: [0.08, 0.09, 0.1],
      markers: [{ location: HOME, size: 0.09, id: 'home' }, ...CITIES.map((location) => ({ location, size: 0.035 }))],
      arcs: CITIES.map((to) => ({ from: HOME, to })),
      arcColor: TEAL,
      arcWidth: 0.5,
      arcHeight: 0.25,
    })

    const tick = () => {
      if (visible && dragFrom === null && !still) phi += 0.0015
      globe.update({ phi: phi + dragged })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    // Only spin while on screen.
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(canvas)

    const onResize = () => {
      width = canvas.offsetWidth
      globe.update({ width: width * 2, height: width * 2 })
    }
    window.addEventListener('resize', onResize)

    const down = (e: PointerEvent) => {
      dragFrom = e.clientX - dragged * 200
      canvas.style.cursor = 'grabbing'
    }
    const up = () => {
      dragFrom = null
      canvas.style.cursor = 'grab'
    }
    const move = (e: PointerEvent) => {
      if (dragFrom !== null) dragged = (e.clientX - dragFrom) / 200
    }
    canvas.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointermove', move)

    requestAnimationFrame(() => (canvas.style.opacity = '1'))

    return () => {
      cancelAnimationFrame(frame)
      io.disconnect()
      globe.destroy()
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointermove', move)
    }
  }, [])

  return (
    <div className="relative aspect-square w-full max-w-[560px] mx-auto">
      <canvas
        ref={canvasRef}
        className="size-full cursor-grab opacity-0 motion-safe:transition-opacity motion-safe:duration-1000 touch-pan-y"
        aria-label="A spinning globe with lines from Nitte, Karnataka to cities across India and the world"
        role="img"
      />
      <span className="globe-home-label hidden rounded bg-teal-300 px-2.5 py-1 text-sm font-semibold text-zinc-950 whitespace-nowrap pointer-events-none">
        Built here · NMAMIT, Nitte
      </span>
    </div>
  )
}
