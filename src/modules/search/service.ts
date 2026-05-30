import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCache, setCache } from '../../utils/cache';
import { vectorSearch } from './repository';
import { formatPropertyResponse } from '../properties/service';
import {
  finalizeParsedFilters,
  hasStructuredFilters,
  relaxFilters,
  type ParsedFilters,
} from './filters';
import {
  buildQueryParserUserPrompt,
  QUERY_PARSER_SYSTEM_PROMPT,
} from './queryParser.prompt';
import {
  mergeParsedFilters,
  parseQueryLocally,
  sanitizeParsedFilters,
} from './queryParser';

// BAAI/bge-small-en-v1.5 has a dimension of 384
const EMBEDDING_DIMENSION = 384;

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
 * Parses search queries with Gemini; falls back to the local rule-based parser.
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

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${QUERY_PARSER_SYSTEM_PROMPT}\n\n${buildQueryParserUserPrompt(query)}`,
            },
          ],
        },
      ],
    });

    const text = result.response.text();
    const gemini = sanitizeParsedFilters(JSON.parse(text || '{}') as Partial<ParsedFilters>, query);
    return mergeParsedFilters(gemini, local, query);
  } catch (err) {
    if (isGeminiQuotaError(err)) {
      console.warn('⚠ Gemini quota exceeded. Using local query parser for this request.');
    } else {
      console.warn('⚠ Gemini query parse failed. Using local query parser.');
    }
    return local;
  }
}

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

export async function searchProperties(query: string, page = 1, limit = 12) {
  const cacheKey = `search:${query.trim().toLowerCase()}:${page}:${limit}`;

  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`⚡ Search cache hit for key: ${cacheKey}`);
    return cached;
  }

  const filters = finalizeParsedFilters(query, await parseQuery(query));

  const embedding = await createEmbedding(query);

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
      const vectorOnly = await vectorSearch(
        embedding,
        {
          location: null,
          bedrooms: null,
          minPrice: null,
          maxPrice: null,
          amenities: [],
          propertyType: null,
          keywords: filters.keywords,
          confidence: filters.confidence,
        },
        skip,
        limit,
      );
      if (vectorOnly.total > 0) {
        ({ results, total } = vectorOnly);
        appliedFilters = {
          location: null,
          bedrooms: null,
          minPrice: null,
          maxPrice: null,
          amenities: [],
          propertyType: null,
          keywords: filters.keywords,
          confidence: filters.confidence,
        };
      }
    }
  }

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

  await setCache(cacheKey, responsePayload, 3600);

  return responsePayload;
}
