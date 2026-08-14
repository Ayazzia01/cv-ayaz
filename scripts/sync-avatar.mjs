/**
 * Sync LinkedIn profile photo → portfolio avatars + favicons.
 *
 * Uses Playwright with a persistent browser context (your real LinkedIn login)
 * to screenshot your profile photo, then generates all required image sizes
 * via sharp-cli and commits the update if the photo changed.
 *
 * Usage:
 *   node scripts/sync-avatar.mjs              # one-shot sync
 *   node scripts/sync-avatar.mjs --check      # check only, no commit
 *   node scripts/sync-avatar.mjs --force      # regenerate even if unchanged
 *
 * Prerequisites:
 *   - npm install (playwright is a devDependency)
 *   - npx playwright install chromium
 *   - You must have logged into LinkedIn at least once in a Chromium browser
 *     using the persistent context at ./browser-data (created automatically
 *     on first run — log in when prompted, the session persists).
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'fs'
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

async function syncAvatar() {
  const args = process.argv.slice(2)
  const checkOnly = args.includes('--check')
  const force = args.includes('--force')

  console.log('[sync-avatar] Launching Playwright with persistent context...')

  if (!existsSync(BROWSER_DATA)) {
    mkdirSync(BROWSER_DATA, { recursive: true })
  }

  const browser = await chromium.launchPersistentContext(BROWSER_DATA, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    channel: 'msedge',
  })

  const page = browser.pages()[0] || await browser.newPage()

  try {
    console.log(`[sync-avatar] Navigating to ${LINKEDIN_URL}...`)
    await page.goto(LINKEDIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })

    const currentUrl = page.url()
    if (currentUrl.includes('authwall') || currentUrl.includes('login')) {
      console.log('')
      console.log('[sync-avatar] LinkedIn requires login.')
      console.log('[sync-avatar] Please log in to LinkedIn in the browser window.')
      console.log('[sync-avatar] After logging in, the session will persist for future runs.')
      console.log('[sync-avatar] Waiting for you to log in (30s timeout after page load)...')
      console.log('')

      await page.waitForURL('**/in/ayazziaansari*', { timeout: 120000 })
      console.log('[sync-avatar] Login detected. Continuing...')
    }

    await page.waitForTimeout(3000)

    const profilePhotoSelector = [
      '.pv-top-card__photo img',
      'button[aria-label*="Profile photo"]',
      '.profile-photo-edit__preview',
      'img[src*="profile-displayphoto"]',
    ].join(', ')

    const photoEl = await page.$(profilePhotoSelector)
    if (!photoEl) {
      console.error('[sync-avatar] Could not find profile photo element on the page.')
      console.error('[sync-avatar] Available images with licdn:')
      const imgs = await page.$$eval('img[src*="licdn"]', els =>
        els.map(e => ({ src: e.src?.slice(0, 80), w: e.width, h: e.height, alt: e.alt }))
      )
      console.error(JSON.stringify(imgs, null, 2))
      process.exit(1)
    }

    console.log('[sync-avatar] Taking screenshot of profile photo...')
    await photoEl.screenshot({ path: TEMP_SCREENSHOT, type: 'png' })

    const newSize = statSync(TEMP_SCREENSHOT).size

    if (!force && existsSync(AVATAR_PATH)) {
      const oldSize = statSync(AVATAR_PATH).size
      if (oldSize === newSize) {
        console.log('[sync-avatar] Photo unchanged (same byte size). Skipping.')
        if (checkOnly) {
          console.log('[sync-avatar] --check mode: no changes needed.')
        } else {
          console.log('[sync-avatar] No commit needed.')
        }
        return
      }
    }

    copyFileSync(TEMP_SCREENSHOT, AVATAR_PATH)
    console.log(`[sync-avatar] Saved new avatar (${newSize} bytes)`)

    console.log('[sync-avatar] Generating favicon sizes via sharp-cli...')
    for (const { name, size } of SIZES) {
      const outPath = join(PUBLIC, name)
      execSync(
        `npx --yes sharp-cli -i "${AVATAR_PATH}" -o "${outPath}" resize ${size} ${size} --withoutEnlargement`,
        { stdio: 'pipe', cwd: ROOT }
      )
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
    const vMatch = html.match(/href="\/(favicon|apple-touch)[^"]*\?v=(\d+)"/)
    const currentVersion = vMatch ? parseInt(vMatch[2]) : 1
    const nextVersion = currentVersion + 1
    html = html.replace(/href="\/(favicon|apple-touch)[^"]*\?v=\d+"/g, (match) => {
      if (match.includes('?v=')) {
        return match.replace(/\?v=\d+/, `?v=${nextVersion}`)
      }
      return match
    })
    if (!html.includes('?v=')) {
      html = html.replace(
        /(<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32x32\.png)"/,
        '$1?v=' + nextVersion + '"'
      )
    }
    writeFileSync(htmlPath, html)

    console.log('[sync-avatar] Committing to git...')
    try {
      execSync('git add public/ayaz-avatar.png public/favicon-16x16.png public/favicon-32x32.png public/favicon.ico public/apple-touch-icon.png index.html', { stdio: 'pipe', cwd: ROOT })
      execSync('git commit -m "chore: auto-sync LinkedIn profile photo [skip ci]"', { stdio: 'pipe', cwd: ROOT })
      execSync('git push origin main', { stdio: 'pipe', cwd: ROOT })
      console.log('[sync-avatar] Pushed to GitHub. Vercel will auto-deploy.')
    } catch (e) {
      console.log('[sync-avatar] Git commit/push skipped (nothing to commit or not in a repo).')
    }

    console.log('[sync-avatar] Done!')
  } finally {
    await browser.close()
  }
}

syncAvatar().catch(err => {
  console.error('[sync-avatar] Error:', err.message)
  process.exit(1)
})