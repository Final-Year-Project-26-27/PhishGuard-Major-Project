'use client'

import { useState } from 'react'
import { db, auth } from '../../lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import {
  Terminal,
  Send,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { isHttpUrl as isValidUrl } from '../../lib/utils'

export default function ReportPage() {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [scamType, setScamType] = useState('fake-job')
  const [description, setDescription] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!url.trim()) {
      newErrors.url = 'Add the link or website you want to report.'
    } else if (!isValidUrl(url.trim())) {
      newErrors.url = 'Enter a full link, for example https://example.com.'
    }

    if (!scamType) {
      newErrors.scamType = 'Select a scam category.'
    }

    if (!description.trim()) {
      newErrors.description = 'Tell us what happened.'
    } else if (description.trim().length < 10) {
      newErrors.description = 'Add a little more detail (at least 10 characters).'
    }

    if (email && !isValidEmail(email)) {
      newErrors.email = 'Enter a valid email address.'
    }

    if (proofUrl && !isValidUrl(proofUrl)) {
      newErrors.proofUrl = 'Enter a full link, for example https://drive.google.com/...'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    const user = auth.currentUser
    if (!user) {
      toast.error('Sign in first. Use the button at the top of the page.')
      return
    }

    if (!validateForm()) {
      toast.error('Check the highlighted fields.')
      return
    }

    setIsSubmitting(true)

    try {
      await addDoc(collection(db, 'reports'), {
        url: url.trim(),
        scamType,
        description: description.trim(),
        reporterEmail: email || user.email,
        proofUrl: proofUrl.trim() || null,
        uid: user.uid,
        createdAt: serverTimestamp(),
        status: 'pending',
      })

      setUrl('')
      setEmail('')
      setScamType('fake-job')
      setDescription('')
      setProofUrl('')
      setErrors({})

      toast.success('Thanks. Your report was sent for review.')
    } catch (error) {
      console.error(error)
      toast.error('Failed to submit report. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-dvh text-zinc-100 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header Telemetry */}
        <div className="space-y-3 border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Report a scam
            </h1>
            <span className="text-sm text-zinc-400">
              Every report is reviewed
            </span>
          </div>
          <p className="text-base sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Tell us about a fake internship offer, a phishing website or a payment link that tried to take your money. We review each report and add confirmed scams to the blocklist.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-lg bg-[#15171a] p-6 space-y-6">

          <div className="flex items-center justify-between border-zinc-800/80 pb-3">
            <span className="text-sm text-zinc-300 flex items-center gap-1.5">
              <Terminal className="size-3.5 text-zinc-400" />
              What happened
            </span>
            <span className="text-sm text-zinc-400">
              Shared with students
            </span>
          </div>

          <div className="space-y-4">

            {/* Target URL */}
            <div className="space-y-1.5">
              <label className="block text-sm text-zinc-400">
                Link or website *
              </label>
              <input
                type="url"
                placeholder="https://internship-offer-deposit.tk/verify"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={`w-full h-9 px-3 rounded bg-zinc-950 border text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors ${
                  errors.url ? 'border-red-800 focus:border-red-600' : 'border-zinc-800 focus:border-zinc-500'
                }`}
              />
              {errors.url && <p className="text-base text-red-400">{errors.url}</p>}
            </div>

            {/* Scam Category */}
            <div className="space-y-1.5">
              <label className="block text-sm text-zinc-400">
                Type of scam *
              </label>
              <select
                value={scamType}
                onChange={(e) => setScamType(e.target.value)}
                className="w-full h-9 px-3 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
              >
                <option value="fake-job">Fake internship or job offer asking for a fee</option>
                <option value="phishing">Fake login page asking for your password</option>
                <option value="financial">Payment scam, such as a UPI deposit</option>
                <option value="malware">Dangerous attachment or document</option>
                <option value="other">Something else</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-sm text-zinc-400">
                What happened? *
              </label>
              <textarea
                rows={4}
                placeholder="How did it reach you? (e.g. a WhatsApp recruiter claiming to represent Google, demanding Rs 2500 training kit fee before interview)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full p-3 rounded bg-zinc-950 border text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed transition-colors ${
                  errors.description ? 'border-red-800 focus:border-red-600' : 'border-zinc-800 focus:border-zinc-500'
                }`}
              />
              {errors.description && <p className="text-base text-red-400">{errors.description}</p>}
            </div>

            {/* Reporter Email & Proof URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-400">
                  Your email (optional)
                </label>
                <input
                  type="email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full h-9 px-3 rounded bg-zinc-950 border text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none ${
                    errors.email ? 'border-red-800' : 'border-zinc-800 focus:border-zinc-500'
                  }`}
                />
                {errors.email && <p className="text-base text-red-400">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-400">
                  Link to a screenshot (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className={`w-full h-9 px-3 rounded bg-zinc-950 border text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none ${
                    errors.proofUrl ? 'border-red-800' : 'border-zinc-800 focus:border-zinc-500'
                  }`}
                />
                {errors.proofUrl && <p className="text-base text-red-400">{errors.proofUrl}</p>}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between border-zinc-800/80">
              <p className="text-base text-zinc-400">
                We check every report before adding it to the blocklist.
              </p>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 active:scale-[0.98] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>Send report</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
