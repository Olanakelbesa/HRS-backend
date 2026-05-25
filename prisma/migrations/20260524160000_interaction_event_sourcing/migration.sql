-- Interaction event sourcing: replace UserInteraction with UserInteractionEvent + UserPropertyState

CREATE TYPE "InteractionSource" AS ENUM (
  'SEARCH_RESULTS',
  'SEARCH_RESULTS_CARD',
  'RECOMMENDATIONS',
  'RECOMMENDATIONS_CARD',
  'SIMILAR_PROPERTIES',
  'SIMILAR_PROPERTIES_CARD',
  'DIRECT_LINK',
  'CATEGORY_BROWSE',
  'LOCATION_BROWSE',
  'OWNER_PROFILE',
  'PROPERTY_DETAIL_PAGE',
  'SAVED_PROPERTIES_PAGE'
);

CREATE TYPE "InteractionType_new" AS ENUM (
  'VIEW',
  'LIKE_ADDED',
  'LIKE_REMOVED',
  'SAVE_ADDED',
  'SAVE_REMOVED',
  'CONTACT',
  'SHARE',
  'SCHEDULE'
);

CREATE TABLE "UserInteractionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "InteractionType_new" NOT NULL,
    "source" "InteractionSource",
    "sessionId" TEXT,
    "viewDuration" INTEGER,
    "imagesViewed" INTEGER,
    "metadata" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInteractionEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPropertyState" (
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "isLiked" BOOLEAN NOT NULL DEFAULT false,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "lastLikeEventId" TEXT,
    "lastSaveEventId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPropertyState_pkey" PRIMARY KEY ("userId","propertyId")
);

CREATE UNIQUE INDEX "UserInteractionEvent_userId_propertyId_type_idempotencyKey_key"
  ON "UserInteractionEvent"("userId", "propertyId", "type", "idempotencyKey");

CREATE INDEX "UserInteractionEvent_userId_createdAt_idx"
  ON "UserInteractionEvent"("userId", "createdAt");

CREATE INDEX "UserInteractionEvent_propertyId_createdAt_idx"
  ON "UserInteractionEvent"("propertyId", "createdAt");

CREATE INDEX "UserInteractionEvent_userId_propertyId_createdAt_idx"
  ON "UserInteractionEvent"("userId", "propertyId", "createdAt");

CREATE INDEX "UserInteractionEvent_userId_propertyId_type_createdAt_idx"
  ON "UserInteractionEvent"("userId", "propertyId", "type", "createdAt");

CREATE INDEX "UserInteractionEvent_sessionId_createdAt_idx"
  ON "UserInteractionEvent"("sessionId", "createdAt");

ALTER TABLE "UserInteractionEvent" ADD CONSTRAINT "UserInteractionEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserInteractionEvent" ADD CONSTRAINT "UserInteractionEvent_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPropertyState" ADD CONSTRAINT "UserPropertyState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPropertyState" ADD CONSTRAINT "UserPropertyState_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy UserInteraction rows into events
INSERT INTO "UserInteractionEvent" (
  "id", "userId", "propertyId", "type", "idempotencyKey", "createdAt"
)
SELECT
  ui."id",
  ui."userId",
  ui."propertyId",
  CASE ui."type"::text
    WHEN 'VIEW' THEN 'VIEW'::"InteractionType_new"
    WHEN 'LIKE' THEN 'LIKE_ADDED'::"InteractionType_new"
    WHEN 'SAVE' THEN 'SAVE_ADDED'::"InteractionType_new"
  END,
  'legacy-' || ui."id",
  ui."createdAt"
FROM "UserInteraction" ui;

-- Build projection from migrated like/save events
INSERT INTO "UserPropertyState" ("userId", "propertyId", "isLiked", "isSaved", "updatedAt")
SELECT
  ui."userId",
  ui."propertyId",
  BOOL_OR(ui."type"::text = 'LIKE'),
  BOOL_OR(ui."type"::text = 'SAVE'),
  MAX(ui."createdAt")
FROM "UserInteraction" ui
WHERE ui."type"::text IN ('LIKE', 'SAVE')
GROUP BY ui."userId", ui."propertyId"
ON CONFLICT ("userId", "propertyId") DO NOTHING;

DROP TABLE "UserInteraction";

DROP TYPE "InteractionType";

ALTER TYPE "InteractionType_new" RENAME TO "InteractionType";
