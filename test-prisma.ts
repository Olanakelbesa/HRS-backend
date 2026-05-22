import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const res = await prisma.agreement.findMany({ select: { id: true, propertyId: true }});
    console.log("Success", res.length);
  } catch (e: any) {
    console.error("ERROR", e.message);
  }
}
main().finally(() => prisma.$disconnect());
