'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  ExternalLink,
  Copy,
  RefreshCw,
  Cpu,
  Terminal,
} from 'lucide-react'
import { db, auth } from '../../lib/firebase'
import { API_URL, openExternal } from '../../lib/utils'
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore'
import { onAuthStateChanged, User as FirebaseUser, signInAnonymously } from 'firebase/auth'
import { toast } from 'sonner'

interface ScanResult {
  prediction: 'Fake' | 'Legit'
  confidence: number
  threat_level?: string
}

interface FirebaseLinkRecord {
  id: string
  url: string
  prediction: 'Fake' | 'Legit'
  confidence: number
  threat_level?: string
  timestamp: ReturnType<typeof serverTimestamp>
  user_id: string
}

export default function LinkScannerPage() {
  const [mounted, setMounted] = useState(false)
  const [link, setLink] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [firebaseHistory, setFirebaseHistory] = useState<FirebaseLinkRecord[]>([])
  const [localHistory, setLocalHistory] = useState<FirebaseLinkRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  const saveToFirebase = async (url: string, scanResult: ScanResult) => {
    if (user) {
      try {
        const scansRef = collection(db, 'users', user.uid, 'scans')
        await addDoc(scansRef, {
          url: url,
          prediction: scanResult.prediction,
          confidence: scanResult.confidence,
          threat_level: scanResult.threat_level,
          timestamp: serverTimestamp(),
          user_id: user.uid
        })
      } catch (error) {
        console.error('Error saving to Firebase:', error)
        const local = JSON.parse(localStorage.getItem('linkScanHistory') || '[]')
        const newScan = {
          id: Date.now().toString(),
          url: url,
          prediction: scanResult.prediction,
          confidence: scanResult.confidence,
          threat_level: scanResult.threat_level,
          timestamp: new Date().toISOString(),
          user_id: user.uid
        }
        local.unshift(newScan)
        localStorage.setItem('linkScanHistory', JSON.stringify(local.slice(0, 10)))
        setLocalHistory(local.slice(0, 10))
      }
    } else {
      const local = JSON.parse(localStorage.getItem('linkScanHistory') || '[]')
      const newScan = {
        id: Date.now().toString(),
        url: url,
        prediction: scanResult.prediction,
        confidence: scanResult.confidence,
        threat_level: scanResult.threat_level,
        timestamp: new Date().toISOString(),
        user_id: 'anonymous'
      }
      local.unshift(newScan)
      localStorage.setItem('linkScanHistory', JSON.stringify(local.slice(0, 10)))
      setLocalHistory(local.slice(0, 10))
    }
  }

  useEffect(() => {
    setMounted(true)

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        const scansRef = collection(db, 'users', currentUser.uid, 'scans')
        const q = query(scansRef, orderBy('timestamp', 'desc'), limit(10))

        const unsubscribeScans = onSnapshot(q, (snapshot) => {
          const scans = snapshot.docs.map(doc => ({
            id: doc.id,
            url: doc.data().url || '',
            prediction: doc.data().prediction || 'Legit',
            confidence: doc.data().confidence || 0,
            threat_level: doc.data().threat_level,
            timestamp: doc.data().timestamp,
            user_id: doc.data().user_id || ''
          })) as FirebaseLinkRecord[]
          setFirebaseHistory(scans)
        }, (error) => {
          console.error('Firebase snapshot error:', error)
          loadLocalHistory()
        })

        return () => unsubscribeScans()
      } else {
        loadLocalHistory()
      }
    })

    const loadLocalHistory = () => {
      const history = localStorage.getItem('linkScanHistory')
      if (history) {
        try {
          const parsed = JSON.parse(history) as FirebaseLinkRecord[]
          setLocalHistory(parsed)
        } catch {
          setLocalHistory([])
        }
      }
    }

    return () => {
      unsubscribeAuth()
    }
  }, [])

  const handleSubmit = async () => {
    if (!link.trim()) return

    setIsScanning(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/scan/link/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link.trim() }),
      })
      if (!res.ok) throw new Error(`Scan failed with status ${res.status}`)

      const data = await res.json()
      const isLegit = data.prediction === 'Legit'
      const apiResult: ScanResult = {
        prediction: isLegit ? 'Legit' : 'Fake',
        confidence: data.confidence,
        threat_level: isLegit ? 'Low' : 'High',
      }
      setResult(apiResult)
      await saveToFirebase(link.trim(), apiResult)

    } catch (err) {
      console.error('Error scanning link:', err)
      setError("Couldn't reach the scanner. Try again in a moment.")
    } finally {
      setIsScanning(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Results copied to clipboard.')
  }

  const handleAnonymousLogin = async () => {
    try {
      await signInAnonymously(auth)
      toast.success('Signed in. Your scans will be saved.')
    } catch (error) {
      console.error('Error signing in anonymously:', error)
      toast.error("Couldn't sign you in. Try again.")
    }
  }

  const clearHistory = async () => {
    if (user) {
      try {
        const scansRef = collection(db, 'users', user.uid, 'scans')
        const q = query(scansRef)
        const snapshot = await getDocs(q)
        const batch = writeBatch(db)
        snapshot.docs.forEach((doc) => batch.delete(doc.ref))
        await batch.commit()
        setFirebaseHistory([])
        toast.success('Scan history cleared.')
      } catch (error) {
        console.error('Error clearing Firebase history:', error)
        localStorage.removeItem('linkScanHistory')
        localStorage.removeItem('scanHistory')
        setLocalHistory([])
        toast.success('Local history cleared.')
      }
    } else {
      localStorage.removeItem('scanHistory')
      localStorage.removeItem('linkScanHistory')
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

        {/* Header telemetry */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Check a link
            </h1>
            <span className="text-sm text-zinc-400">
              Scored by a machine-learning model
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Paste a link before you click it. We look for the tricks scam sites use: look-alike spellings, fake subdomains such as google.verify-login.tk, and risky endings like .tk or .xyz.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Main Inspection Console */}
          <div className="lg:col-span-8 space-y-6">

            {/* Input Card */}
            <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
              <div className="flex items-center justify-between border-zinc-800/80 pb-3">
                <span className="text-sm text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="size-3.5 text-zinc-400" />
                  Link to check
                </span>
                <span className="text-sm text-zinc-400">
                  Starts with http or https
                </span>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 select-none">
                    &gt;
                  </span>
                  <input
                    type="url"
                    placeholder="https://internship-portal-verify.tk/login"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-full h-10 pl-7 pr-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSubmit}
                    disabled={isScanning || !link.trim()}
                    className="px-4 py-2 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 active:scale-[0.98] transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <Search className="size-3.5" />
                        <span>Check link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => { setLink(''); setResult(null); setError(null); }}
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

            {/* Scan Results Display */}
            {result && (
              <div className="rounded-lg bg-[#15171a] p-6 space-y-6">

                {/* Status Bar */}
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
                        {result.prediction === 'Legit' ? 'Looks safe' : 'Likely a phishing link'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm text-zinc-400 block">Risk</span>
                    <span className={` text-sm font-bold px-2 py-0.5 rounded border ${
                      result.threat_level === 'Low'
                        ? 'border-teal-800/60 bg-teal-950/40 text-teal-300'
                        : 'border-red-800/60 bg-red-950/40 text-red-300'
                    }`}>
                      {result.threat_level || 'Low'}
                    </span>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-[#0f1012] space-y-1">
                    <span className="text-sm text-zinc-400">
                      Confidence
                    </span>
                    <p className="text-xl font-bold text-zinc-100">
                      {(result.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 rounded bg-[#0f1012] space-y-1">
                    <span className="text-sm text-zinc-400">
                      Verdict
                    </span>
                    <p className="text-xl font-bold text-zinc-100">
                      {result.prediction}
                    </p>
                  </div>
                </div>

                {/* Technical Interpretation */}
                <div className="p-4 rounded bg-[#0f1012] space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium">
                    <Cpu className="size-3.5 text-zinc-400" />
                    <span>What this means</span>
                  </div>
                  <p className="text-base text-zinc-400 leading-relaxed font-sans">
                    {result.prediction === 'Legit'
                      ? 'We found no fake subdomains, risky domain endings or other common phishing tricks in this link. Still be careful with sites you have never heard of.'
                      : 'This link looks like known phishing links, for example a fake login page, a brand name hidden in a subdomain, or a risky domain ending. Do not enter your password or pay anything on it.'}
                  </p>
                </div>

                {/* Action Bar */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => copyToClipboard(`URL: ${link}\nVerdict: ${result.prediction}\nConfidence: ${(result.confidence * 100).toFixed(1)}%`)}
                    className="px-3 py-1.5 rounded bg-[#15171a] hover:bg-zinc-800 text-zinc-300 text-sm inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="size-3" />
                    <span>Copy result</span>
                  </button>

                  <button
                    onClick={() => openExternal(/^[a-z][a-z0-9+.-]*:/i.test(link) ? link : `https://${link}`)}
                    className="px-3 py-1.5 rounded bg-[#15171a] hover:bg-zinc-800 text-zinc-300 text-sm inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="size-3" />
                    <span>Open link in new tab</span>
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Right Telemetry Column */}
          <div className="lg:col-span-4 space-y-6">

            {/* Session Actions */}
            <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
              <span className="text-sm text-zinc-300 flex items-center gap-2">
                <Shield className="size-3.5 text-zinc-400" />
                Your history
              </span>

              <div className="space-y-2">
                {!user && (
                  <button
                    onClick={handleAnonymousLogin}
                    className="w-full text-left px-3 py-2 rounded bg-[#0f1012] hover:bg-zinc-800 text-zinc-300 text-sm transition-colors flex items-center justify-between"
                  >
                    <span>Save scans to your account</span>
                    <Lock className="size-3.5 text-zinc-400" />
                  </button>
                )}

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
                        onClick={() => { setLink(scan.url); setResult(null); }}
                        className="p-2.5 rounded bg-[#0f1012] hover:border-zinc-700 cursor-pointer transition-colors space-y-1"
                      >
                        <p className="text-base text-zinc-300 truncate" title={scan.url}>
                          {scan.url}
                        </p>
                        <div className="flex items-center justify-between text-sm text-zinc-400">
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
                ) : localHistory.length === 0 ? (
                  <p className="text-base text-zinc-400 py-2">No scans yet.</p>
                ) : (
                  localHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => { setLink(item.url); setResult(null); }}
                      className="p-2.5 rounded bg-[#0f1012] hover:border-zinc-700 cursor-pointer transition-colors space-y-1"
                    >
                      <p className="text-base text-zinc-300 truncate" title={item.url}>
                        {item.url}
                      </p>
                      <div className="flex items-center justify-between text-sm text-zinc-400">
                        <span className={item.prediction === 'Legit' ? 'text-teal-400' : 'text-red-400'}>
                          {item.prediction}
                        </span>
                        <span>{`${(item.confidence * 100).toFixed(0)}%`}</span>
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
