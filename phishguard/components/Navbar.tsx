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

  // trailingSlash: true in next.config means the pathname arrives as "/link/"
  const isActive = (path: string) => pathname === path || pathname === `${path}/`

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
    <header className="sticky top-0 z-50 bg-[#121316]">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo / Identity */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-zinc-100 hover:text-white transition-colors"
            >
              <div className="size-8 rounded bg-zinc-800 flex items-center justify-center">
                <Shield className="size-4 text-emerald-400" />
              </div>
              <span className="font-semibold text-base tracking-tight text-white">PhishGuard</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap px-2.5 py-1.5 rounded text-sm transition-colors ${
                      active
                        ? 'bg-zinc-800 text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Action Menu */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 transition-colors"
                >
                  <div className="size-6 rounded overflow-hidden bg-zinc-800">
                    <Image
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=18181b&color=f4f4f5`}
                      alt={user.displayName || 'Profile'}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="hidden md:inline-block text-sm text-zinc-300 max-w-[140px] truncate">
                    {user.displayName || user.email}
                  </span>
                  <ChevronDown className="size-3.5 text-zinc-400" />
                </button>

                {showUserMenu && (
                  <div /* taste-skill-ignore: menu overlay */ className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-md py-1 z-50 text-sm">
                    <div /* taste-skill-ignore: menu overlay divider */ className="px-4 py-3 border-b border-zinc-800">
                      <p className="font-medium text-zinc-200 truncate">{user.displayName || 'Security Operator'}</p>
                      <p className="text-zinc-400 text-sm truncate mt-0.5">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <Settings className="size-4 text-zinc-400" />
                      <span>Security Settings</span>
                    </Link>
                    <Link
                      href="/chat"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <MessageSquare className="size-4 text-zinc-400" />
                      <span>Advisor Terminal</span>
                    </Link>
                    <button
                      onClick={logout}
                      disabled={isLoading}
                      /* taste-skill-ignore: menu overlay divider */ className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors border-t border-zinc-800 text-left"
                    >
                      <LogOut className="size-4" />
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
                className="h-9 px-4 rounded text-sm font-medium bg-zinc-100 text-zinc-950 hover:bg-white transition-colors"
              >
                {isLoading ? 'Connecting...' : 'Sign In'}
              </Button>
            )}

            {/* Mobile Sheet Navigation */}
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-9 rounded bg-zinc-900 text-zinc-300 hover:text-white">
                    <Menu className="size-5" />
                    <span className="sr-only">Toggle navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent /* taste-skill-ignore: drawer edge */ side="right" className="bg-[#0c0d0e] border-l border-zinc-800 text-zinc-200 w-72 p-5">
                  <SheetHeader /* taste-skill-ignore: drawer header */ className="text-left pb-4 border-b border-zinc-800">
                    <SheetTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                      <Shield className="size-4 text-emerald-400" />
                      PhishGuard Navigation
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-1 py-4">
                    <Link
                      href="/"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`px-3 py-2 rounded text-sm ${isActive('/') ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}
                    >
                      Home
                    </Link>
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm ${
                          isActive(item.href) ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                        }`}
                      >
                        <item.icon className="size-4 opacity-70" />
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
    </header>
  )
}
