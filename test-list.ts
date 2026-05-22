import { listOwnerAgreements } from './src/modules/agreements/service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst({ where: { role: 'owner' } });
  if (!user) { console.log('no owner'); return; }

  // mock checking verification temporarily for local test if needed, but wait, the user's DB should be connected.
  try {
    console.log('Testing with user', user.id);
    const res = await listOwnerAgreements(user.id, {});
    console.log('SUCCESS', res.items.length);
  } catch (e: any) {
    console.error('ERROR ENCOUNTERED:', e?.message || e);
  }
}

run().finally(() => prisma.$disconnect());
