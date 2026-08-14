/**
 * Simple RAG ingestion for cv-ayaz — uses Ollama Cloud embeddings.
 * 
 * Ingests portfolio content (from chatbot-prompt.txt + cv.md) into Supabase
 * so the chatbot can search it for detailed answers.
 *
 * Usage:
 *   node scripts/ingest-rag-ollama.mjs
 *
 * Requires env vars (from .env.local or Vercel):
 *   OLLAMA_API_KEY, OLLAMA_BASE_URL, OLLAMA_EMBED_MODEL
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1'
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OLLAMA_KEY = process.env.OLLAMA_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!OLLAMA_KEY) {
  console.error('Missing OLLAMA_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const MAX_CHUNK = 800
const OVERLAP = 150

function chunkText(text, maxLen = MAX_CHUNK, overlap = OVERLAP) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxLen, text.length)
    chunks.push(text.slice(start, end))
    if (end >= text.length) break
    start = end - overlap
  }
  return chunks
}

async function embed(text) {
  const res = await fetch(`${OLLAMA_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OLLAMA_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Embedding failed: ${res.status} ${errText.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.data[0].embedding
}

async function insertChunks(articleId, chunks) {
  console.log(`  Embedding ${chunks.length} chunks...`)
  const rows = []
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embed(chunks[i])
    rows.push({
      content: chunks[i],
      metadata: {
        article_id: articleId,
        section_id: `chunk-${i}`,
        section_anchor: '',
        page_path_en: '/',
        page_path_es: '/',
        article_slug_en: '',
        article_slug_es: '',
      },
      embedding,
    })
    if ((i + 1) % 5 === 0) console.log(`    ${i + 1}/${chunks.length} embedded`)
  }
  console.log(`  Inserting to Supabase...`)
  const { error } = await supabase.from('documents').insert(rows)
  if (error) throw error
  return rows.length
}

async function main() {
  console.log('RAG Ingestion (Ollama embeddings)\n')

  // 1. Chatbot prompt (has Ayaz's full profile)
  const promptText = readFileSync(join(ROOT, 'chatbot-prompt.txt'), 'utf-8')
  const promptChunks = chunkText(promptText)
  console.log(`chatbot-prompt: ${promptChunks.length} chunks`)

  // 2. CV content
  const cvPath = join(ROOT, '..', 'career-ops', 'cv.md')
  let cvText = ''
  try {
    cvText = readFileSync(cvPath, 'utf-8')
  } catch {
    // CV is in the career-ops project — try alternate path
    try {
      cvText = readFileSync(join(ROOT, 'cv.md'), 'utf-8')
    } catch {
      console.log('  (cv.md not found — skipping)')
    }
  }
  const cvChunks = cvText ? chunkText(cvText) : []
  if (cvChunks.length) console.log(`cv.md: ${cvChunks.length} chunks`)

  // Clear existing
  console.log('\nClearing existing documents...')
  await supabase.from('documents').delete().neq('id', 0)

  // Ingest
  let total = 0
  console.log('\nIngesting chatbot-prompt...')
  total += await insertChunks('chatbot-prompt', promptChunks)

  if (cvChunks.length) {
    console.log('\nIngesting cv.md...')
    total += await insertChunks('cv', cvChunks)
  }

  console.log(`\nDone! ${total} chunks ingested.`)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})