'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  Loader,
  Link as LinkIcon,
  Zap,
  Clock,
  Activity,
  Globe,
  Lock,
  Command,
  ArrowRight,
  ExternalLink,
  Copy,
  RefreshCw,
  Database,
  AlertCircle,
  Brain
} from 'lucide-react'
import { db, auth } from '../../lib/firebase'
import { API_URL } from '../../lib/utils'
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore'
import { onAuthStateChanged, User as FirebaseUser, signInAnonymously } from 'firebase/auth'

// Updated interface without risk_score and analysis fields
interface ScanResult {
  prediction: 'Fake' | 'Legit'
  confidence: number
  threat_level?: string
}

// Updated Firebase record interface
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
  const [scanHistory, setScanHistory] = useState<string[]>([])
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [firebaseHistory, setFirebaseHistory] = useState<FirebaseLinkRecord[]>([])
  const [localHistory, setLocalHistory] = useState<FirebaseLinkRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  // Function to save scan to Firebase (simplified)
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
        console.log('Link scan result saved to Firebase')
      } catch (error) {
        console.error('Error saving to Firebase:', error)
        // Fallback: Save to localStorage if Firebase fails
        const localHistory = JSON.parse(localStorage.getItem('linkScanHistory') || '[]')
        const newScan = {
          id: Date.now().toString(),
          url: url,
          prediction: scanResult.prediction,
          confidence: scanResult.confidence,
          threat_level: scanResult.threat_level,
          timestamp: new Date().toISOString(),
          user_id: user.uid
        }
        localHistory.unshift(newScan)
        localStorage.setItem('linkScanHistory', JSON.stringify(localHistory.slice(0, 10)))
      }
    } else {
      // Save to localStorage for non-authenticated users
      const localHistory = JSON.parse(localStorage.getItem('linkScanHistory') || '[]')
      const newScan = {
        id: Date.now().toString(),
        url: url,
        prediction: scanResult.prediction,
        confidence: scanResult.confidence,
        threat_level: scanResult.threat_level,
        timestamp: new Date().toISOString(),
        user_id: 'anonymous'
      }
      localHistory.unshift(newScan)
      localStorage.setItem('linkScanHistory', JSON.stringify(localHistory.slice(0, 10)))
    }
  }

  useEffect(() => {
    setMounted(true)
    
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
        // Load link scan history from Firebase for authenticated users
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
      const history = localStorage.getItem('linkScanHistory')
      if (history) {
        try {
          const parsedHistory = JSON.parse(history) as FirebaseLinkRecord[]
          setLocalHistory(parsedHistory)
        } catch (error) {
          console.error('Error parsing local history:', error)
          setLocalHistory([])
        }
      }
      
      // Also load old scanHistory format for backward compatibility
      const oldHistory = localStorage.getItem('scanHistory')
      if (oldHistory && !history) {
        try {
          const oldScanHistory = JSON.parse(oldHistory) as string[]
          setScanHistory(oldScanHistory)
        } catch (error) {
          console.error('Error parsing old scan history:', error)
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
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
        body: JSON.stringify({ url: link }),
      })
      if (!res.ok) throw new Error(`Scan failed with status ${res.status}`)

      // Backend returns { prediction: 'Legit' | 'Phishing', confidence: 0-1 }
      const data = await res.json()
      const isLegit = data.prediction === 'Legit'
      const apiResult: ScanResult = {
        prediction: isLegit ? 'Legit' : 'Fake',
        confidence: data.confidence,
        threat_level: isLegit ? 'Low' : 'High',
      }
      setResult(apiResult)
      await saveToFirebase(link, apiResult)

      // Add to local scan history for backward compatibility or non-authenticated users
      if (!user) {
        const newHistory = [link, ...scanHistory.slice(0, 4)]
        setScanHistory(newHistory)
        localStorage.setItem('scanHistory', JSON.stringify(newHistory))
      }

    } catch (err) {
      // If the backend is down, show an error. Don't invent a result or save one to history.
      console.error('Error scanning link:', err)
      setError('Failed to analyze the link. Please try again later.')
    } finally {
      setIsScanning(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Results copied to clipboard!")
  }

  const handleAnonymousLogin = async () => {
    try {
      await signInAnonymously(auth)
      console.log('Signed in anonymously for link scanner')
    } catch (error) {
      console.error('Error signing in anonymously:', error)
    }
  }

  const clearHistory = async () => {
    if (user) {
      // Clear Firebase history
      try {
        const scansRef = collection(db, 'users', user.uid, 'scans')
        const q = query(scansRef)
        const snapshot = await getDocs(q)
        
        const batch = writeBatch(db)
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        
        setFirebaseHistory([])
        console.log('Firebase link history cleared')
      } catch (error) {
        console.error('Error clearing Firebase history:', error)
        // Fallback: Clear local history if Firebase fails
        localStorage.removeItem('linkScanHistory')
        localStorage.removeItem('scanHistory')
        setLocalHistory([])
        setScanHistory([])
      }
    } else {
      // Clear local history for non-authenticated users
      setScanHistory([])
      localStorage.removeItem('scanHistory')
      localStorage.removeItem('linkScanHistory')
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
              <Search className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-ping opacity-20"></div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white mb-4 sm:mb-6 tracking-tight leading-tight">
              Basic{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Link Scanner
              </span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-300 max-w-xs sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto leading-relaxed px-4">
              Simple URL analysis to help identify potentially unsafe links
            </p>

            {/* Status Indicators - Simplified */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-6 sm:mt-8 px-4">
              <div className="flex items-center gap-2 bg-zinc-800/30 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border border-blue-400/20">
                <Database className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-xs sm:text-sm text-gray-300">URL Checking</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-800/30 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border border-purple-400/20">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 animate-pulse" />
                <span className="text-xs sm:text-sm text-gray-300">Simple Analysis</span>
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
              
              {/* URL Input Section */}
              <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-zinc-700/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <LinkIcon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">URL Scanner</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter URL to check (e.g., https://example.com)"
                        className="w-full bg-zinc-900/50 border border-zinc-600/50 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 text-sm sm:text-base"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                      />
                      <Globe className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={handleSubmit}
                        disabled={isScanning || !link.trim()}
                        className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-2xl px-6 py-3 sm:py-4 transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        {isScanning ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5" />
                            Check URL
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      
                      <button 
                        onClick={() => setLink('')}
                        className="bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-2xl px-4 py-3 sm:py-4 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error message if backend is not available */}
              {error && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-amber-200">{error}</p>
                  </div>
                </div>
              )}

              {/* Scan Results - Simplified */}
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
                      <h3 className="text-xl sm:text-2xl font-bold text-white">Scan Results</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                      {/* Threat Status */}
                      <div className={`p-4 sm:p-6 rounded-2xl border ${
                        result.prediction === 'Legit' ? 
                        'bg-green-500/10 border-green-500/30' : 
                        'bg-red-500/10 border-red-500/30'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className={`w-5 h-5 ${result.prediction === 'Legit' ? 'text-green-400' : 'text-red-400'}`} />
                          <span className="font-semibold text-white">Status</span>
                        </div>
                        <p className={`text-lg font-bold ${result.prediction === 'Legit' ? 'text-green-400' : 'text-red-400'}`}>
                          {result.prediction}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          Threat Level: {result.threat_level || 'Low'}
                        </p>
                      </div>
                    </div>

                    {/* Basic Explanation */}
                    <div className="mt-4 p-4 sm:p-6 bg-zinc-900/30 rounded-2xl border border-zinc-600/30">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-cyan-400" />
                        ML Model Result
                      </h4>
                      {result.prediction === 'Legit' ? (
                        <p className="text-sm text-gray-300">
                          The ML model has classified this URL as legitimate based on pattern analysis. However, always exercise caution when clicking on links from unknown sources.
                        </p>
                      ) : (
                        <p className="text-sm text-gray-300">
                          The ML model has flagged this URL as potentially dangerous. It may be attempting to steal information or distribute malware. We recommend avoiding this link.
                        </p>
                      )}
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
                    onClick={() => result && copyToClipboard(`URL: ${link}\nStatus: ${result.prediction}\nThreat Level: ${result.threat_level || 'Low'}`)}
                    disabled={!result}
                    className="w-full bg-zinc-700/50 hover:bg-zinc-600/50 disabled:bg-zinc-800/50 disabled:text-zinc-500 text-white rounded-xl px-4 py-3 transition-all duration-300 flex items-center gap-2 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Results
                  </button>
                  <button 
                    onClick={() => window.open(link, '_blank')}
                    disabled={!link}
                    className="w-full bg-zinc-700/50 hover:bg-zinc-600/50 disabled:bg-zinc-800/50 disabled:text-zinc-500 text-white rounded-xl px-4 py-3 transition-all duration-300 flex items-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View URL
                  </button>
                  {!user && (
                    <button 
                      onClick={handleAnonymousLogin}
                      className="w-full bg-cyan-600/50 hover:bg-cyan-500/50 text-white rounded-xl px-4 py-3 transition-all duration-300 flex items-center gap-2 text-sm"
                    >
                      <Lock className="w-4 h-4" />
                      Enable Cloud Sync
                    </button>
                  )}
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
              {((user && firebaseHistory.length > 0) || (!user && (localHistory.length > 0 || scanHistory.length > 0))) && (
                <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 border border-zinc-700/50">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Recent Scans {user ? <span className="text-xs text-cyan-400">(Cloud)</span> : <span className="text-xs text-yellow-400">(Local)</span>}
                  </h3>
                  <div className="space-y-2">
                    {user ? (
                      firebaseHistory.map((scan) => (
                        <div 
                          key={scan.id}
                          className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-600/30 group hover:border-cyan-400/30 transition-all duration-300 cursor-pointer"
                          onClick={() => setLink(scan.url)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-gray-300 truncate group-hover:text-cyan-400 transition-colors flex-1">
                              {scan.url}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              scan.prediction === 'Legit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {scan.prediction}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : localHistory.length > 0 ? (
                      localHistory.map((scan) => (
                        <div 
                          key={scan.id}
                          className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-600/30 group hover:border-cyan-400/30 transition-all duration-300 cursor-pointer"
                          onClick={() => setLink(scan.url)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-gray-300 truncate group-hover:text-cyan-400 transition-colors flex-1">
                              {scan.url}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              scan.prediction === 'Legit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {scan.prediction}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      scanHistory.map((url, index) => (
                        <div 
                          key={index}
                          className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-600/30 group hover:border-cyan-400/30 transition-all duration-300 cursor-pointer"
                          onClick={() => setLink(url)}
                        >
                          <p className="text-sm text-gray-300 truncate group-hover:text-cyan-400 transition-colors">
                            {url}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Security Features - Updated to be more honest */}
              <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 border border-zinc-700/50">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Current Features
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Basic URL scanning</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Simple legitimacy check</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Scan history storage</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Cloud sync for registered users</span>
                  </div>
                </div>
              </div>
              
              {/* Development Status */}
              <div className="bg-amber-500/10 backdrop-blur-sm rounded-3xl p-6 border border-amber-500/30">
                <h3 className="text-lg font-bold text-amber-400 mb-3">In Development</h3>
                <p className="text-sm text-amber-200 mb-4">
                  We&apos;re working on enhancing the link scanner with these advanced features:
                </p>
                <ul className="space-y-2">
                  <li className="text-xs text-amber-200/80 flex items-start gap-2">
                    <div className="w-1 h-1 bg-amber-400 rounded-full mt-1.5"></div>
                    <span>Advanced domain reputation analysis</span>
                  </li>
                  <li className="text-xs text-amber-200/80 flex items-start gap-2">
                    <div className="w-1 h-1 bg-amber-400 rounded-full mt-1.5"></div>
                    <span>SSL certificate validation</span>
                  </li>
                  <li className="text-xs text-amber-200/80 flex items-start gap-2">
                    <div className="w-1 h-1 bg-amber-400 rounded-full mt-1.5"></div>
                    <span>Malware detection capabilities</span>
                  </li>
                  <li className="text-xs text-amber-200/80 flex items-start gap-2">
                    <div className="w-1 h-1 bg-amber-400 rounded-full mt-1.5"></div>
                    <span>Risk scoring system</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}