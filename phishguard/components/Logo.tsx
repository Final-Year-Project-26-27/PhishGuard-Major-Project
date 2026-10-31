import Link from 'next/link'
import Image from 'next/image'

export default function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="inline-flex items-center gap-2.5 text-white rounded focus-visible:outline-2 focus-visible:outline-teal-400">
      <Image src="/logo.png" alt="" width={32} height={32} className="size-8" priority />
      <span className="font-semibold text-base tracking-tight">PhishGuard</span>
    </Link>
  )
}
