'use client'

import Link from 'next/link'
import { Shield, ArrowUp, Activity } from 'lucide-react'

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-zinc-400 text-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">

          {/* Identity & Scope */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
              <div className="size-6 rounded border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                <Shield className="size-3.5 text-zinc-200" />
              </div>
              <span>PhishGuard</span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Multi-surface threat detection engine built to protect academic communities from deceptive outreach, fake internship scams, and credential theft.
            </p>
            <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-zinc-500">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>DEFENSE SYSTEM ONLINE</span>
            </div>
          </div>

          {/* Core Scanners */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 mb-3">
              Detection Engines
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/link" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  URL / Link Inspector
                </Link>
              </li>
              <li>
                <Link href="/email" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  Internship & Email Scam Classifier
                </Link>
              </li>
              <li>
                <Link href="/doc" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  Document Analysis (PDF / DOCX)
                </Link>
              </li>
              <li>
                <Link href="/scanner" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  Unified Inspection Workstation
                </Link>
              </li>
            </ul>
          </div>

          {/* Defense Surfaces */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 mb-3">
              Protection Surfaces
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/install" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  Browser Extension (MV3)
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  Institutional Telemetry Feed
                </Link>
              </li>
              <li>
                <Link href="/awareness" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  Interactive Defense Training
                </Link>
              </li>
              <li>
                <Link href="/report" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  Community Threat Reporting
                </Link>
              </li>
            </ul>
          </div>

          {/* Technical Telemetry */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 mb-3">
              Architecture Status
            </h4>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400">ML Backend</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Activity className="size-3" /> REST :8000
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400">Models</span>
                <span className="text-zinc-200">5 Pipelines</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400">Interceptors</span>
                <span className="text-zinc-200">Gmail · WA · LinkedIn</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 font-mono text-[11px]">
            © {new Date().getFullYear()} PhishGuard. Open source academic cybersecurity initiative.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 font-mono text-[11px] transition-colors px-2 py-1 rounded hover:bg-zinc-900"
            >
              <span>TOP</span>
              <ArrowUp className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
