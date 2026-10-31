'use client'

import { useState, useEffect } from 'react'
import {
  Download,
  FolderOpen,
  Settings,
  Chrome,
  FileArchive,
  Terminal,
  Check,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'

export default function InstallPage() {
  const [mounted, setMounted] = useState(false)
  const [copiedPath, setCopiedPath] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const copyChromeUrl = () => {
    navigator.clipboard.writeText('chrome://extensions/')
    setCopiedPath(true)
    toast.success('Copied chrome://extensions/ to clipboard.')
    setTimeout(() => setCopiedPath(false), 3000)
  }

  const steps = [
    {
      icon: Download,
      title: 'Download Extension Package',
      description: 'Acquire the compiled Manifest V3 release bundle containing background service workers, content interceptors, and dynamic DNR rule definitions.',
      action: 'Download phishguard.zip below',
    },
    {
      icon: FileArchive,
      title: 'Extract Archive to Local Disk',
      description: 'Extract the contents of phishguard.zip into a permanent directory on your machine (e.g. C:\\Tools\\phishguard or ~/extensions/phishguard).',
      action: 'Keep extracted folder intact',
    },
    {
      icon: Chrome,
      title: 'Open Extension Manager',
      description: 'In Google Chrome, navigate to the extension management portal via the address bar.',
      action: 'chrome://extensions/',
    },
    {
      icon: Settings,
      title: 'Toggle Developer Mode',
      description: 'Switch on Developer Mode using the toggle switch located in the top-right corner of the Extensions dashboard.',
      action: 'Enable top-right toggle',
    },
    {
      icon: FolderOpen,
      title: 'Load Unpacked Extension',
      description: 'Click "Load unpacked" in the top-left toolbar and select the directory extracted in step 2.',
      action: 'Select extension folder',
    },
  ]

  if (!mounted) return null

  return (
    <div className="relative min-h-dvh bg-zinc-950 text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Header Telemetry */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Deploy Browser Extension
            </h1>
            <span className="text-sm text-zinc-400">
              Manifest V3 · Chrome 110+
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Direct installation manual for the PhishGuard browser interceptor, providing automated protection across Gmail, WhatsApp Web, LinkedIn, and system navigation.
          </p>
        </div>

        {/* Download Release Card */}
        <div className="rounded-lg bg-[#15171a] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-zinc-800 pb-4">
            <div className="space-y-1">
              <span className="text-sm text-emerald-400 block">
                Current Release
              </span>
              <h2 className="text-lg font-bold text-zinc-100">PhishGuard Extension Bundle v2.3</h2>
              <p className="text-base text-zinc-400">
                Includes Gmail Shield, WhatsApp Web & LinkedIn pitch analyzers, and Declarative Net Request link interceptor.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/assets/phishguard.zip"
                download
                className="px-4 py-2.5 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 active:scale-[0.98] transition-colors inline-flex items-center gap-2"
              >
                <Download className="size-3.5" />
                <span>Download phishguard.zip</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-zinc-400 pt-1">
            <div className="p-2.5 rounded bg-[#0f1012]">
              <span className="text-sm text-zinc-400 block">Package Format</span>
              <span className="text-zinc-200">ZIP Archive</span>
            </div>
            <div className="p-2.5 rounded bg-[#0f1012]">
              <span className="text-sm text-zinc-400 block">Manifest Spec</span>
              <span className="text-zinc-200">Chrome MV3</span>
            </div>
            <div className="p-2.5 rounded bg-[#0f1012]">
              <span className="text-sm text-zinc-400 block">Threat Sync</span>
              <span className="text-zinc-200">Firestore DNR</span>
            </div>
            <div className="p-2.5 rounded bg-[#0f1012]">
              <span className="text-sm text-zinc-400 block">Privacy</span>
              <span className="text-zinc-200">Zero Query Logging</span>
            </div>
          </div>
        </div>

        {/* Step by Step Runbook */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-zinc-800/80 pb-3">
            <span className="text-sm text-zinc-300 flex items-center gap-1.5">
              <Terminal className="size-3.5 text-zinc-400" />
              Installation Runbook
            </span>
            <span className="text-sm text-zinc-400">
              5 steps
            </span>
          </div>

          <ol className="space-y-3">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <li
                  key={step.title}
                  className="rounded-lg bg-[#15171a] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="size-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                      <Icon className="size-4 text-zinc-300" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-zinc-100">Step {i + 1}: {step.title}</h3>
                      <p className="text-base text-zinc-400 leading-relaxed max-w-xl">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <div className="pl-12 sm:pl-0 shrink-0">
                    {step.action === 'chrome://extensions/' ? (
                      <button
                        onClick={copyChromeUrl}
                        className="px-2.5 py-1.5 rounded bg-[#0f1012] hover:bg-zinc-800 text-zinc-300 text-sm inline-flex items-center gap-1.5 transition-colors"
                      >
                        {copiedPath ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3 text-zinc-400" />}
                        <span>Copy chrome://extensions</span>
                      </button>
                    ) : (
                      <span className="text-sm text-zinc-400 px-2.5 py-1 rounded bg-[#0f1012] block text-right">
                        {step.action}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Gemini Local Configuration Callout */}
        <div className="rounded-lg bg-[#15171a] p-5 space-y-3 text-sm">
          <div className="flex items-center justify-between border-zinc-800 pb-2">
            <span className="text-zinc-300 font-semibold">
              Optional: Gemini Threat Explanations
            </span>
            <span className="text-sm text-zinc-400">LOCAL CONFIGURATION</span>
          </div>
          <p className="text-zinc-400 text-base font-sans leading-relaxed">
            By default, all heuristics, blocklist matching, and URL inspection operate locally via FastAPI. If you wish to enable generative threat summaries in the extension popup, create a local file inside the extracted folder:
          </p>
          <div className="p-3 rounded bg-[#0f1012] text-zinc-300 text-sm">
            <code>extension-build/gemini-config.local.js</code>
            <pre className="text-zinc-400 text-sm mt-2 text-wrap">
              {`GEMINI_CONFIG.apiKey = "YOUR_GEMINI_API_KEY";`}
            </pre>
          </div>
        </div>

      </div>
    </div>
  )
}
