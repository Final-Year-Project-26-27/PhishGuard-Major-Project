'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  Mail,
  AlertTriangle,
  CheckCircle,
  Loader,
  Zap,
  Clock,
  Lock,
  Target,
  Brain,
  Command,
  ArrowRight,
  Copy,
  RefreshCw,
  Heart,
  FileText,
  AtSign
} from 'lucide-react'
import { db, auth } from '../../lib/firebase'
import { API_URL } from '../../lib/utils'
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'

interface EmailScanResult {
  prediction: 'Fake' | 'Legit'
  confidence: number
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [autoScanPending, setAutoScanPending] = useState(false)
  const [fromGmail, setFromGmail] = useState(false)

  // Function to save scan to Firebase
  const saveToFirebase = async (textContent: string, senderDomain: string, scanResult: EmailScanResult) => {
    if (user) {
      try {
        const scansRef = collection(db, 'users', user.uid, 'email_scans')
        await addDoc(scansRef, {
          text_content: textContent,
          sender_domain: senderDomain,
          prediction: scanResult.prediction,
          confidence: scanResult.confidence,
          timestamp: serverTimestamp(),
          user_id: user.uid
        })
        console.log('Email scan result saved to Firebase')
      } catch (error) {
        console.error('Error saving to Firebase:', error)
        // Fallback: Save to localStorage if Firebase fails
        const localHistory = JSON.parse(localStorage.getItem('emailScanHistory') || '[]')
        const newScan = {
          id: Date.now().toString(),
          text_content: textContent,
          sender_domain: senderDomain,
          prediction: scanResult.prediction,
          confidence: scanResult.confidence,
          timestamp: new Date().toISOString(),
          user_id: user.uid
        }
        localHistory.unshift(newScan)
        localStorage.setItem('emailScanHistory', JSON.stringify(localHistory.slice(0, 10)))
      }
    } else {
      // Save to localStorage for non-authenticated users
      const localHistory = JSON.parse(localStorage.getItem('emailScanHistory') || '[]')
      const newScan = {
        id: Date.now().toString(),
        text_content: textContent,
        sender_domain: senderDomain,
        prediction: scanResult.prediction,
        confidence: scanResult.confidence,
        timestamp: new Date().toISOString(),
        user_id: 'anonymous'
      }
      localHistory.unshift(newScan)
      localStorage.setItem('emailScanHistory', JSON.stringify(localHistory.slice(0, 10)))
    }
  }

  useEffect(() => {
    setMounted(true)
    
    // Check for URL parameters (from Gmail "Scan with PhishGuard" button)
    const urlParams = new URLSearchParams(window.location.search)
    const senderParam = urlParams.get('sender')
    const subjectParam = urlParams.get('subject')
    const bodyParam = urlParams.get('body')
    const autoScanParam = urlParams.get('autoScan')
    
    if (senderParam) {
      // Extract domain from email
      const domain = senderParam.split('@')[1] || senderParam
      setSenderDomain(domain)
      setFromGmail(true)
    }
    
    if (bodyParam) {
      // Combine subject and body for full content
      const fullContent = subjectParam 
        ? `Subject: ${subjectParam}\n\n${bodyParam}`
        : bodyParam
      setTextContent(fullContent)
      setFromGmail(true)
    }
    
    // Set auto-scan flag if requested
    if (autoScanParam === 'true' && bodyParam) {
      setAutoScanPending(true)
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }

    // Monitor authentication state
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      
      if (currentUser) {
        // Load email scan history from Firebase for authenticated users
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
        }, (error) => {
          console.error('Firebase snapshot error:', error)
          // Fallback to localStorage if Firebase fails
          loadLocalHistory()
        })

        return () => unsubscribeScans()
      } else {
        // Load local history for non-authenticated users
        loadLocalHistory()
      }
    })

    // Function to load local history
    const loadLocalHistory = () => {
      const history = localStorage.getItem('emailScanHistory')
      if (history) {
        try {
          const parsedHistory = JSON.parse(history) as FirebaseEmailRecord[]
          setLocalHistory(parsedHistory)
        } catch (error) {
          console.error('Error parsing local history:', error)
          setLocalHistory([])
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      unsubscribeAuth()
    }
  }, [])

  // Auto-scan effect when coming from Gmail
  useEffect(() => {
    if (autoScanPending && textContent && senderDomain && mounted && !loading) {
      setAutoScanPending(false)
      // Small delay to ensure UI is ready
      const timer = setTimeout(handleSubmit, 500)
      
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
      }
      setResult(apiResult)
      await saveToFirebase(textContent, senderDomain, apiResult)
    } catch (err) {
      // If the backend is down, show an error. Don't invent a result or save one to history.
      console.error('Error scanning email:', err)
      setError('Could not reach the scanner. Please try again in a minute.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearHistory = async () => {
    if (user) {
      // Clear Firebase history
      try {
        const scansRef = collection(db, 'users', user.uid, 'email_scans')
        const q = query(scansRef)
        const snapshot = await getDocs(q)
        
        const batch = writeBatch(db)
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        
        setFirebaseHistory([])
        console.log('Firebase email history cleared')
      } catch (error) {
        console.error('Error clearing Firebase history:', error)
        // Fallback: Clear local history if Firebase fails
        localStorage.removeItem('emailScanHistory')
        setLocalHistory([])
      }
    } else {
      // Clear local history for non-authenticated users
      localStorage.removeItem('emailScanHistory')
      setLocalHistory([])
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-96 h-96 bg-cyan-400/8 rounded-full blur-3xl transition-all duration-1000 ease-out"
          style={{
            top: `${mousePosition.y}%`,
            left: `${mousePosition.x}%`,
            transform: 'translate(-50%, -50%)',
          }}
        ></div>
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-400/6 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-400/6 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-pink-400/6 rounded-full blur-3xl animate-pulse delay-2000"></div>
        
        {/* Cyber Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:60px_60px] opacity-30"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto">
          
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full mb-6 sm:mb-8 shadow-lg shadow-cyan-500/30 relative group">
              <Mail className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-ping opacity-20"></div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white mb-4 sm:mb-6 tracking-tight leading-tight">
              Email{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Scam Detector
              </span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-300 max-w-xs sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto leading-relaxed px-4">
              Basic machine learning classification for email content and sender domain analysis
            </p>

            {/* Status Indicators - Only show implemented features */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-6 sm:mt-8 px-4">
              <div className="flex items-center gap-2 bg-zinc-800/30 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border border-cyan-400/20">
                <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
                <span className="text-xs sm:text-sm text-gray-300">ML Classification</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-800/30 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border border-blue-400/20">
                <AtSign className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-xs sm:text-sm text-gray-300">Domain Check</span>
              </div>
              {user && (
                <div className="flex items-center gap-2 bg-zinc-800/30 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border border-green-400/20">
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                  <span className="text-xs sm:text-sm text-gray-300">Logged In</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Main Scanner Interface */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Email Input Section */}
              <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-zinc-700/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Email Security Scanner</h2>
                    {fromGmail && (
                      <span className="ml-auto px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full text-green-400 text-xs font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                        </svg>
                        Imported from Gmail
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Email Content */}
                    <div className="relative">
                      <textarea
                        placeholder="Paste suspicious email content here..."
                        className="w-full bg-zinc-900/50 border border-zinc-600/50 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 text-sm sm:text-base resize-none"
                        value={textContent}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextContent(e.target.value)}
                        rows={6}
                      />
                      <FileText className="absolute right-4 top-4 w-5 h-5 text-gray-500" />
                    </div>

                    {/* Sender Domain */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Sender domain (e.g., internship-google.com)"
                        className="w-full bg-zinc-900/50 border border-zinc-600/50 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 text-sm sm:text-base"
                        value={senderDomain}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSenderDomain(e.target.value)}
                      />
                      <AtSign className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={handleSubmit}
                        disabled={loading || !textContent.trim() || !senderDomain.trim()}
                        className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-2xl px-6 py-3 sm:py-4 transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        {loading ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5" />
                            Scan Email
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      
                      <button 
                        onClick={() => {
                          setTextContent('')
                          setSenderDomain('')
                        }}
                        className="bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-2xl px-4 py-3 sm:py-4 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl p-4">
                  {error}
                </div>
              )}

              {/* Scan Results */}
              {result && (
                <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-zinc-700/50 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-red-500/5"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        result.prediction === 'Legit' ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {result.prediction === 'Legit' ? 
                          <CheckCircle className="w-5 h-5 text-white" /> : 
                          <AlertTriangle className="w-5 h-5 text-white" />
                        }
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white">Email Analysis Results</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                      {/* Email Status */}
                      <div className={`p-4 sm:p-6 rounded-2xl border ${
                        result.prediction === 'Legit' ? 
                        'bg-green-500/10 border-green-500/30' : 
                        'bg-red-500/10 border-red-500/30'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className={`w-5 h-5 ${result.prediction === 'Legit' ? 'text-green-400' : 'text-red-400'}`} />
                          <span className="font-semibold text-white">Classification</span>
                        </div>
                        <p className={`text-lg font-bold ${result.prediction === 'Legit' ? 'text-green-400' : 'text-red-400'}`}>
                          {result.prediction}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          Email appears {result.prediction === 'Legit' ? 'legitimate' : 'suspicious'}
                        </p>
                      </div>
                    </div>

                    {/* ML Model Info */}
                    <div className="mt-4 p-4 sm:p-6 bg-zinc-900/30 rounded-2xl border border-zinc-600/30">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-cyan-400" />
                        ML Model Result
                      </h4>
                      <p className="text-sm text-gray-300">
                        {result.prediction === 'Legit' 
                          ? 'The ML model has classified this email as legitimate based on content and domain pattern analysis.'
                          : 'The ML model has flagged this email as potentially malicious. It may be a phishing attempt trying to steal your information.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Quick Actions */}
              <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 border border-zinc-700/50">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Command className="w-5 h-5 text-cyan-400" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => result && copyToClipboard(`Email Domain: ${senderDomain}\nStatus: ${result.prediction}`)}
                    className="w-full bg-zinc-700/50 hover:bg-zinc-600/50 text-white rounded-xl px-4 py-3 transition-all duration-300 flex items-center gap-2 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Results
                  </button>
                  <button 
                    onClick={clearHistory}
                    className="w-full bg-zinc-700/50 hover:bg-zinc-600/50 text-white rounded-xl px-4 py-3 transition-all duration-300 flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear History
                  </button>
                </div>
              </div>

              {/* Scan History */}
              {((user && firebaseHistory.length > 0) || (!user && localHistory.length > 0)) && (
                <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 border border-zinc-700/50">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Recent Email Scans {user ? <span className="text-xs text-cyan-400">(Firebase)</span> : <span className="text-xs text-yellow-400">(Local)</span>}
                  </h3>
                  <div className="space-y-2">
                    {(user ? firebaseHistory : localHistory).map((scan) => (
                      <div 
                        key={scan.id}
                        className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-600/30 group hover:border-cyan-400/30 transition-all duration-300 cursor-pointer"
                        onClick={() => {
                          setTextContent(scan.text_content)
                          setSenderDomain(scan.sender_domain)
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-300 truncate group-hover:text-cyan-400 transition-colors flex-1">
                            {scan.sender_domain}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            scan.prediction === 'Legit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {scan.prediction}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Features - Removed features without backend implementation */}
              <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 border border-zinc-700/50">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Available Features
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    ML text classification
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <AtSign className="w-4 h-4 text-blue-400" />
                    Sender domain analysis
                  </div>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 border border-zinc-700/50 text-center">
                <Heart className="w-8 h-8 text-pink-400 mx-auto mb-3 animate-pulse" />
                <p className="text-sm text-gray-300 mb-2">Protected emails</p>
                <p className="text-xl font-bold text-cyan-400">2+ Analyzed</p>
                <div className="flex justify-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}