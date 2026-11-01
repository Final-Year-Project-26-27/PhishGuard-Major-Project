'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Terminal,
  Upload,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { API_URL } from '@/lib/utils'

interface UnifiedScanResponse {
  event_id?: string
  risk_score: number
  risk_level: string
  recommendation: string
  explanations: string[]
  signals?: {
    email?: {
      prediction: string
      confidence: number
      risk_score: number
    }
    link?: {
      prediction: string
      confidence: number
      risk_score: number
    }
  }
}

// The backend's recommendation codes, in words a student can act on
const RECOMMENDATION_TEXT: Record<string, string> = {
  allow: 'Looks fine to open',
  warn: 'Be careful: check the sender first',
  block_or_step_up: 'Don’t click, reply or pay',
}

export default function ScannerPage() {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [emailFrom, setEmailFrom] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [scanMode, setScanMode] = useState<'quick' | 'detailed' | 'upload'>('quick')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<UnifiedScanResponse | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<Array<{ title: string; score: number; level: string; timestamp: string }>>([])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        const fromMatch = content.match(/From:\s*(.+)/i)
        const subjectMatch = content.match(/Subject:\s*(.+)/i)
        const bodyMatch = content.match(/Body:\s*([\s\S]+)/i)

        if (fromMatch) setEmailFrom(fromMatch[1].trim())
        if (subjectMatch) setEmailSubject(subjectMatch[1].trim())
        if (bodyMatch) setEmailBody(bodyMatch[1].trim())
      }
      reader.readAsText(file)
      toast.success('File loaded.')
    }
  }

  const handleScan = async () => {
    if (scanMode === 'quick' && (!url && !email)) {
      toast.warning('Enter a link or a sender email to check.')
      return
    }
    if (scanMode === 'detailed' && (!emailFrom && !emailBody)) {
      toast.warning("Add the sender's address or the message text.")
      return
    }
    if (scanMode === 'upload' && !uploadedFile && !emailBody) {
      toast.warning('Choose an email file or paste the message text.')
      return
    }

    setIsScanning(true)
    setScanResult(null)
    setScanError(null)

    const sender = scanMode === 'quick' ? email : emailFrom
    const senderDomain = sender.includes('@') ? sender.split('@')[1] : sender
    // Quick mode has no message text; only real message text goes to the message model
    const text = scanMode === 'quick' ? '' : `${emailSubject}\n${emailBody}`.trim()
    // With no link and no text, the sender's own domain is the thing to check
    // Trailing punctuation belongs to the sentence, not the link ("...at https://x.com/abc.")
    const linkInText = (text.match(/https?:\/\/[^\s<>"')\]]+/)?.[0] ?? '').replace(/[.,;:!?]+$/, '')
    const targetUrl = url || linkInText || (text ? '' : senderDomain)

    try {
      const res = await fetch(`${API_URL}/scan/unified/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_text: text || undefined,
          sender_domain: senderDomain || 'gmail.com',
          url: targetUrl || undefined,
          trusted_domains: ['nmamit.in', 'nitte.edu.in', 'google.com', 'microsoft.com'],
        }),
      })

      if (!res.ok) throw new Error("The scanner couldn't check this. Try again in a moment.")

      const data: UnifiedScanResponse = await res.json()
      setScanResult(data)

      const historyItem = {
        title: targetUrl || sender || 'Email check',
        score: data.risk_score,
        level: data.risk_level,
        timestamp: new Date().toLocaleTimeString(),
      }
      setScanHistory(prev => [historyItem, ...prev.slice(0, 9)])
    } catch (err) {
      console.error('Unified scan failure:', err)
      setScanError(err instanceof Error && !(err instanceof TypeError) ? err.message : "Couldn't reach the scanner. Try again in a moment.")
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="relative min-h-dvh text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Workstation Header */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Check a message and link
            </h1>
            <span className="text-sm text-zinc-400">
              Message and link checked together
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Check the sender, the message and any link in one go. Machine-learning models score the text and the link, and you get one risk score with the reasons behind it.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-zinc-800 text-sm">
          <button
            onClick={() => { setScanMode('quick'); setScanResult(null); }}
            className={`px-4 py-2.5 font-medium transition-colors ${
              scanMode === 'quick' ? 'border-zinc-200 text-zinc-100 font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Quick check
          </button>
          <button
            onClick={() => { setScanMode('detailed'); setScanResult(null); }}
            className={`px-4 py-2.5 font-medium transition-colors ${
              scanMode === 'detailed' ? 'border-zinc-200 text-zinc-100 font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Full email
          </button>
          <button
            onClick={() => { setScanMode('upload'); setScanResult(null); }}
            className={`px-4 py-2.5 font-medium transition-colors ${
              scanMode === 'upload' ? 'border-zinc-200 text-zinc-100 font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Upload a file
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Main Input Form */}
          <div className="lg:col-span-8 space-y-6">

            <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
              <div className="flex items-center justify-between border-zinc-800/80 pb-3">
                <span className="text-sm text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="size-3.5 text-zinc-400" />
                  What to check
                </span>
                <span className="text-sm text-zinc-400">
                  Fill in what you have
                </span>
              </div>

              {scanMode === 'quick' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm text-zinc-400">
                      Sender’s email
                    </label>
                    <input
                      type="text"
                      placeholder="recruiter@internship-partner.xyz"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-9 px-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm text-zinc-400">
                      Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://t.co/verification-form"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full h-9 px-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {scanMode === 'detailed' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-sm text-zinc-400">
                        From
                      </label>
                      <input
                        type="text"
                        placeholder="placement-alert@nmamit-verify.in"
                        value={emailFrom}
                        onChange={(e) => setEmailFrom(e.target.value)}
                        className="w-full h-9 px-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm text-zinc-400">
                        Subject
                      </label>
                      <input
                        type="text"
                        placeholder="Urgent: Complete Internship Deposit"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full h-9 px-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm text-zinc-400">
                      Message text
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Paste the email or message..."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full p-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {scanMode === 'upload' && (
                <div className="space-y-3">
                  <div /* taste-skill-ignore: file drop zone */ className="border border-dashed border-zinc-800 rounded-lg p-6 text-center space-y-2 bg-zinc-950/60">
                    <Upload className="size-6 text-zinc-400 mx-auto" />
                    <p className="text-base text-zinc-300 font-medium">Choose a saved email (.eml) or text file</p>
                    <input
                      type="file"
                      accept=".eml,.txt,.msg"
                      onChange={handleFileUpload}
                      className="text-sm text-zinc-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-zinc-700 file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700"
                    />
                  </div>

                  {emailBody && (
                    <div className="p-3 rounded bg-[#0f1012] space-y-1 text-sm">
                      <span className="text-sm text-zinc-400">Preview</span>
                      <p className="text-zinc-300 line-clamp-2">{emailBody}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="px-4 py-2 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 active:scale-[0.98] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="size-3.5" />
                      <span>Check now</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setUrl('')
                    setEmail('')
                    setEmailFrom('')
                    setEmailSubject('')
                    setEmailBody('')
                    setUploadedFile(null)
                    setScanResult(null)
                    setScanError(null)
                  }}
                  className="px-3 py-2 rounded bg-[#15171a] text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                >
                  Reset
                </button>
              </div>

            </div>

            {/* Error Message */}
            {scanError && (
              <div className="p-3.5 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-start gap-2.5">
                <AlertTriangle className="size-4 shrink-0 mt-0.5 text-red-400" />
                <span>{scanError}</span>
              </div>
            )}

            {/* Unified Result Panel */}
            {scanResult && (
              <div className="rounded-lg bg-[#15171a] p-6 space-y-6">

                <div className="flex items-center justify-between border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <span className="text-sm text-zinc-400">
                      Result
                    </span>
                    <div className="flex items-center gap-2.5">
                      {scanResult.risk_level === 'LOW' ? (
                        <CheckCircle className="size-5 text-teal-400" />
                      ) : scanResult.risk_level === 'MEDIUM' ? (
                        <AlertTriangle className="size-5 text-amber-400" />
                      ) : (
                        <XCircle className="size-5 text-red-400" />
                      )}
                      <span className={`text-lg font-bold tracking-tight ${
                        scanResult.risk_level === 'LOW'
                          ? 'text-teal-400'
                          : scanResult.risk_level === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {scanResult.risk_level} RISK
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm text-zinc-400 block">Overall Score</span>
                    <span className="text-xl font-bold text-zinc-100">
                      {scanResult.risk_score}<span className="text-zinc-400 text-sm">/100</span>
                    </span>
                  </div>
                </div>

                {/* Sub-Signals Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-[#0f1012] space-y-1">
                    <span className="text-sm text-zinc-400 block">What to do</span>
                    <span className="text-sm font-bold text-zinc-200 px-2 py-0.5 rounded bg-[#15171a] inline-block">
                      {RECOMMENDATION_TEXT[scanResult.recommendation] ?? scanResult.recommendation}
                    </span>
                  </div>

                  <div className="p-3 rounded bg-[#0f1012] space-y-1">
                    <span className="text-sm text-zinc-400 block">Scan ID</span>
                    <span className="text-sm text-zinc-400 truncate block">
                      {scanResult.event_id || 'Not available'}
                    </span>
                  </div>
                </div>

                {/* Reasoning Explanations */}
                {scanResult.explanations && scanResult.explanations.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-zinc-400 font-semibold block">
                      Why we think so
                    </span>
                    <ul className="space-y-1 text-sm">
                      {scanResult.explanations.map((exp, i) => (
                        <li key={i} className="p-2 rounded bg-[#0f1012] text-zinc-300 flex items-start gap-2">
                          <span className="text-zinc-400">•</span>
                          <span>{exp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Right History Column */}
          <div className="lg:col-span-4 space-y-6">

            <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
              <div className="flex items-center justify-between border-zinc-800/80 pb-3">
                <span className="text-sm text-zinc-300 flex items-center gap-2">
                  <Clock className="size-3.5 text-zinc-400" />
                  Recent checks
                </span>
                <span className="text-sm text-zinc-400">
                  {scanHistory.length} this visit
                </span>
              </div>

              <div className="space-y-2">
                {scanHistory.length > 0 ? (
                  scanHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-[#0f1012] text-sm space-y-1"
                    >
                      <p className="text-zinc-200 truncate font-semibold">{item.title}</p>
                      <div className="flex items-center justify-between text-sm text-zinc-400">
                        <span className={item.level === 'LOW' ? 'text-teal-400' : item.level === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'}>
                          {item.level} ({item.score}/100)
                        </span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-base text-zinc-400 py-2">No checks yet.</p>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
