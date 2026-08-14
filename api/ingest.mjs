// RAG ingestion via Edge runtime (same as chat.js which works)
export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1'
  const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  try {
    const { content } = await req.json()
    const text = content || "test"

    // Step 1: Embed via Ollama
    const embedRes = await fetch(`${OLLAMA_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    })

    if (!embedRes.ok) {
      const errText = await embedRes.text()
      return new Response(JSON.stringify({ step: 'embed', status: embedRes.status, error: errText.slice(0, 300) }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }

    const embedData = await embedRes.json()
    const embedding = embedData.data?.[0]?.embedding

    if (!embedding) {
      return new Response(JSON.stringify({ step: 'parse', error: 'no embedding', keys: Object.keys(embedData) }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }

    // Step 2: Clear existing + insert via Supabase REST API (no SDK needed)
    const sbHeaders = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    }

    // Delete all existing
    await fetch(`${SUPABASE_URL}/rest/v1/documents?id=neq.0`, {
      method: 'DELETE',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
    })

    // Insert new
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        content: text,
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
      }),
    })

    if (!insertRes.ok) {
      const errText = await insertRes.text()
      return new Response(JSON.stringify({ step: 'insert', status: insertRes.status, error: errText.slice(0, 300), dims: embedding.length }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, ingested: 1, dims: embedding.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ step: 'catch', error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}