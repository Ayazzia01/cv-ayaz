// Temporary RAG ingestion endpoint — sends entire content as ONE embedding call
// DELETE this file after ingestion
import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 300 }

const OLLAMA_BASE_URL = () => process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1'
const EMBED_MODEL = () => process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { content } = await req.json()
    if (!content) return new Response(JSON.stringify({ error: 'No content provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Clear existing
    await supabase.from('documents').delete().neq('id', 0)

    // Single embedding call for the entire content
    console.log('Calling Ollama embeddings at:', `${OLLAMA_BASE_URL()}/embeddings`)
    console.log('Model:', EMBED_MODEL())
    console.log('Content length:', content.length)

    const embedRes = await fetch(`${OLLAMA_BASE_URL()}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: EMBED_MODEL(), input: content }),
    })

    console.log('Ollama response status:', embedRes.status)

    if (!embedRes.ok) {
      const errText = await embedRes.text()
      console.error('Ollama error:', errText.slice(0, 300))
      return new Response(JSON.stringify({ error: `Embedding failed: ${embedRes.status}`, detail: errText.slice(0, 300), url: `${OLLAMA_BASE_URL()}/embeddings`, model: EMBED_MODEL() }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }

    const embedData = await embedRes.json()
    const embedding = embedData.data?.[0]?.embedding

    if (!embedding) {
      return new Response(JSON.stringify({ error: 'No embedding returned', response: JSON.stringify(embedData).slice(0, 300) }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }

    // Insert as a single document
    const { error } = await supabase.from('documents').insert({
      content,
      metadata: {
        article_id: 'chatbot-prompt',
        section_id: 'full',
        section_anchor: '',
        page_path_en: '/',
        page_path_es: '/',
        article_slug_en: '',
        article_slug_es: '',
      },
      embedding,
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, ingested: 1, embeddingDims: embedding.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}