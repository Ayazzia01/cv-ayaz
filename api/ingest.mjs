// Temporary endpoint to run RAG ingestion on Vercel (where env vars are available)
// DELETE this file after ingestion is complete
import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 300 }

const OLLAMA_BASE_URL = () => process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1'
const EMBED_MODEL = () => process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { chunks: preChunked } = await req.json()

    if (!preChunked || !Array.isArray(preChunked)) {
      return new Response(JSON.stringify({ error: 'Expected { chunks: string[] }' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Clear existing
    await supabase.from('documents').delete().neq('id', 0)

    let ingested = 0
    const errors = []

    for (let i = 0; i < preChunked.length; i++) {
      try {
        const embedRes = await fetch(`${OLLAMA_BASE_URL()}/embeddings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: EMBED_MODEL(), input: preChunked[i] }),
        })
        const embedData = await embedRes.json()
        const embedding = embedData.data?.[0]?.embedding

        if (!embedding) {
          errors.push(`Chunk ${i}: no embedding returned`)
          continue
        }

        const { error } = await supabase.from('documents').insert({
          content: preChunked[i],
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
        if (error) {
          errors.push(`Chunk ${i}: ${error.message}`)
          continue
        }
        ingested++
      } catch (e) {
        errors.push(`Chunk ${i}: ${e.message}`)
      }
    }

    return new Response(JSON.stringify({ success: true, ingested, total: preChunked.length, errors: errors.slice(0, 5) }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}