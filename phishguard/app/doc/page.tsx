'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Copy,
  Terminal,
  FileCheck,
  Target,
  Clock,
  RefreshCw,
  Cpu,
  Trash2,
  File,
} from 'lucide-react'
import { API_URL } from '../../lib/utils'
import { toast } from 'sonner'

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
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])

  useEffect(() => {
    setMounted(true)
    const history = localStorage.getItem('docScanHistory')
    if (history) {
      try {
        setScanHistory(JSON.parse(history))
      } catch {
        setScanHistory([])
      }
    }
  }, [])

  const saveToHistory = (scanResult: ScanResult) => {
    const newItem: ScanHistoryItem = {
      id: Date.now().toString(),
      filename: scanResult.filename,
      prediction: scanResult.prediction,
      risk_level: scanResult.risk_level,
      risk_score: scanResult.risk_score,
      timestamp: new Date().toISOString(),
    }
    const updated = [newItem, ...scanHistory.slice(0, 9)]
    setScanHistory(updated)
    localStorage.setItem('docScanHistory', JSON.stringify(updated))
  }

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
        throw new Error(errorData.detail || "Couldn't check this document. Try again in a moment.")
      }

      const data: ScanResult = await response.json()
      setResult(data)
      saveToHistory(data)
    } catch (err) {
      console.error('Error scanning document:', err)
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : "Couldn't reach the scanner. Try again in a moment.")
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
      droppedFile.type === 'text/plain' ||
      droppedFile.name.endsWith('.pdf') ||
      droppedFile.name.endsWith('.docx') ||
      droppedFile.name.endsWith('.txt')
    )) {
      setFile(droppedFile)
      setResult(null)
      setError(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Results copied to clipboard.')
  }

  const clearHistory = () => {
    localStorage.removeItem('docScanHistory')
    setScanHistory([])
    toast.success('Scan history cleared.')
  }

  const hasIndicators = (indicators: ScanResult['indicators']) => {
    return indicators && Object.values(indicators).some(arr => arr && arr.length > 0)
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
              Check a document
            </h1>
            <span className="text-sm text-zinc-400">
              Scored by a machine-learning model
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Upload an offer letter or other document. We read the text and look for the signs of a fake offer: fees to pay, requests for passwords or bank details, pressure to act fast, and suspicious links.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Main Inspection Console */}
          <div className="lg:col-span-8 space-y-6">

            {/* Upload Box */}
            <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
              <div className="flex items-center justify-between border-zinc-800/80 pb-3">
                <span className="text-sm text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="size-3.5 text-zinc-400" />
                  Your file
                </span>
                <span className="text-sm text-zinc-400">
                  PDF, Word or text, up to 5 MB
                </span>
              </div>

              {/* Drag and Drop Container */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                /* taste-skill-ignore: file drop zone */ className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-zinc-400 bg-zinc-800/40'
                    : file
                    ? 'border-teal-800/60 bg-teal-950/20'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null)
                    setResult(null)
                    setError(null)
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <File className="size-7 text-teal-400" />
                    <div className="text-left">
                      <p className="text-base text-zinc-200 font-semibold">{file.name}</p>
                      <p className="text-base text-zinc-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="size-9 rounded bg-[#15171a] mx-auto flex items-center justify-center">
                      <FileText className="size-4 text-zinc-400" />
                    </div>
                    <p className="text-base text-zinc-300 font-medium">Drop a file here, or click to choose one</p>
                    <p className="text-base text-zinc-400">PDF, Word (.docx) or text file, up to 5 MB. Scanned images without text can’t be read.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleUpload}
                  disabled={isScanning || !file}
                  className="px-4 py-2 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 active:scale-[0.98] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Reading document...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="size-3.5" />
                      <span>Check document</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => { setFile(null); setResult(null); setError(null); }}
                  className="px-3 py-2 rounded bg-[#15171a] text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-start gap-2.5">
                <AlertTriangle className="size-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Result Display */}
            {result && (
              <div className="rounded-lg bg-[#15171a] p-6 space-y-6">

                {/* Header Verdict */}
                <div className="flex items-center justify-between border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <span className="text-sm text-zinc-400">
                      Result
                    </span>
                    <div className="flex items-center gap-2.5">
                      {result.prediction === 'Legitimate' ? (
                        <CheckCircle className="size-5 text-teal-400" />
                      ) : (
                        <AlertTriangle className="size-5 text-red-400" />
                      )}
                      <span className={`text-lg font-bold tracking-tight ${
                        result.prediction === 'Legitimate' ? 'text-teal-400' : 'text-red-400'
                      }`}>
                        {result.prediction === 'Legitimate' ? 'Looks genuine' : 'Likely a scam document'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm text-zinc-400 block">Risk Score</span>
                    <span className="text-base font-bold text-zinc-100">
                      {result.risk_score}<span className="text-zinc-400 text-sm">/100</span>
                    </span>
                  </div>
                </div>

                {/* Score Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded bg-[#0f1012] space-y-1">
                    <span className="text-sm text-zinc-400">Verdict</span>
                    <p className="text-base font-bold text-zinc-200">{result.prediction}</p>
                  </div>
                  <div className="p-3 rounded bg-[#0f1012] space-y-1">
                    <span className="text-sm text-zinc-400">Confidence</span>
                    <p className="text-base font-bold text-zinc-200">{(result.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded bg-[#0f1012] space-y-1">
                    <span className="text-sm text-zinc-400">Risk Level</span>
                    <span className={`inline-block text-sm font-bold ${
                      result.risk_level === 'LOW' ? 'text-teal-400' : result.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {result.risk_level}
                    </span>
                  </div>
                </div>

                {/* Verdict Summary */}
                <div className="p-3.5 rounded bg-[#0f1012] text-sm text-zinc-300 font-sans">
                  {result.verdict}
                </div>

                {/* Warnings List */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="p-4 rounded bg-red-950/20 border border-red-900/40 space-y-2">
                    <span className="text-sm text-red-400 font-semibold block">
                      Warnings
                    </span>
                    <ul className="text-sm text-red-300 space-y-1">
                      {result.warnings.map((w, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span>•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detected Indicators */}
                {hasIndicators(result.indicators) && (
                  <div className="space-y-3">
                    <span className="text-sm text-zinc-400 font-semibold block">
                      Words that raised a flag
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {result.indicators.money?.length > 0 && (
                        <div className="p-3 rounded bg-[#0f1012] space-y-1.5">
                          <span className="text-sm text-amber-400 block font-semibold">Money and fees</span>
                          <div className="flex flex-wrap gap-1">
                            {result.indicators.money.map((item, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-[#15171a] text-zinc-300 text-sm">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.indicators.credentials?.length > 0 && (
                        <div className="p-3 rounded bg-[#0f1012] space-y-1.5">
                          <span className="text-sm text-red-400 block font-semibold">Requests for passwords or details</span>
                          <div className="flex flex-wrap gap-1">
                            {result.indicators.credentials.map((item, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-[#15171a] text-zinc-300 text-sm">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.indicators.urgency?.length > 0 && (
                        <div className="p-3 rounded bg-[#0f1012] space-y-1.5">
                          <span className="text-sm text-amber-400 block font-semibold">Pressure to act fast</span>
                          <div className="flex flex-wrap gap-1">
                            {result.indicators.urgency.map((item, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-[#15171a] text-zinc-300 text-sm">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.indicators.suspicious_urls?.length > 0 && (
                        <div className="p-3 rounded bg-[#0f1012] space-y-1.5 sm:col-span-2">
                          <span className="text-sm text-red-400 block font-semibold">Suspicious links</span>
                          <div className="flex flex-wrap gap-1">
                            {result.indicators.suspicious_urls.map((item, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-[#15171a] text-red-300 text-sm break-all">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Extracted Text Preview */}
                <div className="space-y-2 border-zinc-800/80 pt-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Cpu className="size-3.5 text-zinc-400" />
                    <span>Text we read from the file</span>
                  </div>
                  <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-400 bg-zinc-950 p-3 rounded border border-zinc-800 leading-relaxed">
                    {result.extracted_text || 'No text found.'}
                  </pre>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => copyToClipboard(`File: ${result.filename}\nVerdict: ${result.prediction}\nRisk Score: ${result.risk_score}/100`)}
                    className="px-3 py-1.5 rounded bg-[#15171a] hover:bg-zinc-800 text-zinc-300 text-sm inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="size-3" />
                    <span>Copy result</span>
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-4 space-y-6">

            <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
              <span className="text-sm text-zinc-300 flex items-center gap-2">
                <Target className="size-3.5 text-zinc-400" />
                Your history
              </span>

              <div className="space-y-2">
                <button
                  onClick={clearHistory}
                  className="w-full text-left px-3 py-2 rounded bg-[#0f1012] hover:bg-zinc-800 text-zinc-300 text-sm transition-colors flex items-center justify-between"
                >
                  <span>Clear history</span>
                  <Trash2 className="size-3.5 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Document Scan History */}
            <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
              <div className="flex items-center justify-between border-zinc-800/80 pb-3">
                <span className="text-sm text-zinc-300 flex items-center gap-2">
                  <Clock className="size-3.5 text-zinc-400" />
                  Past Document Audits
                </span>
                <span className="text-sm text-zinc-400">
                  LOCAL
                </span>
              </div>

              <div className="space-y-2">
                {scanHistory.length > 0 ? (
                  scanHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded bg-[#0f1012] space-y-1 text-sm"
                    >
                      <p className="text-zinc-200 truncate font-semibold" title={item.filename}>
                        {item.filename}
                      </p>
                      <div className="flex items-center justify-between text-sm text-zinc-400 pt-0.5">
                        <span className={item.prediction === 'Legitimate' ? 'text-teal-400' : 'text-red-400'}>
                          {item.prediction}
                        </span>
                        <span>{item.risk_score}/100</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-base text-zinc-400 py-2">No recent document scans.</p>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
