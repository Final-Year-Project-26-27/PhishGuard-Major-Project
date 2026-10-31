'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Shield,
  Download,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { API_URL } from '@/lib/utils'
import DetectionLayers from '@/components/DetectionLayers'
import ScamMarquee from '@/components/ScamMarquee'
import ScamStats from '@/components/ScamStats'
import OurStory from '@/components/OurStory'
import InboxBeforeAfter from '@/components/InboxBeforeAfter'

function Credit({ href, by, licence }: { href: string; by: string; licence: string }) {
  return (
    <p className="text-sm text-zinc-400">
      Photo:{' '}
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-zinc-600 hover:text-zinc-200">
        {by}
      </a>
      , {licence}, via Wikimedia Commons
    </p>
  )
}

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

      {/* 1. Hero Section: Headline strictly 2 lines or fewer across all viewports */}
      <section className="pt-20 pb-28 sm:pt-28 sm:pb-32">
        <div className="max-w-[75rem] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

            {/* Left Narrative Column */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] taste-enter">
                Student phishing and scam defense.
              </h1>

              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl taste-enter-d1">
                PhishGuard catches fake internship offers, registration-fee scams and phishing links in Gmail, WhatsApp, LinkedIn and your browser.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4 taste-enter-d2">
                <Link
                  href="/scanner"
                  className="group px-5 py-3 rounded bg-zinc-100 text-zinc-950 font-medium text-base hover:bg-white active:scale-[0.98] transition-[background-color,transform] inline-flex items-center gap-2"
                >
                  <span>Open the scanner</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>

                <Link
                  href="/install"
                  className="px-5 py-3 rounded bg-zinc-800 text-zinc-100 font-medium text-base hover:bg-zinc-700 active:scale-[0.98] transition-[background-color,transform] inline-flex items-center gap-2"
                >
                  <Download className="size-4" />
                  <span>Get the extension</span>
                </Link>
              </div>
            </div>

            {/* Right: Working Product Fragment (data-ui keeps real borders and controls) */}
            <div className="lg:col-span-5 w-full taste-enter-d2" data-ui="quick-scanner">
              <div className="rounded bg-[#15171a] p-5 space-y-4">

                <div className="space-y-1">
                  <p className="text-lg font-semibold text-white">Check something now</p>
                  <p className="text-sm text-zinc-400">Paste a link, an email or a job offer. Nothing is saved.</p>
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
                      className="w-full h-10 px-3 rounded bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                    />
                  )}

                  {activeTab === 'email' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={senderDomain}
                        onChange={(e) => setSenderDomain(e.target.value)}
                        placeholder="company-recruiter.org"
                        className="w-full h-9 px-3 rounded bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                      />
                      <textarea
                        rows={3}
                        value={emailText}
                        onChange={(e) => setEmailText(e.target.value)}
                        placeholder="Paste recruiter message body..."
                        className="w-full p-2.5 rounded bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 resize-none"
                      />
                    </div>
                  )}

                  {activeTab === 'offer' && (
                    <textarea
                      rows={4}
                      value={offerText}
                      onChange={(e) => setOfferText(e.target.value)}
                      placeholder="Congratulations! You are shortlisted for web internship. Deposit Rs 1999 registration fee via UPI..."
                      className="w-full p-2.5 rounded bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 resize-none"
                    />
                  )}

                  <button
                    onClick={handleQuickScan}
                    disabled={isScanning}
                    className="w-full h-10 rounded bg-teal-500 text-zinc-950 font-semibold text-sm hover:bg-teal-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Checking…</span>
                      </>
                    ) : (
                      <>
                        <Shield className="size-4" />
                        <span>Check for scams</span>
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
                        ? 'bg-teal-950/40 text-teal-200'
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
                      <ul /* taste-skill-ignore: inspector result list */ className="space-y-1 pt-1 opacity-90 border-t border-white/10 text-sm">
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

      <ScamMarquee />

      <ScamStats />

      <OurStory />

      <DetectionLayers />

      <InboxBeforeAfter />

      {/* 3. Archival Architecture Showcase (4 Real Pictures from Open Collections) */}
      <section className="py-28">
        <div className="max-w-[75rem] mx-auto px-4 sm:px-6 space-y-16">
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white taste-enter">
              The trick is older than the inbox.
            </h2>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed taste-enter-d1">
              Pay first, get the job later: the advance-fee con dates back to the 1890s. Computers only made it faster, so one message now reaches thousands of students at once.
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
              <p className="text-base text-zinc-200">
                A university data centre. Campus mail runs through rooms like this, scams included.
              </p>
              <Credit href="https://commons.wikimedia.org/wiki/File:Virginia_Tech_-_data_center.jpg" by="Christopher Bowns" licence="CC BY-SA 2.0" />
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
              <p className="text-base text-zinc-200">
                The first spam email went out in 1978, to a few hundred people on ARPANET.
              </p>
              <Credit href="https://commons.wikimedia.org/wiki/File:Mainframe_Computer.jpg" by="Pargon" licence="CC BY 2.0" />
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
              <p className="text-base text-zinc-200">
                ORACLE at Oak Ridge, 1950s. Computers were built to calculate; the con artists came later.
              </p>
              <Credit href="https://commons.wikimedia.org/wiki/File:ORACLE_computer_at_Oak_Ridge_National_Lab.jpg" by="US Atomic Energy Commission" licence="public domain" />
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
              <p className="text-base text-zinc-200">
                A GE-645 in 1968, built for time-sharing: many users on one machine, each behind a password.
              </p>
              <Credit href="https://commons.wikimedia.org/wiki/File:GE-645-mainframe-1968.png" by="Dóeltenga" licence="CC BY-SA 4.0" />
            </div>

          </div>
        </div>
      </section>

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

      {/* 5. Call to Action */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white taste-enter">
            Got a message that feels off?
          </h2>
          <p className="text-base text-zinc-300 max-w-xl mx-auto leading-relaxed taste-enter-d1">
            Check it in the scanner before you reply, pay or click. Or install the extension and let it check messages as they arrive.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 taste-enter-d2">
            <Link
              href="/scanner"
              className="px-6 py-3 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-white transition-colors"
            >
              Open the scanner
            </Link>
            <Link
              href="/install"
              className="px-6 py-3 rounded bg-zinc-900 text-zinc-200 font-medium text-sm hover:bg-zinc-800 transition-colors"
            >
              Get the extension
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
