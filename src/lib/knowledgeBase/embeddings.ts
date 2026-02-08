/**
 * Embeddings Service
 * Provider: OpenRouter → OpenAI text-embedding-3-small
 * Dimensions: 768
 * OpenAI-compatible API via OpenRouter
 */

export const EMBEDDING_DIMENSIONS = 768;

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/embeddings';
const MODEL = 'openai/text-embedding-3-small';

async function callOpenRouter(input: string | string[], apiKey: string): Promise<EmbeddingResult[]> {
  const response = await fetch(OPENROUTER_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`Embedding error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const sorted = data.data.sort((a: any, b: any) => a.index - b.index);
  const tokensPerItem = Math.floor((data.usage?.total_tokens || 0) / sorted.length);

  return sorted.map((item: any) => ({
    embedding: item.embedding,
    tokens: tokensPerItem,
  }));
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<EmbeddingResult> {
  const results = await callOpenRouter(text, apiKey);
  return results[0];
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<EmbeddingResult[]> {
  const batchSize = 500;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await callOpenRouter(batch, apiKey);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Generate embedding for a search query (same as document embedding for this model)
 */
export async function generateQueryEmbedding(
  text: string,
  apiKey: string
): Promise<EmbeddingResult> {
  const results = await callOpenRouter(text, apiKey);
  return results[0];
}
