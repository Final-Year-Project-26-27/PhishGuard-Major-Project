'use client'

import { Shield, CheckCircle, ExternalLink } from 'lucide-react'

export default function ExtensionPreviewPage() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans">
      <div className="w-[320px] rounded-lg bg-[#15171a] p-5 space-y-4">
        <div className="flex items-center justify-between border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded border border-zinc-700 bg-zinc-950 flex items-center justify-center">
              <Shield className="size-3.5 text-zinc-200" />
            </div>
            <span className="font-semibold text-sm text-zinc-100">PhishGuard MV3</span>
          </div>
          <span className="text-sm text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
            ACTIVE
          </span>
        </div>

        <p className="text-base text-zinc-400 leading-relaxed font-sans">
          Autonomous real-time defense intercepting suspicious outreach across Gmail, WhatsApp Web, LinkedIn, and dynamic browser navigation.
        </p>

        <div className="p-3 rounded bg-[#0f1012] space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span>DNR Interception</span>
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle className="size-3" /> ENABLED
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Inference Backend</span>
            <span className="text-zinc-200">:8000</span>
          </div>
        </div>

        <a
          href="/install"
          className="w-full h-8 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>Deployment Instructions</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  )
}
