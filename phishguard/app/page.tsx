'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  RefreshCw,
} from 'lucide-react'
import { API_URL } from '@/lib/utils'
import DetectionLayers from '@/components/DetectionLayers'
import ScamMarquee from '@/components/ScamMarquee'
import ScamStats from '@/components/ScamStats'
import OurStory from '@/components/OurStory'
import InboxBeforeAfter from '@/components/InboxBeforeAfter'

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
        if (!res.ok) throw new Error('The scanner is unavailable right now. Try again in a moment.')
        const data = await res.json()
        const isLegit = data.prediction === 'Legit'
        setScanResult({
          status: isLegit ? 'safe' : 'danger',
          headline: isLegit ? 'Verified clean link' : 'Phishing destination detected',
          confidence: data.confidence,
          details: [
            `Verdict: ${data.prediction}`,
            `Certainty: ${(data.confidence * 100).toFixed(1)}%`,
            isLegit ? 'Nothing in the link matches known phishing patterns.' : 'Looks built to steal a login or pose as someone else.',
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
        if (!res.ok) throw new Error('The scanner is unavailable right now. Try again in a moment.')
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
              : ['No scam signals found in the text.']),
          ],
        })
      } else if (activeTab === 'offer') {
        if (!offerText.trim()) return
        const res = await fetch(`${API_URL}/scan/offer/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: offerText.trim() }),
        })
        if (!res.ok) throw new Error('The scanner is unavailable right now. Try again in a moment.')
        const data = await res.json()
        if (!data.is_offer) {
          setScanResult({
            status: 'warning',
            headline: 'Non-recruitment message',
            confidence: 0,
            details: ['This doesn’t read like a job or internship offer.'],
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
                : ['Reads like a normal hiring message.']),
            ],
          })
        }
      }
    } catch (err) {
      // fetch() itself throws a TypeError ("Failed to fetch") when the scanner is offline
      setScanError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'Couldn’t reach the scanner. Try again in a moment.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#0c0d0e] text-zinc-100 font-sans">

      {/* Hero: the checker is the first thing, like a search box. The one centred moment on the page. */}
      <section className="pt-20 pb-24 sm:pt-28 sm:pb-28">
        <div className="max-w-[75rem] mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-5xl sm:text-7xl lg:text-[6.5rem] font-bold tracking-[-0.04em] text-white leading-[0.98] taste-enter">
            Is this offer real?
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-300 leading-relaxed max-w-2xl mx-auto taste-enter-d1">
            Paste the link, the email or the job offer. PhishGuard checks it for the scams students fall for and tells you why.
          </p>

          <div className="mt-12 max-w-3xl mx-auto text-left taste-enter-d2" data-ui="quick-scanner">
            <div className="rounded-xl bg-[#15171a] p-3 sm:p-4 space-y-3">
              <div className="flex gap-1.5" role="tablist" aria-label="What are you checking?">
                {(
                  [
                    ['url', 'Link'],
                    ['email', 'Email'],
                    ['offer', 'Job offer'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={activeTab === key}
                    onClick={() => {
                      setActiveTab(key)
                      setScanResult(null)
                    }}
                    className={`px-4 py-2 rounded-lg text-base transition-colors ${
                      activeTab === key ? 'bg-zinc-100 text-zinc-950 font-medium' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === 'url' && (
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickScan()}
                  placeholder="https://internship-confirm.tk/verify"
                  aria-label="Link to check"
                  className="w-full h-14 px-4 rounded-lg bg-[#0c0d0e] border border-white/10 text-lg text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400"
                />
              )}

              {activeTab === 'email' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={senderDomain}
                    onChange={(e) => setSenderDomain(e.target.value)}
                    placeholder="Sender’s domain, e.g. company-recruiter.org"
                    aria-label="Sender's domain"
                    className="w-full h-12 px-4 rounded-lg bg-[#0c0d0e] border border-white/10 text-base text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400"
                  />
                  <textarea
                    rows={4}
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    placeholder="Paste the email here…"
                    aria-label="Email text"
                    className="w-full p-4 rounded-lg bg-[#0c0d0e] border border-white/10 text-base text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400 resize-none"
                  />
                </div>
              )}

              {activeTab === 'offer' && (
                <textarea
                  rows={4}
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  placeholder="Congratulations! You are shortlisted for the web internship. Deposit Rs 1999 registration fee via UPI…"
                  aria-label="Job offer text"
                  className="w-full p-4 rounded-lg bg-[#0c0d0e] border border-white/10 text-base text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400 resize-none"
                />
              )}

              <button
                onClick={handleQuickScan}
                disabled={isScanning}
                className="w-full h-14 rounded-lg bg-teal-400 text-zinc-950 font-semibold text-lg hover:bg-teal-300 active:scale-[0.99] transition-[background-color,transform] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="size-5 animate-spin" />
                    <span>Checking…</span>
                  </>
                ) : (
                  <span>Check for scams</span>
                )}
              </button>

              {scanError && <div className="p-4 rounded-lg bg-red-950/60 text-red-200 text-base">{scanError}</div>}

              {scanResult && (
                <div
                  aria-live="polite"
                  className={`p-4 rounded-lg text-base space-y-2 ${
                    scanResult.status === 'safe'
                      ? 'bg-teal-950/60 text-teal-100'
                      : scanResult.status === 'warning'
                      ? 'bg-amber-950/50 text-amber-100'
                      : 'bg-red-950/60 text-red-100'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-lg">
                    <span>{scanResult.headline}</span>
                    {scanResult.confidence > 0 && <span>{(scanResult.confidence * 100).toFixed(0)}%</span>}
                  </div>
                  <ul className="space-y-1 opacity-90">
                    {scanResult.details.map((d, i) => (
                      <li key={i}>• {d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="mt-4 text-center text-base text-zinc-400">
              Nothing you paste is saved.{' '}
              <Link href="/install" className="group text-zinc-100 underline decoration-zinc-600 hover:text-teal-300">
                Or get the extension
              </Link>{' '}
              and it checks Gmail, WhatsApp and LinkedIn for you.
            </p>
          </div>
        </div>
      </section>

      <ScamMarquee />

      <ScamStats />

      <OurStory />

      <DetectionLayers />

      <InboxBeforeAfter />

      {/* 4. Threat Matrix: Real comparison table (Real tables keep lines) */}
      <section className="py-24 bg-[#121316]">
        <div className="max-w-[75rem] mx-auto px-4 sm:px-6 space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white taste-enter">
              Scams it catches.
            </h2>
            <p className="text-base text-zinc-300 taste-enter-d1">
              Four common scams aimed at students, and what stops each one.
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto taste-enter-d2">
            <table /* taste-skill-ignore: real table */ className="w-full text-left text-sm border border-white/10 rounded">
              <thead /* taste-skill-ignore: real table */ className="bg-[#15171a] text-zinc-200 font-semibold border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">Scam</th>
                  <th className="py-3.5 px-4">What it looks like</th>
                  <th className="py-3.5 px-4">How PhishGuard catches it</th>
                  <th className="py-3.5 px-4">Where</th>
                </tr>
              </thead>
              <tbody /* taste-skill-ignore: real table */ className="divide-y divide-white/5 text-zinc-300">
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Fake internship offer</td>
                  <td className="py-4 px-4 text-zinc-400">Demanding UPI registration fees within 24 hours.</td>
                  <td className="py-4 px-4 text-teal-400">Offer model flags fee demands and deadlines</td>
                  <td className="py-4 px-4 text-zinc-300">Email and WhatsApp</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">College domain spoofing</td>
                  <td className="py-4 px-4 text-zinc-400">Sending from placement@nmamit.in.attacker.com.</td>
                  <td className="py-4 px-4 text-teal-400">Sender must match the college domain exactly</td>
                  <td className="py-4 px-4 text-zinc-300">Gmail</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Credential harvesting link</td>
                  <td className="py-4 px-4 text-zinc-400">Urgent “verify your portal” links on cheap domains.</td>
                  <td className="py-4 px-4 text-teal-400">Link model scores it; the extension blocks it</td>
                  <td className="py-4 px-4 text-zinc-300">Browser navigation</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Fraudulent PDF attachment</td>
                  <td className="py-4 px-4 text-zinc-400">Offer letters requiring upfront equipment payments.</td>
                  <td className="py-4 px-4 text-teal-400">Document scanner reads the letter for payment asks</td>
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
                defense: 'Offer model flags fee demands and deadlines',
                channel: 'Email and WhatsApp',
              },
              {
                title: 'College domain spoofing',
                pattern: 'Sending from placement@nmamit.in.attacker.com.',
                defense: 'Sender must match the college domain exactly',
                channel: 'Gmail',
              },
              {
                title: 'Credential harvesting link',
                pattern: 'Urgent “verify your portal” links on cheap domains.',
                defense: 'Link model scores it; the extension blocks it',
                channel: 'Browser navigation',
              },
              {
                title: 'Fraudulent PDF attachment',
                pattern: 'Offer letters requiring upfront equipment payments.',
                defense: 'Document scanner reads the letter for payment asks',
                channel: 'Document scanner',
              },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded bg-[#15171a] space-y-2 text-sm">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>{item.title}</span>
                  <span className="text-sm text-zinc-400">{item.channel}</span>
                </div>
                <p className="text-zinc-400">{item.pattern}</p>
                <p className="text-teal-400 font-medium">{item.defense}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Close: what to do next */}
      <section className="py-28 sm:py-36">
        <div className="max-w-[75rem] mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.4fr_1fr] gap-10 items-end">
          <div className="space-y-5">
            <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.02] taste-enter">
              Got a message that feels off?
            </h2>
            <p className="text-lg text-zinc-300 max-w-xl leading-relaxed taste-enter-d1">
              Check it before you reply, pay or click. Or install the extension and let it check messages as they arrive.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end taste-enter-d2">
            <Link
              href="/scanner"
              className="px-6 py-3.5 rounded-lg bg-teal-400 text-zinc-950 font-semibold text-base hover:bg-teal-300 active:scale-[0.98] transition-[background-color,transform]"
            >
              Open the scanner
            </Link>
            <Link
              href="/install"
              className="px-6 py-3.5 rounded-lg bg-zinc-800 text-zinc-100 font-medium text-base hover:bg-zinc-700 active:scale-[0.98] transition-[background-color,transform]"
            >
              Get the extension
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
