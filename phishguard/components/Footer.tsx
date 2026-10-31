'use client'

import Link from 'next/link'
import { Shield, ArrowUp, Activity } from 'lucide-react'

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="bg-[#08090a] text-zinc-300 text-sm font-sans pt-16 pb-12">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Identity & Scope */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <div className="size-6 rounded bg-zinc-800 flex items-center justify-center">
                <Shield className="size-3.5 text-emerald-400" />
              </div>
              <span>PhishGuard</span>
            </div>
            <p className="text-zinc-400 text-base leading-relaxed">
              Cybersecurity platform designed for students and universities. Intercepts deceptive outreach, fake internship fees, and credential theft across communication channels.
            </p>
            <div className="flex items-center gap-2 pt-1 text-sm text-zinc-300">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Defense system online</span>
            </div>
          </div>

          {/* Core Scanners */}
          <div>
            <h4 className="text-base font-semibold text-white mb-3">
              Detection engines
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/link" className="text-zinc-400 hover:text-white transition-colors">
                  URL link inspector
                </Link>
              </li>
              <li>
                <Link href="/email" className="text-zinc-400 hover:text-white transition-colors">
                  Internship scam classifier
                </Link>
              </li>
              <li>
                <Link href="/doc" className="text-zinc-400 hover:text-white transition-colors">
                  Document analysis
                </Link>
              </li>
              <li>
                <Link href="/scanner" className="text-zinc-400 hover:text-white transition-colors">
                  Unified workstation
                </Link>
              </li>
            </ul>
          </div>

          {/* Defense Surfaces */}
          <div>
            <h4 className="text-base font-semibold text-white mb-3">
              Protection surfaces
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/install" className="text-zinc-400 hover:text-white transition-colors">
                  Chrome extension (MV3)
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                  Telemetry feed
                </Link>
              </li>
              <li>
                <Link href="/awareness" className="text-zinc-400 hover:text-white transition-colors">
                  Defense training
                </Link>
              </li>
              <li>
                <Link href="/report" className="text-zinc-400 hover:text-white transition-colors">
                  Report incident
                </Link>
              </li>
            </ul>
          </div>

          {/* Technical Telemetry */}
          <div>
            <h4 className="text-base font-semibold text-white mb-3">
              Architecture telemetry
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900">
                <span className="text-zinc-400">ML backend</span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <Activity className="size-3" /> REST :8000
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900">
                <span className="text-zinc-400">Trained models</span>
                <span className="text-zinc-200">5 active pipelines</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900">
                <span className="text-zinc-400">Interceptors</span>
                <span className="text-zinc-200">Gmail · WA · LinkedIn</span>
              </div>
            </div>
          </div>

        </div>

        {/* Archival Photography Credits (Tasteskill floor) */}
        <div className="pt-6 text-sm text-zinc-400 leading-relaxed max-w-3xl">
          <p>
            Archival imagery: &ldquo;Virginia Tech - data center&rdquo; by Christopher Bowns, CC BY-SA 2.0; &ldquo;ORACLE computer at Oak Ridge National Lab&rdquo; by US Atomic Energy Commission, public domain; &ldquo;Mainframe Computer&rdquo; by Pargon, CC BY 2.0; &ldquo;GE-645-mainframe-1968&rdquo; by Dóeltenga, CC BY-SA 4.0, via Wikimedia Commons.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
          <p>
            © {new Date().getFullYear()} PhishGuard. Open source academic cybersecurity initiative.
          </p>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors px-2 py-1 rounded hover:bg-zinc-900"
          >
            <span>Top of page</span>
            <ArrowUp className="size-3" />
          </button>
        </div>
      </div>
    </footer>
  )
}
