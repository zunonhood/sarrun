import { chromium } from 'playwright-core'
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('pageerror', error => errors.push(error.message))
await page.goto('http://127.0.0.1:4191/', { waitUntil: 'networkidle' })
const homeText = await page.locator('body').innerText()
await page.screenshot({ path: 'qa-solana-home.png', fullPage: true })
const home = { title: await page.title(), logoLoaded: await page.locator('.logo-mark img').first().evaluate(image => image.complete && image.naturalWidth > 0), docsHref: await page.getByRole('link', { name: 'Docs', exact: true }).first().getAttribute('href'), hasSolana: homeText.includes('Solana'), hasLegacy: /Robinhood Chain|\bETH\b|EVM wallet/.test(homeText) }
await page.getByRole('link', { name: 'Docs', exact: true }).first().click()
await page.waitForLoadState('networkidle')
const docsText = await page.locator('body').innerText()
await page.screenshot({ path: 'qa-solana-docs.png', fullPage: true })
const docs = { url: page.url(), title: await page.title(), sourceVisible: await page.getByText('sarrun / protocol').isVisible(), logoLoaded: await page.locator('.docs-logo img').evaluate(image => image.complete && image.naturalWidth > 0), hasSolana: docsText.includes('Solana'), hasLegacy: /Robinhood Chain|\bETH\b|EVM wallet/.test(docsText) }
console.log(JSON.stringify({ home, docs, errors }, null, 2))
if (!home.logoLoaded || !home.hasSolana || home.hasLegacy || !docs.logoLoaded || !docs.sourceVisible || !docs.hasSolana || docs.hasLegacy || errors.length) process.exitCode = 1
await browser.close()
