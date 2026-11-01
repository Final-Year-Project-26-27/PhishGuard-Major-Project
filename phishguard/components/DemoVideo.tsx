'use client'

import { useEffect, useRef, useState } from 'react'

// Scene start times (seconds) in the recording; the list highlights whichever scene is playing
const STEPS = [
  { at: 0, title: 'A fake bank link', body: 'sbi-kyc-update.com is flagged as phishing before anyone types a password.' },
  { at: 10.7, title: 'A paid “internship”', body: 'A Microsoft-branded training offer that hints at “mentor fees” is caught, and the email says why.' },
  { at: 25.1, title: 'A fake offer letter', body: 'An uploaded letter asking for a ₹2,499 laptop deposit by UPI scores 85 out of 100.' },
  { at: 33.7, title: 'A KYC threat', body: 'The message and its link are checked together: high risk, with the reasons listed.' },
  { at: 46.2, title: 'Inside Gmail', body: 'A real pay-to-intern email in a student’s inbox. The extension warns as soon as it opens.' },
]

export default function DemoVideo() {
  const video = useRef<HTMLVideoElement>(null)
  const [step, setStep] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const v = video.current
    if (!v) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true)
      return
    }
    // Play only while on screen
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.4 })
    io.observe(v)
    return () => io.disconnect()
  }, [])

  const onTime = () => {
    const t = video.current?.currentTime ?? 0
    setStep(STEPS.reduce((current, s, i) => (t >= s.at ? i : current), 0))
  }

  return (
    <section className="py-28 lg:py-36 bg-[#121316]">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6">
        <div className="max-w-2xl space-y-4">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05] taste-enter">
            Watch it catch five.
          </h2>
          <p className="text-lg text-zinc-300 leading-relaxed taste-enter-d1">
            A real run of the scanners on this site and the browser extension, recorded as it happened. The first four messages
            are examples; the last is a real scam email from a student’s inbox, with names hidden.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-[1.6fr_1fr] gap-10 lg:gap-14 items-center">
          <div className="rounded-xl bg-[#1b1d21] p-2" data-ui="demo-video">
            <div className="flex items-center gap-1.5 px-2 pb-2">
              <span className="size-2.5 rounded-full bg-zinc-700" />
              <span className="size-2.5 rounded-full bg-zinc-700" />
              <span className="size-2.5 rounded-full bg-zinc-700" />
            </div>
            <video
              ref={video}
              className="w-full aspect-[8/5] rounded-lg bg-[#0c0d0e]"
              poster="/assets/demo/phishguard-demo-poster.jpg"
              muted
              loop
              playsInline
              preload="metadata"
              controls={reduced}
              onTimeUpdate={onTime}
              aria-label="Screen recording: PhishGuard flags a fake bank link, a paid internship email, a fake offer letter, a KYC scam, and a real scam email in Gmail"
            >
              <source src="/assets/demo/phishguard-demo.webm" type="video/webm" />
              <source src="/assets/demo/phishguard-demo.mp4" type="video/mp4" />
            </video>
          </div>

          <ol className="space-y-2">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => {
                    const v = video.current
                    if (!v) return
                    v.currentTime = s.at
                    setStep(i)
                    v.play().catch(() => {})
                  }}
                  className={`w-full text-left rounded-lg p-4 transition-colors ${
                    step === i ? 'bg-[#1b1d21]' : 'hover:bg-[#17191c]'
                  }`}
                >
                  <span className={`block text-lg font-semibold ${step === i ? 'text-white' : 'text-zinc-400'}`}>{s.title}</span>
                  <span className={`block text-base leading-relaxed ${step === i ? 'text-zinc-300' : 'text-zinc-400'}`}>{s.body}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
