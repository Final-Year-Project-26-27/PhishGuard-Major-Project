import Image from 'next/image'
import { TEAM } from './team'

function Credit({ href, by }: { href: string; by: string }) {
  return (
    <p className="text-sm text-teal-100">
      Photo:{' '}
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-teal-300/60 hover:text-white">
        {by}
      </a>
      , CC BY-SA 4.0, via Wikimedia Commons
    </p>
  )
}

export default function OurStory() {
  return (
    <section className="bg-teal-700 text-white py-24 sm:py-32">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6 space-y-20">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.02] taste-enter">
              For students, by students.
            </h2>
            <p className="text-2xl sm:text-3xl leading-snug font-medium taste-enter-d1">
              We watched our batchmates fall for fake offers and phishing emails. So we decided to do something about it.
            </p>
          </div>
          <figure className="space-y-3 taste-enter-d2">
            <Image
              src="/assets/campus/nmamit-nitte-entrance.jpg"
              alt="Flagpoles and gardens inside the NMAMIT entrance, with a signpost listing the Placement Cell"
              width={1600}
              height={898}
              className="w-full aspect-[16/10] object-cover rounded-lg"
            />
            <figcaption className="space-y-1">
              <p className="text-base">
                Inside our college gate. Third on the signpost: the Placement Cell, the office fake offers love to pretend to
                be.
              </p>
              <Credit href="https://commons.wikimedia.org/wiki/File:NMAMIT_Nitte_Entrance.jpg" by="Sathishnayak" />
            </figcaption>
          </figure>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-end">
          <figure className="space-y-3 order-2 lg:order-1 taste-enter-d1">
            <Image
              src="/assets/campus/nmamit-university-karkala.jpg"
              alt="The NMAMIT campus seen from above, with gardens and palm trees"
              width={1000}
              height={1333}
              className="w-full aspect-[4/3] lg:aspect-[5/4] object-cover object-bottom rounded-lg"
            />
            <figcaption>
              <Credit href="https://commons.wikimedia.org/wiki/File:NMAMIT_university_karkala.jpg" by="Aryabn46" />
            </figcaption>
          </figure>

          <div className="space-y-8 order-1 lg:order-2">
            <p className="text-lg leading-relaxed text-teal-50 max-w-xl taste-enter">
              PhishGuard is our final-year project at NMAMIT, Nitte: a cybersecurity tool built by four students for everyone
              still in the middle of their first job hunt.
            </p>
            <ul className="space-y-1 taste-enter-d1">
              {TEAM.map((dev) => (
                <li key={dev.name}>
                  <a
                    href={dev.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-baseline justify-between gap-4 rounded px-3 py-3 -mx-3 hover:bg-teal-600/70 transition-colors"
                  >
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight">{dev.name}</span>
                    <span className="text-base font-medium text-teal-100 transition-transform group-hover:translate-x-1">
                      LinkedIn →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
