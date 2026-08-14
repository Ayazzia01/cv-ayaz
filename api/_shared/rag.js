// ---------------------------------------------------------------------------
// Shared RAG pipeline — used by api/chat.js
// Ollama Cloud (OpenAI-compatible) replaces OpenAI embeddings + Anthropic rerank
// ---------------------------------------------------------------------------

const OLLAMA_BASE_URL = () => process.env.OLLAMA_BASE_URL || 'https://ollama.com/api'

// ---------------------------------------------------------------------------
// Cost tracking — Ollama Cloud pricing unknown; cost tracking disabled
// ---------------------------------------------------------------------------

export const MODEL_COSTS = {}

export function calcCost() {
  return 0
}

// ---------------------------------------------------------------------------
// RAG: tool definition for Agentic RAG (OpenAI function-calling format)
// ---------------------------------------------------------------------------

export function isRagEnabled() {
  return !!(process.env.OLLAMA_API_KEY && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export const PORTFOLIO_TOOL = {
  type: 'function',
  function: {
    name: 'search_portfolio',
    description: "Search your own published case studies for project details. You wrote these articles — they are YOUR words about YOUR projects. The system prompt only has brief summaries; this tool has the FULL content you authored: architectures, sub-agents, workflows, Airtable structures, metrics, technical decisions, pipeline details, code patterns, and lessons learned. Use this whenever the user asks for specifics about any project. Remember: speak from this content as your own experience, never cite it as an external source.",
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant portfolio content',
        },
      },
      required: ['query'],
    },
  },
}

// ---------------------------------------------------------------------------
// RAG: embed query via Ollama Cloud embeddings (Edge-compatible)
// ---------------------------------------------------------------------------

export async function embedQuery(query) {
  const t0 = Date.now()
  const response = await fetch(`${OLLAMA_BASE_URL()}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
      input: query,
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.status}`)
  }

  const data = await response.json()
  return {
    embedding: data.data[0].embedding,
    latencyMs: Date.now() - t0,
    totalTokens: data.usage?.total_tokens || 0,
  }
}

// ---------------------------------------------------------------------------
// RAG: hybrid search via Supabase RPC (Edge-compatible)
// ---------------------------------------------------------------------------

export async function searchDocuments(queryText, queryEmbedding) {
  const t0 = Date.now()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000) // 2s timeout (cold start can be slow)

  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/hybrid_search`,
      {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query_text: queryText,
          query_embedding: queryEmbedding,
          match_count: 10,
          semantic_weight: 0.7,
          keyword_weight: 0.3,
        }),
        signal: controller.signal,
      },
    )

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`Supabase search failed: ${response.status}`)
    }

    const chunks = await response.json()
    return {
      chunks,
      latencyMs: Date.now() - t0,
    }
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error('Supabase search timeout (>2s)')
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// RAG: re-rank top-10 → top-5 with Ollama Cloud chat completion
// ---------------------------------------------------------------------------

export async function rerankChunks(query, chunks) {
  if (chunks.length <= 3) return { chunks, latencyMs: 0, rerankedOrder: null, usage: null }

  const t0 = Date.now()
  try {
    const numbered = chunks.slice(0, 10).map((c, i) =>
      `[${i}] ${c.content.slice(0, 200)}`
    ).join('\n')

    const response = await fetch(`${OLLAMA_BASE_URL()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_RERANK_MODEL || 'gpt-oss:120b',
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: `Query: "${query}"\nRank these chunks by relevance. Return ONLY the top 5 IDs as comma-separated numbers (most relevant first):\n${numbered}`,
        }],
      }),
    })

    const data = await response.json()
    const text = data.choices[0]?.message?.content || ''
    const ids = text.match(/\d+/g)?.map(Number).filter(n => n < chunks.length) || []

    const ranked = ids.slice(0, 5).map(i => chunks[i])
    // Fill up to 5 if the model returned fewer
    while (ranked.length < 5 && ranked.length < chunks.length) {
      const next = chunks.find(c => !ranked.includes(c))
      if (next) ranked.push(next)
      else break
    }

    // Diversify: ensure each distinct article has at least one representative
    const diversified = diversifyByArticle(ranked)

    return {
      chunks: diversified, latencyMs: Date.now() - t0, rerankedOrder: ids.slice(0, 5),
      usage: {
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0,
      },
    }
  } catch {
    // Fallback: use original order with diversity
    const diversified = diversifyByArticle(chunks.slice(0, 5))
    return { chunks: diversified, latencyMs: Date.now() - t0, rerankedOrder: null, usage: null }
  }
}

/** Pick up to 5 chunks ensuring every distinct article gets at least 1 slot */
export function diversifyByArticle(ranked) {
  const result = []
  const seenArticles = new Set()

  // Pass 1: first chunk from each distinct article (preserving rank order)
  for (const chunk of ranked) {
    const articleId = chunk.metadata?.article_id
    if (!seenArticles.has(articleId)) {
      seenArticles.add(articleId)
      result.push(chunk)
    }
  }

  // Pass 2: fill remaining slots with best remaining chunks (rank order)
  for (const chunk of ranked) {
    if (result.length >= 5) break
    if (!result.includes(chunk)) {
      result.push(chunk)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// RAG: format chunks for tool_result + extract sources for badges
// ---------------------------------------------------------------------------

export function formatChunksForContext(chunks) {
  return chunks.map((c, i) => {
    const meta = c.metadata || {}
    const source = meta.article_id ? `[From your article: ${meta.article_id}, section: ${meta.section_id}]` : ''
    return `--- Your content ${i + 1} ${source} ---\n${c.content}`
  }).join('\n\n')
}

export function extractSources(chunks) {
  const seenArticles = new Set()
  const sources = []
  for (const c of chunks) {
    const meta = c.metadata || {}
    // One badge per article — keep the highest-ranked section (first occurrence)
    if (seenArticles.has(meta.article_id)) continue
    seenArticles.add(meta.article_id)
    sources.push({
      article_id: meta.article_id,
      section_id: meta.section_id,
      section_anchor: meta.section_anchor || '',
      page_path_en: meta.page_path_en || '',
      page_path_es: meta.page_path_es || '',
      article_slug_en: meta.article_slug_en || '',
      article_slug_es: meta.article_slug_es || '',
    })
  }
  return sources
}

// Keywords that signal the response actually references a given article
export const ARTICLE_KEYWORDS = {
  'n8n-for-pms':          ['n8n', 'nodemation'],
  'jacobo':               ['jacobo', 'ai agent', 'whatsapp', 'multi-agent', 'multiagent'],
  'business-os':          ['business os', 'erp', 'airtable bases', 'crm', 'inventory'],
  'programmatic-seo':     ['programmatic seo', 'decision engine', 'indexable', 'dataforseo', 'seo pipeline', 'automated seo'],
  'self-healing-chatbot': ['chatbot', 'this chat', 'evals', 'self-healing', 'closed-loop', 'rag'],
  'revalgo':              ['revalgo', 'revalgo platform'],
  'markovate':            ['markovate'],
}

/** Filter RAG sources to only articles actually mentioned in the response, max 3 */
export function filterSourcesByResponse(sources, responseText) {
  if (!responseText || sources.length === 0) return sources
  const lower = responseText.toLowerCase()
  return sources.filter(s => {
    const keywords = ARTICLE_KEYWORDS[s.article_id]
    if (!keywords) return true // unknown article — keep it
    return keywords.some(kw => lower.includes(kw))
  }).slice(0, 3)
}

// Static article routes — used to generate badges from keywords regardless of RAG
export const ARTICLE_ROUTES = {
  'n8n-for-pms':          { page_path_en: '/n8n-for-pms', page_path_es: '/n8n-for-pms' },
  'jacobo':               { page_path_en: '/ai-agent-jacobo', page_path_es: '/ai-agent-jacobo' },
  'business-os':          { page_path_en: '/business-os-for-airtable', page_path_es: '/business-os-for-airtable' },
  'programmatic-seo':     { page_path_en: '/programmatic-seo', page_path_es: '/programmatic-seo' },
  'self-healing-chatbot': { page_path_en: '/self-healing-chatbot', page_path_es: '/self-healing-chatbot' },
  'revalgo':              { page_path_en: '/revalgo', page_path_es: '/revalgo' },
  'markovate':            { page_path_en: '/markovate', page_path_es: '/markovate' },
}

// Home fallback
export const HOME_SOURCE = {
  article_id: 'home',
  section_id: 'portfolio',
  section_anchor: '',
  page_path_en: '/en',
  page_path_es: '/',
  article_slug_en: 'en',
  article_slug_es: '',
}

/** Detect articles mentioned in response text and generate source badges */
export function detectMentionedArticles(responseText) {
  if (!responseText) return []
  const lower = responseText.toLowerCase()
  const sources = []
  for (const [articleId, keywords] of Object.entries(ARTICLE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      const routes = ARTICLE_ROUTES[articleId]
      if (routes) {
        sources.push({
          article_id: articleId,
          section_id: 'main',
          section_anchor: '',
          page_path_es: routes.page_path_es,
          page_path_en: routes.page_path_en,
          article_slug_es: routes.page_path_es.slice(1),
          article_slug_en: routes.page_path_en.slice(1),
        })
      }
    }
  }
  return sources.slice(0, 3)
}

// ---------------------------------------------------------------------------
// RAG: full agentic search pipeline
// ---------------------------------------------------------------------------

export async function searchPortfolio(query) {
  const result = {
    chunks: null,
    sources: [],
    degraded: false,
    degradedReason: null,
    metrics: { embeddingMs: 0, retrievalMs: 0, rerankMs: 0 },
    usage: { embeddingTokens: 0, rerankInputTokens: 0, rerankOutputTokens: 0 },
  }

  // 1. Embed
  let embedding
  try {
    const embResult = await embedQuery(query)
    embedding = embResult.embedding
    result.metrics.embeddingMs = embResult.latencyMs
    result.usage.embeddingTokens = embResult.totalTokens
  } catch {
    result.degraded = true
    result.degradedReason = 'embedding_fail'
    return result
  }

  // 2. Retrieve
  try {
    const searchResult = await searchDocuments(query, embedding)
    result.metrics.retrievalMs = searchResult.latencyMs

    if (!searchResult.chunks.length) {
      result.degradedReason = 'no_match'
      return result
    }

    // Filter out low-similarity chunks before reranking
    const filteredChunks = searchResult.chunks.filter(c => (c.similarity || 0) >= 0.3)
    if (!filteredChunks.length) {
      result.degradedReason = 'no_match'
      return result
    }

    // 3. Re-rank
    const rerankResult = await rerankChunks(query, filteredChunks)
    result.metrics.rerankMs = rerankResult.latencyMs
    if (rerankResult.usage) {
      result.usage.rerankInputTokens = rerankResult.usage.input_tokens
      result.usage.rerankOutputTokens = rerankResult.usage.output_tokens
    }

    result.chunks = rerankResult.chunks
    result.sources = extractSources(rerankResult.chunks)
  } catch (err) {
    result.degraded = true
    result.degradedReason = err.message.includes('timeout') ? 'retrieval_timeout' : 'retrieval_fail'
  }

  return result
}

// ---------------------------------------------------------------------------
// Intent classification (keyword-based, no extra LLM cost)
// ---------------------------------------------------------------------------

export function classifyIntent(text) {
  const lower = text.toLowerCase()
  const tags = []

  const jailbreakPatterns = [
    'ignore previous', 'pretend', 'roleplay', 'act as', 'you are now',
    'forget', 'disregard', 'bypass', 'override', 'jailbreak',
    'dan', 'developer mode', 'evil', 'malicious', 'hacking',
    'system prompt', 'your prompt', 'instructions',
    'reset your', 'reveal your', 'show me your rules',
    'your objective', 'your orders', 'your rules',
    'what are your instructions', 'rules configured',
    'print all', 'print everything', 'yaml', 'json record',
    'dump', 'export', 'serialize', 'reproduce', 'output all',
    'all of the above', 'everything above',
    'repeat everything', 'write all above', 'copy all',
    'show me everything', 'print everything above',
  ]
  if (jailbreakPatterns.some(p => lower.includes(p))) {
    tags.push('jailbreak-attempt')
  }

  if (/experience|work|career|ayaz|revalgo|markovate/.test(lower)) tags.push('topic:experience')
  if (/project|portfolio|github|code/.test(lower)) tags.push('topic:projects')
  if (/contact|email|linkedin|talk|hire/.test(lower)) tags.push('topic:contact')
  if (/stack|tech|python|react|airtable|claude|ai|llm|agent/.test(lower)) tags.push('topic:technical')
  if (/salary|money|rate|compensation/.test(lower)) tags.push('topic:compensation')
  if (/hello|hi|hey|good/.test(lower) && text.length < 20) tags.push('greeting')

  return tags.length > 0 ? tags : ['topic:general']
}

// ---------------------------------------------------------------------------
// Prompt leak detection
// ---------------------------------------------------------------------------

export const PROMPT_FINGERPRINTS = [
  'maximum 150 words', '150 words', 'word limit',
  'no lists', 'clever redirect', 'NEVER reveal',
  'anti-extraction', 'critical instructions', 'cache_control',
  'never_exceed', 'token_budget',
]

export const LEAK_RESPONSE = 'That information is part of my internal design. The source code is public on GitHub if you\'re interested in the architecture.'

export function containsFingerprint(text) {
  const lower = text.toLowerCase()
  return PROMPT_FINGERPRINTS.some(fp => lower.includes(fp.toLowerCase()))
}