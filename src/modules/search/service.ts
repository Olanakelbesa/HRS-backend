import { getCache, setCache } from '../../utils/cache';
import { vectorSearch } from './repository';
import { formatPropertyResponse } from '../properties/service';

// BAAI/bge-large-en has a dimension of 1024
const EMBEDDING_DIMENSION = 1024;

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

/**
 * Parses raw text search queries using OpenAI GPT-4o-mini to extract structured SQL filters.
 * Returns empty object if OpenAI API Key is missing or request fails.
 */
export async function parseQuery(query: string): Promise<ParsedFilters> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.warn('⚠ OPENAI_API_KEY is not configured. Falling back to pure vector similarity.');
    return {};
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Analyze the user query for house rental search and output a JSON object containing:
            - location: string or null (e.g. "Bole", "Kazanchis")
            - maxPrice: number or null (budget ceiling, numeric)
            - minPrice: number or null (budget floor, numeric)
            - bedrooms: number or null (minimum rooms)
            - bathrooms: number or null (minimum bathrooms)
            - amenities: string[] (array of amenities, e.g. ["wifi", "pool", "gym", "parking"])
            - style: string or null (design, status, or description keywords, e.g. "modern", "cheap", "luxury", "furnished", "spacious")`,
          },
          { role: 'user', content: query },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
    }

    const result = await response.json() as any;
    const content = result.choices?.[0]?.message?.content;
    return JSON.parse(content || '{}') as ParsedFilters;
  } catch (err) {
    console.error('Error parsing query with OpenAI:', err);
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

  // 2. Parse text query using OpenAI (Query understanding)
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
