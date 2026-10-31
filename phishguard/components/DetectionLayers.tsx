'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldBan } from 'lucide-react'

const layers = [
  {
    name: 'Machine-learning models',
    title: 'Machine-learning models score it',
    body: 'Models trained on real internship scams and phishing links read the message and the link. They look for the signals scammers repeat: fees to join, payment by UPI, deadlines measured in hours, domains that copy a real company.',
    verdict: 'Likely scam · 94%',
  },
  {
    name: 'AI language model',
    title: 'An AI language model explains it',
    body: 'A score alone doesn’t help you decide. A language model reads the message the way a careful friend would and tells you, in plain words, what gives it away.',
    verdict: 'Scam, explained',
  },
  {
    name: 'Browser rules',
    title: 'Browser rules block the click',
    body: 'If you click anyway, rules running inside the PhishGuard extension stop the page before it loads, in Gmail, WhatsApp Web, LinkedIn or any other tab.',
    verdict: 'Link blocked',
  },
]

function Flag({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <mark
      className={`rounded-sm px-0.5 -mx-0.5 text-inherit motion-safe:transition-colors motion-safe:duration-500 ${
        on ? 'bg-red-500/25 text-red-100' : 'bg-transparent'
      }`}
    >
      {children}
    </mark>
  )
}

export default function DetectionLayers() {
  // Without script, and on phones, the card shows every layer applied.
  const [active, setActive] = useState(2)
  const steps = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return
    setActive(-1)
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.layer))
      },
      { rootMargin: '-45% 0px -45% 0px' }
    )
    steps.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  // -1 is "not reached yet" on desktop, before the first layer scrolls into view
  const verdict = active < 0 ? 'Checking…' : layers[active].verdict
  const verdictTone = ['bg-zinc-700 text-zinc-100', 'bg-amber-400 text-zinc-950', 'bg-orange-400 text-zinc-950', 'bg-red-600 text-white'][
    active + 1
  ]

  return (
    <section className="py-28 lg:py-36 bg-[#121316]">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6">
        <div className="max-w-2xl space-y-4">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05] taste-enter">
            Three checks on every message.
          </h2>
          <p className="text-lg text-zinc-300 leading-relaxed taste-enter-d1">
            One fake internship offer, followed through each layer of PhishGuard.
          </p>
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* The pinned message: a fragment of the real warning UI */}
          <div className="lg:sticky lg:top-24" data-ui="layer-demo">
            <div className="rounded-lg bg-[#1b1d21] p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 shrink-0 rounded-full bg-zinc-700 grid place-items-center text-sm font-semibold text-zinc-200">
                    TN
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white truncate">TechNova Placement Cell</p>
                    <p className="text-sm text-zinc-400">WhatsApp · 9:41 AM</p>
                  </div>
                </div>
                <span
                  key={active}
                  className={`shrink-0 rounded px-2.5 py-1 text-sm font-semibold motion-safe:animate-[verdictIn_0.4s_cubic-bezier(0.16,1,0.3,1)] ${verdictTone}`}
                >
                  {verdict}
                </span>
              </div>

              <p className="rounded-lg rounded-tl-none bg-[#232529] p-4 text-base leading-relaxed text-zinc-100">
                Congratulations! You are shortlisted for the Web Development Internship.{' '}
                <Flag on={active >= 0}>Pay ₹1,999 registration fee via UPI</Flag>{' '}
                <Flag on={active >= 0}>within 24 hours</Flag> to confirm your seat:{' '}
                <span
                  className={`break-all motion-safe:transition-colors motion-safe:duration-500 ${
                    active >= 2 ? 'text-red-300 line-through decoration-2' : 'text-sky-300 underline'
                  }`}
                >
                  technova-careers.xyz/confirm
                </span>
              </p>

              <div className="space-y-2" aria-live="polite">
                <div className="flex justify-between text-sm text-zinc-300">
                  <span>Scam likelihood</span>
                  <span className="font-semibold text-white">{active >= 0 ? '94%' : '…'}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full w-full origin-left rounded-full bg-red-500 motion-safe:transition-transform motion-safe:duration-1000 ${
                      active >= 0 ? 'scale-x-[0.94]' : 'scale-x-0'
                    }`}
                  />
                </div>
              </div>

              <div
                className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-500 ${
                  active >= 1 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="rounded-lg bg-[#232529] p-4 text-base leading-relaxed text-zinc-200">
                    <span className="font-semibold text-white">Why this is a scam: </span>
                    real employers never charge you to join. The 24-hour deadline is there to rush you before you check,
                    and the link isn’t on TechNova’s own website.
                  </p>
                </div>
              </div>

              <div
                className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-500 ${
                  active >= 2 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex items-center gap-3 rounded-lg bg-red-950/70 p-4 text-base text-red-100">
                    <ShieldBan className="size-5 shrink-0 text-red-300" />
                    <span>PhishGuard stopped technova-careers.xyz from opening.</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-400">Example message. TechNova is a made-up company.</p>
          </div>

          <ol className="space-y-16 lg:space-y-0">
            {layers.map((l, i) => (
              <li
                key={l.name}
                ref={(el) => {
                  steps.current[i] = el
                }}
                data-layer={i}
                className="lg:min-h-[70vh] lg:flex lg:flex-col lg:justify-center"
              >
                <div
                  className={`space-y-4 motion-safe:transition-opacity motion-safe:duration-500 ${
                    active === i ? 'lg:opacity-100' : 'lg:opacity-40'
                  }`}
                >
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{l.title}</h3>
                  <p className="text-lg text-zinc-300 leading-relaxed max-w-md">{l.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
