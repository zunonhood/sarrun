import { chromium } from 'playwright-core'
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', err => errors.push(err.message))
await page.goto('http://127.0.0.1:4191/?app=1', { waitUntil: 'networkidle' })
const checks = []
for (const [label, heading] of [['Account','Your private account'],['Activity','Public settlement'],['Recovery','Your keys stay local'],['Help','Three actions']]) {
  await page.getByRole('button', { name: label, exact: true }).click()
  const active = (await page.locator('.app-side button.active').innerText()).trim()
  const visible = await page.getByRole('heading', { name: new RegExp(heading, 'i') }).isVisible()
  checks.push({ label, active, visible })
}
await page.getByRole('button', { name: 'Account', exact: true }).click()
await page.getByRole('button', { name: /Connect wallet/i }).click()
checks.push({ walletStandardFallback: await page.getByText(/No Solana wallet found/i).isVisible() })
await page.screenshot({ path: 'qa-solana-app.png', fullPage: true })
const text = await page.locator('body').innerText()
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
console.log(JSON.stringify({ checks, errors, overflow, hasSolana: text.includes('Solana'), hasLegacy: /Robinhood Chain|\bETH\b|EVM wallet/.test(text) }, null, 2))
if (errors.length || overflow || checks.some(check => Object.values(check).includes(false)) || /Robinhood Chain|\bETH\b|EVM wallet/.test(text)) process.exitCode = 1
await browser.close()
