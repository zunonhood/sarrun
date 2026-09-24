import { chromium } from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}})
  await page.goto('http://127.0.0.1:4174/docs.html',{waitUntil:'networkidle'})
  await page.locator('.repo-entry.file').filter({hasText:'circuits/JoinSplit.circom'}).click()
  await page.waitForTimeout(500)
  const result=await page.evaluate(()=>({
    selected:document.querySelector('.source-head b')?.textContent,
    hasCircuit:document.querySelector('.source-viewer pre')?.textContent.includes('template JoinSplit'),
    lines:document.querySelectorAll('.source-line').length,
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
  }))
  await page.screenshot({path:`qa-docs-source-${width}.png`})
  console.log(JSON.stringify({width,...result,overflow:result.scrollWidth>result.clientWidth}))
  await page.close()
}
await browser.close()