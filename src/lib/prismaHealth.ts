import prisma from '../config/database';

/** Verify DB matches current Prisma schema (post Chapa/GatewayPaymentStatus migration). */
export async function assertDatabaseSchemaReady(): Promise<void> {
  const rows = await prisma.$queryRaw<{ typname: string }[]>`
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname IN ('GatewayPaymentStatus', 'PaymentStatus', 'AgreementStatus')
  `;

  const types = new Set(rows.map((r) => r.typname));

  if (types.has('PaymentStatus')) {
    throw new Error(
      'Database still has legacy PaymentStatus enum. Run: npx prisma migrate deploy'
    );
  }

  if (!types.has('GatewayPaymentStatus')) {
    throw new Error(
      'Database missing GatewayPaymentStatus enum. Run: npx prisma migrate deploy'
    );
  }

  if (!types.has('AgreementStatus')) {
    throw new Error('Database missing AgreementStatus enum. Run: npx prisma migrate deploy');
  }

  const agreementCols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Agreement'
      AND column_name = 'paymentStatus'
  `;

  if (agreementCols.length > 0) {
    throw new Error(
      'Database still has Agreement.paymentStatus column. Run: npx prisma migrate deploy'
    );
  }
}
