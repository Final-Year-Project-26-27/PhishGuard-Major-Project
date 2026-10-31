'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth'
import { useEffect, useState } from 'react'
import {
  Shield,
  Search,
  FileText,
  Mail,
  Download,
  AlertTriangle,
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

export default function Navbar() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u)
    })
    return () => unsubscribe()
  }, [])

  const login = async () => {
    setIsLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      toast.success('Signed in successfully.')
    } catch (error) {
      console.error('Login failed:', error)
      toast.error('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await signOut(auth)
      toast.success('Signed out.')
      setIsMobileMenuOpen(false)
      setShowUserMenu(false)
    } catch (error) {
      console.error('Logout failed:', error)
      toast.error('Sign out failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/link', label: 'Link Scan', icon: Search },
    { href: '/email', label: 'Email Scan', icon: Mail },
    { href: '/doc', label: 'Doc Scan', icon: FileText },
    { href: '/scanner', label: 'Workstation', icon: Layers },
    { href: '/dashboard', label: 'Telemetry', icon: LayoutDashboard },
    { href: '/install', label: 'Extension', icon: Download },
    { href: '/awareness', label: 'Training', icon: BookOpen },
    { href: '/report', label: 'Report Threat', icon: AlertTriangle },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo / Identity */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 group py-1 text-zinc-100 hover:text-white transition-colors"
            >
              <div className="size-8 rounded border border-zinc-700 bg-zinc-900 flex items-center justify-center transition-colors group-hover:border-zinc-500">
                <Shield className="size-4 text-zinc-100" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm tracking-tight font-sans">PhishGuard</span>
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500 tracking-wider uppercase border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-900/60">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ACTIVE
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                      active
                        ? 'bg-zinc-800/80 text-zinc-100 border border-zinc-700/60'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <Icon className="size-3.5 opacity-70" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right Action Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1 rounded border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/60 hover:border-zinc-700 transition-colors"
                >
                  <div className="size-6 rounded overflow-hidden border border-zinc-700 bg-zinc-800">
                    <Image
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=18181b&color=f4f4f5`}
                      alt={user.displayName || 'Profile'}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="hidden md:inline-block text-xs font-medium text-zinc-300 max-w-[120px] truncate">
                    {user.displayName || user.email}
                  </span>
                  <ChevronDown className="size-3 text-zinc-500" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-50 text-xs font-sans">
                    <div className="px-3 py-2 border-b border-zinc-800">
                      <p className="font-medium text-zinc-200 truncate">{user.displayName || 'Security Operator'}</p>
                      <p className="text-zinc-500 font-mono text-[11px] truncate mt-0.5">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <Settings className="size-3.5 text-zinc-400" />
                      <span>Security Settings</span>
                    </Link>
                    <Link
                      href="/chat"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <MessageSquare className="size-3.5 text-zinc-400" />
                      <span>Advisor Terminal</span>
                    </Link>
                    <button
                      onClick={logout}
                      disabled={isLoading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors border-t border-zinc-800"
                    >
                      <LogOut className="size-3.5" />
                      <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={login}
                disabled={isLoading}
                size="sm"
                className="h-8 px-3 rounded text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] transition-all"
              >
                {isLoading ? 'Connecting...' : 'Sign In'}
              </Button>
            )}

            {/* Mobile Sheet Navigation */}
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-100">
                    <Menu className="size-4" />
                    <span className="sr-only">Toggle navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-zinc-950 border-l border-zinc-800 text-zinc-200 w-72 p-4">
                  <SheetHeader className="text-left pb-4 border-b border-zinc-800">
                    <SheetTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <Shield className="size-4" />
                      Navigation Console
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-1 py-4">
                    <Link
                      href="/"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`px-3 py-2 rounded text-xs font-medium ${isActive('/') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}
                    >
                      Home
                    </Link>
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium ${
                          isActive(item.href) ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                        }`}
                      >
                        <item.icon className="size-3.5 opacity-70" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

        </div>
      </div>
    </nav>
  )
}
