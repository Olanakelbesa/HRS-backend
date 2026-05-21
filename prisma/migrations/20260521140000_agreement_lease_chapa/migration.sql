-- Agreement lease + Chapa payment migration

-- New agreement status enum (user-facing lifecycle)
CREATE TYPE "AgreementStatus_new" AS ENUM (
  'draft',
  'sent',
  'payment_pending',
  'completed',
  'rejected',
  'cancelled',
  'terminated',
  'expired'
);

ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "termsSnapshot" JSONB;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "depositOriginal" JSONB;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "depositAmountEtb" DOUBLE PRECISION;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "fxRate" DOUBLE PRECISION;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "fxRateAt" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "ownerMessage" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "renterRespondedAt" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "offerExpiresAt" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

ALTER TABLE "Agreement"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Agreement"
  ALTER COLUMN "status" TYPE "AgreementStatus_new"
  USING (
    CASE "status"::text
      WHEN 'active' THEN 'completed'
      WHEN 'pending_renter' THEN 'sent'
      WHEN 'pending_owner' THEN 'draft'
      ELSE 'draft'
    END::"AgreementStatus_new"
  );

DROP TYPE "AgreementStatus";
ALTER TYPE "AgreementStatus_new" RENAME TO "AgreementStatus";
ALTER TABLE "Agreement" ALTER COLUMN "status" SET DEFAULT 'draft';

ALTER TABLE "Agreement" DROP COLUMN IF EXISTS "paymentStatus";

CREATE INDEX IF NOT EXISTS "Agreement_status_idx" ON "Agreement"("status");
CREATE INDEX IF NOT EXISTS "Agreement_offerExpiresAt_idx" ON "Agreement"("offerExpiresAt");

ALTER TABLE "Agreement"
  ADD CONSTRAINT "Agreement_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payment gateway enums
CREATE TYPE "PaymentPurpose" AS ENUM ('security_deposit', 'monthly_rent');
CREATE TYPE "PaymentProvider" AS ENUM ('chapa', 'manual');
CREATE TYPE "GatewayPaymentStatus" AS ENUM ('pending', 'processing', 'success', 'failed', 'expired');

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "purpose" "PaymentPurpose" NOT NULL DEFAULT 'security_deposit';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "provider" "PaymentProvider" NOT NULL DEFAULT 'chapa';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "amountEtb" DOUBLE PRECISION;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "originalAmount" DOUBLE PRECISION;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "originalCurrency" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "chapaTxRef" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "chapaRefId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

UPDATE "Payment" SET "amountEtb" = "amount" WHERE "amountEtb" IS NULL;
UPDATE "Payment" SET "chapaTxRef" = "stripeId" WHERE "chapaTxRef" IS NULL AND "stripeId" IS NOT NULL;

ALTER TABLE "Payment" DROP COLUMN IF EXISTS "stripeId";

ALTER TABLE "Payment" ADD COLUMN "status_new" "GatewayPaymentStatus";

UPDATE "Payment" SET "status_new" = CASE
  WHEN "status"::text = 'confirmed' THEN 'success'::"GatewayPaymentStatus"
  WHEN "status"::text = 'proof_uploaded' THEN 'processing'::"GatewayPaymentStatus"
  ELSE 'pending'::"GatewayPaymentStatus"
END;

ALTER TABLE "Payment" DROP COLUMN "status";
DROP TYPE "PaymentStatus";
ALTER TABLE "Payment" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_chapaTxRef_key" ON "Payment"("chapaTxRef");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Payment_purpose_idx" ON "Payment"("purpose");
