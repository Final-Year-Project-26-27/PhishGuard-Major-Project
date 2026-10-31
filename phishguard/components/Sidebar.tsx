'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import Logo from './Logo'
import AccountMenu from './AccountMenu'
import { NAV_GROUPS, isActivePath } from './navigation'

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="space-y-7">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-sm font-medium text-zinc-400">{group.title}</p>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex items-center gap-3 px-3 py-2 rounded text-[15px] transition-colors ${
                      active ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`size-4 transition-transform group-hover:translate-x-0.5 ${active ? 'text-teal-400' : 'text-zinc-400'}`}
                    />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="size-10 grid place-items-center rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-[#121316] border-0 text-zinc-200 w-72 p-5 flex flex-col gap-8">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <Logo onClick={() => setOpen(false)} />
        <div className="flex-1 overflow-y-auto">
          <NavList onNavigate={() => setOpen(false)} />
        </div>
        <AccountMenu up full />
      </SheetContent>
    </Sheet>
  )
}

export default function Sidebar() {
  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-[#121316]">
        <Logo />
        <MobileMenu />
      </header>

      <aside className="hidden lg:flex sticky top-0 h-dvh w-64 shrink-0 flex-col gap-10 bg-[#121316] px-4 py-6">
        <div className="px-2">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <AccountMenu up full />
      </aside>
    </>
  )
}
