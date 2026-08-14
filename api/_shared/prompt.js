import FALLBACK from '../../chatbot-prompt.txt'

export async function getSystemPrompt() {
  return { text: FALLBACK, version: 'file' }
}