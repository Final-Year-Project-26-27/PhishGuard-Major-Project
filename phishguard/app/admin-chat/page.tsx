'use client'

import React, { useState, useEffect } from 'react'
import {
  Search,
  Send,
  Terminal,
  Lock,
} from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import { User as FirebaseUser } from 'firebase/auth'
import { toast } from 'sonner'

interface Question {
  id: string
  content: string
  student: {
    name: string
    email: string
    avatar: string
  }
  category: string
  timestamp: Date
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'unanswered' | 'answered' | 'resolved'
  likes: number
  views: number
  tags: string[]
}

export default function AdminChatPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const ADMIN_UID = '9z0COxpJEbXJsjElS3ZlUdGNcC22'

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u)
      if (u && u.uid === ADMIN_UID) {
        setIsAuthorized(true)
      } else {
        setIsAuthorized(false)
      }
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (isAuthorized) {
      const q = query(collection(db, 'questions'), orderBy('timestamp', 'desc'))
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const questionsData: Question[] = []
        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          questionsData.push({
            id: docSnap.id,
            content: data.content,
            student: data.student,
            category: data.category,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
            priority: data.priority || 'medium',
            status: data.status || 'unanswered',
            likes: data.likes || 0,
            views: data.views || 0,
            tags: data.tags || []
          })
        })
        setQuestions(questionsData)
      })

      return () => unsubscribe()
    }
  }, [isAuthorized])

  const handleAnswerSubmit = async () => {
    if (!answer.trim() || !selectedQuestion || !user) return
    setIsLoading(true)

    try {
      const answerData = {
        content: answer.trim(),
        answeredBy: {
          id: user.uid,
          name: user.displayName || 'Security Lead',
          email: user.email || '',
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=SecLead&background=047857&color=f4f4f5`
        },
        timestamp: new Date()
      }

      const questionRef = doc(db, 'questions', selectedQuestion.id)
      await updateDoc(questionRef, {
        status: 'answered',
        answer: answerData
      })

      setQuestions(prev => prev.map(q =>
        q.id === selectedQuestion.id
          ? { ...q, status: 'answered' as const }
          : q
      ))

      setAnswer('')
      setSelectedQuestion(null)
      toast.success('Response dispatched to student inquiry.')
    } catch (error) {
      console.error('Error submitting answer:', error)
      toast.error('Failed to submit response.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFilter = filterStatus === 'all' || q.status === filterStatus
    return matchesSearch && matchesFilter
  })

  if (authLoading) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center text-sm text-zinc-400">
        Authenticating Operator Token...
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full rounded-lg border border-red-900/60 bg-red-950/20 p-6 text-center space-y-4">
          <Lock className="size-8 text-red-400 mx-auto" />
          <h1 className="text-lg font-bold text-red-200">Restricted Administration Surface</h1>
          <p className="text-base text-zinc-400 leading-relaxed">
            This operator workstation requires verified administrative UID privileges.
          </p>
          <button
            onClick={() => window.location.href = '/chat'}
            className="px-4 py-2 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors"
          >
            Return to Advisory Feed
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh bg-zinc-950 text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header Telemetry */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Inquiry Resolution Console
            </h1>
            <span className="text-sm text-zinc-400">
              Admin UID Verified · Queue Active
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Review incoming student threat questions, provide verified advisory responses, and resolve active incident reports.
          </p>
        </div>

        {/* Queue Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3.5 rounded bg-[#15171a] space-y-1">
            <span className="text-sm text-zinc-400 block">Total Queries</span>
            <p className="text-xl font-bold text-zinc-100">{questions.length}</p>
          </div>
          <div className="p-3.5 rounded bg-[#15171a] space-y-1">
            <span className="text-sm text-amber-500 block">Pending Resolution</span>
            <p className="text-xl font-bold text-amber-400">
              {questions.filter(q => q.status === 'unanswered').length}
            </p>
          </div>
          <div className="p-3.5 rounded bg-[#15171a] space-y-1">
            <span className="text-sm text-emerald-500 block">Resolved</span>
            <p className="text-xl font-bold text-emerald-400">
              {questions.filter(q => q.status === 'answered').length}
            </p>
          </div>
        </div>

        {/* Workstation Split Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Question Queue List */}
          <div className="lg:col-span-7 rounded-lg bg-[#15171a] p-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                <input
                  placeholder="Search inquiries or student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-8 px-2 rounded bg-[#0f1012] text-sm text-zinc-300"
              >
                <option value="all">All Queue</option>
                <option value="unanswered">Unanswered</option>
                <option value="answered">Answered</option>
              </select>
            </div>

            <div className="max-h-[550px] overflow-y-auto space-y-2">
              {filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestion(q)}
                  className={`p-3.5 rounded border text-sm cursor-pointer transition-colors space-y-2 ${
                    selectedQuestion?.id === q.id
                      ? 'border-zinc-400 bg-zinc-800/80'
                      : 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-zinc-200">{q.student?.name}</span>
                    <span className={q.status === 'answered' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {q.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-zinc-300 line-clamp-2 font-sans">{q.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Response Editor Pane */}
          <div className="lg:col-span-5 rounded-lg bg-[#15171a] p-5 space-y-4">
            <div className="flex items-center justify-between border-zinc-800 pb-2">
              <span className="text-sm text-zinc-300 flex items-center gap-1.5">
                <Terminal className="size-3.5 text-zinc-400" />
                Response Dispatch
              </span>
              <span className="text-sm text-zinc-400">
                OFFICIAL VERDICT
              </span>
            </div>

            {selectedQuestion ? (
              <div className="space-y-4">
                <div className="p-3 rounded bg-[#0f1012] space-y-1">
                  <span className="text-sm text-zinc-400 block">Selected Student Inquiry</span>
                  <p className="text-base text-zinc-200 leading-relaxed font-sans">{selectedQuestion.content}</p>
                  <p className="text-base text-zinc-400 pt-1">
                    From: {selectedQuestion.student?.name} ({selectedQuestion.student?.email})
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-zinc-400">
                    Official Security Analysis
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Provide detailed security verification, guidance, or next steps for this student..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full p-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  onClick={handleAnswerSubmit}
                  disabled={isLoading || !answer.trim()}
                  className="w-full h-9 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Send className="size-3.5" />
                  <span>{isLoading ? 'Publishing...' : 'Dispatch Verified Response'}</span>
                </button>
              </div>
            ) : (
              <div className="p-12 text-center text-zinc-400 text-sm">
                Select an inquiry from the queue on the left to review details and draft an analysis response.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
