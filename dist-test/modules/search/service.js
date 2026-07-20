"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQuery = parseQuery;
exports.createEmbedding = createEmbedding;
exports.searchProperties = searchProperties;
const generative_ai_1 = require("@google/generative-ai");
const cache_1 = require("../../utils/cache");
const repository_1 = require("./repository");
const filters_1 = require("./filters");
const queryParser_prompt_1 = require("./queryParser.prompt");
const queryParser_1 = require("./queryParser");
const currency_1 = require("./currency");
const formatSearchProperty_1 = require("./formatSearchProperty");
const EMBEDDING_DIMENSION = 384;
let genAI = null;
function getGeminiClient(apiKey) {
    if (!genAI) {
        genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    return genAI;
}
function isGeminiQuotaError(err) {
    const status = err?.status;
    const message = err instanceof Error ? err.message : String(err);
    return status === 429 || /quota|rate.?limit|too many requests/i.test(message);
}
function emptyFilters(keywords, confidence, currency) {
    return {
        location: null,
        bedrooms: null,
        minPrice: null,
        maxPrice: null,
        priceCurrency: 'ETB',
        currency,
        amenities: [],
        propertyType: null,
        keywords,
        confidence,
    };
}
async function parseQuery(query, displayCurrency = 'ETB') {
    const local = (0, queryParser_1.parseQueryLocally)(query, displayCurrency);
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
                            text: `${queryParser_prompt_1.QUERY_PARSER_SYSTEM_PROMPT}\n\n${(0, queryParser_prompt_1.buildQueryParserUserPrompt)(query)}`,
                        },
                    ],
                },
            ],
        });
        const text = result.response.text();
        const gemini = (0, queryParser_1.sanitizeParsedFilters)(JSON.parse(text || '{}'), query, displayCurrency);
        return (0, queryParser_1.mergeParsedFilters)(gemini, local, query, displayCurrency);
    }
    catch (err) {
        if (isGeminiQuotaError(err)) {
            console.warn('⚠ Gemini quota exceeded. Using local query parser for this request.');
        }
        else {
            console.warn('⚠ Gemini query parse failed. Using local query parser.');
        }
        return local;
    }
}
async function createEmbedding(text) {
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
        const data = (await response.json());
        if (!data.embedding || data.embedding.length !== EMBEDDING_DIMENSION) {
            throw new Error(`Invalid embedding returned: expected dimension ${EMBEDDING_DIMENSION}`);
        }
        return data.embedding;
    }
    catch (err) {
        console.error('Error generating vector embedding:', err);
        throw err;
    }
}
async function searchProperties(query, page = 1, limit = 12, displayCurrency = 'ETB') {
    const currency = (0, currency_1.normalizeDisplayCurrency)(displayCurrency);
    const cacheKey = `search:${query.trim().toLowerCase()}:${currency}:${page}:${limit}`;
    const cached = await (0, cache_1.getCache)(cacheKey);
    if (cached) {
        console.log(`⚡ Search cache hit for key: ${cacheKey}`);
        return cached;
    }
    const etbPerUsd = await (0, currency_1.getEtbPerUsd)();
    const parsed = await parseQuery(query, currency);
    const filters = (0, filters_1.finalizeParsedFilters)(query, { ...parsed, currency });
    const embedding = await createEmbedding(query);
    const skip = (page - 1) * limit;
    let { results, total } = await (0, repository_1.vectorSearch)(embedding, filters, skip, limit, etbPerUsd);
    let appliedFilters = filters;
    if (total === 0 && (0, filters_1.hasStructuredFilters)(filters)) {
        const relaxed = (0, filters_1.relaxFilters)(filters);
        const relaxedResult = await (0, repository_1.vectorSearch)(embedding, relaxed, skip, limit, etbPerUsd);
        if (relaxedResult.total > 0) {
            ({ results, total } = relaxedResult);
            appliedFilters = relaxed;
        }
        else {
            const vectorOnly = await (0, repository_1.vectorSearch)(embedding, emptyFilters(filters.keywords, filters.confidence, currency), skip, limit, etbPerUsd);
            if (vectorOnly.total > 0) {
                ({ results, total } = vectorOnly);
                appliedFilters = emptyFilters(filters.keywords, filters.confidence, currency);
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
            ...(0, formatSearchProperty_1.formatSearchProperty)(property, etbPerUsd, currency),
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
            fxRate: {
                etbPerUsd,
                base: 'ETB',
            },
        },
    };
    await (0, cache_1.setCache)(cacheKey, responsePayload, 3600);
    return responsePayload;
}
