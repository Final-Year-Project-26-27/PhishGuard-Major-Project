'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { toast } from 'sonner'
import {
  Shield,
  Brain,
  FileText,
  Mail,
  Smartphone,
  Award,
  Terminal,
  RotateCcw,
} from 'lucide-react'

interface UserProgress {
  points: number
  level: number
  completedLessons: string[]
  badges: string[]
  streak: number
}

interface Lesson {
  id: string
  title: string
  description: string
  category: 'phishing' | 'malware' | 'social' | 'mobile' | 'general'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  points: number
  duration: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  completed?: boolean
  content: {
    page1: {
      title: string
      content: string
      keyPoints: string[]
    }
    page2: {
      title: string
      content: string
      keyPoints: string[]
      quiz?: {
        question: string
        options: string[]
        correct: number
      }
    }
  }
}

interface Article {
  id: string
  title: string
  excerpt: string
  category: string
  readTime: string
  date: string
  featured?: boolean
}

export default function AwarenessHub() {
  const [userProgress, setUserProgress] = useState<UserProgress>({
    points: 0,
    level: 1,
    completedLessons: [],
    badges: [],
    streak: 0
  })
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('phishguard-progress')
    if (saved) {
      try {
        setUserProgress(JSON.parse(saved))
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('phishguard-progress', JSON.stringify(userProgress))
  }, [userProgress])

  const lessons: Lesson[] = [
    {
      id: 'phish-basics',
      title: 'Phishing Fundamentals & Anatomy',
      description: 'Foundational principles of social engineering outreach and domain impersonation identification.',
      category: 'phishing',
      difficulty: 'beginner',
      points: 100,
      duration: '15 min',
      icon: Shield,
      completed: false,
      content: {
        page1: {
          title: 'Anatomy of Academic Phishing',
          content: 'Phishing represents the primary intrusion vector into educational environments. Attackers impersonate university registrars, career placement cells, or enterprise partners to harvest single sign-on (SSO) credentials or demand advance payments.',
          keyPoints: [
            'Attacks frequently exploit institutional trust and urgency',
            'Lookalike domains mimic university naming conventions (e.g., mail-nitte.in)',
            'Legitimate departments never demand cash deposits via UPI for interviews',
            'Always inspect destination URLs before providing credentials'
          ]
        },
        page2: {
          title: 'Inspection Verification Matrix',
          content: 'Examine message headers for mismatched sender domains, unanchored subdomains, and pressurized response timelines. Unsolicited requests for bank account details, Aadhaar, or PAN cards represent high-certainty scam indicators.',
          keyPoints: [
            'Inspect the exact envelope domain, not just the display name',
            'Look for artificial deadlines (e.g., within 24 hours to secure seat)',
            'Verify unexpected communications through direct departmental contact',
            'Report unverified outreach to institutional administrators'
          ],
          quiz: {
            question: 'Which of the following is a primary indicator of a deceptive academic outreach?',
            options: [
              'Originating from an authorized .edu or .in institutional domain',
              'Requiring an upfront refundable deposit via UPI to confirm an interview',
              'Providing a publicly listed campus office location and phone number',
              'Listing official university placement committee coordinators'
            ],
            correct: 1
          }
        }
      }
    },
    {
      id: 'email-safety',
      title: 'Cryptographic Email Authentication',
      description: 'Understanding SPF, DKIM, and DMARC enforcement mechanisms in mailbox defense.',
      category: 'phishing',
      difficulty: 'intermediate',
      points: 150,
      duration: '20 min',
      icon: Mail,
      completed: false,
      content: {
        page1: {
          title: 'RFC 8601 Authentication Records',
          content: 'Modern mail transfer agents validate authenticity using SPF (IP sender authorization), DKIM (cryptographic body signature), and DMARC (alignment policy). Attackers frequently attempt to plant fake downstream headers to simulate a pass.',
          keyPoints: [
            'SPF specifies which IP addresses are authorized to send for a domain',
            'DKIM provides cryptographic non-repudiation using public-key cryptography',
            'DMARC instructs the receiving MTA how to handle verification failures',
            'Only the topmost Authentication-Results from trusted MTAs should be evaluated'
          ]
        },
        page2: {
          title: 'Targeted Spear Phishing Recognition',
          content: 'Spear phishing campaigns harvest public student profile data from LinkedIn and campus directories to craft personalized, high-credibility messages claiming to represent reputable tech recruiters.',
          keyPoints: [
            'Attackers use scraped resume details to bypass initial skepticism',
            'Recruiters will not conduct hiring exclusively through WhatsApp or Telegram',
            'Formal offers must arrive with verifiable corporate email signatures',
            'Use PhishGuard Link Inspector to verify all application portals'
          ],
          quiz: {
            question: 'Why does PhishGuard strictly inspect the topmost Authentication-Results header?',
            options: [
              'Topmost headers are shorter and faster to process',
              'Receiving MTAs prepend headers; downstream copies can be forged by senders',
              'Middle headers only contain styling information',
              'Gmail removes all other headers automatically'
            ],
            correct: 1
          }
        }
      }
    },
    {
      id: 'mobile-security',
      title: 'Mobile & Messaging Threat Vectors',
      description: 'Securing student mobile devices against SMS phishing, WhatsApp scams, and malicious APKs.',
      category: 'mobile',
      difficulty: 'beginner',
      points: 125,
      duration: '18 min',
      icon: Smartphone,
      completed: false,
      content: {
        page1: {
          title: 'WhatsApp & SMS Scam Ecosystem',
          content: 'Mobile channels exhibit higher student response rates than traditional email. Threat actors utilize automated WhatsApp business accounts to distribute fraudulent job offers, requesting registration fees or distributing malicious APK download links.',
          keyPoints: [
            'Never install Android package (.apk) files received over messaging apps',
            'Legitimate hiring processes do not require direct UPI deposits',
            'Verify phone number country codes against claimed corporate headquarters',
            'Forward suspicious outreach to the PhishGuard WhatsApp Assistant'
          ]
        },
        page2: {
          title: 'Defense Best Practices',
          content: 'Enforce multi-factor authentication across student accounts, restrict side-loading permissions on mobile operating systems, and verify suspicious recruitment links before navigation.',
          keyPoints: [
            'Audit application permissions regularly',
            'Keep device security patch levels up to date',
            'Use hardware or authenticator-app 2FA rather than SMS OTPs',
            'Report scam numbers directly to messaging platforms'
          ],
          quiz: {
            question: 'What is the safest action when receiving an unsolicited APK file on WhatsApp?',
            options: [
              'Install it to inspect its permissions',
              'Never install it; report the sender and delete the payload',
              'Forward it to peers to see if they recognize it',
              'Rename the extension and open it in a browser'
            ],
            correct: 1
          }
        }
      }
    },
    {
      id: 'social-engineering',
      title: 'Social Engineering & Psychological Pressure',
      description: 'Deconstructing urgency, authority bias, and FOMO tactics deployed in academic scams.',
      category: 'social',
      difficulty: 'intermediate',
      points: 175,
      duration: '25 min',
      icon: Brain,
      completed: false,
      content: {
        page1: {
          title: 'Psychological Exploitation Vectors',
          content: 'Cybercriminals rely on human cognitive biases rather than technical vulnerabilities. Key levers include authority impersonation (professors, placement deans), artificial urgency (2-hour deadlines), and fear of missing out on coveted career opportunities.',
          keyPoints: [
            'Authority bias prevents students from challenging fraudulent requests',
            'Urgency compresses decision-making time to bypass critical thinking',
            'High-prestige brand names (Google, Microsoft) are used as emotional hooks',
            'Scammers often promise 100% placement with zero technical interviews'
          ]
        },
        page2: {
          title: 'Systematic Cognitive Countermeasures',
          content: 'Establish a mandatory 15-minute reflection window before responding to any communication demanding payments, account verification, or credential updates. Always contact the claimed sender via an independently sourced phone number or email.',
          keyPoints: [
            'Pause and disengage when an email or message demands immediate compliance',
            'Validate unusual administrative requests with departmental staff directly',
            'Consult the PhishGuard Community Telemetry feed for active campaigns',
            'Remember that legitimate career fairs never demand advance entry fees'
          ],
          quiz: {
            question: 'What is the primary psychological purpose of a 2-hour deadline in a scam message?',
            options: [
              'To adhere to corporate hiring guidelines',
              'To create artificial panic and suppress logical verification',
              'To ensure high network throughput',
              'To comply with data privacy regulations'
            ],
            correct: 1
          }
        }
      }
    }
  ]

  const articles: Article[] = [
    {
      id: '1',
      title: 'Dissecting Fake Internship Campaigns in Engineering Colleges',
      excerpt: 'How deceptive syndicates impersonate tier-1 technology companies to extract training fees from engineering students.',
      category: 'Investigation',
      readTime: '8 min read',
      date: 'Latest',
      featured: true
    },
    {
      id: '2',
      title: 'RFC 8601 Header Validation: Protecting Student Mailboxes',
      excerpt: 'A technical breakdown of Authentication-Results header isolation and why DNS fallbacks create vulnerability gaps.',
      category: 'Architecture',
      readTime: '6 min read',
      date: 'Technical',
      featured: true
    },
    {
      id: '3',
      title: 'The Rise of WhatsApp Recruiter Scams: A Defensive Guide',
      excerpt: 'Analyzing automated business accounts, fake offer letters, and UPI payment pressure tactics targeting freshers.',
      category: 'Field Report',
      readTime: '5 min read',
      date: 'Recent'
    },
    {
      id: '4',
      title: 'PyMuPDF vs OCR: Structural Feature Extraction in Phishing PDFs',
      excerpt: 'Why lexical indicator modeling outperforms raw OCR for detecting scam signatures in digital documents.',
      category: 'Machine Learning',
      readTime: '7 min read',
      date: 'Research'
    }
  ]

  const filteredLessons = lessons.filter(lesson => {
    return selectedCategory === 'all' || lesson.category === selectedCategory
  })

  const completeLesson = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId)
    if (lesson && !userProgress.completedLessons.includes(lessonId)) {
      const newPoints = userProgress.points + lesson.points
      const newLevel = Math.floor(newPoints / 300) + 1
      const newBadges = [...userProgress.badges]
      if (!newBadges.includes(lesson.title)) {
        newBadges.push(lesson.title)
      }

      setUserProgress({
        points: newPoints,
        level: newLevel,
        completedLessons: [...userProgress.completedLessons, lessonId],
        badges: newBadges,
        streak: userProgress.streak + 1,
      })
      toast.success(`Completed ${lesson.title} (+${lesson.points} XP)`)
    }
  }

  const startLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setCurrentPage(1)
    setSelectedAnswer(null)
  }

  const closeLessonViewer = () => {
    setSelectedLesson(null)
    setCurrentPage(1)
    setSelectedAnswer(null)
  }

  const finishLesson = () => {
    if (selectedLesson) {
      completeLesson(selectedLesson.id)
      closeLessonViewer()
    }
  }

  const resetProgress = () => {
    const def = { points: 0, level: 1, completedLessons: [], badges: [], streak: 0 }
    setUserProgress(def)
    localStorage.removeItem('phishguard-progress')
    toast.success('Training progress reset.')
  }

  return (
    <div className="relative min-h-dvh bg-zinc-950 text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">

      {/* Lesson Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div /* taste-skill-ignore: modal dialog */ className="bg-[#15171a] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">

            {/* Modal Header */}
            <div className="p-5 border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-sm text-zinc-400 block">
                  MODULE {selectedLesson.id.toUpperCase()} · STEP {currentPage} OF 2
                </span>
                <h2 className="text-base font-bold text-zinc-100 mt-0.5">{selectedLesson.title}</h2>
              </div>
              <button
                onClick={closeLessonViewer}
                className="px-2.5 py-1 rounded bg-[#0f1012] text-zinc-400 hover:text-zinc-200 text-sm"
              >
                Exit
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1">
              {currentPage === 1 && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-zinc-200">
                    {selectedLesson.content.page1.title}
                  </h3>
                  <p className="text-base sm:text-base text-zinc-300 leading-relaxed font-sans">
                    {selectedLesson.content.page1.content}
                  </p>

                  <div className="p-4 rounded bg-[#0f1012] space-y-2">
                    <span className="text-sm text-zinc-400 block font-semibold">
                      Key Analysis Points
                    </span>
                    <ul className="text-sm text-zinc-300 space-y-2">
                      {selectedLesson.content.page1.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-400">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {currentPage === 2 && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-zinc-200">
                    {selectedLesson.content.page2.title}
                  </h3>
                  <p className="text-base sm:text-base text-zinc-300 leading-relaxed font-sans">
                    {selectedLesson.content.page2.content}
                  </p>

                  <div className="p-4 rounded bg-[#0f1012] space-y-2">
                    <span className="text-sm text-zinc-400 block font-semibold">
                      Defensive Indicators
                    </span>
                    <ul className="text-sm text-zinc-300 space-y-2">
                      {selectedLesson.content.page2.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-400">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Knowledge Check */}
                  {selectedLesson.content.page2.quiz && (
                    <div className="p-4 rounded bg-[#0f1012] space-y-3 text-sm">
                      <span className="text-sm text-amber-400 block font-semibold">
                        Checkpoint Question
                      </span>
                      <p className="text-zinc-200 font-sans text-base">
                        {selectedLesson.content.page2.quiz.question}
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {selectedLesson.content.page2.quiz.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedAnswer(idx)}
                            className={`w-full text-left p-2.5 rounded border text-sm transition-colors flex items-center justify-between ${
                              selectedAnswer === idx
                                ? idx === selectedLesson.content.page2.quiz?.correct
                                  ? 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300'
                                  : 'border-red-800/80 bg-red-950/40 text-red-300'
                                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            <span>{opt}</span>
                            {selectedAnswer === idx && (
                              <span className="text-sm font-bold">
                                {idx === selectedLesson.content.page2.quiz?.correct ? 'CORRECT' : 'INCORRECT'}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-zinc-800 flex items-center justify-between bg-zinc-950">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded bg-[#15171a] text-zinc-400 hover:text-zinc-200 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              {currentPage === 1 ? (
                <button
                  onClick={() => setCurrentPage(2)}
                  className="px-3 py-1.5 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200"
                >
                  Proceed to Checkpoint
                </button>
              ) : (
                <button
                  onClick={finishLesson}
                  className="px-3 py-1.5 rounded bg-emerald-500 text-zinc-950 font-medium text-sm hover:bg-emerald-400"
                >
                  Complete Module (+{selectedLesson.points} XP)
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header Telemetry */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Security Awareness Academy
            </h1>
            <span className="text-sm text-zinc-400">
              Interactive Incident Simulation & Heuristic Training
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Curated interactive modules training students to dissect recruiter deception, malicious headers, and social engineering vectors.
          </p>
        </div>

        {/* Progress Tracker Card */}
        <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
          <div className="flex items-center justify-between border-zinc-800/80 pb-3">
            <span className="text-sm text-zinc-300 flex items-center gap-1.5">
              <Award className="size-3.5 text-zinc-400" />
              Operator Progress
            </span>
            <button
              onClick={resetProgress}
              className="text-sm text-zinc-400 hover:text-zinc-300 flex items-center gap-1"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded bg-[#0f1012] space-y-1">
              <span className="text-sm text-zinc-400 block">Operator Rank</span>
              <p className="text-base font-bold text-zinc-100">Level {userProgress.level}</p>
            </div>
            <div className="p-3 rounded bg-[#0f1012] space-y-1">
              <span className="text-sm text-zinc-400 block">Total Experience</span>
              <p className="text-base font-bold text-zinc-100">{userProgress.points} XP</p>
            </div>
            <div className="p-3 rounded bg-[#0f1012] space-y-1">
              <span className="text-sm text-zinc-400 block">Modules Cleared</span>
              <p className="text-base font-bold text-emerald-400">{userProgress.completedLessons.length} / {lessons.length}</p>
            </div>
            <div className="p-3 rounded bg-[#0f1012] space-y-1">
              <span className="text-sm text-zinc-400 block">Badges Awarded</span>
              <p className="text-base font-bold text-zinc-100">{userProgress.badges.length}</p>
            </div>
          </div>
        </div>

        {/* Course Modules Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-zinc-800/80 pb-3">
            <span className="text-sm text-zinc-300 flex items-center gap-1.5">
              <Terminal className="size-3.5 text-zinc-400" />
              Available Training Modules
            </span>
            <div className="flex items-center gap-1.5 text-sm">
              {(['all', 'phishing', 'mobile', 'social'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded text-sm transition-colors ${
                    selectedCategory === cat
                      ? 'bg-zinc-100 text-zinc-950 font-semibold'
                      : 'bg-[#15171a] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLessons.map((lesson) => {
              const isCompleted = userProgress.completedLessons.includes(lesson.id)
              const Icon = lesson.icon
              return (
                <div
                  key={lesson.id}
                  className={`rounded-lg border p-5 space-y-3 transition-colors ${
                    isCompleted
                      ? 'border-emerald-800/50 bg-emerald-950/10'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded bg-[#0f1012] flex items-center justify-center">
                        <Icon className="size-4 text-zinc-300" />
                      </div>
                      <div>
                        <span className="text-sm text-zinc-400 block">
                          {lesson.difficulty} · {lesson.duration}
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-200">{lesson.title}</h3>
                      </div>
                    </div>

                    <span className="text-sm text-zinc-400 font-medium">
                      +{lesson.points} XP
                    </span>
                  </div>

                  <p className="text-base text-zinc-400 leading-relaxed font-sans">
                    {lesson.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-zinc-800/60">
                    <span className="text-sm text-zinc-400">
                      {isCompleted ? 'Status: Completed' : 'Status: Ready'}
                    </span>

                    <button
                      onClick={() => startLesson(lesson)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        isCompleted
                          ? 'border border-emerald-800/60 bg-emerald-950/40 text-emerald-300'
                          : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200'
                      }`}
                    >
                      {isCompleted ? 'Review Content' : 'Start Module'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Intelligence Briefings Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-zinc-800/80 pb-3">
            <span className="text-sm text-zinc-300 flex items-center gap-1.5">
              <FileText className="size-3.5 text-zinc-400" />
              Technical Analysis Briefings
            </span>
            <span className="text-sm text-zinc-400">
              DOCUMENTATION
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((art) => (
              <div
                key={art.id}
                className="rounded-lg bg-[#15171a] p-5 space-y-2 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{art.category}</span>
                  <span className="text-zinc-400">{art.readTime}</span>
                </div>
                <h4 className="text-sm font-semibold text-zinc-200">{art.title}</h4>
                <p className="text-base text-zinc-400 leading-relaxed font-sans">{art.excerpt}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
