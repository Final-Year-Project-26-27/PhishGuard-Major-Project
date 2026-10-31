'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth'
import { Settings, LogOut, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { auth, googleProvider } from '../lib/firebase'

// `up` opens the menu above the button, for the bottom of the sidebar.
export default function AccountMenu({ up = false, full = false }: { up?: boolean; full?: boolean }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => auth.onAuthStateChanged(setUser), [])

  const login = async () => {
    setIsLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      toast.success('Signed in.')
    } catch (error) {
      console.error('Login failed:', error)
      toast.error('Sign-in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await signOut(auth)
      setOpen(false)
      toast.success('Signed out.')
    } catch (error) {
      console.error('Logout failed:', error)
      toast.error('Sign out failed.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <button
        onClick={login}
        disabled={isLoading}
        className={`h-9 px-4 rounded bg-zinc-100 text-zinc-950 text-sm font-medium hover:bg-white active:scale-[0.98] transition-[background-color,transform] disabled:opacity-60 ${full ? 'w-full' : ''}`}
      >
        {isLoading ? 'Connecting…' : 'Sign in'}
      </button>
    )
  }

  const name = user.displayName || user.email || 'Account'
  return (
    <div className={`relative ${full ? 'w-full' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors ${full ? 'w-full' : ''}`}
      >
        <Image
          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=18181b&color=f4f4f5`}
          alt=""
          width={28}
          height={28}
          className="size-7 rounded-full"
          unoptimized
        />
        <span className="text-sm text-zinc-200 truncate max-w-[140px] text-left flex-1">{name}</span>
        <ChevronDown className={`size-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute z-50 w-60 rounded-md bg-zinc-900 py-1 text-sm shadow-xl ${up ? 'bottom-full mb-2 left-0' : 'top-full mt-2 right-0'}`} // taste-skill-ignore: menu overlay
        >
          <p className="px-4 py-2.5 text-zinc-400 truncate">{user.email}</p>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Settings className="size-4 text-zinc-400" />
            Settings
          </Link>
          <button
            onClick={logout}
            disabled={isLoading}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-300 hover:bg-red-950/40 transition-colors text-left"
          >
            <LogOut className="size-4" />
            {isLoading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
