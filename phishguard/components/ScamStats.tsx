import ScamGlobe from './ScamGlobe'

const STATS = [
  {
    figure: '93%',
    text: 'of employees and job seekers in India have come across a suspicious or fake job opportunity.',
    source: 'Indeed survey of 1,161 people in India, 2026',
    href: 'https://www.storyboard18.com/how-it-works/recruitment-scams-widespread-in-india-eroding-trust-ws-l-103685.htm',
  },
  {
    figure: '51%',
    text: 'aren’t confident they can tell a real recruiter from a scammer.',
    source: 'Same Indeed survey, 2026',
    href: 'https://www.storyboard18.com/how-it-works/recruitment-scams-widespread-in-india-eroding-trust-ws-l-103685.htm',
  },
  {
    figure: '5×',
    text: 'People aged 18 to 59 lost money to job scams at more than five times the rate of adults over 60.',
    source: 'US Federal Trade Commission, 2021 data',
    href: 'https://www.ftc.gov/news-events/data-visualizations/data-spotlight/2022/12/who-experiences-scams-story-all-ages',
  },
]

export default function ScamStats() {
  return (
    <section className="py-28 lg:py-36">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-14 lg:gap-10 items-center">
        <div className="space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05] taste-enter">
              Almost every student gets one.
            </h2>
            <p className="text-lg text-zinc-300 leading-relaxed max-w-lg taste-enter-d1">
              Fake offers aren’t rare and they aren’t clumsy. Early-career job seekers are hit hardest, because they are the
              ones still saying yes to every opportunity.
            </p>
          </div>

          <dl className="space-y-9">
            {STATS.map((s, i) => (
              <div key={s.figure} className={`grid grid-cols-[6.5rem_1fr] gap-5 items-start taste-enter-d${i + 1}`}>
                <dt className="text-5xl font-bold tracking-tight text-red-400">{s.figure}</dt>
                <dd className="space-y-1.5 pt-2">
                  <p className="text-lg text-zinc-100 leading-snug">{s.text}</p>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-400 underline decoration-zinc-600 hover:text-zinc-200"
                  >
                    {s.source}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-3">
          <ScamGlobe />
          <p className="text-sm text-zinc-400 text-center">Drag to spin. Lines run from our college to cities where students job-hunt.</p>
        </div>
      </div>
    </section>
  )
}
