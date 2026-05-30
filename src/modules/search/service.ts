import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCache, setCache } from '../../utils/cache';
import { vectorSearch } from './repository';
import { formatPropertyResponse } from '../properties/service';
import {
  hasStructuredFilters,
  mergeParsedFilters,
  normalizeParsedFilters,
  parseQueryLocally,
  relaxFilters,
  type ParsedFilters,
} from './filters';

// BAAI/bge-small-en-v1.5 has a dimension of 384
const EMBEDDING_DIMENSION = 384;

// Lazily initialized Gemini Client to avoid errors if API key is not yet set at startup
let genAI: GoogleGenerativeAI | null = null;
function getGeminiClient(apiKey: string): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function isGeminiQuotaError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  return status === 429 || /quota|rate.?limit|too many requests/i.test(message);
}

/**
 * Parses search queries: Gemini when available, local rules as fallback.
 */
export async function parseQuery(query: string): Promise<ParsedFilters> {
  const local = parseQueryLocally(query);
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.warn('⚠ GEMINI_API_KEY is not configured. Using local query parser.');
    return local;
  }

  try {
    const ai = getGeminiClient(apiKey);
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Analyze the user query for house rental search in Addis Ababa and output a JSON object.

JSON Schema:
{
  "location": string | null (neighborhood or subcity name only, e.g. "Bole", "Kazanchis", "Piassa"),
  "maxPrice": number | null (monthly rent ceiling in ETB; use for "cheap", "affordable", "under X", budget limits),
  "minPrice": number | null (monthly rent floor in ETB; use for "luxury", "premium", "above X"),
  "bedrooms": number | null (minimum bedroom count if mentioned),
  "bathrooms": number | null (minimum bathroom count if mentioned),
  "amenities": string[] (explicit amenities only, e.g. ["wifi", "gym", "parking", "elevator"]),
  "style": string | null (descriptive vibe words only for UI display, e.g. "modern", "spacious"; do NOT put price words like "cheap" here)
}

Rules:
- Put price intent in maxPrice/minPrice, not in style.
- "cheap" or "affordable" without a number → set maxPrice to a reasonable ETB ceiling (e.g. 35000–45000).
- Return ONLY valid JSON, no markdown.

User query: "${query}"`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const gemini = JSON.parse(text || '{}') as ParsedFilters;
    return mergeParsedFilters(gemini, local);
  } catch (err) {
    if (isGeminiQuotaError(err)) {
      console.warn('⚠ Gemini quota exceeded. Using local query parser for this request.');
    } else {
      console.warn('⚠ Gemini query parse failed. Using local query parser.', err);
    }
    return local;
  }
}


/**
 * Calls the local embedding service python container to create the 1024-dim BGE vector.
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const url = process.env.EMBEDDING_URL || 'http://localhost:8000';
  try {
    const response = await fetch(`${url}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Embedding service responded with status ${response.status}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    if (!data.embedding || data.embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(`Invalid embedding returned: expected dimension ${EMBEDDING_DIMENSION}`);
    }

    return data.embedding;
  } catch (err) {
    console.error('Error generating vector embedding:', err);
    throw err;
  }
}

/**
 * Executes a semantic vector search combined with structured SQL filters, using Redis caching.
 */
export async function searchProperties(query: string, page = 1, limit = 12) {
  const cacheKey = `search:${query.trim().toLowerCase()}:${page}:${limit}`;

  // 1. Check Redis Cache
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`⚡ Search cache hit for key: ${cacheKey}`);
    return cached;
  }

  // 2. Parse text query using Gemini AI (Query understanding)
  const rawFilters = await parseQuery(query);
  const filters = normalizeParsedFilters(query, rawFilters);

  // 3. Generate BGE text embedding (Vectorization)
  const embedding = await createEmbedding(query);

  // 4. Run vector + SQL hybrid search; fall back if structured filters are too strict
  const skip = (page - 1) * limit;
  let { results, total } = await vectorSearch(embedding, filters, skip, limit);
  let appliedFilters = filters;

  if (total === 0 && hasStructuredFilters(filters)) {
    const relaxed = relaxFilters(filters);
    const relaxedResult = await vectorSearch(embedding, relaxed, skip, limit);
    if (relaxedResult.total > 0) {
      ({ results, total } = relaxedResult);
      appliedFilters = relaxed;
    } else {
      const vectorOnly = await vectorSearch(embedding, {}, skip, limit);
      if (vectorOnly.total > 0) {
        ({ results, total } = vectorOnly);
        appliedFilters = {};
      }
    }
  }

  // 5. Structure and format standard property objects
  const formattedProperties = results.map((row) => {
    const property = {
      ...row,
      owner: row.owner_id
        ? {
            id: row.owner_id,
            first_name: row.owner_first_name || '',
            last_name: row.owner_last_name || '',
            email: row.owner_email || '',
          }
        : null,
    };
    return {
      ...formatPropertyResponse(property),
      similarity: Number(row.similarity?.toFixed(4) ?? 0),
    };
  });

  const responsePayload = {
    properties: formattedProperties,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: appliedFilters,
    },
  };

  // 6. Cache the output in Redis for 1 hour (3600 seconds)
  await setCache(cacheKey, responsePayload, 3600);

  return responsePayload;
}
