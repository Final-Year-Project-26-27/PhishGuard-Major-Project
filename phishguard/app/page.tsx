'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Shield,
  Download,
  ArrowRight,
  Terminal,
  Layers,
  RefreshCw,
} from 'lucide-react'
import { API_URL } from '@/lib/utils'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'url' | 'email' | 'offer'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [emailText, setEmailText] = useState('')
  const [senderDomain, setSenderDomain] = useState('')
  const [offerText, setOfferText] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{
    status: 'safe' | 'danger' | 'warning'
    headline: string
    confidence: number
    details: string[]
  } | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const handleQuickScan = async () => {
    setIsScanning(true)
    setScanResult(null)
    setScanError(null)

    try {
      if (activeTab === 'url') {
        if (!urlInput.trim()) return
        const res = await fetch(`${API_URL}/scan/link/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlInput.trim() }),
        })
        if (!res.ok) throw new Error(`Scanner returned status ${res.status}`)
        const data = await res.json()
        const isLegit = data.prediction === 'Legit'
        setScanResult({
          status: isLegit ? 'safe' : 'danger',
          headline: isLegit ? 'Verified clean link' : 'Phishing destination detected',
          confidence: data.confidence,
          details: [
            `Model verdict: ${data.prediction}`,
            `Certainty: ${(data.confidence * 100).toFixed(1)}%`,
            isLegit ? 'No known blacklisted patterns identified.' : 'High probability of credential harvesting or impersonation.',
          ],
        })
      } else if (activeTab === 'email') {
        if (!emailText.trim()) return
        const res = await fetch(`${API_URL}/scan/email/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text_content: emailText.trim(),
            sender_domain: senderDomain.trim() || 'gmail.com',
          }),
        })
        if (!res.ok) throw new Error(`Scanner returned status ${res.status}`)
        const data = await res.json()
        const isLegit = data.prediction === 'Legit'
        setScanResult({
          status: isLegit ? 'safe' : 'danger',
          headline: isLegit ? 'Legitimate communication' : 'Deceptive fee scam pattern detected',
          confidence: data.confidence,
          details: [
            `Verdict: ${data.prediction}`,
            `Certainty: ${(data.confidence * 100).toFixed(1)}%`,
            ...(data.red_flag_words && data.red_flag_words.length > 0
              ? data.red_flag_words.map((w: string) => `Flagged: ${w}`)
              : ['Standard correspondence indicators observed.']),
          ],
        })
      } else if (activeTab === 'offer') {
        if (!offerText.trim()) return
        const res = await fetch(`${API_URL}/scan/offer/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: offerText.trim() }),
        })
        if (!res.ok) throw new Error(`Scanner returned status ${res.status}`)
        const data = await res.json()
        if (!data.is_offer) {
          setScanResult({
            status: 'warning',
            headline: 'Non-recruitment message',
            confidence: 0,
            details: ['Content does not match an internship or job offer structure.'],
          })
        } else {
          const isFake = data.prediction === 'Fake'
          setScanResult({
            status: isFake ? 'danger' : 'safe',
            headline: isFake ? 'High-risk recruitment scam' : 'Verified legitimate offer',
            confidence: data.confidence / 100,
            details: [
              `Verdict: ${data.prediction}`,
              `Certainty: ${data.confidence}%`,
              ...(data.red_flags && data.red_flags.length > 0
                ? data.red_flags.map((r: string) => `Alert: ${r}`)
                : ['Standard institutional hiring language identified.']),
            ],
          })
        }
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Could not reach the classification backend.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#0c0d0e] text-zinc-100 font-sans">

      {/* 1. Hero Section: Headline strictly 2 lines or fewer across all viewports */}
      <section className="pt-20 pb-28 sm:pt-28 sm:pb-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

            {/* Left Narrative Column */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] taste-enter">
                Student phishing and scam defense.
              </h1>

              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl taste-enter-d1">
                PhishGuard intercepts deceptive recruiter outreach, registration fee scams, and malicious URLs across Gmail, WhatsApp, and the browser.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4 taste-enter-d2">
                <Link
                  href="/scanner"
                  className="px-5 py-3 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-white transition-colors inline-flex items-center gap-2"
                >
                  <Layers className="size-4" />
                  <span>Launch scanner workstation</span>
                  <ArrowRight className="size-4" />
                </Link>

                <Link
                  href="/install"
                  className="px-5 py-3 rounded bg-zinc-900 text-zinc-200 font-medium text-sm hover:bg-zinc-800 transition-colors inline-flex items-center gap-2"
                >
                  <Download className="size-4" />
                  <span>Download browser extension</span>
                </Link>
              </div>

              {/* Sub-signals */}
              <div className="pt-8 grid grid-cols-3 gap-6 max-w-md taste-enter-d3">
                <div>
                  <div className="text-2xl font-bold text-white">5</div>
                  <div className="text-sm text-zinc-400 mt-1">Inference engines</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">18</div>
                  <div className="text-sm text-zinc-400 mt-1">Recruitment signals</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-400">&lt;50ms</div>
                  <div className="text-sm text-zinc-400 mt-1">Local response time</div>
                </div>
              </div>
            </div>

            {/* Right: Working Product Fragment (data-ui keeps real borders and controls) */}
            <div className="lg:col-span-5 w-full taste-enter-d2" data-ui="quick-scanner">
              <div className="rounded bg-[#15171a] p-5 space-y-4">

                {/* Fragment Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Terminal className="size-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Live Threat Inspector</span>
                  </div>
                  <span className="text-sm text-zinc-400">FastAPI backend</span>
                </div>

                {/* Intake Selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setActiveTab('url'); setScanResult(null); }}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      activeTab === 'url' ? 'bg-zinc-100 text-zinc-950 font-medium' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Link check
                  </button>
                  <button
                    onClick={() => { setActiveTab('email'); setScanResult(null); }}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      activeTab === 'email' ? 'bg-zinc-100 text-zinc-950 font-medium' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Email body
                  </button>
                  <button
                    onClick={() => { setActiveTab('offer'); setScanResult(null); }}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      activeTab === 'offer' ? 'bg-zinc-100 text-zinc-950 font-medium' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Offer pitch
                  </button>
                </div>

                {/* Input Fields */}
                <div className="space-y-3 pt-1">
                  {activeTab === 'url' && (
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://internship-confirm.tk/verify"
                      className="w-full h-10 px-3 rounded bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  )}

                  {activeTab === 'email' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={senderDomain}
                        onChange={(e) => setSenderDomain(e.target.value)}
                        placeholder="company-recruiter.org"
                        className="w-full h-9 px-3 rounded bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      />
                      <textarea
                        rows={3}
                        value={emailText}
                        onChange={(e) => setEmailText(e.target.value)}
                        placeholder="Paste recruiter message body..."
                        className="w-full p-2.5 rounded bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>
                  )}

                  {activeTab === 'offer' && (
                    <textarea
                      rows={4}
                      value={offerText}
                      onChange={(e) => setOfferText(e.target.value)}
                      placeholder="Congratulations! You are shortlisted for web internship. Deposit Rs 1999 registration fee via UPI..."
                      className="w-full p-2.5 rounded bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  )}

                  <button
                    onClick={handleQuickScan}
                    disabled={isScanning}
                    className="w-full h-10 rounded bg-emerald-500 text-zinc-950 font-semibold text-sm hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Evaluating indicators...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="size-4" />
                        <span>Run threat inference</span>
                      </>
                    )}
                  </button>

                  {scanError && (
                    <div className="p-3 rounded bg-red-950/60 text-red-200 text-sm">
                      {scanError}
                    </div>
                  )}

                  {scanResult && (
                    <div className={`p-4 rounded text-sm space-y-2 ${
                      scanResult.status === 'safe'
                        ? 'bg-emerald-950/40 text-emerald-200'
                        : scanResult.status === 'warning'
                        ? 'bg-amber-950/40 text-amber-200'
                        : 'bg-red-950/40 text-red-200'
                    }`}>
                      <div className="flex items-center justify-between font-semibold text-sm">
                        <span>{scanResult.headline}</span>
                        {scanResult.confidence > 0 && (
                          <span>{(scanResult.confidence * 100).toFixed(0)}%</span>
                        )}
                      </div>
                      <ul className="space-y-1 pt-1 opacity-90 border-t border-white/10 text-sm">
                        {scanResult.details.map((d, i) => (
                          <li key={i}>• {d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Features Statement Section */}
      <section className="py-24 bg-[#121316]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight taste-enter">
            Protection across every channel students use daily.
          </h2>
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl taste-enter-d1">
            PhishGuard combines a browser extension for Gmail and WhatsApp Web with an autonomous Google Workspace ingestion pipeline. When a suspicious offer arrives, our ML models decompose the text into 18 recruitment indicators, flagging advance-fee demands and lookalike college domains in real time.
          </p>
          <div className="pt-2 taste-enter-d2">
            <Link
              href="/install"
              className="text-emerald-400 font-semibold hover:text-emerald-300 text-base inline-flex items-center gap-1.5"
            >
              <span>Read the extension installation manual</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Archival Architecture Showcase (4 Real Pictures from Open Collections) */}
      <section className="py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white taste-enter">
              Engineering infrastructure and threat telemetry.
            </h2>
            <p className="text-base text-zinc-300 leading-relaxed taste-enter-d1">
              PhishGuard connects local statistical classification models with institutional security feeds and distributed browser agents.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">

            {/* Photographic Artifact 1 */}
            <div className="space-y-3 taste-enter">
              <div className="rounded overflow-hidden bg-zinc-900 aspect-[4/3] relative">
                <Image
                  src="/assets/archival/virginia-tech-data-center.jpg"
                  alt="Academic computer server infrastructure"
                  width={1200}
                  height={900}
                  className="w-full h-full object-cover grayscale contrast-125"
                  priority={false}
                />
              </div>
              <p className="text-base text-zinc-300">
                Academic network telemetry and server infrastructure monitoring inbound institutional mail flows.
              </p>
            </div>

            {/* Photographic Artifact 2 */}
            <div className="space-y-3 taste-enter-d1">
              <div className="rounded overflow-hidden bg-zinc-900 aspect-[4/3] relative">
                <Image
                  src="/assets/archival/mainframe-computer.jpg"
                  alt="High throughput computational processing engine"
                  width={1200}
                  height={800}
                  className="w-full h-full object-cover grayscale contrast-125"
                  priority={false}
                />
              </div>
              <p className="text-base text-zinc-300">
                Deterministic inference pipelines processing tokenized URL vectors and lexical indicators in sub-50ms windows.
              </p>
            </div>

            {/* Photographic Artifact 3 */}
            <div className="space-y-3 taste-enter-d2">
              <div className="rounded overflow-hidden bg-zinc-900 aspect-[4/3] relative">
                <Image
                  src="/assets/archival/oracle-computer-at-oak-ridge-national-lab.jpg"
                  alt="Early architectural computing laboratory equipment"
                  width={1200}
                  height={800}
                  className="w-full h-full object-cover grayscale contrast-125"
                  priority={false}
                />
              </div>
              <p className="text-base text-zinc-300">
                Foundational computational parsing architectures adapted for modern recursive token extraction.
              </p>
            </div>

            {/* Photographic Artifact 4 */}
            <div className="space-y-3 taste-enter-d3">
              <div className="rounded overflow-hidden bg-zinc-900 aspect-[4/3] relative">
                <Image
                  src="/assets/archival/ge-645-mainframe-1968.png"
                  alt="Historical system architecture diagram"
                  width={1200}
                  height={1500}
                  className="w-full h-full object-cover grayscale contrast-125"
                  priority={false}
                />
              </div>
              <p className="text-base text-zinc-300">
                Structural system topology ensuring cryptographic separation between ingress channels and detection layers.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Threat Matrix: Real comparison table (Real tables keep lines) */}
      <section className="py-24 bg-[#121316]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white taste-enter">
              Addressed threat scenarios.
            </h2>
            <p className="text-base text-zinc-300 taste-enter-d1">
              Direct countermeasures against common academic attack patterns.
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto taste-enter-d2">
            <table className="w-full text-left text-sm border border-white/10 rounded">
              <thead className="bg-[#15171a] text-zinc-200 font-semibold border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">Threat vector</th>
                  <th className="py-3.5 px-4">Deceptive pattern</th>
                  <th className="py-3.5 px-4">PhishGuard defense</th>
                  <th className="py-3.5 px-4">Protection channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Fake internship offer</td>
                  <td className="py-4 px-4 text-zinc-400">Demanding UPI registration fees within 24 hours.</td>
                  <td className="py-4 px-4 text-emerald-400">Trained offer classifier evaluating fee patterns</td>
                  <td className="py-4 px-4 text-zinc-300">Email and WhatsApp</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">College domain spoofing</td>
                  <td className="py-4 px-4 text-zinc-400">Sending from placement@nmamit.in.attacker.com.</td>
                  <td className="py-4 px-4 text-emerald-400">Exact-or-subdomain anchored validation</td>
                  <td className="py-4 px-4 text-zinc-300">Gmail Shield</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Credential harvesting link</td>
                  <td className="py-4 px-4 text-zinc-400">Urgent portal verification links on free TLDs.</td>
                  <td className="py-4 px-4 text-emerald-400">GradientBoosting model and DNR link guard</td>
                  <td className="py-4 px-4 text-zinc-300">Browser navigation</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Fraudulent PDF attachment</td>
                  <td className="py-4 px-4 text-zinc-400">Offer letters requiring upfront equipment payments.</td>
                  <td className="py-4 px-4 text-emerald-400">PyMuPDF structural extractor and indicator scoring</td>
                  <td className="py-4 px-4 text-zinc-300">Document scanner</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards View (No horizontal scrolling on phones) */}
          <div className="sm:hidden space-y-4 taste-enter-d2">
            {[
              {
                title: 'Fake internship offer',
                pattern: 'Demanding UPI registration fees within 24 hours.',
                defense: 'Trained offer classifier evaluating fee patterns',
                channel: 'Email and WhatsApp',
              },
              {
                title: 'College domain spoofing',
                pattern: 'Sending from placement@nmamit.in.attacker.com.',
                defense: 'Exact-or-subdomain anchored validation',
                channel: 'Gmail Shield',
              },
              {
                title: 'Credential harvesting link',
                pattern: 'Urgent portal verification links on free TLDs.',
                defense: 'GradientBoosting model and DNR link guard',
                channel: 'Browser navigation',
              },
              {
                title: 'Fraudulent PDF attachment',
                pattern: 'Offer letters requiring upfront equipment payments.',
                defense: 'PyMuPDF structural extractor and indicator scoring',
                channel: 'Document scanner',
              },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded bg-[#15171a] space-y-2 text-sm">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>{item.title}</span>
                  <span className="text-sm text-zinc-400">{item.channel}</span>
                </div>
                <p className="text-zinc-400">{item.pattern}</p>
                <p className="text-emerald-400 font-medium">{item.defense}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Call to Action */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white taste-enter">
            Start inspecting suspicious outreach now.
          </h2>
          <p className="text-base text-zinc-300 max-w-xl mx-auto leading-relaxed taste-enter-d1">
            Analyze links and documents in the web workstation, or install the browser extension for real-time protection across messaging apps.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 taste-enter-d2">
            <Link
              href="/scanner"
              className="px-6 py-3 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-white transition-colors"
            >
              Launch inspection workstation
            </Link>
            <Link
              href="/install"
              className="px-6 py-3 rounded bg-zinc-900 text-zinc-200 font-medium text-sm hover:bg-zinc-800 transition-colors"
            >
              Extension deployment guide
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
