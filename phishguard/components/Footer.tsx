import Link from 'next/link'

const links = [
  { href: '/link', label: 'Check a link' },
  { href: '/install', label: 'Get the extension' },
  { href: '/awareness', label: 'Training' },
  { href: '/report', label: 'Report a scam' },
]

// One quiet line: what this is, a few links, the year.
export default function Footer() {
  return (
    <footer className="pt-24 pb-8">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6 grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-baseline text-sm sm:text-[15px]">
        <p className="text-zinc-400">Scam defense for students.</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-zinc-100 hover:text-teal-300 transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-zinc-400 md:text-right">© {new Date().getFullYear()} PhishGuard</p>
      </div>
    </footer>
  )
}
