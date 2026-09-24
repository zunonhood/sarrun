import { chromium } from 'playwright-core'
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', err => errors.push(err.message))
await page.goto('http://127.0.0.1:4174/?app=1', { waitUntil: 'networkidle' })
const checks = []
for (const [label, heading] of [['Account','Your private account'],['Activity','Public settlement'],['Recovery','Restore a private note'],['Help','Three actions']]) {
  await page.getByRole('button', { name: label, exact: true }).click()
  const active = (await page.locator('.app-side button.active').innerText()).trim()
  const visible = await page.getByRole('heading', { name: new RegExp(heading, 'i') }).isVisible()
  checks.push({ label, active, visible })
}
await page.getByRole('button', { name: 'Recovery', exact: true }).click()
await page.locator('#recovery-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1}') })
checks.push({ invalidRecoveryRejected: await page.getByText('This is not a valid Sarrun recovery record.').isVisible() })
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
console.log(JSON.stringify({ checks, errors, overflow }, null, 2))
await page.screenshot({ path: 'qa-launch-app.png', fullPage: true })
await browser.close()