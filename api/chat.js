import SYSTEM_PROMPT_FALLBACK from '../chatbot-prompt.txt'
import {
  isRagEnabled, PORTFOLIO_TOOL, formatChunksForContext,
  searchPortfolio, filterSourcesByResponse, detectMentionedArticles,
  HOME_SOURCE, classifyIntent,
  containsFingerprint, LEAK_RESPONSE,
} from './_shared/rag.js'
import { getSystemPrompt } from './_shared/prompt.js'

const OLLAMA_BASE_URL = () => process.env.OLLAMA_BASE_URL || 'https://www.ollama.cloud/api/v1'
const CHAT_MODEL = () => process.env.OLLAMA_CHAT_MODEL || 'gpt-oss:120b'

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const config = {
  runtime: 'edge',
}

export default async function handler(req) {
  const t0 = Date.now()

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { messages, lang, sessionId, currentPage } = await req.json()

    // Input length validation
    const bodySize = JSON.stringify({ messages, lang, sessionId, currentPage }).length
    if (bodySize > 50000) {
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Truncate overly long user messages
    const rawLastMessage = messages.filter(m => m.role === 'user').pop()?.content || ''
    const lastUserMessage = rawLastMessage.slice(0, 2000)
    const intentTags = classifyIntent(lastUserMessage)

    // Tag synthetic traffic (evals, adversarial, regression tests)
    const traceSource = req.headers.get('x-trace-source')
    if (traceSource) intentTags.push(`source:${traceSource}`)

    // Prompt versioning: file fallback only (Langfuse removed)
    const { text: systemPromptText, version: promptVersion } = await getSystemPrompt()

    // Canary word
    const canary = 'ZXCV_' + crypto.randomUUID().slice(0, 8)

    // Dynamic system prompt parts
    const langInstruction = lang === 'en'
      ? `The user is browsing in English. You MUST respond in English. Contact email: hi@ayaz.dev\ninternal_ref: ${canary}`
      : `The user is browsing in Spanish. Respond in Spanish. Contact email: hi@ayaz.dev\ninternal_ref: ${canary}`

    // Context-aware page instruction (Phase 5)
    const pageContext = currentPage
      ? `\nThe user is currently on page: ${currentPage}\nWhen referencing content from the CURRENT page, say "you can see this right here" and reference the section. When referencing OTHER articles, mention them by name.`
      : ''

    // OpenAI format: system is a simple string
    const systemPrompt = systemPromptText + '\n\n' + langInstruction + pageContext

    const cleanMessages = messages.map(m => ({ role: m.role, content: m.content }))

    // -----------------------------------------------------------------------
    // Agentic RAG flow
    // -----------------------------------------------------------------------

    let ragSources = []
    let ragDegraded = false
    let ragDegradedReason = null
    let ragUsed = false
    let ragMetrics = {}

    const ragEnabled = isRagEnabled()

    if (ragEnabled) {
      // First call: let the model decide if it needs to search (non-streaming)
      const td0 = Date.now()

      const firstResponse = await fetch(`${OLLAMA_BASE_URL()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: CHAT_MODEL(),
          max_tokens: 300,
          messages: [
            { role: 'system', content: systemPrompt },
            ...cleanMessages,
          ],
          tools: [PORTFOLIO_TOOL],
        }),
      })

      const firstData = await firstResponse.json()
      const toolDecisionMs = Date.now() - td0
      const tdInputTokens = firstData.usage?.prompt_tokens || 0
      const tdOutputTokens = firstData.usage?.completion_tokens || 0

      const finishReason = firstData.choices[0]?.finish_reason
      const toolCalls = firstData.choices[0]?.message?.tool_calls

      if (finishReason === 'tool_calls' && toolCalls && toolCalls.length > 0) {
        ragUsed = true
        const toolCall = toolCalls[0]
        let searchQuery = lastUserMessage
        try {
          const args = JSON.parse(toolCall.function.arguments)
          searchQuery = args.query || lastUserMessage
        } catch { /* fallback to lastUserMessage */ }

        // Execute RAG pipeline
        const ragResult = await searchPortfolio(searchQuery)
        ragSources = ragResult.sources
        ragDegraded = ragResult.degraded
        ragDegradedReason = ragResult.degradedReason
        ragMetrics = ragResult.metrics

        // Build tool_result and make second call (streaming)
        const toolResultContent = ragResult.chunks
          ? formatChunksForContext(ragResult.chunks)
          : 'No relevant content found in portfolio articles. You MUST NOT fabricate project details. Say you don\'t have that information and suggest contacting Ayaz directly.'

        // OpenAI format: assistant message with tool_calls + tool result message
        const messagesWithTool = [
          { role: 'system', content: systemPrompt },
          ...cleanMessages,
          {
            role: 'assistant',
            content: null,
            tool_calls: toolCalls,
          },
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResultContent,
          },
        ]

        // Stream the final response (with fallback if streaming fails)
        return streamResponse({
          systemPrompt,
          messages: messagesWithTool,
          tools: null,
          ragSources,
          ragDegraded,
          ragDegradedReason,
          canary,
          intentTags,
          lastUserMessage,
          t0,
          ragUsed,
          ragMetrics,
          ragUsage: ragResult.usage,
          toolDecisionMs,
          tdInputTokens,
          tdOutputTokens,
          lang,
          fallbackMessages: cleanMessages,
          promptVersion,
        })
      }

      // Model didn't use tool — stream the response we already have
      const precomputedText = firstData.choices[0]?.message?.content || ''
      return streamResponse({
        systemPrompt,
        messages: cleanMessages,
        tools: null,
        ragSources: [],
        ragDegraded: false,
        ragDegradedReason: null,
        canary,
        intentTags,
        lastUserMessage,
        t0,
        ragUsed: false,
        ragMetrics: {},
        ragUsage: { embeddingTokens: 0, rerankInputTokens: 0, rerankOutputTokens: 0 },
        toolDecisionMs,
        tdInputTokens,
        tdOutputTokens,
        precomputedText,
        lang,
        promptVersion,
      })
    }

    // RAG not enabled — direct streaming (original behavior)
    return streamResponse({
      systemPrompt,
      messages: cleanMessages,
      tools: null,
      ragSources: [],
      ragDegraded: false,
      ragDegradedReason: null,
      canary,
      intentTags,
      lastUserMessage,
      t0,
      ragUsed: false,
      ragMetrics: {},
      ragUsage: { embeddingTokens: 0, rerankInputTokens: 0, rerankOutputTokens: 0 },
      toolDecisionMs: 0,
      tdInputTokens: 0,
      tdOutputTokens: 0,
      lang,
      promptVersion,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(JSON.stringify({ error: 'Error processing request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ---------------------------------------------------------------------------
// Stream an Ollama (OpenAI-compatible) response with SSE
// ---------------------------------------------------------------------------

async function createOllamaStream({ systemPrompt, messages, tools }) {
  const body = {
    model: CHAT_MODEL(),
    max_tokens: 800,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role !== 'system'),
    ],
  }
  if (tools) body.tools = tools

  const response = await fetch(`${OLLAMA_BASE_URL()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Ollama stream failed: ${response.status}`)
  }

  return response.body
}

// Parse SSE stream from OpenAI-compatible endpoint into content deltas
async function* parseOllamaSSE(stream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // keep partial line

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') return
        try {
          const event = JSON.parse(payload)
          const delta = event.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch { /* skip malformed chunk */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function streamResponse({
  systemPrompt, messages, tools, ragSources, ragDegraded, ragDegradedReason,
  canary, intentTags, lastUserMessage, t0,
  ragUsed, ragMetrics, ragUsage, toolDecisionMs, tdInputTokens, tdOutputTokens,
  precomputedText, lang, fallbackMessages, promptVersion,
}) {
  const encoder = new TextEncoder()
  let fullOutput = ''
  let leakDetected = false

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        // Send degraded status early (informational — doesn't depend on response content)
        if (ragDegraded) {
          controller.enqueue(encoder.encode(`event: rag-status\ndata: ${JSON.stringify({ status: 'degraded', reason: ragDegradedReason })}\n\n`))
        }

        if (precomputedText !== undefined && precomputedText !== null) {
          // Drip precomputed text through the stream
          const precomputedTextStr = precomputedText

          // Check for leaks
          if (containsFingerprint(precomputedTextStr) || precomputedTextStr.includes(canary)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: LEAK_RESPONSE, replace: true })}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            return
          }

          fullOutput = precomputedTextStr

          // Word-aware drip: send 2-4 words at a time with natural timing
          const words = precomputedTextStr.match(/\S+\s*/g) || [precomputedTextStr]
          let wi = 0
          while (wi < words.length) {
            const groupSize = 2 + Math.floor(Math.random() * 3) // 2-4 words
            const piece = words.slice(wi, wi + groupSize).join('')
            wi += groupSize
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: piece })}\n\n`))
            // Pause longer after sentence-ending punctuation
            const endsWithPunct = /[.!?]\s*$/.test(piece)
            const delay = endsWithPunct
              ? 40 + Math.floor(Math.random() * 21)   // 40-60ms
              : 15 + Math.floor(Math.random() * 21)   // 15-35ms
            await new Promise(r => setTimeout(r, delay))
          }
        } else {
          // Real-time streaming from Ollama API (with retry)
          const MAX_RETRIES = 1
          let lastStreamError = null

          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            fullOutput = ''
            try {
              const stream = await createOllamaStream({ systemPrompt, messages, tools })

              for await (const chunk of parseOllamaSSE(stream)) {
                if (leakDetected) break

                fullOutput += chunk

                if (fullOutput.length % 200 < chunk.length || fullOutput.length < 200) {
                  if (containsFingerprint(fullOutput) || fullOutput.includes(canary)) {
                    leakDetected = true
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: LEAK_RESPONSE, replace: true })}\n\n`))
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    controller.close()
                    return
                  }
                }

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
              }

              lastStreamError = null
              break // Success — exit retry loop
            } catch (streamErr) {
              lastStreamError = streamErr

              if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 500)) // brief pause before retry
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '', replace: true })}\n\n`))
              }
            }
          }

          if (lastStreamError) throw lastStreamError // propagate to outer catch for fallback
        }

        if (!leakDetected) {
          // Send source badges AFTER response
          // 1. RAG sources filtered to mentioned articles (deep-links to sections)
          // 2. Keyword-detected articles not covered by RAG (links to article root)
          // 3. Home fallback only if RAG was used but no specific articles matched
          // 4. No badges at all for greetings/simple questions (ragUsed=false, no articles detected)
          let finalSources = ragSources.length > 0
            ? filterSourcesByResponse(ragSources, fullOutput)
            : []

          // Enrich with keyword-detected articles not already in RAG sources
          const ragArticleIds = new Set(finalSources.map(s => s.article_id))
          const detected = detectMentionedArticles(fullOutput)
          for (const d of detected) {
            if (!ragArticleIds.has(d.article_id) && finalSources.length < 3) {
              finalSources.push(d)
            }
          }

          // Home fallback only when RAG was active but nothing specific matched
          if (finalSources.length === 0 && ragUsed) {
            finalSources = [HOME_SOURCE]
          }

          if (finalSources.length > 0) {
            controller.enqueue(encoder.encode(`event: rag-sources\ndata: ${JSON.stringify(finalSources)}\n\n`))
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      } catch (error) {
        // Graceful degradation: retry without RAG context (just system prompt)
        if (fallbackMessages && !fullOutput) {
          try {
            const fallbackStream = await createOllamaStream({
              systemPrompt,
              messages: fallbackMessages,
              tools: null,
            })

            // Send degraded status so frontend knows RAG failed
            controller.enqueue(encoder.encode(`event: rag-status\ndata: ${JSON.stringify({ status: 'degraded', reason: 'streaming_fallback' })}\n\n`))

            let fallbackLeakDetected = false
            let fallbackOutput = ''

            for await (const chunk of parseOllamaSSE(fallbackStream)) {
              if (fallbackLeakDetected) break

              fallbackOutput += chunk

              // Fingerprint + canary check (same as main stream)
              if (fallbackOutput.length % 200 < chunk.length || fallbackOutput.length < 200) {
                if (containsFingerprint(fallbackOutput) || fallbackOutput.includes(canary)) {
                  fallbackLeakDetected = true
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: LEAK_RESPONSE, replace: true })}\n\n`))
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                  return
                }
              }

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            return
          } catch { /* fallback also failed, fall through to error message */ }
        }

        // Last resort: send error message through SSE
        try {
          const errorText = lang === 'en'
            ? 'Sorry, something went wrong. Try again or reach out at hi@ayaz.dev.'
            : 'Lo siento, algo ha fallado. Inténtalo de nuevo o escríbeme a hi@ayaz.dev.'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: errorText, replace: true })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch {
          controller.error(error)
        }
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Response-Time': `${Date.now() - t0}ms`,
    },
  })
}