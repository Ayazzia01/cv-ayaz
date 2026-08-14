// Temporary endpoint to run RAG ingestion on Vercel (where env vars are available)
// DELETE this file after ingestion is complete
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const OLLAMA_BASE_URL = () => process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1'
const EMBED_MODEL = () => process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { text: content } = await req.json()
    if (!content) return new Response(JSON.stringify({ error: 'No content provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    // Chunk
    const MAX_CHUNK = 800
    const OVERLAP = 150
    const chunks = []
    let start = 0
    while (start < content.length) {
      const end = Math.min(start + MAX_CHUNK, content.length)
      chunks.push(content.slice(start, end))
      if (end >= content.length) break
      start = end - OVERLAP
    }

    // Embed each chunk
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Clear existing
    await supabase.from('documents').delete().neq('id', 0)

    let ingested = 0
    for (let i = 0; i < chunks.length; i++) {
      const embedRes = await fetch(`${OLLAMA_BASE_URL()}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: EMBED_MODEL(), input: chunks[i] }),
      })
      const embedData = await embedRes.json()
      const embedding = embedData.data?.[0]?.embedding

      if (!embedding) {
        console.error('Embedding failed for chunk', i, JSON.stringify(embedData).slice(0, 200))
        continue
      }

      const { error } = await supabase.from('documents').insert({
        content: chunks[i],
        metadata: {
          article_id: 'chatbot-prompt',
          section_id: `chunk-${i}`,
          section_anchor: '',
          page_path_en: '/',
          page_path_es: '/',
          article_slug_en: '',
          article_slug_es: '',
        },
        embedding,
      })
      if (error) throw error
      ingested++
    }

    return new Response(JSON.stringify({ success: true, ingested, total: chunks.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}