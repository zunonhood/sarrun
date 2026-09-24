import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const cases = [
  ['home-mobile', 'http://127.0.0.1:4174/', 390, 844],
  ['docs-mobile', 'http://127.0.0.1:4174/docs.html', 390, 844],
  ['app-mobile', 'http://127.0.0.1:4174/?app=1', 390, 844],
]
const results = []
for (const [name, url, width, height] of cases) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.screenshot({ path: resolve(`qa-${name}.png`), fullPage: false })
  const metrics = await page.evaluate(() => ({ innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, title: document.title }))
  results.push({ name, ...metrics, overflow: metrics.scrollWidth > metrics.clientWidth })
  await page.close()
}
await browser.close()
console.log(JSON.stringify(results, null, 2))