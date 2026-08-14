/**
 * Extract LinkedIn cookies from your local browser for GitHub Actions CI.
 *
 * Launches a Playwright browser with your persistent LinkedIn session,
 * navigates to LinkedIn, extracts all cookies for linkedin.com, and
 * prints them as a JSON string ready to paste into a GitHub secret.
 *
 * Usage:
 *   node scripts/extract-linkedin-cookies.mjs
 *
 * Then:
 *   1. Copy the printed JSON
 *   2. Go to GitHub → your repo → Settings → Secrets and variables → Actions
 *   3. Create/update the secret named LINKEDIN_COOKIES with the JSON value
 *   4. The weekly GitHub Actions workflow will use these cookies
 *
 * Note: LinkedIn cookies expire (~1 year for session cookies, sooner if you
 * log out). If the workflow fails, re-run this script to get fresh cookies.
 */

import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BROWSER_DATA = join(ROOT, 'browser-data')

async function extractCookies() {
  if (!existsSync(BROWSER_DATA)) {
    mkdirSync(BROWSER_DATA, { recursive: true })
  }

  console.log('[extract-cookies] Launching browser with persistent context...')
  console.log('[extract-cookies] If LinkedIn requires login, please log in in the browser window.')

  const browser = await chromium.launchPersistentContext(BROWSER_DATA, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    channel: 'msedge',
  })

  const page = browser.pages()[0] || await browser.newPage()

  try {
    console.log('[extract-cookies] Navigating to LinkedIn...')
    await page.goto('https://www.linkedin.com/in/ayazziaansari', { waitUntil: 'domcontentloaded', timeout: 30000 })

    const currentUrl = page.url()
    if (currentUrl.includes('authwall') || currentUrl.includes('login')) {
      console.log('')
      console.log('[extract-cookies] Please log in to LinkedIn in the browser window.')
      console.log('[extract-cookies] Waiting for login (2 min timeout)...')
      console.log('')
      await page.waitForURL('**/in/ayazziaansari*', { timeout: 120000 })
      console.log('[extract-cookies] Login detected. Extracting cookies...')
    }

    await page.waitForTimeout(2000)

    const context = page.context()
    const cookies = await context.cookies(['https://www.linkedin.com'])

    const filtered = cookies.filter(c =>
      c.name === 'li_at' ||
      c.name === 'li_rm' ||
      c.name === 'liap' ||
      c.name === 'JSESSIONID' ||
      c.name === 'bsession' ||
      c.name === 'bcookie' ||
      c.name === 'lang' ||
      c.name === 'li_theme' ||
      c.name === 'li_ta' ||
      c.name === 'sentryReplaySession' ||
      c.name.startsWith('li_') ||
      c.name.startsWith('aem_') ||
      c.name === 'visit' ||
      c.name === 'UTC_MIN' ||
      c.name === 'X_HTTP_CF_CONNECTING_IP' ||
      true
    )

    const json = JSON.stringify(filtered)

    console.log('')
    console.log('══════════════════════════════════════════════════════════════════')
    console.log(' COPY THE JSON BELOW (between the markers) — this is your secret ')
    console.log('══════════════════════════════════════════════════════════════════')
    console.log('')
    console.log('---BEGIN COOKIES---')
    console.log(json)
    console.log('---END COOKIES---')
    console.log('')
    console.log(`Total cookies: ${filtered.length}`)
    console.log('')
    console.log('Next steps:')
    console.log('  1. Copy the JSON above (between the markers)')
    console.log('  2. Go to: https://github.com/Ayazzia01/cv-ayaz/settings/secrets/actions')
    console.log('  3. Click "New repository secret"')
    console.log('  4. Name: LINKEDIN_COOKIES')
    console.log('  5. Value: paste the JSON')
    console.log('  6. Click "Add secret"')
    console.log('')
    console.log('Done! The GitHub Actions workflow will use these cookies every Monday.')
  } finally {
    await browser.close()
  }
}

extractCookies().catch(err => {
  console.error('[extract-cookies] Error:', err.message)
  process.exit(1)
})