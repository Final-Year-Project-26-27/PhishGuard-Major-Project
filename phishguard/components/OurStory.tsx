import { TEAM } from './team'

export default function OurStory() {
  return (
    <section className="bg-teal-300 text-zinc-950 py-24 sm:py-32">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-end">
        <div className="space-y-8">
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.02] taste-enter">
            For students, by students.
          </h2>
          <p className="text-2xl sm:text-3xl leading-snug font-medium max-w-3xl taste-enter-d1">
            We watched our batchmates fall for fake offers and phishing emails. So we decided to do something.
          </p>
          <p className="text-lg leading-relaxed max-w-xl text-zinc-800 taste-enter-d2">
            PhishGuard is our final-year project at NMAMIT, Nitte: a cybersecurity tool built by four students for everyone
            still in the middle of their first job hunt.
          </p>
        </div>

        <ul className="space-y-1 taste-enter-d3">
          {TEAM.map((dev) => (
            <li key={dev.name}>
              <a
                href={dev.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline justify-between gap-4 rounded px-3 py-3 -mx-3 hover:bg-teal-400/60 transition-colors"
              >
                <span className="text-2xl sm:text-3xl font-bold tracking-tight">{dev.name}</span>
                <span className="text-base font-medium text-zinc-800 transition-transform group-hover:translate-x-1">LinkedIn →</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
