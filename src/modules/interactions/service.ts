import prisma from '../../config/database';
import {
  InteractionSource,
  InteractionType,
  Prisma,
  UserInteractionEvent,
} from '@prisma/client';
import { InteractionApiError, INTERACTION_SOURCE_VALUES } from './errors';

type MutationInput = {
  propertyId: string;
  source?: InteractionSource;
  sessionId?: string;
  idempotencyKey: string;
  viewDuration?: number;
  imagesViewed?: number;
  metadata?: Record<string, unknown>;
};

function formatEventResponse(event: UserInteractionEvent, metadata?: Record<string, unknown>) {
  const meta = (metadata ?? event.metadata) as Record<string, unknown> | null;
  const base: Record<string, unknown> = {
    interactionId: event.id,
    type: event.type,
    propertyId: event.propertyId,
    userId: event.userId,
    sessionId: event.sessionId,
    source: event.source,
    recordedAt: event.createdAt.toISOString(),
  };

  if (event.type === 'VIEW') {
    base.viewDuration = event.viewDuration;
    base.imagesViewed = event.imagesViewed;
  }

  if (event.type === 'CONTACT' && meta?.contactMethod) {
    base.contactMethod = meta.contactMethod;
  }

  if (event.type === 'SHARE' && meta?.shareMethod) {
    base.shareMethod = meta.shareMethod;
  }

  if (event.type === 'SCHEDULE') {
    if (meta?.scheduledDate) base.scheduledDate = meta.scheduledDate;
    if (meta?.appointmentId) base.appointmentId = meta.appointmentId;
  }

  return base;
}

function formatDuplicateResponse(event: UserInteractionEvent) {
  return {
    interactionId: event.id,
    type: event.type,
    isDuplicate: true,
    originalRecordedAt: event.createdAt.toISOString(),
  };
}

async function ensurePropertyExists(propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, isDeleted: false },
  });
  if (!property) {
    throw new InteractionApiError('PROPERTY_NOT_FOUND', 'Property not found', 404);
  }
}

async function bootstrapProjection(
  tx: Prisma.TransactionClient,
  userId: string,
  propertyId: string
) {
  await tx.$executeRaw`
    INSERT INTO "UserPropertyState" ("userId", "propertyId", "isLiked", "isSaved", "updatedAt")
    VALUES (${userId}, ${propertyId}, false, false, NOW())
    ON CONFLICT ("userId", "propertyId") DO NOTHING
  `;
}

async function findDuplicateEvent(
  userId: string,
  propertyId: string,
  type: InteractionType,
  idempotencyKey: string
) {
  return prisma.userInteractionEvent.findUnique({
    where: {
      userId_propertyId_type_idempotencyKey: {
        userId,
        propertyId,
        type,
        idempotencyKey,
      },
    },
  });
}

async function insertEvent(
  tx: Prisma.TransactionClient,
  userId: string,
  input: MutationInput,
  type: InteractionType
) {
  return tx.userInteractionEvent.create({
    data: {
      userId,
      propertyId: input.propertyId,
      type,
      source: input.source,
      sessionId: input.sessionId,
      viewDuration: input.viewDuration,
      imagesViewed: input.imagesViewed,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      idempotencyKey: input.idempotencyKey,
    },
  });
}

async function recordSimpleEvent(
  userId: string,
  input: MutationInput,
  type: InteractionType,
  successMessage: string
) {
  await ensurePropertyExists(input.propertyId);

  const existing = await findDuplicateEvent(
    userId,
    input.propertyId,
    type,
    input.idempotencyKey
  );
  if (existing) {
    return {
      statusCode: 200,
      body: {
        success: true,
        message: 'Event already recorded',
        data: formatDuplicateResponse(existing),
      },
    };
  }

  const event = await prisma.userInteractionEvent.create({
    data: {
      userId,
      propertyId: input.propertyId,
      type,
      source: input.source,
      sessionId: input.sessionId,
      viewDuration: input.viewDuration,
      imagesViewed: input.imagesViewed,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      idempotencyKey: input.idempotencyKey,
    },
  });

  return {
    statusCode: 201,
    body: {
      success: true,
      message: successMessage,
      data: formatEventResponse(event, input.metadata),
    },
  };
}

async function recordToggleEvent(
  userId: string,
  input: MutationInput,
  options: {
    addType: 'LIKE_ADDED' | 'SAVE_ADDED';
    removeType: 'LIKE_REMOVED' | 'SAVE_REMOVED';
    addMessage: string;
    removeMessage: string;
    alreadyError: InteractionApiError;
    notError: InteractionApiError;
    projectionField: 'isLiked' | 'isSaved';
    lastEventField: 'lastLikeEventId' | 'lastSaveEventId';
    isAdd: boolean;
  }
) {
  await ensurePropertyExists(input.propertyId);

  const eventType = options.isAdd ? options.addType : options.removeType;
  const existing = await findDuplicateEvent(
    userId,
    input.propertyId,
    eventType,
    input.idempotencyKey
  );
  if (existing) {
    return {
      statusCode: 200,
      body: {
        success: true,
        message: 'Event already recorded',
        data: formatDuplicateResponse(existing),
      },
    };
  }

  try {
    const event = await prisma.$transaction(async (tx) => {
      await bootstrapProjection(tx, userId, input.propertyId);

      const created = await insertEvent(tx, userId, input, eventType);

      const where =
        options.projectionField === 'isLiked'
          ? { userId, propertyId: input.propertyId, isLiked: !options.isAdd }
          : { userId, propertyId: input.propertyId, isSaved: !options.isAdd };

      const data =
        options.projectionField === 'isLiked'
          ? {
              isLiked: options.isAdd,
              lastLikeEventId: created.id,
            }
          : {
              isSaved: options.isAdd,
              lastSaveEventId: created.id,
            };

      const updated = await tx.userPropertyState.updateMany({
        where,
        data,
      });

      if (updated.count === 0) {
        throw options.isAdd ? options.alreadyError : options.notError;
      }

      return created;
    });

    return {
      statusCode: 201,
      body: {
        success: true,
        message: options.isAdd ? options.addMessage : options.removeMessage,
        data: formatEventResponse(event, input.metadata),
      },
    };
  } catch (error) {
    if (error instanceof InteractionApiError) {
      throw error;
    }
    throw error;
  }
}

const STATE_EVENT_TYPES: InteractionType[] = [
  'LIKE_ADDED',
  'LIKE_REMOVED',
  'SAVE_ADDED',
  'SAVE_REMOVED',
];

export async function rebuildProjection(userId: string, propertyId: string) {
  const events = await prisma.userInteractionEvent.findMany({
    where: {
      userId,
      propertyId,
      type: { in: STATE_EVENT_TYPES },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  let isLiked = false;
  let isSaved = false;
  let lastLikeEventId: string | null = null;
  let lastSaveEventId: string | null = null;

  for (const event of events) {
    switch (event.type) {
      case 'LIKE_ADDED':
        isLiked = true;
        lastLikeEventId = event.id;
        break;
      case 'LIKE_REMOVED':
        isLiked = false;
        lastLikeEventId = event.id;
        break;
      case 'SAVE_ADDED':
        isSaved = true;
        lastSaveEventId = event.id;
        break;
      case 'SAVE_REMOVED':
        isSaved = false;
        lastSaveEventId = event.id;
        break;
    }
  }

  return prisma.userPropertyState.upsert({
    where: { userId_propertyId: { userId, propertyId } },
    create: {
      userId,
      propertyId,
      isLiked,
      isSaved,
      lastLikeEventId,
      lastSaveEventId,
    },
    update: {
      isLiked,
      isSaved,
      lastLikeEventId,
      lastSaveEventId,
    },
  });
}

function computeLikeCycles(events: UserInteractionEvent[]) {
  const likeEvents = events.filter((e) =>
    ['LIKE_ADDED', 'LIKE_REMOVED'].includes(e.type)
  );

  const cycles: Array<{
    likedAt: string;
    removedAt: string;
    durationHours: number;
  }> = [];

  let openLike: Date | null = null;

  for (const event of likeEvents) {
    if (event.type === 'LIKE_ADDED') {
      openLike = event.createdAt;
    } else if (event.type === 'LIKE_REMOVED' && openLike) {
      const durationMs = event.createdAt.getTime() - openLike.getTime();
      cycles.push({
        likedAt: openLike.toISOString(),
        removedAt: event.createdAt.toISOString(),
        durationHours: Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10,
      });
      openLike = null;
    }
  }

  return cycles;
}

function extractLocalizedText(value: unknown, lang = 'en'): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const map = value as Record<string, unknown>;
    const preferred = map[lang];
    if (typeof preferred === 'string') return preferred;
    const first = Object.values(map).find((v) => typeof v === 'string');
    if (typeof first === 'string') return first;
  }
  return '';
}

function formatHistoryProperty(property: {
  title: unknown;
  price: unknown;
  category: unknown;
  address: unknown;
  location: unknown;
}) {
  const title = extractLocalizedText(property.title);
  const priceObj = property.price as { value?: number } | null;
  const categoryObj = property.category as { en?: string } | string | null;
  const category =
    typeof categoryObj === 'string'
      ? categoryObj
      : categoryObj?.en ?? extractLocalizedText(property.category);

  const addressParts = [
    extractLocalizedText(property.address),
    extractLocalizedText(property.location),
  ].filter(Boolean);

  return {
    title,
    price: priceObj?.value ?? 0,
    category,
    addressShort: addressParts.join(', ') || '—',
  };
}

class InteractionService {
  recordView(userId: string, input: MutationInput) {
    return recordSimpleEvent(userId, input, 'VIEW', 'View recorded');
  }

  likeProperty(userId: string, input: MutationInput) {
    return recordToggleEvent(userId, input, {
      addType: 'LIKE_ADDED',
      removeType: 'LIKE_REMOVED',
      addMessage: 'Property liked',
      removeMessage: 'Property unliked',
      alreadyError: new InteractionApiError(
        'ALREADY_LIKED',
        'This property is already liked.',
        409
      ),
      notError: new InteractionApiError(
        'NOT_LIKED',
        'This property is not currently liked.',
        409
      ),
      projectionField: 'isLiked',
      lastEventField: 'lastLikeEventId',
      isAdd: true,
    });
  }

  unlikeProperty(userId: string, input: MutationInput) {
    return recordToggleEvent(userId, input, {
      addType: 'LIKE_ADDED',
      removeType: 'LIKE_REMOVED',
      addMessage: 'Property liked',
      removeMessage: 'Property unliked',
      alreadyError: new InteractionApiError(
        'ALREADY_LIKED',
        'This property is already liked.',
        409
      ),
      notError: new InteractionApiError(
        'NOT_LIKED',
        'This property is not currently liked.',
        409
      ),
      projectionField: 'isLiked',
      lastEventField: 'lastLikeEventId',
      isAdd: false,
    });
  }

  saveProperty(userId: string, input: MutationInput) {
    return recordToggleEvent(userId, input, {
      addType: 'SAVE_ADDED',
      removeType: 'SAVE_REMOVED',
      addMessage: 'Property saved',
      removeMessage: 'Property removed from saved',
      alreadyError: new InteractionApiError(
        'ALREADY_SAVED',
        'This property is already saved.',
        409
      ),
      notError: new InteractionApiError(
        'NOT_SAVED',
        'This property is not currently saved.',
        409
      ),
      projectionField: 'isSaved',
      lastEventField: 'lastSaveEventId',
      isAdd: true,
    });
  }

  unsaveProperty(userId: string, input: MutationInput) {
    return recordToggleEvent(userId, input, {
      addType: 'SAVE_ADDED',
      removeType: 'SAVE_REMOVED',
      addMessage: 'Property saved',
      removeMessage: 'Property removed from saved',
      alreadyError: new InteractionApiError(
        'ALREADY_SAVED',
        'This property is already saved.',
        409
      ),
      notError: new InteractionApiError(
        'NOT_SAVED',
        'This property is not currently saved.',
        409
      ),
      projectionField: 'isSaved',
      lastEventField: 'lastSaveEventId',
      isAdd: false,
    });
  }

  recordContact(userId: string, input: MutationInput) {
    return recordSimpleEvent(userId, input, 'CONTACT', 'Contact recorded');
  }

  recordShare(userId: string, input: MutationInput) {
    return recordSimpleEvent(userId, input, 'SHARE', 'Share recorded');
  }

  recordSchedule(userId: string, input: MutationInput) {
    return recordSimpleEvent(userId, input, 'SCHEDULE', 'Viewing schedule recorded');
  }

  async getPropertyState(userId: string, propertyId: string) {
    await ensurePropertyExists(propertyId);

    let state = await prisma.userPropertyState.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });

    if (!state) {
      state = await rebuildProjection(userId, propertyId);
    }

    const propertyEvents = await prisma.userInteractionEvent.findMany({
      where: { userId, propertyId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const likeCycles = computeLikeCycles(propertyEvents);

    return {
      success: true,
      data: {
        propertyId,
        userId,
        currentState: {
          isLiked: state.isLiked,
          isSaved: state.isSaved,
        },
        lifecycleMetrics: {
          likeCycles,
          totalViews: propertyEvents.filter((e) => e.type === 'VIEW').length,
          totalContacts: propertyEvents.filter((e) => e.type === 'CONTACT').length,
          totalShares: propertyEvents.filter((e) => e.type === 'SHARE').length,
          totalSchedules: propertyEvents.filter((e) => e.type === 'SCHEDULE').length,
        },
      },
    };
  }

  async getHistory(
    userId: string,
    query: {
      limit: number;
      offset: number;
      type?: string;
      propertyId?: string;
      sessionId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const where: Prisma.UserInteractionEventWhereInput = { userId };

    if (query.type && query.type !== 'all') {
      where.type = query.type as InteractionType;
    }
    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, events] = await Promise.all([
      prisma.userInteractionEvent.count({ where }),
      prisma.userInteractionEvent.findMany({
        where,
        include: { property: true },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
    ]);

    return {
      success: true,
      data: {
        events: events.map((event) => ({
          interactionId: event.id,
          type: event.type,
          propertyId: event.propertyId,
          property: formatHistoryProperty(event.property),
          sessionId: event.sessionId,
          source: event.source,
          createdAt: event.createdAt.toISOString(),
        })),
        pagination: {
          total,
          returned: events.length,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + events.length < total,
        },
      },
    };
  }

  async exportUserEvents(userId: string, after?: string) {
    const where: Prisma.UserInteractionEventWhereInput = { userId };
    if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const [events, likedStates, savedStates] = await Promise.all([
      prisma.userInteractionEvent.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      prisma.userPropertyState.findMany({
        where: { userId, isLiked: true },
        select: { propertyId: true },
      }),
      prisma.userPropertyState.findMany({
        where: { userId, isSaved: true },
        select: { propertyId: true },
      }),
    ]);

    return {
      success: true,
      data: {
        userId,
        exportedAt: new Date().toISOString(),
        events: events.map((event) => ({
          interactionId: event.id,
          type: event.type,
          propertyId: event.propertyId,
          sessionId: event.sessionId,
          viewDuration: event.viewDuration,
          imagesViewed: event.imagesViewed,
          source: event.source,
          metadata: event.metadata,
          createdAt: event.createdAt.toISOString(),
        })),
        currentState: {
          likedPropertyIds: likedStates.map((s) => s.propertyId),
          savedPropertyIds: savedStates.map((s) => s.propertyId),
        },
      },
    };
  }

  validateSource(source: string | undefined): InteractionSource | undefined {
    if (source === undefined) return undefined;
    if (!INTERACTION_SOURCE_VALUES.includes(source as (typeof INTERACTION_SOURCE_VALUES)[number])) {
      throw new InteractionApiError(
        'INVALID_SOURCE',
        'Source must be a valid InteractionSource enum value',
        400,
        {
          providedValue: source,
          allowedValues: [...INTERACTION_SOURCE_VALUES],
        }
      );
    }
    return source as InteractionSource;
  }

  /** Daily-deduped view for property detail pages; returns true when a new view was recorded. */
  async trackLegacyDailyView(propertyId: string, userId: string): Promise<boolean> {
    const dayKey = new Date().toISOString().slice(0, 10);
    const result = await this.recordView(userId, {
      propertyId,
      idempotencyKey: `legacy-view-${userId}-${propertyId}-${dayKey}`,
      source: 'PROPERTY_DETAIL_PAGE',
    });
    return result.statusCode === 201;
  }

  async getSavedAt(userId: string, propertyId: string): Promise<Date | null> {
    const state = await prisma.userPropertyState.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    if (!state?.isSaved) return null;

    if (state.lastSaveEventId) {
      const event = await prisma.userInteractionEvent.findUnique({
        where: { id: state.lastSaveEventId },
      });
      if (event) return event.createdAt;
    }
    return state.updatedAt;
  }

  async isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
    const state = await prisma.userPropertyState.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
      select: { isSaved: true },
    });
    return state?.isSaved ?? false;
  }

  async listSavedPropertyRecords(
    userId: string
  ): Promise<
    Prisma.UserPropertyStateGetPayload<{
      include: {
        property: {
          include: {
            owner: {
              select: { id: true; first_name: true; last_name: true; email: true };
            };
          };
        };
      };
    }>[]
  > {
    return prisma.userPropertyState.findMany({
      where: {
        userId,
        isSaved: true,
        property: { isDeleted: false },
      },
      include: {
        property: {
          include: {
            owner: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

export default new InteractionService();
