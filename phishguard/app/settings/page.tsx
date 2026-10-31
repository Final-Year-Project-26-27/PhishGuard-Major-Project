'use client'

import React, { useState, useEffect } from 'react'
import {
  User,
  Shield,
  Bell,
  Save,
  RefreshCw,
  Download,
  Upload,
  Brain,
  RotateCcw,
  LogOut,
} from 'lucide-react'
import { auth, db } from '../../lib/firebase'
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import Image from 'next/image'

interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    scanComplete: boolean
    threatDetected: boolean
    weeklyReport: boolean
    systemUpdates: boolean
  }
  privacy: {
    saveHistory: boolean
    anonymousMode: boolean
    shareAnalytics: boolean
    autoDeleteHistory: boolean
  }
  scanning: {
    deepScan: boolean
    realTimeProtection: boolean
    cloudSync: boolean
    autoScan: boolean
  }
  appearance: {
    compactMode: boolean
    animationsEnabled: boolean
    soundEffects: boolean
    colorScheme: 'cyan' | 'blue' | 'purple' | 'green'
  }
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  notifications: {
    scanComplete: true,
    threatDetected: true,
    weeklyReport: false,
    systemUpdates: true
  },
  privacy: {
    saveHistory: true,
    anonymousMode: false,
    shareAnalytics: false,
    autoDeleteHistory: false
  },
  scanning: {
    deepScan: true,
    realTimeProtection: true,
    cloudSync: true,
    autoScan: false
  },
  appearance: {
    compactMode: false,
    animationsEnabled: true,
    soundEffects: false,
    colorScheme: 'cyan'
  }
}

export default function SettingsPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('scanning')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        await loadUserSettings(currentUser.uid)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loadUserSettings = async (userId: string) => {
    try {
      const settingsDoc = await getDoc(doc(db, 'users', userId, 'settings', 'preferences'))
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    if (!user) {
      toast.error('Authentication required to sync settings.')
      return
    }

    setSaving(true)
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), settings)
      toast.success('Security preferences saved to cloud.')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (category: keyof UserSettings, key: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as Record<string, unknown>),
        [key]: value
      }
    }))
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'phishguard-settings.json'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Configuration exported.')
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setSettings({ ...defaultSettings, ...imported })
        toast.success('Configuration imported.')
      } catch {
        toast.error('Invalid configuration format.')
      }
    }
    reader.readAsText(file)
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    toast.info('Settings reset to defaults.')
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast.success('Signed out.')
    } catch {
      toast.error('Sign out failed.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-24 px-4 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-zinc-400">
          <RefreshCw className="size-4 animate-spin" />
          <span>Loading Operator Settings...</span>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'scanning', label: 'Detection Engines', icon: Brain },
    { id: 'privacy', label: 'Privacy & Storage', icon: Shield },
    { id: 'notifications', label: 'Alerting', icon: Bell },
    { id: 'account', label: 'Operator Identity', icon: User },
  ]

  return (
    <div className="relative min-h-dvh bg-zinc-950 text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header Telemetry */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Security Settings
            </h1>
            <span className="text-sm text-zinc-400">
              Target: Cloud Firestore & Local Engine Defaults
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Manage heuristic inspection depth, telemetry persistence rules, and account authentication parameters.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Navigation Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-lg bg-[#15171a] p-3 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors text-left ${
                      activeTab === tab.id
                        ? 'bg-zinc-100 text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Quick Actions Panel */}
            <div className="rounded-lg bg-[#15171a] p-4 space-y-3 text-sm">
              <span className="text-sm text-zinc-400 font-semibold block">
                Profile Operations
              </span>

              <div className="space-y-1.5">
                <button
                  onClick={saveSettings}
                  disabled={saving || !user}
                  className="w-full px-3 py-1.5 rounded bg-zinc-100 text-zinc-950 font-medium hover:bg-zinc-200 transition-colors flex items-center justify-between disabled:opacity-40"
                >
                  <span>{saving ? 'Syncing...' : 'Save Configuration'}</span>
                  <Save className="size-3.5" />
                </button>

                <button
                  onClick={exportSettings}
                  className="w-full px-3 py-1.5 rounded bg-[#0f1012] hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center justify-between"
                >
                  <span>Export JSON</span>
                  <Download className="size-3.5 text-zinc-400" />
                </button>

                <label className="w-full px-3 py-1.5 rounded bg-[#0f1012] hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center justify-between cursor-pointer">
                  <span>Import JSON</span>
                  <Upload className="size-3.5 text-zinc-400" />
                  <input type="file" accept=".json" onChange={importSettings} className="hidden" />
                </label>

                <button
                  onClick={resetSettings}
                  className="w-full px-3 py-1.5 rounded bg-[#0f1012] hover:bg-zinc-800 text-zinc-400 transition-colors flex items-center justify-between"
                >
                  <span>Reset Defaults</span>
                  <RotateCcw className="size-3.5 text-zinc-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Settings Detail Pane */}
          <div className="lg:col-span-8 rounded-lg bg-[#15171a] p-6 space-y-6">

            {/* Scanning Controls */}
            {activeTab === 'scanning' && (
              <div className="space-y-4">
                <div className="border-zinc-800 pb-3 flex items-center justify-between">
                  <h3 className="text-sm text-zinc-200 font-semibold">
                    Detection & Heuristic Tuning
                  </h3>
                  <span className="text-sm text-zinc-400">FASTAPI INTEGRATION</span>
                </div>

                <div className="divide-zinc-800/80">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-200">Real-Time In-Situ Interception</p>
                      <p className="text-base text-zinc-400">Allow browser extension to scan active DOM nodes in Gmail and WhatsApp Web.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.scanning.realTimeProtection}
                      onChange={(e) => updateSetting('scanning', 'realTimeProtection', e.target.checked)}
                      className="size-4 accent-zinc-200 rounded cursor-pointer"
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-200">Deep Structural Document Inspection</p>
                      <p className="text-base text-zinc-400">Run secondary 22-indicator lexical matching on PDF/DOCX attachments.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.scanning.deepScan}
                      onChange={(e) => updateSetting('scanning', 'deepScan', e.target.checked)}
                      className="size-4 accent-zinc-200 rounded cursor-pointer"
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-200">Cloud History Synchronization</p>
                      <p className="text-base text-zinc-400">Store scan tokens and verdicts in user private Firestore collection.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.scanning.cloudSync}
                      onChange={(e) => updateSetting('scanning', 'cloudSync', e.target.checked)}
                      className="size-4 accent-zinc-200 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Controls */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="border-zinc-800 pb-3 flex items-center justify-between">
                  <h3 className="text-sm text-zinc-200 font-semibold">
                    Privacy & Telemetry Persistence
                  </h3>
                  <span className="text-sm text-zinc-400">DATA POLICY</span>
                </div>

                <div className="divide-zinc-800/80">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-200">Retain Local History</p>
                      <p className="text-base text-zinc-400">Preserve past URLs and files in browser localStorage.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.privacy.saveHistory}
                      onChange={(e) => updateSetting('privacy', 'saveHistory', e.target.checked)}
                      className="size-4 accent-zinc-200 rounded cursor-pointer"
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-200">Anonymous Intake Mode</p>
                      <p className="text-base text-zinc-400">Omit reporter email address when submitting community threat reports.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.privacy.anonymousMode}
                      onChange={(e) => updateSetting('privacy', 'anonymousMode', e.target.checked)}
                      className="size-4 accent-zinc-200 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Alerting Controls */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="border-zinc-800 pb-3 flex items-center justify-between">
                  <h3 className="text-sm text-zinc-200 font-semibold">
                    Alerting & Threat Notifications
                  </h3>
                  <span className="text-sm text-zinc-400">CHANNELS</span>
                </div>

                <div className="divide-zinc-800/80">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-200">Threat Detected Toast</p>
                      <p className="text-base text-zinc-400">Display immediate banner when link or message classification exceeds 75% risk.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.threatDetected}
                      onChange={(e) => updateSetting('notifications', 'threatDetected', e.target.checked)}
                      className="size-4 accent-zinc-200 rounded cursor-pointer"
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-200">Scan Completion Notification</p>
                      <p className="text-base text-zinc-400">Acknowledge completion of multi-page document scans.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.scanComplete}
                      onChange={(e) => updateSetting('notifications', 'scanComplete', e.target.checked)}
                      className="size-4 accent-zinc-200 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Account Info */}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <div className="border-zinc-800 pb-3 flex items-center justify-between">
                  <h3 className="text-sm text-zinc-200 font-semibold">
                    Authenticated Identity
                  </h3>
                  <span className="text-sm text-zinc-400">FIREBASE AUTH</span>
                </div>

                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded bg-[#0f1012]">
                      <div className="size-10 rounded overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
                        <Image
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=18181b&color=f4f4f5`}
                          alt="Profile"
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-zinc-100 truncate">{user.displayName || 'Security Operator'}</p>
                        <p className="text-zinc-400 truncate">{user.email}</p>
                        <p className="text-base text-zinc-400 truncate mt-0.5">UID: {user.uid}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleSignOut}
                      className="px-3 py-1.5 rounded border border-red-900/60 bg-red-950/30 text-red-300 text-sm hover:bg-red-950/60 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="size-3.5" />
                      <span>Sign Out Current Session</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-base text-zinc-400 py-2">
                    Not currently authenticated. Sign in with Google via the top navigation bar to associate cloud telemetry with your identity.
                  </p>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}
