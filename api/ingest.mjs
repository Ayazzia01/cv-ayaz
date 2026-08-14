// Debug endpoint: test Ollama embeddings API
import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 120, runtime: 'nodejs' }

export default async function handler(req) {
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1'
  const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { content } = await req.json()

    // Step 1: Test Ollama embeddings
    const t0 = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    const embedRes = await fetch(`${OLLAMA_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: content || "test" }),
      signal: controller.signal,
    }).catch(e => {
      clearTimeout(timeout)
      return { ok: false, status: 0, text: () => Promise.resolve(e.message) }
    })
    clearTimeout(timeout)

    const embedMs = Date.now() - t0
    const embedText = await embedRes.text()

    if (!embedRes.ok) {
      return new Response(JSON.stringify({
        step: 'embedding',
        status: embedRes.status,
        error: embedText.slice(0, 500),
        url: `${OLLAMA_BASE_URL}/embeddings`,
        model: EMBED_MODEL,
        ms: embedMs,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const embedData = JSON.parse(embedText)
    const embedding = embedData.data?.[0]?.embedding

    if (!embedding) {
      return new Response(JSON.stringify({
        step: 'parse-embedding',
        error: 'No embedding in response',
        responseKeys: Object.keys(embedData),
        responsePreview: embedText.slice(0, 500),
        ms: embedMs,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    // Step 2: Test Supabase insert
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Clear existing
    await supabase.from('documents').delete().neq('id', 0)

    const { error } = await supabase.from('documents').insert({
      content: content || "test",
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
      return new Response(JSON.stringify({
        step: 'supabase-insert',
        error: error.message,
        embeddingDims: embedding.length,
        ms: embedMs,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      success: true,
      ingested: 1,
      embeddingDims: embedding.length,
      embedMs,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({
      step: 'catch',
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join(' | '),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}