'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  MessageSquare,
  Send,
  Shield,
  CheckCircle,
  Search,
  Terminal,
  ThumbsUp,
  RefreshCw,
  CornerDownRight,
} from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { User as FirebaseUser } from 'firebase/auth'
import { toast } from 'sonner'

interface Message {
  id: string
  content: string
  sender: {
    id: string
    name: string
    email: string
    avatar: string
    role: 'student' | 'team_lead' | 'admin'
  }
  timestamp: Date
  type: 'question' | 'answer' | 'system'
  category: string
  likes: number
  isResolved: boolean
  replies?: Message[]
}

export default function ChatPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u)
    })
    return () => unsubscribe()
  }, [])

  const categories = [
    { id: 'all', name: 'All Threads' },
    { id: 'phishing', name: 'Phishing URLs' },
    { id: 'scams', name: 'Internship Scams' },
    { id: 'security', name: 'Account Defense' },
    { id: 'technical', name: 'Technical Analysis' },
  ]

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'questions'), orderBy('timestamp', 'desc'))
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const questionsData: Message[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()

          const questionMessage: Message = {
            id: doc.id,
            content: data.content,
            sender: {
              id: data.student?.id || 'anon',
              name: data.student?.name || 'Student',
              email: data.student?.email || '',
              avatar: data.student?.avatar || `https://ui-avatars.com/api/?name=Student&background=18181b&color=f4f4f5`,
              role: 'student'
            },
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
            type: 'question',
            category: data.category || 'general',
            likes: data.likes || 0,
            isResolved: data.status === 'answered' || data.status === 'resolved',
            replies: []
          }

          if (data.answer && data.status === 'answered') {
            const adminReply: Message = {
              id: `${doc.id}-answer`,
              content: data.answer.content,
              sender: {
                id: data.answer.answeredBy?.id || 'lead',
                name: data.answer.answeredBy?.name || 'Security Lead',
                email: data.answer.answeredBy?.email || '',
                avatar: data.answer.answeredBy?.avatar || `https://ui-avatars.com/api/?name=SecLead&background=047857&color=f4f4f5`,
                role: 'team_lead'
              },
              timestamp: data.answer.timestamp?.toDate ? data.answer.timestamp.toDate() : new Date(),
              type: 'answer',
              category: data.category || 'general',
              likes: 0,
              isResolved: false,
              replies: []
            }
            questionMessage.replies = [adminReply]
          }

          questionsData.push(questionMessage)
        })
        setMessages(questionsData)
      }, (err) => {
        console.error('Questions fetch error:', err)
      })

      return () => unsubscribe()
    } else {
      setMessages([])
    }
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    if (!user) {
      toast.error('Authentication required to dispatch security inquiries.')
      return
    }

    setIsLoading(true)

    try {
      const questionData = {
        content: newMessage.trim(),
        student: {
          id: user.uid,
          name: user.displayName || 'Student',
          email: user.email || '',
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Student')}&background=18181b&color=f4f4f5`
        },
        category: selectedCategory === 'all' ? 'general' : selectedCategory,
        timestamp: new Date(),
        priority: 'medium',
        status: 'unanswered',
        likes: 0,
        views: 0,
        tags: [selectedCategory === 'all' ? 'general' : selectedCategory],
        replies: []
      }

      await addDoc(collection(db, 'questions'), questionData)
      setNewMessage('')
      toast.success('Inquiry dispatched to security team queue.')
    } catch (error) {
      console.error('Error saving question:', error)
      toast.error('Failed to post question.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendReply = async (parentMessageId: string) => {
    if (!replyContent.trim() || !user) return

    setIsLoading(true)
    const reply: Message = {
      id: `${parentMessageId}-reply-${Date.now()}`,
      content: replyContent.trim(),
      sender: {
        id: user.uid,
        name: user.displayName || 'Student',
        email: user.email || '',
        avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Student')}&background=18181b&color=f4f4f5`,
        role: 'student'
      },
      timestamp: new Date(),
      type: 'question',
      category: 'general',
      likes: 0,
      isResolved: false,
    }

    setMessages(prev => prev.map(msg => {
      if (msg.id === parentMessageId) {
        return {
          ...msg,
          replies: [...(msg.replies || []), reply]
        }
      }
      return msg
    }))

    setReplyContent('')
    setReplyingTo(null)
    setIsLoading(false)
    toast.success('Follow-up appended to thread.')
  }

  const handleLikeMessage = (messageId: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, likes: msg.likes + 1 }
        : {
            ...msg,
            replies: msg.replies?.map(r => r.id === messageId ? { ...r, likes: r.likes + 1 } : r)
          }
    ))
  }

  const filteredMessages = messages.filter(msg => {
    const matchesCategory = selectedCategory === 'all' || msg.category === selectedCategory
    const matchesSearch = msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         msg.sender.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header Telemetry */}
        <div className="space-y-3 border-b border-zinc-800 pb-6">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] text-zinc-400 uppercase tracking-wider">
            <MessageSquare className="size-3.5 text-zinc-400" />
            <span>Advisory Channel</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200">Security Advisor Terminal</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Security Advisor Terminal
            </h1>
            <span className="font-mono text-xs text-zinc-500">
              Live Q&A Dispatch with Institutional Security Leads
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Direct consultative terminal for submitting unverified outreach, suspicious internship contracts, or domain spoofing queries to human security operators.
          </p>
        </div>

        {/* Toolbar & Category Filters */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search advisor threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-100 text-zinc-950 font-semibold'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dispatch New Inquiry Input */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Terminal className="size-3.5 text-zinc-500" />
              Dispatch Security Inquiry
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              {user ? 'AUTHENTICATED' : 'ANONYMOUS READ-ONLY'}
            </span>
          </div>

          <div className="space-y-3">
            <textarea
              rows={3}
              placeholder={user ? "Ask a question about an offer letter, recruiter message, or suspicious campus email..." : "Sign in to post an inquiry to the security team..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!user || isLoading}
              className="w-full p-3 rounded bg-zinc-950 border border-zinc-800 text-xs sm:text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none disabled:opacity-50"
            />

            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono text-zinc-500">
                Responses are vetted by university security team leads.
              </p>

              <button
                onClick={handleSendMessage}
                disabled={!user || !newMessage.trim() || isLoading}
                className="px-4 py-2 rounded bg-zinc-100 text-zinc-950 font-medium text-xs hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>Transmit Inquiry</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Threads List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              Active Inquiries ({filteredMessages.length})
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              REALTIME SYNCHRONIZATION
            </span>
          </div>

          <div className="space-y-4">
            {filteredMessages.length > 0 ? (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 space-y-3 shadow-sm hover:border-zinc-700 transition-colors"
                >
                  {/* Sender Metadata Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded overflow-hidden border border-zinc-700 bg-zinc-800">
                        <Image
                          src={msg.sender.avatar}
                          alt={msg.sender.name}
                          width={28}
                          height={28}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs text-zinc-200 font-semibold">{msg.sender.name}</p>
                        <p className="text-[10px] font-mono text-zinc-500">
                          {msg.timestamp.toLocaleDateString()} · {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded border border-zinc-800 bg-zinc-950 text-zinc-400">
                        {msg.category}
                      </span>
                      {msg.isResolved && (
                        <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 flex items-center gap-1 font-semibold">
                          <CheckCircle className="size-3" />
                          Answered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Content */}
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                    {msg.content}
                  </p>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
                    <button
                      onClick={() => handleLikeMessage(msg.id)}
                      className="hover:text-zinc-200 inline-flex items-center gap-1 transition-colors"
                    >
                      <ThumbsUp className="size-3" />
                      <span>{msg.likes}</span>
                    </button>

                    {user && (
                      <button
                        onClick={() => setReplyingTo(replyingTo === msg.id ? null : msg.id)}
                        className="hover:text-zinc-200 inline-flex items-center gap-1 transition-colors"
                      >
                        <CornerDownRight className="size-3" />
                        <span>Reply</span>
                      </button>
                    )}
                  </div>

                  {/* Inline Reply Input */}
                  {user && replyingTo === msg.id && (
                    <div className="pt-2 border-t border-zinc-800 space-y-2">
                      <textarea
                        rows={2}
                        placeholder="Provide supplemental information or follow-up..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="w-full p-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                          className="px-2.5 py-1 rounded border border-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendReply(msg.id)}
                          className="px-3 py-1 rounded bg-zinc-100 text-zinc-950 font-medium text-[11px] font-mono hover:bg-zinc-200"
                        >
                          Append
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Thread Replies */}
                  {msg.replies && msg.replies.length > 0 && (
                    <div className="pt-2 pl-4 border-l border-zinc-800 space-y-3">
                      {msg.replies.map((reply) => (
                        <div key={reply.id} className="p-3 rounded bg-zinc-950 border border-zinc-800/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="size-3.5 text-emerald-400" />
                              <span className="font-mono text-xs font-bold text-zinc-200">{reply.sender.name}</span>
                              <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                                Verified Analyst
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-zinc-500">
                              {reply.timestamp.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              ))
            ) : (
              <div className="p-12 text-center text-zinc-500 font-mono text-xs border border-zinc-800 rounded-lg">
                {user ? 'No active inquiries matching selected filters.' : 'Please sign in to load the live security team Q&A feed.'}
              </div>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>

      </div>
    </div>
  )
}
