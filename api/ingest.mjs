// Minimal ingest endpoint — lazy import to avoid cold start issues
export const config = { maxDuration: 120, runtime: 'nodejs' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1'
  const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

  try {
    const { content } = await req.json()
    const text = content || "test"

    // Step 1: Test Ollama embeddings with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    let embedRes
    try {
      embedRes = await fetch(`${OLLAMA_BASE_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: EMBED_MODEL, input: text }),
        signal: controller.signal,
      })
    } catch (e) {
      clearTimeout(timeout)
      return new Response(JSON.stringify({ step: 'fetch', error: e.message, url: `${OLLAMA_BASE_URL}/embeddings` }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }
    clearTimeout(timeout)

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

    // Step 2: Lazy import Supabase + insert
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    await supabase.from('documents').delete().neq('id', 0)

    const { error } = await supabase.from('documents').insert({
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
    })

    if (error) {
      return new Response(JSON.stringify({ step: 'insert', error: error.message, dims: embedding.length }), {
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