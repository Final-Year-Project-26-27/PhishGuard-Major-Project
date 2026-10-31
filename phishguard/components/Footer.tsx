import Link from 'next/link'
import { Linkedin, Instagram, type LucideIcon } from 'lucide-react'
import { TEAM } from './team'

const links = [
  { href: '/link', label: 'Check a link' },
  { href: '/install', label: 'Get the extension' },
  { href: '/awareness', label: 'Training' },
  { href: '/report', label: 'Report a scam' },
]

// lucide only has a generic envelope; this is the Gmail "M".
function GmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M2 6.5V18a1.5 1.5 0 0 0 1.5 1.5H6V10l6 4.5 6-4.5v9.5h2.5A1.5 1.5 0 0 0 22 18V6.5a2 2 0 0 0-3.2-1.6L12 10 5.2 4.9A2 2 0 0 0 2 6.5z" />
    </svg>
  )
}

function Social({ href, label, Icon }: { href: string; label: string; Icon: LucideIcon | typeof GmailIcon }) {
  const box = 'size-9 grid place-items-center rounded'
  if (!href) {
    return (
      <span className={`${box} text-zinc-600`} title={`${label}: coming soon`} aria-hidden="true">
        <Icon className="size-[18px]" />
      </span>
    )
  }
  return (
    <a
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel="noopener noreferrer"
      aria-label={label}
      className={`${box} text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition-[color,background-color,transform]`}
    >
      <Icon className="size-[18px]" />
    </a>
  )
}

export default function Footer() {
  return (
    <footer className="pt-24 pb-8">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6 space-y-12">
        <section aria-labelledby="contact-devs" className="space-y-5">
          <h2 id="contact-devs" className="text-lg font-semibold text-white">
            Contact the developers
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
            {TEAM.map((dev) => (
              <li key={dev.name} className="flex items-center gap-1">
                <a
                  href={dev.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 mr-1 text-base font-medium text-zinc-100 hover:text-teal-300 transition-colors"
                >
                  {dev.name}
                  <Linkedin className="size-[18px] text-[#0a66c2] transition-transform group-hover:-translate-y-0.5" aria-label="LinkedIn" />
                </a>
                <Social href={dev.email && `mailto:${dev.email}`} label={`Email ${dev.name}`} Icon={GmailIcon} />
                <Social href={dev.instagram} label={`${dev.name} on Instagram`} Icon={Instagram} />
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-baseline text-sm sm:text-base">
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
      </div>
    </footer>
  )
}
