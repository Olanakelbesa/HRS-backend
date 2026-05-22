import { PrismaClient } from '@prisma/client';
import { agreementListSelect } from './src/lib/prismaSelects';
const prisma = new PrismaClient();
async function main() {
  try {
    const res = await prisma.agreement.findMany({ select: agreementListSelect, skip: NaN, take: 10 });
    console.log("Success NaN skip");
  } catch (e: any) {
    console.error("NaN skip error:", e.name, e.message);
  }

  try {
    const res2 = await prisma.agreement.findMany({ select: agreementListSelect, take: 10 });
    console.log("Success Valid skip", res2.length);
  } catch (e: any) {
    console.error("Valid skip error:", e.name, e.message);
  }
}
main().finally(() => prisma.$disconnect());
