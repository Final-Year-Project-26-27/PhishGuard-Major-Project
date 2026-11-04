'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { auth, db } from '../../lib/firebase'
import { openExternal } from '../../lib/utils'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import {
  Search,
  Download,
  BarChart3,
  PieChart,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ArcElement
)

// Canvas text can't read CSS variables, so hand Chart.js the resolved page font
if (typeof document !== 'undefined') {
  ChartJS.defaults.font.family = getComputedStyle(document.body).fontFamily
  ChartJS.defaults.font.size = 13
  ChartJS.defaults.color = '#a1a1aa'
}

interface Report {
  id: string
  url: string
  reporterEmail?: string
  scamType?: string
  description?: string
  imageUrl?: string
  createdAt?: {
    toDate: () => Date
  }
}

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  // Reports are readable only when signed in (firestore.rules); null until auth has answered
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  // CSV Export Function
  const exportToCSV = () => {
    if (filteredReports.length === 0) {
      toast.warning('No reports to download.')
      return
    }

    try {
      const headers = ['ID', 'URL', 'Reporter Email', 'Scam Type', 'Description', 'Image URL', 'Date Reported']
      const csvData = filteredReports.map(report => [
        report.id,
        `"${report.url}"`,
        report.reporterEmail || 'Anonymous',
        report.scamType || 'Unknown',
        `"${(report.description || '').replace(/"/g, '""')}"`,
        report.imageUrl || '',
        report.createdAt?.toDate
          ? new Date(report.createdAt.toDate()).toISOString()
          : 'Unknown'
      ])

      const csvContent = [headers, ...csvData]
        .map(row => row.join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `phishguard-reports-${new Date().toISOString().slice(0, 10)}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Downloaded ${filteredReports.length} reports.`)
    } catch (err) {
      console.error('Error exporting CSV:', err)
      toast.error("Couldn't download the reports. Try again.")
    }
  }

  useEffect(() => auth.onAuthStateChanged((u) => setSignedIn(!!u)), [])

  useEffect(() => {
    if (signedIn === null) return
    if (!signedIn) {
      setReports([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadFailed(false)
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Report))
      setReports(data)
      setLoading(false)
    }, (err) => {
      console.error('Firestore reports fetch error:', err)
      setLoadFailed(true)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [signedIn])

  const analytics = useMemo(() => {
    const totalReports = reports.length
    const scamTypeCounts = reports.reduce((acc: Record<string, number>, report) => {
      const type = report.scamType || 'Unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentReports = reports.filter(r => {
      if (!r.createdAt?.toDate) return false
      return r.createdAt.toDate() >= sevenDaysAgo
    }).length

    const topScamType = Object.entries(scamTypeCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'

    return { totalReports, recentReports, scamTypeCounts, topScamType }
  }, [reports])

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch =
        (report.url || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.reporterEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.description || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter =
        selectedFilter === 'all' ||
        report.scamType === selectedFilter

      return matchesSearch && matchesFilter
    })
  }, [reports, searchTerm, selectedFilter])

  // Modern Technical Palette for Charts
  const chartData = {
    labels: Object.keys(analytics.scamTypeCounts),
    datasets: [
      {
        label: 'Reports',
        data: Object.values(analytics.scamTypeCounts),
        backgroundColor: 'rgba(244, 244, 245, 0.8)',
        hoverBackgroundColor: '#ffffff',
        borderRadius: 4,
        borderWidth: 0,
      },
    ],
  }

  const doughnutData = {
    labels: Object.keys(analytics.scamTypeCounts),
    datasets: [
      {
        data: Object.values(analytics.scamTypeCounts),
        backgroundColor: [
          '#ef4444', // crimson
          '#f59e0b', // amber
          '#14b8a6', // emerald
          '#38bdf8', // sky
          '#a1a1aa', // zinc
          '#f472b6', // pink
        ],
        borderColor: '#121215',
        borderWidth: 2,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#f4f4f5',
        bodyColor: '#a1a1aa',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 8,
      },
    },
    scales: {
      x: {
        ticks: { color: '#a1a1aa' },
        grid: { display: false },
      },
      y: {
        ticks: { color: '#a1a1aa' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#a1a1aa',
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#f4f4f5',
        bodyColor: '#a1a1aa',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 8,
      },
    },
  }

  const uniqueScamTypes = ['all', ...Array.from(new Set(reports.map(r => r.scamType).filter(Boolean)))]

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-24 px-4 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-zinc-400">
          <RefreshCw className="size-4 animate-spin" />
          <span>Loading reports...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header Telemetry */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Scam reports
            </h1>
            <span className="text-sm text-zinc-400">
              Sent in by students
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Every scam report students have sent in, newest first: fake recruiters, phishing sites and payment scams. The list updates as new reports arrive.
          </p>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg bg-[#15171a] p-4 space-y-1">
            <span className="text-sm text-zinc-400">Total Reports</span>
            <p className="text-2xl font-bold text-zinc-100">{analytics.totalReports}</p>
          </div>

          <div className="rounded-lg bg-[#15171a] p-4 space-y-1">
            <span className="text-sm text-zinc-400">Last 7 days</span>
            <p className="text-2xl font-bold text-zinc-100">{analytics.recentReports}</p>
          </div>

          <div className="rounded-lg bg-[#15171a] p-4 space-y-1">
            <span className="text-sm text-zinc-400">Most reported</span>
            <p className="text-base font-bold text-amber-400 truncate">{analytics.topScamType}</p>
          </div>

          <div className="rounded-lg bg-[#15171a] p-4 space-y-1">
            <span className="text-sm text-zinc-400">Scam types</span>
            <p className="text-2xl font-bold text-zinc-100">{Object.keys(analytics.scamTypeCounts).length}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-lg bg-[#15171a] p-5 space-y-4">
            <div className="flex items-center justify-between border-zinc-800/80 pb-3">
              <span className="text-sm text-zinc-300 flex items-center gap-1.5">
                <BarChart3 className="size-3.5 text-zinc-400" />
                Reports by scam type
              </span>
            </div>
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="lg:col-span-5 rounded-lg bg-[#15171a] p-5 space-y-4">
            <div className="flex items-center justify-between border-zinc-800/80 pb-3">
              <span className="text-sm text-zinc-300 flex items-center gap-1.5">
                <PieChart className="size-3.5 text-zinc-400" />
                Share of each type
              </span>
            </div>
            <div className="h-64">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>
        </div>

        {/* Search, Filter & Export Toolbar */}
        <div className="rounded-lg bg-[#15171a] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by link, email or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <button
              onClick={exportToCSV}
              className="w-full sm:w-auto px-3 py-1.5 rounded bg-[#15171a] hover:bg-zinc-800 text-zinc-300 text-sm inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="size-3" />
              <span>Download as spreadsheet</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {uniqueScamTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedFilter(type || 'all')}
                className={`px-2.5 py-1 rounded text-sm transition-colors ${
                  selectedFilter === type
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'bg-[#0f1012] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Feed */}
        <div className="rounded-lg bg-[#15171a] overflow-hidden">
          <div className="p-4 bg-zinc-950 border-zinc-800 flex items-center justify-between">
            <span className="text-sm text-zinc-300">
              All reports ({filteredReports.length})
            </span>
            <span className="text-sm text-zinc-400">
              Updates live
            </span>
          </div>

          <div className="divide-zinc-800/80">
            {filteredReports.length > 0 ? (
              filteredReports.map((report) => (
                <div key={report.id} className="p-4 sm:p-5 hover:bg-zinc-900/40 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold px-2 py-0.5 rounded border border-red-900/50 bg-red-950/30 text-red-300">
                        {report.scamType || 'Other'}
                      </span>
                      <span className="text-sm text-zinc-300 font-semibold truncate max-w-md">
                        {report.url}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-400">
                      {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString() : 'Recent'}
                    </span>
                  </div>

                  {report.description && (
                    <p className="text-base text-zinc-400 leading-relaxed font-sans">
                      {report.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-zinc-400 pt-1">
                    <span>Reporter: {report.reporterEmail || 'Anonymous Student'}</span>
                    <button
                      onClick={() => openExternal(report.url)}
                      className="hover:text-zinc-200 inline-flex items-center gap-1"
                    >
                      <span>Open link</span>
                      <ExternalLink className="size-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-zinc-400 text-sm">
                {!signedIn
                  ? 'Sign in to see the reports students have sent in.'
                  : loadFailed
                    ? "Couldn't load the reports. Try again in a moment."
                    : 'No reports match your search.'}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
