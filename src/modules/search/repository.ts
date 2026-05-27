import prisma from '../../config/database';
import { AppError } from '../../core/AppError';

// BAAI/bge-small-en-v1.5 has a dimension of 384
const EMBEDDING_DIMENSION = 384;

/**
 * Initializes pgvector and creates the HNSW expression index.
 * Fallback to IVFFlat if HNSW is not supported by the PG engine.
 */
export async function initVectorSearch() {
  try {
    // 1. Enable pgvector extension
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');

    // 2. Create expression index for efficient cosine similarity calculations
    // We cast the double precision[] column to vector(384) inside the index definition
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS property_embedding_vector_idx
      ON "PropertyEmbedding"
      USING hnsw ((embedding::vector(${EMBEDDING_DIMENSION})) vector_cosine_ops);
    `).catch((err) => {
      console.warn('⚠ HNSW index creation failed, falling back to IVFFlat...', err.message);
      return prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS property_embedding_vector_idx
        ON "PropertyEmbedding"
        USING ivfflat ((embedding::vector(${EMBEDDING_DIMENSION})) vector_cosine_ops)
        WITH (lists = 100);
      `);
    });
    console.log('✅ pgvector extension and indexes verified successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize pgvector database structures:', err);
  }
}

/**
 * Executes a semantic vector search combined with structured SQL filters.
 */
export async function vectorSearch(embedding: number[], filters: any, skip: number, limit: number) {
  // Convert vector to postgres array format: '[0.1, 0.2, ...]'
  const embeddingString = `[${embedding.join(',')}]`;

  let filterSql = '';

  // Apply price filters (JSON price field -> price->'value')
  if (filters.maxPrice != null) {
    filterSql += ` AND (p.price->>'value')::numeric <= ${Number(filters.maxPrice)}`;
  }
  if (filters.minPrice != null) {
    filterSql += ` AND (p.price->>'value')::numeric >= ${Number(filters.minPrice)}`;
  }

  // Bed/Bath filtering
  if (filters.bedrooms != null) {
    filterSql += ` AND p.bedrooms >= ${Number(filters.bedrooms)}`;
  }
  if (filters.bathrooms != null) {
    filterSql += ` AND p.bathrooms >= ${Number(filters.bathrooms)}`;
  }

  // Location/Address matching (case-insensitive ILIKE)
  if (filters.location) {
    const locEscaped = `%${filters.location.replace(/[%_]/g, '\\$&')}%`;
    filterSql += ` AND p.address::text ILIKE '${locEscaped}'`;
  }

  // Style descriptions (modern, luxury, cheap, etc.)
  if (filters.style) {
    const styleEscaped = `%${filters.style.replace(/[%_]/g, '\\$&')}%`;
    filterSql += ` AND (
      p.title::text ILIKE '${styleEscaped}' OR 
      p.description::text ILIKE '${styleEscaped}' OR 
      p.category::text ILIKE '${styleEscaped}'
    )`;
  }

  // Amenities filtering
  if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
    for (const amenity of filters.amenities) {
      const amenityEscaped = `%${amenity.replace(/[%_]/g, '\\$&')}%`;
      filterSql += ` AND p.amenities::text ILIKE '${amenityEscaped}'`;
    }
  }

  // Execute raw query using pgvector operators
  // <=> computes cosine distance, similarity is 1 - distance
  const query = `
    SELECT p.*, 
           u.id AS "owner_id",
           u.first_name AS "owner_first_name",
           u.last_name AS "owner_last_name",
           u.email AS "owner_email",
           1 - (pe.embedding::vector(${EMBEDDING_DIMENSION}) <=> '${embeddingString}'::vector(${EMBEDDING_DIMENSION})) AS similarity
    FROM "Property" p
    JOIN "PropertyEmbedding" pe ON p.id = pe."propertyId"
    LEFT JOIN "User" u ON p."ownerId" = u.id
    WHERE p."isDeleted" = false AND p.status = 'AVAILABLE' ${filterSql}
    ORDER BY pe.embedding::vector(${EMBEDDING_DIMENSION}) <=> '${embeddingString}'::vector(${EMBEDDING_DIMENSION})
    OFFSET ${skip} LIMIT ${limit};
  `;

  const countQuery = `
    SELECT COUNT(*)::integer as total
    FROM "Property" p
    JOIN "PropertyEmbedding" pe ON p.id = pe."propertyId"
    WHERE p."isDeleted" = false AND p.status = 'AVAILABLE' ${filterSql};
  `;

  const [results, countResults] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(query),
    prisma.$queryRawUnsafe<any[]>(countQuery),
  ]);

  const total = countResults[0]?.total ?? 0;

  return { results, total };
}

/**
 * Builds the text representation of a property to create its vector embedding.
 */
function getPropertyTextRepresentation(property: any): string {
  const title = typeof property.title === 'string' ? property.title : (property.title as { en?: string })?.en || '';
  const description = typeof property.description === 'string' ? property.description : (property.description as { en?: string })?.en || '';
  const category = typeof property.category === 'string' ? property.category : (property.category as { en?: string })?.en || '';
  const address = typeof property.address === 'string' ? property.address : (property.address as { en?: string })?.en || '';
  
  let amenitiesStr = '';
  if (Array.isArray(property.amenities)) {
    amenitiesStr = property.amenities
      .map((a: any) => typeof a === 'string' ? a : (a.en || ''))
      .filter(Boolean)
      .join(', ');
  }

  return `Title: ${title}. Category: ${category}. Address: ${address}. Amenities: ${amenitiesStr}. Description: ${description}`;
}

/**
 * Calls the local embedding service python container to create the 1024-dim BGE vector.
 */
async function createEmbedding(text: string): Promise<number[]> {
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
 * Syncs a single property's vector embedding.
 */
export async function syncPropertyEmbedding(propertyId: string) {
  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!property) return;

    const text = getPropertyTextRepresentation(property);
    const vector = await createEmbedding(text);

    await prisma.propertyEmbedding.upsert({
      where: { propertyId },
      update: { embedding: vector },
      create: { propertyId, embedding: vector },
    });

    console.log(`📡 Cosine embedding synced for Property ID: ${propertyId}`);
  } catch (err) {
    console.error(`❌ Failed to sync embedding for Property ID: ${propertyId}`, err);
  }
}

/**
 * Syncs embeddings for all properties currently missing them.
 */
export async function syncAllPropertyEmbeddings() {
  try {
    const properties = await prisma.property.findMany({
      where: {
        isDeleted: false,
        embedding: null,
      },
      select: { id: true },
    });

    if (properties.length === 0) return;

    console.log(`📡 Found ${properties.length} properties missing vector embeddings. Syncing...`);
    for (const property of properties) {
      await syncPropertyEmbedding(property.id);
    }
    console.log('✅ Embedding sync complete.');
  } catch (err) {
    console.error('❌ Failed to bulk sync property embeddings:', err);
  }
}
