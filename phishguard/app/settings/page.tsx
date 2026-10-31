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
      toast.error('Sign in to save your settings.')
      return
    }

    setSaving(true)
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), settings)
      toast.success('Settings saved to your account.')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error("Couldn't save your settings. Try again.")
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
    toast.success('Settings downloaded.')
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setSettings({ ...defaultSettings, ...imported })
        toast.success('Settings loaded from file.')
      } catch {
        toast.error("That file isn't a PhishGuard settings file.")
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
          <span>Loading your settings...</span>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'scanning', label: 'Scanning', icon: Brain },
    { id: 'privacy', label: 'Privacy & Storage', icon: Shield },
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'account', label: 'Account', icon: User },
  ]

  return (
    <div className="relative min-h-dvh text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header Telemetry */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Settings
            </h1>
            <span className="text-sm text-zinc-400">
              Saved to your account
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Choose what PhishGuard scans, what it saves and when it alerts you.
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
                Your settings
              </span>

              <div className="space-y-1.5">
                <button
                  onClick={saveSettings}
                  disabled={saving || !user}
                  className="w-full px-3 py-1.5 rounded bg-zinc-100 text-zinc-950 font-medium hover:bg-zinc-200 transition-colors flex items-center justify-between disabled:opacity-40"
                >
                  <span>{saving ? 'Saving...' : 'Save settings'}</span>
                  <Save className="size-3.5" />
                </button>

                <button
                  onClick={exportSettings}
                  className="w-full px-3 py-1.5 rounded bg-[#0f1012] hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center justify-between"
                >
                  <span>Download settings file</span>
                  <Download className="size-3.5 text-zinc-400" />
                </button>

                <label className="w-full px-3 py-1.5 rounded bg-[#0f1012] hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center justify-between cursor-pointer">
                  <span>Load settings file</span>
                  <Upload className="size-3.5 text-zinc-400" />
                  <input type="file" accept=".json" onChange={importSettings} className="hidden" />
                </label>

                <button
                  onClick={resetSettings}
                  className="w-full px-3 py-1.5 rounded bg-[#0f1012] hover:bg-zinc-800 text-zinc-400 transition-colors flex items-center justify-between"
                >
                  <span>Reset to defaults</span>
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
                    Scanning
                  </h3>
                  <span className="text-sm text-zinc-400">What PhishGuard checks</span>
                </div>

                <div className="divide-zinc-800/80">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-200">Scan messages as you read them</p>
                      <p className="text-base text-zinc-400">Let the browser extension check messages you open in Gmail and WhatsApp Web.</p>
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
                      <p className="text-base font-semibold text-zinc-200">Extra checks on documents</p>
                      <p className="text-base text-zinc-400">Also look for warning words like fees and urgent deadlines in PDF and Word files.</p>
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
                      <p className="text-base font-semibold text-zinc-200">Save scans to your account</p>
                      <p className="text-base text-zinc-400">Keep your scan history in your account so only you can see it on any device.</p>
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
                    Privacy
                  </h3>
                  <span className="text-sm text-zinc-400">What we keep</span>
                </div>

                <div className="divide-zinc-800/80">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-200">Keep history on this device</p>
                      <p className="text-base text-zinc-400">Remember links and files you checked in this browser.</p>
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
                      <p className="text-base font-semibold text-zinc-200">Report anonymously</p>
                      <p className="text-base text-zinc-400">Leave your email off the scam reports you send.</p>
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
                    Alerts
                  </h3>
                  <span className="text-sm text-zinc-400">When to tell you</span>
                </div>

                <div className="divide-zinc-800/80">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-200">Warn me about threats</p>
                      <p className="text-base text-zinc-400">Show a warning right away when a link or message scores above 75% risk.</p>
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
                      <p className="text-base font-semibold text-zinc-200">Tell me when a scan finishes</p>
                      <p className="text-base text-zinc-400">Let me know when a long document has been checked.</p>
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
                    Account
                  </h3>
                  <span className="text-sm text-zinc-400">Signed in with Google</span>
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
                        <p className="font-semibold text-zinc-100 truncate">{user.displayName || 'PhishGuard user'}</p>
                        <p className="text-zinc-400 truncate">{user.email}</p>
                        <p className="text-base text-zinc-400 truncate mt-0.5">Account ID: {user.uid}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleSignOut}
                      className="px-3 py-1.5 rounded border border-red-900/60 bg-red-950/30 text-red-300 text-sm hover:bg-red-950/60 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="size-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-base text-zinc-400 py-2">
                    You’re not signed in. Sign in with Google at the top of the page to save your settings and scan history.
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
