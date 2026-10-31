'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Shield,
  Mail,
  FileText,
  Download,
  ArrowRight,
  Terminal,
  Layers,
  Lock,
  Cpu,
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
          headline: isLegit ? 'Verified Clean Link' : 'Malicious / Phishing URL Detected',
          confidence: data.confidence,
          details: [
            `Model Prediction: ${data.prediction}`,
            `Confidence: ${(data.confidence * 100).toFixed(1)}%`,
            isLegit ? 'No known blacklisted heuristics triggered.' : 'High probability of credential harvesting or impersonation.',
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
          headline: isLegit ? 'Legitimate Communication' : 'Deceptive or Fee-Scam Pattern Detected',
          confidence: data.confidence,
          details: [
            `Verdict: ${data.prediction}`,
            `Confidence: ${(data.confidence * 100).toFixed(1)}%`,
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
            headline: 'Non-Recruitment Content',
            confidence: 0,
            details: ['Message does not appear to be an internship or job offer.'],
          })
        } else {
          const isFake = data.prediction === 'Fake'
          setScanResult({
            status: isFake ? 'danger' : 'safe',
            headline: isFake ? 'High-Risk Internship Scam' : 'Verified Legitimate Offer',
            confidence: data.confidence / 100,
            details: [
              `Classification: ${data.prediction}`,
              `Confidence: ${data.confidence}%`,
              ...(data.red_flags && data.red_flags.length > 0
                ? data.red_flags.map((r: string) => `Alert: ${r}`)
                : ['Standard institutional hiring language detected.']),
            ],
          })
        }
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Could not connect to the ML backend. Ensure FastAPI is active.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans">

      {/* Blueprint Substrate Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900/80 text-zinc-400 font-mono text-[11px] uppercase tracking-wider mb-8">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>PhishGuard Security Suite</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">v2.3 Core</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

            {/* Left Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.08]">
                Autonomous threat detection built for student environments.
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
                PhishGuard protects universities and students from deceptive recruitment pitches, credential-harvesting portals, and fraudulent internship scams across Web, Gmail, WhatsApp, and LinkedIn.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/scanner"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-zinc-100 text-zinc-950 font-medium text-xs hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm"
                >
                  <Layers className="size-3.5" />
                  <span>Open Full Workstation</span>
                  <ArrowRight className="size-3.5" />
                </Link>

                <Link
                  href="/install"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-zinc-800 bg-zinc-900/60 text-zinc-300 font-medium text-xs hover:bg-zinc-800/80 hover:text-white transition-colors"
                >
                  <Download className="size-3.5 text-zinc-400" />
                  <span>Download Browser Extension</span>
                </Link>
              </div>

              {/* Architecture Badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-zinc-800/80 max-w-md">
                <div>
                  <div className="font-mono text-lg font-semibold text-zinc-200">5</div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-mono">ML Engines</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-semibold text-zinc-200">18</div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-mono">Offer Signals</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-semibold text-emerald-400">0.0</div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-mono">Mock Fallbacks</div>
                </div>
              </div>
            </div>

            {/* Right Live Quick-Scan Console */}
            <div className="lg:col-span-5 w-full">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 shadow-2xl overflow-hidden backdrop-blur-sm">

                {/* Console Title Bar */}
                <div className="px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="size-3.5 text-zinc-400" />
                    <span className="font-mono text-xs text-zinc-300 font-medium uppercase tracking-wider">
                      Live Threat Inspector
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    API :8000
                  </span>
                </div>

                {/* Sub-Tabs */}
                <div className="flex border-b border-zinc-800 bg-zinc-950/40 text-xs font-mono">
                  <button
                    onClick={() => { setActiveTab('url'); setScanResult(null); }}
                    className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                      activeTab === 'url' ? 'border-zinc-200 text-zinc-100 bg-zinc-900/80 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    URL Inspection
                  </button>
                  <button
                    onClick={() => { setActiveTab('email'); setScanResult(null); }}
                    className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                      activeTab === 'email' ? 'border-zinc-200 text-zinc-100 bg-zinc-900/80 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Email Analysis
                  </button>
                  <button
                    onClick={() => { setActiveTab('offer'); setScanResult(null); }}
                    className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                      activeTab === 'offer' ? 'border-zinc-200 text-zinc-100 bg-zinc-900/80 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Offer Scam
                  </button>
                </div>

                {/* Console Body */}
                <div className="p-4 space-y-3">
                  {activeTab === 'url' && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                        Destination URL
                      </label>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://internship-confirm.tk/login"
                        className="w-full h-9 px-3 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {activeTab === 'email' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                          Sender Domain
                        </label>
                        <input
                          type="text"
                          value={senderDomain}
                          onChange={(e) => setSenderDomain(e.target.value)}
                          placeholder="company-recruiter.org"
                          className="w-full h-8 px-3 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                          Message Body
                        </label>
                        <textarea
                          rows={3}
                          value={emailText}
                          onChange={(e) => setEmailText(e.target.value)}
                          placeholder="Paste recruiter email or outreach content..."
                          className="w-full p-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'offer' && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                        Offer Pitch / WhatsApp Message
                      </label>
                      <textarea
                        rows={4}
                        value={offerText}
                        onChange={(e) => setOfferText(e.target.value)}
                        placeholder="Congratulations! You have been selected for web internship. Deposit Rs 1999 registration fee..."
                        className="w-full p-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleQuickScan}
                    disabled={isScanning}
                    className="w-full h-9 rounded bg-zinc-100 text-zinc-950 font-medium text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Evaluating Heuristics...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="size-3.5" />
                        <span>Run Model Inference</span>
                      </>
                    )}
                  </button>

                  {/* Scan Error */}
                  {scanError && (
                    <div className="p-3 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-xs font-mono">
                      {scanError}
                    </div>
                  )}

                  {/* Scan Result Readout */}
                  {scanResult && (
                    <div className={`p-3 rounded border font-mono text-xs space-y-2 ${
                      scanResult.status === 'safe'
                        ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                        : scanResult.status === 'warning'
                        ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                        : 'bg-red-950/30 border-red-800/50 text-red-200'
                    }`}>
                      <div className="flex items-center justify-between font-semibold">
                        <span>{scanResult.headline}</span>
                        {scanResult.confidence > 0 && (
                          <span className="text-[11px] opacity-80">
                            {(scanResult.confidence * 100).toFixed(0)}% Conf
                          </span>
                        )}
                      </div>
                      <ul className="text-[11px] space-y-1 opacity-90 border-t border-white/10 pt-2">
                        {scanResult.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-zinc-500">•</span>
                            <span>{detail}</span>
                          </li>
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

      {/* Architecture & Telemetry Strip */}
      <section className="py-12 border-b border-zinc-800/80 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <span className="font-mono text-xs text-zinc-500 uppercase tracking-wider">Inference Target</span>
              <p className="font-semibold text-sm text-zinc-200">FastAPI Architecture</p>
              <p className="text-xs text-zinc-400">Sub-50ms local tokenization and scoring.</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-xs text-zinc-500 uppercase tracking-wider">Intercept Channels</span>
              <p className="font-semibold text-sm text-zinc-200">Gmail · WA · LinkedIn</p>
              <p className="text-xs text-zinc-400">Contextual DOM injection and link guards.</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-xs text-zinc-500 uppercase tracking-wider">Remediation</span>
              <p className="font-semibold text-sm text-zinc-200">Autonomous Ingestion</p>
              <p className="text-xs text-zinc-400">Thread-level warning draft injection.</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-xs text-zinc-500 uppercase tracking-wider">Security Contract</span>
              <p className="font-semibold text-sm text-zinc-200">Zero Mocking Policy</p>
              <p className="text-xs text-zinc-400">True failures report cleanly; never invented.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid: Defense Capabilities */}
      <section className="py-20 border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="space-y-2">
            <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">[ DEFENSE SURFACES ]</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Specialized security mechanisms engineered for academia.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Bento Card 1: Multi-Platform Extension */}
            <div className="md:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="size-8 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                  <Shield className="size-4 text-zinc-200" />
                </div>
                <span className="font-mono text-[10px] uppercase text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded">
                  Manifest V3
                </span>
              </div>
              <h3 className="text-base font-semibold text-zinc-100">Multi-Channel In-Situ Interceptor</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Rather than forcing users to copy-paste URLs into an external scanner, the PhishGuard Chrome extension monitors navigation in real-time. It injects contextual warning banners into Gmail message headers, highlights scam recruiter pitches in WhatsApp Web and LinkedIn, and guards all new tab navigations via a declarative blocked interstitial.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Link href="/install" className="text-xs text-zinc-300 font-medium inline-flex items-center gap-1 hover:text-white">
                  <span>Explore Extension Installation</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            {/* Bento Card 2: Document Inspection */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="size-8 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                  <FileText className="size-4 text-zinc-200" />
                </div>
                <span className="font-mono text-[10px] uppercase text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded">
                  5 MB Limit
                </span>
              </div>
              <h3 className="text-base font-semibold text-zinc-100">Structural Document Audit</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                PyMuPDF parser evaluating PDF, DOCX, and TXT offer attachments across 22 lexical patterns, spotting deceptive fee requirements and disguised hostnames.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Link href="/doc" className="text-xs text-zinc-300 font-medium inline-flex items-center gap-1 hover:text-white">
                  <span>Open Document Scanner</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            {/* Bento Card 3: Autonomous Gmail Pipeline */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="size-8 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                  <Mail className="size-4 text-zinc-200" />
                </div>
                <span className="font-mono text-[10px] uppercase text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded">
                  Pub/Sub Ingestion
                </span>
              </div>
              <h3 className="text-base font-semibold text-zinc-100">Gmail Gateway Pipeline</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Asynchronous ingestion inspecting RFC 8601 cryptographic headers from mx.google.com, applying heuristic rules, and running L2 NLP evaluation without user intervention.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Link href="/email" className="text-xs text-zinc-300 font-medium inline-flex items-center gap-1 hover:text-white">
                  <span>View Email Engine</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            {/* Bento Card 4: Threat Intelligence */}
            <div className="md:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="size-8 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                  <Cpu className="size-4 text-zinc-200" />
                </div>
                <span className="font-mono text-[10px] uppercase text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded">
                  MCP Integration
                </span>
              </div>
              <h3 className="text-base font-semibold text-zinc-100">Model Context Protocol Threat Feeds</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Inbound suspicious entities are checked through Model Context Protocol (MCP) bridges connecting live VirusTotal intelligence databases, governed by a local token-bucket rate limiter (4 requests/minute) and strict DNS pinning to guard against SSRF and host rebinding.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Link href="/dashboard" className="text-xs text-zinc-300 font-medium inline-flex items-center gap-1 hover:text-white">
                  <span>Inspect Threat Telemetry</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Academic Threat Model Matrix */}
      <section className="py-20 border-b border-zinc-800/80 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          <div className="space-y-2">
            <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">[ THREAT MATRIX ]</span>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
              Addressed attack vectors in student ecosystems.
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-900 border-b border-zinc-800 font-mono text-[11px] text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Threat Vector</th>
                  <th className="py-3 px-4">Attacker Tactic</th>
                  <th className="py-3 px-4">PhishGuard Countermeasure</th>
                  <th className="py-3 px-4">Surface</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950/60 font-sans text-zinc-300">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-zinc-100">Fake Internship Offer</td>
                  <td className="py-3.5 px-4 text-zinc-400">Demanding UPI &ldquo;training fees&rdquo; or refundable deposits within 24 hours.</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">/scan/offer/ (18 custom lexical & financial indicators)</td>
                  <td className="py-3.5 px-4 text-zinc-500 font-mono">Email / WhatsApp</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-zinc-100">College Domain Spoofing</td>
                  <td className="py-3.5 px-4 text-zinc-400">Sending from placement@nmamit.in.attacker.com or fake institutional subdomains.</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">Exact-or-subdomain anchored parser + RFC 8601 SPF header inspection</td>
                  <td className="py-3.5 px-4 text-zinc-500 font-mono">Gmail / Ingest</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-zinc-100">Credential Harvest Link</td>
                  <td className="py-3.5 px-4 text-zinc-400">Urgent account verification pages disguised on free TLDs (.tk, .cf, .xyz).</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">GradientBoostingClassifier + DNR dynamic interceptor</td>
                  <td className="py-3.5 px-4 text-zinc-500 font-mono">Browser / Navigation</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-zinc-100">Fraudulent PDF Attachment</td>
                  <td className="py-3.5 px-4 text-zinc-400">Offer letters requiring Aadhaar/PAN scans or upfront payment slips.</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">PyMuPDF structural extractor + whole-word warning categorizer</td>
                  <td className="py-3.5 px-4 text-zinc-500 font-mono">Document Scan</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* Bottom Dispatch CTA */}
      <section className="py-20 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="size-10 rounded border border-zinc-800 bg-zinc-900 mx-auto flex items-center justify-center">
            <Lock className="size-5 text-zinc-200" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Activate institutional cybersecurity defense.
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Begin with the web workstation to evaluate suspicious links and attachments, or deploy the browser extension for real-time channel protection.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/scanner"
              className="px-5 py-2.5 rounded bg-zinc-100 text-zinc-950 font-medium text-xs hover:bg-zinc-200 active:scale-[0.98] transition-all"
            >
              Launch Inspection Workstation
            </Link>
            <Link
              href="/install"
              className="px-5 py-2.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 font-medium text-xs hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Extension Deployment Guide
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
