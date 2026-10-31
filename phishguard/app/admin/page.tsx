'use client'

import { useState } from 'react'
import { db } from '../../lib/firebase'
import { addDoc, collection } from 'firebase/firestore'
import { Shield, Plus, Terminal } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPage() {
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUpload = async () => {
    if (!url.trim()) return
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, 'phishing_links'), { url: url.trim() })
      toast.success('Domain registered to global blocklist.')
      setUrl('')
    } catch {
      toast.error('Write rejected. Only authorized administrator UIDs can update blocklists.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-dvh bg-zinc-950 text-zinc-100 font-sans py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">

        <div className="text-center space-y-2">
          <div className="size-10 rounded bg-[#15171a] mx-auto flex items-center justify-center">
            <Shield className="size-5 text-zinc-200" />
          </div>
          <span className="text-sm text-zinc-400 block">
            ADMINISTRATIVE DISPATCH
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Blocklist Ingress Console
          </h1>
          <p className="text-base text-zinc-400">
            Inject verified malicious indicators directly into Cloud Firestore `phishing_links` for Chrome DNR synchronization.
          </p>
        </div>

        <div className="rounded-lg bg-[#15171a] p-5 space-y-4">
          <div className="flex items-center justify-between border-zinc-800/80 pb-2.5">
            <span className="text-sm text-zinc-300 flex items-center gap-1.5">
              <Terminal className="size-3.5 text-zinc-400" />
              Target Entry
            </span>
            <span className="text-sm text-zinc-400">
              STRICT AUTH
            </span>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="malicious-domain.tk or full URL"
              className="w-full h-9 px-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />

            <button
              onClick={handleUpload}
              disabled={isSubmitting || !url.trim()}
              className="w-full h-9 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="size-3.5" />
              <span>{isSubmitting ? 'Syncing...' : 'Add to Blocklist'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
