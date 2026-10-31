'use client'

import React, { useState, useEffect } from 'react'
import { API_URL } from '../../lib/utils'
import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader,
  Upload,
  Zap,
  Eye,
  Clock,
  FileCheck,
  Lock,
  Target,
  Brain,
  Command,
  ArrowRight,
  Copy,
  RefreshCw,
  Database,
  Heart,
  File,
  Download,
  Trash2,
  Sparkles
} from 'lucide-react'

interface ScanResult {
  prediction: string
  confidence: number
  risk_score: number
  risk_level: string
  verdict: string
  warnings: string[]
  indicators: {
    urgency: string[]
    money: string[]
    credentials: string[]
    threats: string[]
    suspicious_urls: string[]
    actions: string[]
  }
  extracted_text: string
  filename: string
}

interface ScanHistoryItem {
  id: string
  filename: string
  prediction: string
  risk_level: string
  risk_score: number
  timestamp: string
}

export default function DocScanPage() {
  const [mounted, setMounted] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [dragActive, setDragActive] = useState(false)
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Load scan history from localStorage
  const loadHistory = () => {
    try {
      const history = localStorage.getItem('docScanHistory')
      if (history) {
        setScanHistory(JSON.parse(history))
      }
    } catch (e) {
      console.error('Error loading history:', e)
    }
  }

  // Save scan to history
  const saveToHistory = (scanResult: ScanResult) => {
    const historyItem: ScanHistoryItem = {
      id: Date.now().toString(),
      filename: scanResult.filename,
      prediction: scanResult.prediction,
      risk_level: scanResult.risk_level,
      risk_score: scanResult.risk_score,
      timestamp: new Date().toISOString()
    }
    
    const newHistory = [historyItem, ...scanHistory].slice(0, 10)
    setScanHistory(newHistory)
    localStorage.setItem('docScanHistory', JSON.stringify(newHistory))
  }

  useEffect(() => {
    setMounted(true)
    loadHistory()
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  const handleUpload = async () => {
    if (!file) return
    
    setIsScanning(true)
    setResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`${API_URL}/scan/doc/`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to analyze document')
      }
      
      const data: ScanResult = await response.json()
      setResult(data)
      saveToHistory(data)

    } catch (err) {
      console.error('Error scanning document:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze document. Make sure the backend is running.')
    } finally {
      setIsScanning(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (
      droppedFile.type === 'application/pdf' || 
      droppedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      droppedFile.type === 'text/plain'
    )) {
      setFile(droppedFile)
      setResult(null)
      setError(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearHistory = () => {
    localStorage.removeItem('docScanHistory')
    setScanHistory([])
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-500'
      case 'MEDIUM': return 'bg-yellow-500'
      case 'LOW': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const hasIndicators = (indicators: ScanResult['indicators']) => {
    return indicators && Object.values(indicators).some(arr => arr && arr.length > 0)
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
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-ping opacity-20"></div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white mb-4 sm:mb-6 tracking-tight leading-tight">
              Document{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Scanner
              </span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-300 max-w-xs sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto leading-relaxed px-4">
              Advanced ML-powered document analysis for job/internship scam detection
            </p>

            {/* Status Indicators */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-6 sm:mt-8 px-4">
              <div className="flex items-center gap-2 bg-zinc-800/30 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border border-cyan-400/20">
                <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
                <span className="text-xs sm:text-sm text-gray-300">ML Classification</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-800/30 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border border-blue-400/20">
                <FileCheck className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-xs sm:text-sm text-gray-300">Text Extraction</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-800/30 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border border-purple-400/20">
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
                <span className="text-xs sm:text-sm text-gray-300">Risk Analysis</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Main Scanner Interface */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Document Upload Section */}
              <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-zinc-700/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Document Scam Detector</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Drag & Drop Area */}
                    <div 
                      className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${
                        dragActive 
                          ? 'border-cyan-400 bg-cyan-400/10' 
                          : file 
                            ? 'border-green-400 bg-green-400/10' 
                            : 'border-zinc-600/50 bg-zinc-900/20'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setFile(e.target.files?.[0] || null)
                          setResult(null)
                          setError(null)
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      
                      <div className="text-center">
                        {file ? (
                          <div className="flex items-center justify-center gap-3">
                            <File className="w-8 h-8 text-green-400" />
                            <div>
                              <p className="text-green-400 font-medium">{file.name}</p>
                              <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-white font-medium mb-2">Drop your document here</p>
                            <p className="text-gray-400 text-sm">or click to browse</p>
                            <p className="text-gray-500 text-xs mt-2">Supports PDF, DOCX, and TXT files</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          <span>{error}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={handleUpload}
                        disabled={isScanning || !file}
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
                            Scan Document
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      
                      <button 
                        onClick={() => {
                          setFile(null)
                          setResult(null)
                          setError(null)
                        }}
                        className="bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-2xl px-4 py-3 sm:py-4 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scan Results */}
              {result && (
                <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-zinc-700/50 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-red-500/5"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        result.prediction === 'Legitimate' ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {result.prediction === 'Legitimate' ? 
                          <CheckCircle className="w-5 h-5 text-white" /> : 
                          <AlertTriangle className="w-5 h-5 text-white" />
                        }
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white">Analysis Results</h3>
                    </div>

                    {/* Main Result Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className={`p-4 rounded-2xl border ${
                        result.prediction === 'Legitimate' ? 
                        'bg-green-500/10 border-green-500/30' : 
                        'bg-red-500/10 border-red-500/30'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className={`w-5 h-5 ${result.prediction === 'Legitimate' ? 'text-green-400' : 'text-red-400'}`} />
                          <span className="text-sm text-gray-400">Prediction</span>
                        </div>
                        <p className={`text-lg font-bold ${result.prediction === 'Legitimate' ? 'text-green-400' : 'text-red-400'}`}>
                          {result.prediction}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-600/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-5 h-5 text-purple-400" />
                          <span className="text-sm text-gray-400">Risk Score</span>
                        </div>
                        <p className="text-lg font-bold text-white">
                          {result.risk_score}<span className="text-gray-400 text-sm">/100</span>
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-600/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-5 h-5 text-cyan-400" />
                          <span className="text-sm text-gray-400">Risk Level</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risk_level)} text-white`}>
                          {result.risk_level}
                        </span>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-600/30 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Confidence</span>
                        <span className="text-lg font-bold text-cyan-400">{(result.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-zinc-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${result.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Verdict */}
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 mb-6">
                      <p className="text-blue-300">{result.verdict}</p>
                    </div>

                    {/* Warnings */}
                    {result.warnings && result.warnings.length > 0 && (
                      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 mb-6">
                        <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          Warnings
                        </h4>
                        <ul className="space-y-2">
                          {result.warnings.map((warning, idx) => (
                            <li key={idx} className="text-sm text-red-300 flex items-start gap-2">
                              <span className="text-red-400">•</span>
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Detected Indicators */}
                    {hasIndicators(result.indicators) && (
                      <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-600/30 mb-6">
                        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                          <Eye className="w-5 h-5 text-purple-400" />
                          Detected Indicators
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {result.indicators.urgency?.length > 0 && (
                            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                              <p className="text-xs text-orange-400 mb-2">🚨 Urgency Language</p>
                              <div className="flex flex-wrap gap-1">
                                {result.indicators.urgency.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-orange-500/20 rounded text-xs text-orange-300">{item}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.indicators.money?.length > 0 && (
                            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                              <p className="text-xs text-yellow-400 mb-2">💰 Money-Related</p>
                              <div className="flex flex-wrap gap-1">
                                {result.indicators.money.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-yellow-500/20 rounded text-xs text-yellow-300">{item}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.indicators.credentials?.length > 0 && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                              <p className="text-xs text-red-400 mb-2">🔐 Credential Requests</p>
                              <div className="flex flex-wrap gap-1">
                                {result.indicators.credentials.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-red-500/20 rounded text-xs text-red-300">{item}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.indicators.threats?.length > 0 && (
                            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                              <p className="text-xs text-purple-400 mb-2">⚡ Threat Language</p>
                              <div className="flex flex-wrap gap-1">
                                {result.indicators.threats.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-purple-500/20 rounded text-xs text-purple-300">{item}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.indicators.suspicious_urls?.length > 0 && (
                            <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 col-span-full">
                              <p className="text-xs text-pink-400 mb-2">🔗 Suspicious URLs</p>
                              <div className="flex flex-wrap gap-1">
                                {result.indicators.suspicious_urls.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-pink-500/20 rounded text-xs text-pink-300 break-all">{item}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.indicators.actions?.length > 0 && (
                            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-blue-400 mb-2">👆 Action Requests</p>
                              <div className="flex flex-wrap gap-1">
                                {result.indicators.actions.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-300">{item}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Extracted Text */}
                    <div className="p-4 sm:p-6 bg-zinc-900/30 rounded-2xl border border-zinc-600/30">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-cyan-400" />
                        Extracted Text Content
                      </h4>
                      <div className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-gray-300 bg-black/20 p-4 rounded-xl border border-zinc-700/50">
                        {result.extracted_text || "No text could be extracted from this document."}
                      </div>
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
                    onClick={() => result && copyToClipboard(`File: ${result.filename}\nPrediction: ${result.prediction}\nRisk Level: ${result.risk_level}\nRisk Score: ${result.risk_score}/100\nVerdict: ${result.verdict}`)}
                    disabled={!result}
                    className="w-full bg-zinc-700/50 hover:bg-zinc-600/50 disabled:opacity-50 text-white rounded-xl px-4 py-3 transition-all duration-300 flex items-center gap-2 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Results
                  </button>
                  <button 
                    onClick={() => file && window.open(URL.createObjectURL(file), '_blank')}
                    disabled={!file}
                    className="w-full bg-zinc-700/50 hover:bg-zinc-600/50 disabled:opacity-50 text-white rounded-xl px-4 py-3 transition-all duration-300 flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    View Document
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
              {scanHistory.length > 0 && (
                <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 border border-zinc-700/50">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Recent Scans
                  </h3>
                  <div className="space-y-2">
                    {scanHistory.map((scan) => (
                      <div 
                        key={scan.id}
                        className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-600/30 group hover:border-cyan-400/30 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-300 truncate group-hover:text-cyan-400 transition-colors flex-1 mr-2">
                            {scan.filename}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            scan.prediction === 'Legitimate' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {scan.prediction}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Risk: {scan.risk_score}/100</span>
                          <span className={`px-2 py-0.5 rounded ${getRiskColor(scan.risk_level)} text-white`}>
                            {scan.risk_level}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Features */}
              <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 border border-zinc-700/50">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Detection Features
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    Text content analysis
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Lock className="w-4 h-4 text-blue-400" />
                    Credential request detection
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Brain className="w-4 h-4 text-purple-400" />
                    ML-powered classification
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Urgency & threat detection
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Database className="w-4 h-4 text-pink-400" />
                    Suspicious URL scanning
                  </div>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="bg-zinc-800/30 backdrop-blur-sm rounded-3xl p-6 border border-zinc-700/50 text-center">
                <Heart className="w-8 h-8 text-pink-400 mx-auto mb-3 animate-pulse" />
                <p className="text-sm text-gray-300 mb-2">Model Accuracy</p>
                <p className="text-xl font-bold text-cyan-400">99.76%</p>
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
