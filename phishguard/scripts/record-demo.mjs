// Records a real tour of the PhishGuard scanners (live models, nothing mocked) for the landing-page demo.
// 1. Run the mlmodel backend on :8000 and serve the static build: npm run build, then serve out/ on :3100
// 2. npm i --no-save playwright-core && node scripts/record-demo.mjs http://localhost:3100 ./demo-video
// 3. Encode the .webm into public/assets/demo/ (H.264 .mp4 + VP9 .webm + poster .jpg) and, if the
//    timing changed, update the scene times in components/DemoVideo.tsx from the MARK lines printed below.
// Uses the installed Chrome (CHROME_PATH to override). Firebase requests are blocked so no demo scans are saved.
import { chromium } from 'playwright-core'

const [site = 'http://localhost:3100', outDir = './demo-video', letter = new URL('./demo-offer-letter.txt', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')] = process.argv.slice(2)
const W = 1280, H = 800
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: outDir, size: { width: W, height: H } } })
// The link and email pages save scans to Firebase; keep the demo out of the live database
await context.route(/googleapis\.com|firebase|gstatic\.com\/firebasejs/, (route) => route.abort())
// 125% zoom so the UI reads at video size, applied before first paint; the cursor lives outside <body> so it isn't zoomed
await context.addInitScript(() => {
  const add = () => { if (!document.documentElement) return requestAnimationFrame(add); const st = document.createElement('style'); st.textContent = 'body{zoom:1.25}'; document.documentElement.appendChild(st) }
  add()
})
const page = await context.newPage()
const t0 = Date.now()
const mark = (label) => console.log('MARK', label, ((Date.now() - t0) / 1000).toFixed(2))

const CURSOR = `(() => { if (document.getElementById('demo-cursor')) return;
  const c = document.createElement('div'); c.id = 'demo-cursor';
  c.style.cssText = 'position:fixed;left:700px;top:520px;width:22px;height:22px;z-index:99999;pointer-events:none;transition:left .55s cubic-bezier(.2,.8,.2,1),top .55s cubic-bezier(.2,.8,.2,1);';
  const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '22'); s.setAttribute('height', '22');
  p.setAttribute('d', 'M4 2l15 9-6.5 1.6L9 19z'); p.setAttribute('fill', '#fff'); p.setAttribute('stroke', '#111'); p.setAttribute('stroke-width', '1.4');
  s.appendChild(p); c.appendChild(s); document.documentElement.appendChild(c); })()`

async function visit(path) {
  mark(path)
  await page.goto(site + path, { waitUntil: 'networkidle' })
  await page.evaluate(CURSOR)
  await sleep(900)
}
async function moveTo(locator) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  await page.evaluate(([x, y]) => { const c = document.getElementById('demo-cursor'); c.style.left = x + 'px'; c.style.top = y + 'px' },
    [b.x + Math.min(b.width / 2, 160), b.y + b.height / 2])
  await sleep(650)
}
async function click(locator) {
  await moveTo(locator)
  await page.evaluate(() => document.getElementById('demo-cursor').animate([{ transform: 'scale(1)' }, { transform: 'scale(.8)' }, { transform: 'scale(1)' }], 220))
  await locator.click()
}
async function showResult(text, exact = false) {
  const el = page.getByText(text, { exact }).first()
  await el.waitFor()
  // Bring the result card into view the way a person would scroll to it
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }),
    await el.evaluate((n) => n.getBoundingClientRect().top + window.scrollY - 110))
  await sleep(900)
  await moveTo(el)  // point at the verdict
  await sleep(2600)
}

// 1. Link scanner: a fake bank KYC link
await visit('/link/')
await click(page.locator('input[placeholder^="https://internship-portal"]'))
await page.keyboard.type('https://sbi-kyc-update.com/verify', { delay: 45 })
await click(page.getByRole('button', { name: /check link/i }))
await showResult('Likely a phishing link')

// 2. Email scanner: a pay-to-intern "training program"
await visit('/email/')
await click(page.locator('input[placeholder="company-recruiter.com"]'))
await page.keyboard.type('careers-skillhub.in', { delay: 35 })
await click(page.locator('textarea'))
await page.keyboard.type('Congratulations! You are shortlisted for the Microsoft-powered Summer Internship. Complete the form to confirm your seat. Co-branded certificate and lifetime job assistance. Use scholarship code MS@30. Note: mentor fees are applicable.', { delay: 12 })
await click(page.getByRole('button', { name: /check email/i }))
await showResult('Likely a scam', true)

// 3. Document scanner: a fake offer letter asking for a deposit
await visit('/doc/')
await moveTo(page.getByText(/PDF, Word or text/).first())
await page.locator('input[type="file"]').setInputFiles(letter)
await sleep(700)
await click(page.getByRole('button', { name: /check document/i }))
await showResult('Likely a scam document')

// 4. Full check: message and link scored together
await visit('/scanner/')
await click(page.getByRole('button', { name: 'Full email' }))
await click(page.locator('[placeholder="placement-alert@nmamit-verify.in"]'))
await page.keyboard.type('alerts@bank-notice.co', { delay: 30 })
await click(page.locator('[placeholder="Paste the email or message..."]'))
await page.keyboard.type('Your SBI account will be blocked today. Update your KYC now at http://sbi-kyc-online.co/update', { delay: 14 })
await click(page.getByRole('button', { name: 'Check now' }))
await showResult('HIGH RISK')

mark('end')
await context.close()
await browser.close()
console.log('done')
