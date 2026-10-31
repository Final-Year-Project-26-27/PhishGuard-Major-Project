import {
  Link2,
  Mail,
  FileText,
  Layers,
  Puzzle,
  Flag,
  GraduationCap,
  BarChart3,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon }

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Scan',
    items: [
      { href: '/link', label: 'Link scanner', icon: Link2 },
      { href: '/email', label: 'Email scanner', icon: Mail },
      { href: '/doc', label: 'Document scanner', icon: FileText },
      { href: '/scanner', label: 'Full check', icon: Layers },
    ],
  },
  {
    title: 'Protect',
    items: [
      { href: '/install', label: 'Browser extension', icon: Puzzle },
      { href: '/report', label: 'Report a scam', icon: Flag },
    ],
  },
  {
    title: 'Learn',
    items: [
      { href: '/awareness', label: 'Training', icon: GraduationCap },
      { href: '/dashboard', label: 'Community reports', icon: BarChart3 },
      { href: '/chat', label: 'Ask the advisor', icon: MessageSquare },
    ],
  },
]

// trailingSlash: true in next.config means the pathname arrives as "/link/"
export const isActivePath = (pathname: string | null, href: string) =>
  pathname === href || pathname === `${href}/`
