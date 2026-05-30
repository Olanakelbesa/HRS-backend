import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMBEDDING_URL = process.env.EMBEDDING_URL || 'http://embedding-service:8000';

// ---------- Embedding call ---------
async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${EMBEDDING_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Embedding failed: ${await res.text()}`);
  }

  const data = await res.json();
  return data.embedding;
}

// ---------- Build text ---------
function buildPropertyText(p: any) {
  return `
Title: ${p.title}
Description: ${p.description}
Location: ${p.location}
Price: ${p.price}
`.trim();
}

// ---------- MAIN RESYNC ---------
export async function resyncAllEmbeddings() {
  const properties = await prisma.property.findMany();

  const result = {
    total: properties.length,
    success: 0,
    failed: 0,
    errors: [] as any[],
  };

  for (const property of properties) {
    try {
      const text = buildPropertyText(property);
      const embedding = await getEmbedding(text);

      await prisma.propertyEmbedding.upsert({
        where: {
          propertyId: property.id,
        },
        update: {
          embedding,
          updatedAt: new Date(),
        },
        create: {
          propertyId: property.id,
          embedding,
        },
      });

      console.log(`📡 Synced: ${property.id}`);
      result.success++;
    } catch (err: any) {
      console.error(`❌ Failed: ${property.id}`, err.message);
      result.failed++;
      result.errors.push({
        propertyId: property.id,
        error: err.message,
      });
    }
  }

  return result;
}
