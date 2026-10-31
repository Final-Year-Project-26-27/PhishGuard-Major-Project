'use client'

import Link from 'next/link'
import { Shield, ArrowRight, Layers, Download } from 'lucide-react'

interface HeroSectionProps {
  title?: string
  subtitle?: string
  description?: string
  showCTA?: boolean
}

export default function HeroSection({
  title = "PhishGuard Threat Defense",
  subtitle = "Academic & Institutional Cybersecurity",
  description = "Autonomous ML-powered threat classification and real-time interception engineered for university environments.",
  showCTA = true,
}: HeroSectionProps) {
  return (
    <section className="relative py-16 md:py-24 border-zinc-800 bg-zinc-950 text-zinc-100 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">

        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 text-sm mx-auto">
          <Shield className="size-3 text-zinc-300" />
          <span>{subtitle}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-100 max-w-3xl mx-auto">
          {title}
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>

        {showCTA && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/scanner"
              className="px-4 py-2 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors inline-flex items-center gap-2"
            >
              <Layers className="size-3.5" />
              <span>Launch Workstation</span>
              <ArrowRight className="size-3.5" />
            </Link>

            <Link
              href="/install"
              className="px-4 py-2 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 font-medium text-sm hover:bg-zinc-800 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              <Download className="size-3.5" />
              <span>Deploy Extension</span>
            </Link>
          </div>
        )}

      </div>
    </section>
  )
}
