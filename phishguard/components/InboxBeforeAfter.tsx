import { CheckCircle2 } from 'lucide-react'

// Example messages for the "before" pile. Positions and tilt are fixed so the pile looks thrown, not gridded.
const PILE = [
  { app: 'WhatsApp', from: 'TechNova Placement Cell', text: 'Pay ₹1,999 to confirm your seat', top: '6%', left: '4%', r: '-4deg' },
  { app: 'Gmail', from: 'IT Helpdesk', text: 'Your college email expires today', top: '20%', left: '38%', r: '3deg' },
  { app: 'LinkedIn', from: 'Priya · HR Recruiter', text: 'Paid training before offer letter', top: '38%', left: '8%', r: '2deg' },
  { app: 'Gmail', from: 'Scholarship Desk', text: 'Processing fee due in 24 hours', top: '52%', left: '42%', r: '-3deg' },
  { app: 'WhatsApp', from: '+91 98•• ••• 210', text: 'Earn ₹5,000 a day from home', top: '68%', left: '6%', r: '-2deg' },
  { app: 'Gmail', from: 'Onboarding Team', text: 'Send Aadhaar and PAN to join', top: '76%', left: '40%', r: '4deg' },
]

const COUNTS = PILE.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.app]: (acc[m.app] ?? 0) + 1 }), {})

export default function InboxBeforeAfter() {
  return (
    <section className="py-28">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6">
        <div className="max-w-2xl space-y-4">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05] taste-enter">
            Your inbox, before and after.
          </h2>
          <p className="text-lg text-zinc-300 leading-relaxed taste-enter-d1">
            Scam messages arrive one at a time, from apps you trust. PhishGuard checks each one as it lands, so you see the
            warning before you reply.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-2 gap-4">
          <div data-ui="inbox-before" className="rounded-lg bg-[#15171a] p-6 sm:p-8">
            <p className="text-lg font-semibold text-white">Without PhishGuard</p>
            <p className="text-base text-zinc-400">Every message looks like an opportunity.</p>
            <div className="relative mt-6 h-[380px] sm:h-[420px] overflow-hidden">
              {PILE.map((m, i) => (
                <div
                  key={m.text}
                  className="pile-card absolute w-[56%] min-w-[220px] rounded-lg bg-[#232529] p-3.5"
                  style={{ top: m.top, left: m.left, '--r': m.r, animationDelay: `${i * 0.7}s` } as React.CSSProperties}
                >
                  <p className="flex justify-between gap-2 text-sm text-zinc-400">
                    <span className="truncate text-zinc-200 font-medium">{m.from}</span>
                    <span className="shrink-0">{m.app}</span>
                  </p>
                  <p className="mt-1 text-base text-zinc-100">{m.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div data-ui="inbox-after" className="rounded-lg bg-teal-700 p-6 sm:p-8 text-white flex flex-col">
            <p className="text-lg font-semibold">With PhishGuard</p>
            <p className="text-base text-teal-50">The same six messages, checked before you opened them.</p>
            <div className="flex-1 grid place-items-center py-12">
              <div className="text-center space-y-4">
                <CheckCircle2 className="size-14 mx-auto" strokeWidth={1.5} />
                <p className="text-3xl sm:text-4xl font-bold tracking-tight">{PILE.length} scams flagged</p>
                <p className="text-base text-teal-50">
                  {Object.entries(COUNTS)
                    .map(([app, n]) => `${app} ${n}`)
                    .join('  ·  ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
