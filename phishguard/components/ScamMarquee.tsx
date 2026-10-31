// Typical lines from fake offers and phishing messages, written as examples.
const LINES = [
  'Pay ₹1,999 registration fee to confirm your internship',
  'Your college email will be deactivated today. Verify now',
  'Shortlisted! Finish the paid training to receive your offer letter',
  'Earn ₹5,000 a day from home, no interview needed',
  'Your scholarship is approved. Pay the processing fee within 24 hours',
  'HR here: send your Aadhaar and PAN to complete onboarding',
  'Placement update: log in at college-placements-verify.in',
  'Refundable laptop deposit required before your joining date',
]

export default function ScamMarquee() {
  return (
    <section aria-label="Examples of scam messages" className="py-10 bg-[#121316]">
      <div className="max-w-[75rem] mx-auto px-4 sm:px-6">
        <p className="text-base text-zinc-400">Lines like these reach students on WhatsApp, Gmail and LinkedIn:</p>
        <div className="marquee marquee-fade mt-5 overflow-hidden">
          <ul className="marquee-track flex w-max gap-3">
            {[...LINES, ...LINES].map((line, i) => (
              <li
                key={i}
                aria-hidden={i >= LINES.length}
                className="shrink-0 rounded bg-[#1b1d21] px-4 py-2.5 text-base text-zinc-200 whitespace-nowrap"
              >
                “{line}”
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
