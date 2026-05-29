import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCache, setCache } from '../../utils/cache';
import { vectorSearch } from './repository';
import { formatPropertyResponse } from '../properties/service';

// BAAI/bge-small-en-v1.5 has a dimension of 384
const EMBEDDING_DIMENSION = 384;

/**
 * Interface representing parsed query filters extracted by LLM.
 */
interface ParsedFilters {
  location?: string | null;
  maxPrice?: number | null;
  minPrice?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  amenities?: string[];
  style?: string | null;
}

// Lazily initialized Gemini Client to avoid errors if API key is not yet set at startup
let genAI: GoogleGenerativeAI | null = null;
function getGeminiClient(apiKey: string): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Parses raw text search queries using Gemini AI to extract structured SQL filters.
 * Returns empty object if Gemini API Key is missing or request fails.
 */
export async function parseQuery(query: string): Promise<ParsedFilters> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.warn('⚠ GEMINI_API_KEY is not configured. Falling back to pure vector similarity.');
    return {};
  }

  try {
    const ai = getGeminiClient(apiKey);
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Analyze the user query for house rental search and output a JSON object.

JSON Schema:
{
  "location": string | null (e.g. "Bole", "Kazanchis"),
  "maxPrice": number | null (budget ceiling, numeric),
  "minPrice": number | null (budget floor, numeric),
  "bedrooms": number | null (minimum rooms),
  "bathrooms": number | null (minimum bathrooms),
  "amenities": string[] (array of amenities, e.g. ["wifi", "pool", "gym", "parking"]),
  "style": string | null (design, status, or description keywords, e.g. "modern", "cheap", "luxury", "furnished", "spacious")
}

Return ONLY valid JSON. Do not wrap in markdown or include any explanations. If invalid, return an empty object.

User query: "${query}"`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text || '{}') as ParsedFilters;
  } catch (err) {
    console.error('Error parsing query with Gemini:', err);
    return {};
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
  const filters = await parseQuery(query);

  // 3. Generate BGE text embedding (Vectorization)
  const embedding = await createEmbedding(query);

  // 4. Run Vector + SQL hybrid search in pgvector database
  const skip = (page - 1) * limit;
  const { results, total } = await vectorSearch(embedding, filters, skip, limit);

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
      filters, // Returns parsed query understanding metrics to the frontend
    },
  };

  // 6. Cache the output in Redis for 1 hour (3600 seconds)
  await setCache(cacheKey, responsePayload, 3600);

  return responsePayload;
}
