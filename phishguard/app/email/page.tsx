'use client'

import React, { useState, useEffect } from 'react'
import {
  Mail,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  RefreshCw,
  Terminal,
  Cpu,
  Shield,
} from 'lucide-react'
import { db, auth } from '../../lib/firebase'
import { API_URL } from '../../lib/utils'
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { toast } from 'sonner'

interface EmailScanResult {
  prediction: 'Fake' | 'Legit'
  confidence: number
  red_flags?: string[]
}

interface FirebaseEmailRecord {
  id: string
  text_content: string
  sender_domain: string
  prediction: 'Fake' | 'Legit'
  confidence: number
  timestamp: ReturnType<typeof serverTimestamp>
  user_id: string
}

export default function EmailScannerPage() {
  const [mounted, setMounted] = useState(false)
  const [textContent, setTextContent] = useState('')
  const [senderDomain, setSenderDomain] = useState('')
  const [result, setResult] = useState<EmailScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [firebaseHistory, setFirebaseHistory] = useState<FirebaseEmailRecord[]>([])
  const [localHistory, setLocalHistory] = useState<FirebaseEmailRecord[]>([])
  const [autoScanPending, setAutoScanPending] = useState(false)
  const [fromGmail, setFromGmail] = useState(false)

  const saveToFirebase = async (text: string, domain: string, scanResult: EmailScanResult) => {
    if (user) {
      try {
        const scansRef = collection(db, 'users', user.uid, 'email_scans')
        await addDoc(scansRef, {
          text_content: text,
          sender_domain: domain,
          prediction: scanResult.prediction,
          confidence: scanResult.confidence,
          timestamp: serverTimestamp(),
          user_id: user.uid
        })
      } catch (err) {
        console.error('Error saving to Firebase:', err)
        saveLocal(text, domain, scanResult, user.uid)
      }
    } else {
      saveLocal(text, domain, scanResult, 'anonymous')
    }
  }

  const saveLocal = (text: string, domain: string, scanResult: EmailScanResult, userId: string) => {
    const history = JSON.parse(localStorage.getItem('emailScanHistory') || '[]')
    const newScan = {
      id: Date.now().toString(),
      text_content: text,
      sender_domain: domain,
      prediction: scanResult.prediction,
      confidence: scanResult.confidence,
      timestamp: new Date().toISOString(),
      user_id: userId
    }
    history.unshift(newScan)
    localStorage.setItem('emailScanHistory', JSON.stringify(history.slice(0, 10)))
    setLocalHistory(history.slice(0, 10))
  }

  useEffect(() => {
    setMounted(true)

    // Parse URL parameters from extension / Gmail button
    const searchParams = new URLSearchParams(window.location.search)
    const bodyParam = searchParams.get('body') || searchParams.get('text')
    const senderParam = searchParams.get('sender') || searchParams.get('from')
    const autoScan = searchParams.get('autoScan') === 'true'

    if (bodyParam) {
      setTextContent(bodyParam)
      setFromGmail(true)
    }

    if (senderParam) {
      const cleanDomain = senderParam.includes('@') ? senderParam.split('@')[1] : senderParam
      setSenderDomain(cleanDomain)
    }

    if (autoScan && bodyParam && senderParam) {
      setAutoScanPending(true)
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        const scansRef = collection(db, 'users', currentUser.uid, 'email_scans')
        const q = query(scansRef, orderBy('timestamp', 'desc'), limit(10))

        const unsubscribeScans = onSnapshot(q, (snapshot) => {
          const scans = snapshot.docs.map(doc => ({
            id: doc.id,
            text_content: doc.data().text_content || '',
            sender_domain: doc.data().sender_domain || '',
            prediction: doc.data().prediction || 'Legit',
            confidence: doc.data().confidence || 0,
            timestamp: doc.data().timestamp,
            user_id: doc.data().user_id || ''
          })) as FirebaseEmailRecord[]
          setFirebaseHistory(scans)
        }, (err) => {
          console.error('Firebase snapshot error:', err)
          loadLocalHistory()
        })

        return () => unsubscribeScans()
      } else {
        loadLocalHistory()
      }
    })

    const loadLocalHistory = () => {
      const history = localStorage.getItem('emailScanHistory')
      if (history) {
        try {
          setLocalHistory(JSON.parse(history) as FirebaseEmailRecord[])
        } catch {
          setLocalHistory([])
        }
      }
    }

    return () => {
      unsubscribeAuth()
    }
  }, [])

  useEffect(() => {
    if (autoScanPending && textContent && senderDomain && mounted && !loading) {
      setAutoScanPending(false)
      const timer = setTimeout(handleSubmit, 400)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScanPending, textContent, senderDomain, mounted])

  const handleSubmit = async () => {
    if (!textContent.trim() || !senderDomain.trim()) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/scan/email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_content: textContent, sender_domain: senderDomain }),
      })
      if (!res.ok) throw new Error(`Scan failed with status ${res.status}`)

      const data = await res.json()
      const apiResult: EmailScanResult = {
        prediction: data.prediction === 'Legit' ? 'Legit' : 'Fake',
        confidence: data.confidence,
        red_flags: data.red_flag_words || [],
      }
      setResult(apiResult)
      await saveToFirebase(textContent, senderDomain, apiResult)
    } catch (err) {
      console.error('Error scanning email:', err)
      setError("Couldn't reach the scanner. Try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Results copied to clipboard.')
  }

  const clearHistory = async () => {
    if (user) {
      try {
        const scansRef = collection(db, 'users', user.uid, 'email_scans')
        const q = query(scansRef)
        const snapshot = await getDocs(q)
        const batch = writeBatch(db)
        snapshot.docs.forEach((doc) => batch.delete(doc.ref))
        await batch.commit()
        setFirebaseHistory([])
        toast.success('Scan history cleared.')
      } catch (err) {
        console.error('Error clearing Firebase history:', err)
        localStorage.removeItem('emailScanHistory')
        setLocalHistory([])
        toast.success('Scan history cleared.')
      }
    } else {
      localStorage.removeItem('emailScanHistory')
      setLocalHistory([])
      toast.success('Scan history cleared.')
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="relative min-h-dvh text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header Telemetry */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Check an email
            </h1>
            <span className="text-sm text-zinc-400">
              Scored by a machine-learning model
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Paste a recruiter email or internship offer. We look for the signs of a scam: fees before you join, pressure to act fast, and requests for your password or bank details.
          </p>

          {fromGmail && (
            <div className="p-2.5 rounded bg-blue-950/40 border border-blue-800/60 text-blue-300 text-sm inline-flex items-center gap-2">
              <Mail className="size-3.5" />
              <span>Opened from the PhishGuard extension in Gmail.</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Main Form Console */}
          <div className="lg:col-span-8 space-y-6">

            <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
              <div className="flex items-center justify-between border-zinc-800/80 pb-3">
                <span className="text-sm text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="size-3.5 text-zinc-400" />
                  The message
                </span>
                <span className="text-sm text-zinc-400">
                  Paste the full text
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-400">
                    Sender’s email domain
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 select-none">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="company-recruiter.com"
                      value={senderDomain}
                      onChange={(e) => setSenderDomain(e.target.value)}
                      className="w-full h-9 pl-7 pr-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-400">
                    Email text
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Paste the suspicious recruiter email, internship notice, or message content..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full p-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none leading-relaxed transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !textContent.trim() || !senderDomain.trim()}
                    className="px-4 py-2 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 active:scale-[0.98] transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="size-3.5" />
                        <span>Check email</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => { setTextContent(''); setSenderDomain(''); setResult(null); setError(null); }}
                    className="px-3 py-2 rounded bg-[#15171a] text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-start gap-2.5">
                <AlertTriangle className="size-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Result Panel */}
            {result && (
              <div className="rounded-lg bg-[#15171a] p-6 space-y-6">

                <div className="flex items-center justify-between border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <span className="text-sm text-zinc-400">
                      Result
                    </span>
                    <div className="flex items-center gap-2.5">
                      {result.prediction === 'Legit' ? (
                        <CheckCircle className="size-5 text-teal-400" />
                      ) : (
                        <AlertTriangle className="size-5 text-red-400" />
                      )}
                      <span className={`text-lg font-bold tracking-tight ${
                        result.prediction === 'Legit' ? 'text-teal-400' : 'text-red-400'
                      }`}>
                        {result.prediction === 'Legit' ? 'Looks genuine' : 'Likely a scam'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm text-zinc-400 block">Confidence</span>
                    <span className="text-sm font-bold text-zinc-100">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Red Flags Readout */}
                {result.red_flags && result.red_flags.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-red-400 font-semibold block">
                      Warning signs we found
                    </span>
                    <div className="space-y-1.5">
                      {result.red_flags.map((flag, idx) => (
                        <div key={idx} className="p-2 rounded bg-red-950/30 border border-red-900/50 text-red-200 text-sm flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-red-400" />
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Interpretation */}
                <div className="p-4 rounded bg-[#0f1012] space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium">
                    <Cpu className="size-3.5 text-zinc-400" />
                    <span>What this means</span>
                  </div>
                  <p className="text-base text-zinc-400 leading-relaxed font-sans">
                    {result.prediction === 'Legit'
                      ? 'This reads like a normal company or college email. We found no fee demands or pressure to act fast.'
                      : 'This looks like a scam. Fake internships often ask you to pay for a training kit, a background check or equipment before you get an offer letter. Real companies do not charge you to join.'}
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => copyToClipboard(`Sender: @${senderDomain}\nVerdict: ${result.prediction}\nConfidence: ${(result.confidence * 100).toFixed(1)}%\nFlags: ${result.red_flags?.join(', ') || 'None'}`)}
                    className="px-3 py-1.5 rounded bg-[#15171a] hover:bg-zinc-800 text-zinc-300 text-sm inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="size-3" />
                    <span>Copy result</span>
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Right Telemetry Column */}
          <div className="lg:col-span-4 space-y-6">

            <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
              <span className="text-sm text-zinc-300 flex items-center gap-2">
                <Shield className="size-3.5 text-zinc-400" />
                Your history
              </span>

              <div className="space-y-2">
                <button
                  onClick={clearHistory}
                  className="w-full text-left px-3 py-2 rounded bg-[#0f1012] hover:bg-zinc-800 text-zinc-300 text-sm transition-colors flex items-center justify-between"
                >
                  <span>Clear history</span>
                  <RefreshCw className="size-3.5 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Recent Scans */}
            <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
              <div className="flex items-center justify-between border-zinc-800/80 pb-3">
                <span className="text-sm text-zinc-300 flex items-center gap-2">
                  <Clock className="size-3.5 text-zinc-400" />
                  Recent Scans
                </span>
                <span className="text-sm text-zinc-400">
                  {user ? 'Saved to account' : 'This device'}
                </span>
              </div>

              <div className="space-y-2">
                {user ? (
                  firebaseHistory.length > 0 ? (
                    firebaseHistory.map((scan) => (
                      <div
                        key={scan.id}
                        onClick={() => {
                          setTextContent(scan.text_content);
                          setSenderDomain(scan.sender_domain);
                          setResult(null);
                        }}
                        className="p-2.5 rounded bg-[#0f1012] hover:border-zinc-700 cursor-pointer transition-colors space-y-1"
                      >
                        <p className="text-base text-zinc-300 truncate">
                          @{scan.sender_domain || 'unknown'}
                        </p>
                        <p className="text-base text-zinc-400 line-clamp-1 font-sans">
                          {scan.text_content}
                        </p>
                        <div className="flex items-center justify-between text-sm text-zinc-400 pt-1">
                          <span className={scan.prediction === 'Legit' ? 'text-teal-400' : 'text-red-400'}>
                            {scan.prediction}
                          </span>
                          <span>{(scan.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-base text-zinc-400 py-2">No scans yet.</p>
                  )
                ) : (
                  localHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setTextContent(item.text_content);
                        setSenderDomain(item.sender_domain);
                        setResult(null);
                      }}
                      className="p-2.5 rounded bg-[#0f1012] hover:border-zinc-700 cursor-pointer transition-colors space-y-1"
                    >
                      <p className="text-base text-zinc-300 truncate">
                        @{item.sender_domain || 'unknown'}
                      </p>
                      <p className="text-base text-zinc-400 line-clamp-1 font-sans">
                        {item.text_content}
                      </p>
                      <div className="flex items-center justify-between text-sm text-zinc-400 pt-1">
                        <span className={item.prediction === 'Legit' ? 'text-teal-400' : 'text-red-400'}>
                          {item.prediction}
                        </span>
                        <span>{(item.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
