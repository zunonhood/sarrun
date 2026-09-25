import { chromium } from 'playwright-core'
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
const errors = []
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', err => errors.push(err.message))
await page.goto('http://127.0.0.1:4174/?app=1', { waitUntil: 'networkidle' })
for (const [label, heading] of [['Account','Your private account'],['Activity','Public settlement'],['Recovery','Your keys stay local'],['Help','Three actions']]) {
  await page.getByRole('button', { name: label, exact: true }).click()
  if (!await page.getByRole('heading', { name: new RegExp(heading, 'i') }).isVisible()) throw new Error(`${label} panel did not render`)
}
await page.getByRole('button', { name: 'Recovery', exact: true }).click()
const downloadPromise = page.waitForEvent('download')
await page.getByRole('button', { name: 'Create address', exact: true }).click()
const download = await downloadPromise
await page.getByRole('button', { name: /murven:rh:1:/ }).waitFor()
const addressText = await page.getByRole('button', { name: /murven:rh:1:/ }).innerText()
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
console.log(JSON.stringify({ addressPrefix: addressText.slice(0, 12), download: download.suggestedFilename(), errors, overflow }, null, 2))
await page.screenshot({ path: 'qa-private-receive.png', fullPage: true })
await browser.close()