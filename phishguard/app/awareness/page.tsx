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
      title: 'Phishing basics',
      description: 'How scammers pretend to be your college or a company, and how to spot a fake website address.',
      category: 'phishing',
      difficulty: 'beginner',
      points: 100,
      duration: '15 min',
      icon: Shield,
      completed: false,
      content: {
        page1: {
          title: 'How phishing targets students',
          content: 'Phishing is the most common way scammers reach students. They pretend to be the exam office, the placement cell or a well-known company, so you hand over your college login or pay money up front.',
          keyPoints: [
            'Scammers count on you trusting your college and acting fast',
            'Fake website addresses look almost like your college\'s (e.g., mail-nitte.in)',
            'Legitimate departments never demand cash deposits via UPI for interviews',
            'Check the website address before you type a password'
          ]
        },
        page2: {
          title: 'What to check in every message',
          content: 'Check who really sent the message, whether the link goes where it claims, and whether you are being rushed. A message you didn\'t expect that asks for your bank details, Aadhaar or PAN card is almost always a scam.',
          keyPoints: [
            'Look at the full email address, not just the sender\'s name',
            'Look for artificial deadlines (e.g., within 24 hours to secure seat)',
            'If a message surprises you, call or visit the department yourself',
            'Report suspicious messages to your college'
          ],
          quiz: {
            question: 'Which of these is a strong sign that a message is a scam?',
            options: [
              'It comes from your college\'s official email address',
              'It asks for a refundable UPI deposit to confirm your interview',
              'It lists the campus office address and phone number',
              'It names the placement coordinators you already know'
            ],
            correct: 1
          }
        }
      }
    },
    {
      id: 'email-safety',
      title: 'Is this email really from them?',
      description: 'How your inbox checks who sent an email, and what to do when that check fails.',
      category: 'phishing',
      difficulty: 'intermediate',
      points: 150,
      duration: '20 min',
      icon: Mail,
      completed: false,
      content: {
        page1: {
          title: 'How your inbox checks the sender',
          content: 'When an email arrives, Gmail and other inboxes check that it really came from the company it names. Scammers try to fake this, so trust the warning your inbox shows over anything written inside the email.',
          keyPoints: [
            'Companies tell inboxes which servers may send their email',
            'Real emails carry a hidden signature that proves they weren\'t changed',
            'If those checks fail, your inbox may warn you or send the email to spam',
            'A warning banner from Gmail matters more than a "verified" badge inside the email'
          ]
        },
        page2: {
          title: 'Scams made just for you',
          content: 'Some scammers read your LinkedIn profile and campus directory, then write a personal message that seems to come from a recruiter at a well-known tech company.',
          keyPoints: [
            'They mention your real projects and skills so you trust them',
            'Recruiters will not conduct hiring exclusively through WhatsApp or Telegram',
            'A real offer comes from the company\'s own email address',
            'Check every application link with PhishGuard first'
          ],
          quiz: {
            question: 'An email says "Verified sender" in its text, but Gmail shows a warning that it may not be from the company. What should you trust?',
            options: [
              'The "Verified sender" text, because it is in the email',
              'Gmail\'s warning, because the sender can write anything inside the email',
              'Neither, so reply and ask the sender',
              'Both, because they can be true at the same time'
            ],
            correct: 1
          }
        }
      }
    },
    {
      id: 'mobile-security',
      title: 'Scams on your phone',
      description: 'Staying safe from scam texts, WhatsApp job offers and dangerous app files.',
      category: 'mobile',
      difficulty: 'beginner',
      points: 125,
      duration: '18 min',
      icon: Smartphone,
      completed: false,
      content: {
        page1: {
          title: 'WhatsApp and SMS scams',
          content: 'Students reply to WhatsApp and SMS faster than to email, and scammers know it. They use WhatsApp business accounts to send fake job offers that ask for a registration fee or link to a dangerous app file.',
          keyPoints: [
            'Never install an app file (.apk) someone sends you in a chat',
            'Legitimate hiring processes do not require direct UPI deposits',
            'Check that the phone number\'s country code matches where the company is',
            'Forward suspicious outreach to the PhishGuard WhatsApp Assistant'
          ]
        },
        page2: {
          title: 'Habits that keep you safe',
          content: 'Turn on two-step login for your accounts, only install apps from the official app store, and check recruitment links before you open them.',
          keyPoints: [
            'Review which apps can see your contacts, photos and messages',
            'Install phone updates when they arrive',
            'Use an authenticator app for two-step login instead of SMS codes',
            'Report scam numbers directly to messaging platforms'
          ],
          quiz: {
            question: 'What is the safest action when receiving an unsolicited APK file on WhatsApp?',
            options: [
              'Install it to inspect its permissions',
              'Don\'t install it; report the sender and delete the file',
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
      title: 'Pressure tricks scammers use',
      description: 'How scammers use deadlines, fake authority and fear of missing out to rush you.',
      category: 'social',
      difficulty: 'intermediate',
      points: 175,
      duration: '25 min',
      icon: Brain,
      completed: false,
      content: {
        page1: {
          title: 'Why smart people fall for scams',
          content: 'Most scams work on people, not computers. Scammers pretend to be a professor or the placement dean, set a 2-hour deadline, and make you afraid of losing a great job.',
          keyPoints: [
            'It feels wrong to question someone who seems senior',
            'A tight deadline leaves you no time to think it through',
            'Big names like Google or Microsoft make an offer feel real',
            'Scammers often promise 100% placement with zero technical interviews'
          ]
        },
        page2: {
          title: 'How to slow a scam down',
          content: 'Wait 15 minutes before you reply to any message asking for money, a login or account details. Then contact the sender using a phone number or email you found yourself, not one from the message.',
          keyPoints: [
            'Stop when a message says you must act right now',
            'Check odd requests with department staff in person',
            'Look at PhishGuard\'s scam reports to see what is going around',
            'Remember that legitimate career fairs never demand advance entry fees'
          ],
          quiz: {
            question: 'What is the primary psychological purpose of a 2-hour deadline in a scam message?',
            options: [
              'To adhere to corporate hiring guidelines',
              'To create artificial panic and suppress logical verification',
              'To keep their servers running fast',
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
      title: 'How fake internship scams work',
      excerpt: 'How scam groups pretend to be top tech companies to collect training fees from engineering students.',
      category: 'Explainer',
      readTime: '8 min read',
      date: 'Latest',
      featured: true
    },
    {
      id: '2',
      title: 'Spotting emails that fake your college',
      excerpt: 'Why a familiar name in the From line proves nothing, and how to tell a real college email from a fake one.',
      category: 'Guide',
      readTime: '6 min read',
      date: 'Guide',
      featured: true
    },
    {
      id: '3',
      title: 'The Rise of WhatsApp Recruiter Scams: A Defensive Guide',
      excerpt: 'Fake WhatsApp business accounts, fake offer letters and UPI payment pressure aimed at freshers.',
      category: 'Field Report',
      readTime: '5 min read',
      date: 'Recent'
    },
    {
      id: '4',
      title: 'How to spot a fake offer letter',
      excerpt: 'The words and requests that give away a fake offer letter PDF, from training fees to urgent deadlines.',
      category: 'Guide',
      readTime: '7 min read',
      date: 'Guide'
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
    toast.success('Your progress was reset.')
  }

  return (
    <div className="relative min-h-dvh text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">

      {/* Lesson Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div /* taste-skill-ignore: modal dialog */ className="bg-[#15171a] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">

            {/* Modal Header */}
            <div className="p-5 border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-sm text-zinc-400 block">
                  Step {currentPage} of 2
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
                      Key points
                    </span>
                    <ul className="text-sm text-zinc-300 space-y-2">
                      {selectedLesson.content.page1.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-teal-400">•</span>
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
                      What to do
                    </span>
                    <ul className="text-sm text-zinc-300 space-y-2">
                      {selectedLesson.content.page2.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-teal-400">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Knowledge Check */}
                  {selectedLesson.content.page2.quiz && (
                    <div className="p-4 rounded bg-[#0f1012] space-y-3 text-sm">
                      <span className="text-sm text-amber-400 block font-semibold">
                        Quick check
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
                                  ? 'border-teal-800/80 bg-teal-950/40 text-teal-300'
                                  : 'border-red-800/80 bg-red-950/40 text-red-300'
                                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            <span>{opt}</span>
                            {selectedAnswer === idx && (
                              <span className="text-sm font-bold">
                                {idx === selectedLesson.content.page2.quiz?.correct ? 'Correct' : 'Not quite'}
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
                  Next
                </button>
              ) : (
                <button
                  onClick={finishLesson}
                  className="px-3 py-1.5 rounded bg-teal-500 text-zinc-950 font-medium text-sm hover:bg-teal-400"
                >
                  Finish lesson (+{selectedLesson.points} XP)
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
              Learn to spot scams
            </h1>
            <span className="text-sm text-zinc-400">
              Short lessons with quick checks
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Short lessons on fake recruiters, fake emails, phone scams and the pressure tricks scammers use. Each ends with a quick question.
          </p>
        </div>

        {/* Progress Tracker Card */}
        <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
          <div className="flex items-center justify-between border-zinc-800/80 pb-3">
            <span className="text-sm text-zinc-300 flex items-center gap-1.5">
              <Award className="size-3.5 text-zinc-400" />
              Your progress
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
              <span className="text-sm text-zinc-400 block">Level</span>
              <p className="text-base font-bold text-zinc-100">Level {userProgress.level}</p>
            </div>
            <div className="p-3 rounded bg-[#0f1012] space-y-1">
              <span className="text-sm text-zinc-400 block">Points</span>
              <p className="text-base font-bold text-zinc-100">{userProgress.points} XP</p>
            </div>
            <div className="p-3 rounded bg-[#0f1012] space-y-1">
              <span className="text-sm text-zinc-400 block">Lessons done</span>
              <p className="text-base font-bold text-teal-400">{userProgress.completedLessons.length} / {lessons.length}</p>
            </div>
            <div className="p-3 rounded bg-[#0f1012] space-y-1">
              <span className="text-sm text-zinc-400 block">Badges</span>
              <p className="text-base font-bold text-zinc-100">{userProgress.badges.length}</p>
            </div>
          </div>
        </div>

        {/* Course Modules Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-zinc-800/80 pb-3">
            <span className="text-sm text-zinc-300 flex items-center gap-1.5">
              <Terminal className="size-3.5 text-zinc-400" />
              Lessons
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
                      ? 'border-teal-800/50 bg-teal-950/10'
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
                      {isCompleted ? 'Completed' : 'Not started'}
                    </span>

                    <button
                      onClick={() => startLesson(lesson)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        isCompleted
                          ? 'border border-teal-800/60 bg-teal-950/40 text-teal-300'
                          : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200'
                      }`}
                    >
                      {isCompleted ? 'Review lesson' : 'Start lesson'}
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
              Further reading
            </span>
            <span className="text-sm text-zinc-400">
              Guides
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
