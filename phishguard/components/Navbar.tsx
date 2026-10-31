'use client'

import Link from 'next/link'
import Logo from './Logo'
import AccountMenu from './AccountMenu'
import { MobileMenu } from './Sidebar'

const links = [
  { href: '/scanner', label: 'Scanner' },
  { href: '/install', label: 'Extension' },
  { href: '/awareness', label: 'Training' },
  { href: '/report', label: 'Report a scam' },
]

// Home page bar: the tools live in the sidebar on every other page.
export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-[#0c0d0e]">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded text-base text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <AccountMenu />
          <div className="md:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
