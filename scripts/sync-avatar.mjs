/**
 * Sync LinkedIn profile photo → portfolio avatars + favicons.
 *
 * Two modes:
 *   1. LOCAL (default): launches a headed browser with persistent context
 *      for manual LinkedIn login. Session persists at ./browser-data.
 *   2. CI (CI=true): launches headless, injects LinkedIn cookies from
 *      LINKEDIN_COOKIES env var (JSON array of Playwright cookie objects).
 *
 * Usage:
 *   node scripts/sync-avatar.mjs              # local, headed
 *   node scripts/sync-avatar.mjs --check      # local, check only
 *   node scripts/sync-avatar.mjs --force      # local, force regenerate
 *   CI=true node scripts/sync-avatar.mjs      # CI, headless with cookies
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
  copyFileSync, statSync, rmSync,
} from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')

const LINKEDIN_URL = 'https://www.linkedin.com/in/ayazziaansari'
const BROWSER_DATA = join(ROOT, 'browser-data')
const TEMP_SCREENSHOT = join(PUBLIC, 'ayaz-avatar-new.png')
const AVATAR_PATH = join(PUBLIC, 'ayaz-avatar.png')

const SIZES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.ico', size: 32 },
]

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const force = args.includes('--force')

async function syncAvatar() {
  console.log(`[sync-avatar] Mode: ${isCI ? 'CI (headless + cookies)' : 'LOCAL (headed + persistent context)'}`)

  let browser

  if (isCI) {
    if (!process.env.LINKEDIN_COOKIES) {
      console.error('[sync-avatar] CI mode requires LINKEDIN_COOKIES env var')
      console.error('[sync-avatar] Set it as a GitHub secret: JSON array of Playwright cookie objects')
      process.exit(1)
    }

    browser = await chromium.launch({
      headless: true,
      channel: 'chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    })

    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Linux"',
      },
    })

    // Stealth: override navigator properties to avoid headless detection
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })
      window.chrome = { runtime: {} }
    })

    let cookies
    try {
      const raw = process.env.LINKEDIN_COOKIES.trim()
      // Handle both JSON array and newline/whitespace-separated objects
      if (raw.startsWith('[')) {
        cookies = JSON.parse(raw)
      } else if (raw.startsWith('{')) {
        // Multiple objects separated by whitespace/newlines — wrap in array
        const wrapped = '[' + raw.replace(/}\s*{/g, '},{') + ']'
        cookies = JSON.parse(wrapped)
      } else {
        cookies = JSON.parse(raw)
      }
    } catch (e) {
      console.error('[sync-avatar] LINKEDIN_COOKIES is not valid JSON:', e.message)
      console.error('[sync-avatar] Length:', process.env.LINKEDIN_COOKIES.length, 'First 80 chars:', process.env.LINKEDIN_COOKIES.slice(0, 80))
      process.exit(1)
    }

    await context.addCookies(cookies)
    const page = await context.newPage()
    await runSync(page)
  } else {
    if (!existsSync(BROWSER_DATA)) {
      mkdirSync(BROWSER_DATA, { recursive: true })
    }

    browser = await chromium.launchPersistentContext(BROWSER_DATA, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      channel: 'msedge',
    })

    const page = browser.pages()[0] || await browser.newPage()
    await runSync(page)
  }

  async function runSync(page) {
    console.log(`[sync-avatar] Navigating to ${LINKEDIN_URL}...`)
    await page.goto(LINKEDIN_URL, { waitUntil: 'networkidle', timeout: 45000 })

    const currentUrl = page.url()
    console.log(`[sync-avatar] Current URL: ${currentUrl}`)

    if (currentUrl.includes('authwall') || currentUrl.includes('login') || currentUrl.includes('signup')) {
      if (isCI) {
        console.error('[sync-avatar] LinkedIn requires login. Cookies may be expired.')
        console.error('[sync-avatar] Update the LINKEDIN_COOKIES GitHub secret with fresh cookies.')
        console.error('[sync-avatar] Page title:', await page.title())
        process.exit(1)
      } else {
        console.log('')
        console.log('[sync-avatar] LinkedIn requires login. Please log in in the browser window.')
        console.log('[sync-avatar] Session will persist for future runs.')
        console.log('')
        await page.waitForURL('**/in/ayazziaansari*', { timeout: 120000 })
        console.log('[sync-avatar] Login detected. Continuing...')
      }
    }

    // Wait for page to fully render
    await page.waitForTimeout(isCI ? 8000 : 3000)

    // Try multiple selectors with retry
    const selectors = [
      '.pv-top-card__photo img',
      'button[aria-label*="Profile photo"] img',
      '.profile-photo-edit__preview',
      'img[src*="profile-displayphoto"]',
      '.pv-top-card-profile-picture img',
      'div[class*="profile-photo"] img',
    ]

    let photoEl = null

    // Try each selector with a short wait
    for (const sel of selectors) {
      try {
        photoEl = await page.waitForSelector(sel, { timeout: 5000, state: 'visible' })
        if (photoEl) {
          console.log(`[sync-avatar] Found photo with selector: ${sel}`)
          break
        }
      } catch {
        // continue to next selector
      }
    }

    if (!photoEl) {
      console.log('[sync-avatar] Direct selectors failed. Scanning all images...')
      const allImgs = await page.$$eval('img', els =>
        els.filter(e => e.src && e.src.includes('profile-displayphoto'))
           .map(e => ({ src: e.src, w: e.width, h: e.height }))
      )
      if (allImgs.length > 0) {
        console.log(`[sync-avatar] Found ${allImgs.length} profile-displayphoto images`)
        // Get the largest one
        const best = allImgs.sort((a, b) => b.w * b.h - a.w * a.h)[0]
        photoEl = await page.$(`img[src="${best.src}"]`)
      }
    }

    if (!photoEl) {
      console.error('[sync-avatar] Could not find profile photo element.')
      console.error('[sync-avatar] Page title:', await page.title())
      // Take a debug screenshot in CI
      if (isCI) {
        await page.screenshot({ path: 'debug-page.png', fullPage: false })
        console.error('[sync-avatar] Debug screenshot saved to debug-page.png')
        // List all images on the page
        const imgs = await page.$$eval('img', els =>
          els.map(e => ({ src: e.src?.slice(0, 100), w: e.naturalWidth, h: e.naturalHeight, alt: e.alt?.slice(0, 50) }))
        )
        console.error('[sync-avatar] All images on page:', JSON.stringify(imgs.slice(0, 15), null, 2))
      }
      process.exit(1)
    }
      }
      process.exit(1)
    }

    console.log('[sync-avatar] Taking screenshot of profile photo...')
    await photoEl.screenshot({ path: TEMP_SCREENSHOT, type: 'png' })

    const newSize = statSync(TEMP_SCREENSHOT).size

    if (!force && existsSync(AVATAR_PATH)) {
      const oldSize = statSync(AVATAR_PATH).size
      if (Math.abs(oldSize - newSize) < 100) {
        console.log('[sync-avatar] Photo unchanged (size delta < 100 bytes). Skipping.')
        if (existsSync(TEMP_SCREENSHOT)) rmSync(TEMP_SCREENSHOT)
        console.log('[sync-avatar] Done — no changes needed.')
        return
      }
    }

    copyFileSync(TEMP_SCREENSHOT, AVATAR_PATH)
    if (existsSync(TEMP_SCREENSHOT)) rmSync(TEMP_SCREENSHOT)
    console.log(`[sync-avatar] Saved new avatar (${newSize} bytes)`)

    console.log('[sync-avatar] Generating favicon sizes via sharp...')
    const sharp = (await import('sharp')).default
    for (const { name, size } of SIZES) {
      const outPath = join(PUBLIC, name)
      await sharp(AVATAR_PATH).resize(size, size, { fit: 'cover' }).png().toFile(outPath)
      const genSize = statSync(outPath).size
      console.log(`[sync-avatar]   ${name}: ${genSize} bytes`)
    }

    if (checkOnly) {
      console.log('[sync-avatar] --check mode: changes generated but not committed.')
      return
    }

    console.log('[sync-avatar] Bumping favicon cache-bust version in index.html...')
    const htmlPath = join(ROOT, 'index.html')
    let html = readFileSync(htmlPath, 'utf8')
    const vMatch = html.match(/\?v=(\d+)/)
    const currentVersion = vMatch ? parseInt(vMatch[1]) : 1
    const nextVersion = currentVersion + 1
    html = html.replace(/\?v=\d+/g, `?v=${nextVersion}`)
    if (!html.includes('?v=')) {
      html = html.replace(
        /(href="\/favicon-32x32\.png)"/,
        '$1?v=' + nextVersion + '"'
      )
    }
    writeFileSync(htmlPath, html)

    if (!isCI) {
      console.log('[sync-avatar] Committing to git...')
      try {
        execSync('git add public/ayaz-avatar.png public/favicon-16x16.png public/favicon-32x32.png public/favicon.ico public/apple-touch-icon.png index.html', { stdio: 'pipe', cwd: ROOT })
        execSync('git commit -m "chore: auto-sync LinkedIn profile photo [skip ci]"', { stdio: 'pipe', cwd: ROOT })
        execSync('git push origin main', { stdio: 'pipe', cwd: ROOT })
        console.log('[sync-avatar] Pushed to GitHub.')
      } catch {
        console.log('[sync-avatar] Git commit/push skipped (nothing to commit or not in a repo).')
      }
    }

    console.log('[sync-avatar] Done!')
  }

  await browser.close()
}

syncAvatar().catch(err => {
  console.error('[sync-avatar] Error:', err.message)
  process.exit(1)
})