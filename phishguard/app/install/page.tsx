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
      title: 'Download the extension',
      description: 'Download phishguard.zip. It holds everything the extension needs.',
      action: 'Download phishguard.zip below',
    },
    {
      icon: FileArchive,
      title: 'Unzip it',
      description: 'Unzip phishguard.zip into a folder you will keep, such as Documents\\phishguard. Chrome loads the extension from this folder, so don\'t delete or move it later.',
      action: 'Keep the folder',
    },
    {
      icon: Chrome,
      title: 'Open Chrome extensions',
      description: 'In Google Chrome, type chrome://extensions in the address bar and press Enter.',
      action: 'chrome://extensions/',
    },
    {
      icon: Settings,
      title: 'Turn on Developer mode',
      description: 'Turn on the Developer mode switch in the top-right corner of the Extensions page.',
      action: 'Top-right switch',
    },
    {
      icon: FolderOpen,
      title: 'Load the folder',
      description: 'Click "Load unpacked" at the top left and choose the folder you unzipped in step 2.',
      action: 'Choose the folder',
    },
  ]

  if (!mounted) return null

  return (
    <div className="relative min-h-dvh text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Header Telemetry */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Install the extension
            </h1>
            <span className="text-sm text-zinc-400">
              For Google Chrome
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Add PhishGuard to Chrome in five steps. It checks messages in Gmail, WhatsApp Web and LinkedIn, and warns you before you open a dangerous link.
          </p>
        </div>

        {/* Download Release Card */}
        <div className="rounded-lg bg-[#15171a] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-zinc-800 pb-4">
            <div className="space-y-1">
              <span className="text-sm text-teal-400 block">
                Download
              </span>
              <h2 className="text-lg font-bold text-zinc-100">PhishGuard for Chrome</h2>
              <p className="text-base text-zinc-400">
                Scans messages in Gmail, WhatsApp Web and LinkedIn, and blocks known phishing links before the page opens.
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
              <span className="text-sm text-zinc-400 block">File</span>
              <span className="text-zinc-200">ZIP</span>
            </div>
            <div className="p-2.5 rounded bg-[#0f1012]">
              <span className="text-sm text-zinc-400 block">Browser</span>
              <span className="text-zinc-200">Google Chrome</span>
            </div>
            <div className="p-2.5 rounded bg-[#0f1012]">
              <span className="text-sm text-zinc-400 block">Blocklist</span>
              <span className="text-zinc-200">Updates on its own</span>
            </div>
            <div className="p-2.5 rounded bg-[#0f1012]">
              <span className="text-sm text-zinc-400 block">Works on</span>
              <span className="text-zinc-200">Gmail, WhatsApp, LinkedIn</span>
            </div>
          </div>
        </div>

        {/* Step by Step Runbook */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-zinc-800/80 pb-3">
            <span className="text-sm text-zinc-300 flex items-center gap-1.5">
              <Terminal className="size-3.5 text-zinc-400" />
              How to install
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
                        {copiedPath ? <Check className="size-3 text-teal-400" /> : <Copy className="size-3 text-zinc-400" />}
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

      </div>
    </div>
  )
}
