'use client'

import { Shield, CheckCircle, ExternalLink } from 'lucide-react'

export default function ExtensionPreviewPage() {
  return (
    <div className="min-h-dvh text-zinc-100 flex items-center justify-center p-4 font-sans">
      <div className="w-[320px] rounded-lg bg-[#15171a] p-5 space-y-4">
        <div className="flex items-center justify-between border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded border border-zinc-700 bg-zinc-950 flex items-center justify-center">
              <Shield className="size-3.5 text-zinc-200" />
            </div>
            <span className="font-semibold text-sm text-zinc-100">PhishGuard</span>
          </div>
          <span className="text-sm text-teal-400 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/60">
            Active
          </span>
        </div>

        <p className="text-base text-zinc-400 leading-relaxed font-sans">
          Checks messages in Gmail, WhatsApp Web and LinkedIn, and warns you before you open a dangerous link.
        </p>

        <div className="p-3 rounded bg-[#0f1012] space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Link blocking</span>
            <span className="text-teal-400 flex items-center gap-1 font-bold">
              <CheckCircle className="size-3" /> On
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Message scanning</span>
            <span className="text-zinc-200">Connected</span>
          </div>
        </div>

        <a
          href="/install"
          className="w-full h-8 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>How to install</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  )
}
