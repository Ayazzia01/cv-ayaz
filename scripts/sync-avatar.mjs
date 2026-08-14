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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    let cookies
    try {
      const raw = process.env.LINKEDIN_COOKIES.trim()
      cookies = JSON.parse(raw)
    } catch (e) {
      console.error('[sync-avatar] LINKEDIN_COOKIES is not valid JSON:', e.message)
      console.error('[sync-avatar] Length:', process.env.LINKEDIN_COOKIES.length, 'First 50 chars:', process.env.LINKEDIN_COOKIES.slice(0, 50))
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
    await page.goto(LINKEDIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })

    const currentUrl = page.url()
    if (currentUrl.includes('authwall') || currentUrl.includes('login')) {
      if (isCI) {
        console.error('[sync-avatar] LinkedIn requires login. Cookies may be expired.')
        console.error('[sync-avatar] Update the LINKEDIN_COOKIES GitHub secret with fresh cookies.')
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

    await page.waitForTimeout(isCI ? 5000 : 3000)

    const profilePhotoSelector = [
      '.pv-top-card__photo img',
      'button[aria-label*="Profile photo"]',
      '.profile-photo-edit__preview',
      'img[src*="profile-displayphoto"]',
    ].join(', ')

    let photoEl = await page.$(profilePhotoSelector)

    if (!photoEl) {
      console.log('[sync-avatar] Profile photo element not found directly. Trying alternative approach...')
      const allImgs = await page.$$eval('img[src*="licdn"]', els =>
        els.filter(e => e.width > 50 && e.height > 50 && e.src.includes('profile-displayphoto'))
           .map(e => ({ src: e.src, w: e.width, h: e.height }))
      )
      if (allImgs.length > 0) {
        photoEl = await page.$(`img[src="${allImgs[0].src}"]`)
      }
    }

    if (!photoEl) {
      console.error('[sync-avatar] Could not find profile photo element.')
      if (!isCI) {
        const imgs = await page.$$eval('img', els =>
          els.filter(e => e.src && e.width > 50).map(e => ({ src: e.src.slice(0, 100), w: e.width, h: e.height, alt: e.alt }))
        )
        console.error('[sync-avatar] Available images:', JSON.stringify(imgs.slice(0, 10), null, 2))
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