import {
  InteractionSource,
  InteractionType,
  Prisma,
  PrismaClient,
  Property,
  PropertyType,
  Role,
  UserStatus,
  VerificationState,
} from '@prisma/client';
import { getRenterMapLocation, RENTER_SEED_LOCATION_COUNT, SeedMapLocation } from './seedLocations';

const RENTER_SEED_TAG = '';
const RENTER_TOTAL = RENTER_SEED_LOCATION_COUNT;
const HISTORY_DAYS = 60;

type LocaleText = {
  en: string;
  am?: string;
};

type PropertyFeature = {
  id: string;
  category: string;
  categoryEnum: PropertyType;
  title: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
  priceEtb: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  furnishingStatus: string;
};

type PersonaKey =
  | 'student_budget'
  | 'young_professional'
  | 'family_seeker'
  | 'executive'
  | 'location_loyal'
  | 'casual_browser'
  | 'serious_seeker'
  | 'researcher'
  | 'upgrader'
  | 'shared_housing';

type Persona = {
  key: PersonaKey;
  label: string;
  count: number;
  budget: [number, number];
  bedroomRange: [number, number];
  preferredTypes: PropertyType[];
  preferredLocations: string[];
  preferredAmenities: string[];
  furnishStatus: string;
  sessionsRange: [number, number];
  viewsPerSession: [number, number];
  likeRate: number;
  saveRate: number;
  contactRate: number;
  scheduleRate: number;
  shareRate: number;
  removeLikeRate: number;
  removeSaveRate: number;
};

type RenterDraft = {
  index: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  persona: Persona;
  location: string;
  mapLocation: SeedMapLocation;
  preferredLanguage: 'en' | 'am';
};

type EventDraft = {
  id: string;
  userId: string;
  propertyId: string;
  type: InteractionType;
  source?: InteractionSource;
  sessionId?: string;
  viewDuration?: number;
  imagesViewed?: number;
  metadata?: Prisma.InputJsonValue;
  idempotencyKey: string;
  createdAt: Date;
};

type StateDraft = {
  userId: string;
  propertyId: string;
  isLiked: boolean;
  isSaved: boolean;
  lastLikeEventId: string | null;
  lastSaveEventId: string | null;
};

type SeedStats = {
  personaCounts: Record<string, number>;
  eventCounts: Record<string, number>;
  propertyCounts: Map<string, number>;
  neighborhoodCounts: Map<string, number>;
  sessionLengths: number[];
  viewedPairs: Set<string>;
  likedPairs: Set<string>;
  savedPairs: Set<string>;
  contactedPairs: Set<string>;
  scheduledPairs: Set<string>;
  warnings: string[];
};

const PERSONAS: Persona[] = [
  {
    key: 'student_budget',
    label: 'Students and entry-level renters',
    count: 12,
    budget: [4000, 14000],
    bedroomRange: [0, 1],
    preferredTypes: [PropertyType.STUDIO, PropertyType.SHARED_ROOM],
    preferredLocations: ['Megenagna', 'Mexico Square', 'Saris', 'Piassa'],
    preferredAmenities: ['WiFi', 'Shared kitchen', 'Near public transport', 'Hot shower', 'Study desk'],
    furnishStatus: 'furnished',
    sessionsRange: [8, 16],
    viewsPerSession: [5, 10],
    likeRate: 0.12,
    saveRate: 0.04,
    contactRate: 0.01,
    scheduleRate: 0.003,
    shareRate: 0.05,
    removeLikeRate: 0.35,
    removeSaveRate: 0.2,
  },
  {
    key: 'young_professional',
    label: 'Young professionals',
    count: 14,
    budget: [12000, 35000],
    bedroomRange: [1, 2],
    preferredTypes: [PropertyType.APARTMENT, PropertyType.CONDO, PropertyType.STUDIO, PropertyType.SERVICED_APARTMENT],
    preferredLocations: ['Bole Medhanialem', 'Kazanchis', 'CMC', 'Bisrate Gabriel'],
    preferredAmenities: ['WiFi', 'Parking', 'Backup generator', 'Elevator', 'Security', 'Near public transport'],
    furnishStatus: 'semi-furnished',
    sessionsRange: [10, 18],
    viewsPerSession: [4, 9],
    likeRate: 0.22,
    saveRate: 0.1,
    contactRate: 0.035,
    scheduleRate: 0.012,
    shareRate: 0.04,
    removeLikeRate: 0.18,
    removeSaveRate: 0.1,
  },
  {
    key: 'family_seeker',
    label: 'Families seeking long-term homes',
    count: 12,
    budget: [22000, 65000],
    bedroomRange: [2, 5],
    preferredTypes: [PropertyType.APARTMENT, PropertyType.VILLA, PropertyType.HOUSE],
    preferredLocations: ['Ayat', 'CMC', 'Old Airport', 'Summit', 'Bole Medhanialem'],
    preferredAmenities: ['Parking', 'Security', 'Water tank', 'Garden', 'Private compound', 'Children play area'],
    furnishStatus: 'semi-furnished',
    sessionsRange: [7, 14],
    viewsPerSession: [4, 8],
    likeRate: 0.28,
    saveRate: 0.17,
    contactRate: 0.08,
    scheduleRate: 0.035,
    shareRate: 0.06,
    removeLikeRate: 0.1,
    removeSaveRate: 0.06,
  },
  {
    key: 'executive',
    label: 'Executives and premium renters',
    count: 8,
    budget: [45000, 110000],
    bedroomRange: [2, 5],
    preferredTypes: [PropertyType.PENTHOUSE, PropertyType.VILLA, PropertyType.SERVICED_APARTMENT],
    preferredLocations: ['Bole Medhanialem', 'Old Airport', 'Kazanchis'],
    preferredAmenities: ['Gym', 'City view', 'Private terrace', 'Backup generator', 'CCTV'],
    furnishStatus: 'furnished',
    sessionsRange: [5, 10],
    viewsPerSession: [3, 7],
    likeRate: 0.3,
    saveRate: 0.22,
    contactRate: 0.11,
    scheduleRate: 0.055,
    shareRate: 0.04,
    removeLikeRate: 0.08,
    removeSaveRate: 0.04,
  },
  {
    key: 'location_loyal',
    label: 'Location-loyal neighborhood searchers',
    count: 9,
    budget: [10000, 42000],
    bedroomRange: [1, 3],
    preferredTypes: [PropertyType.APARTMENT, PropertyType.CONDO, PropertyType.STUDIO],
    preferredLocations: ['Bole Medhanialem', 'Megenagna', 'Kazanchis'],
    preferredAmenities: ['Near public transport', 'WiFi', 'Security', 'Balcony'],
    furnishStatus: 'unfurnished',
    sessionsRange: [9, 17],
    viewsPerSession: [5, 11],
    likeRate: 0.18,
    saveRate: 0.08,
    contactRate: 0.025,
    scheduleRate: 0.008,
    shareRate: 0.03,
    removeLikeRate: 0.16,
    removeSaveRate: 0.08,
  },
  {
    key: 'casual_browser',
    label: 'Casual browsers',
    count: 10,
    budget: [8000, 55000],
    bedroomRange: [0, 4],
    preferredTypes: [PropertyType.APARTMENT, PropertyType.CONDO, PropertyType.STUDIO, PropertyType.VILLA],
    preferredLocations: ['Bole Medhanialem', 'CMC', 'Piassa', 'Adama', 'Hawassa'],
    preferredAmenities: ['WiFi', 'Balcony', 'Parking', 'Kitchen cabinets'],
    furnishStatus: 'semi-furnished',
    sessionsRange: [14, 24],
    viewsPerSession: [6, 13],
    likeRate: 0.07,
    saveRate: 0.018,
    contactRate: 0.004,
    scheduleRate: 0.001,
    shareRate: 0.035,
    removeLikeRate: 0.45,
    removeSaveRate: 0.28,
  },
  {
    key: 'serious_seeker',
    label: 'Serious renters with clear intent',
    count: 10,
    budget: [18000, 60000],
    bedroomRange: [1, 4],
    preferredTypes: [PropertyType.APARTMENT, PropertyType.HOUSE, PropertyType.VILLA, PropertyType.SERVICED_APARTMENT],
    preferredLocations: ['Bole Medhanialem', 'Kazanchis', 'Ayat', 'CMC'],
    preferredAmenities: ['Security', 'Parking', 'Backup generator', 'Water tank', 'Private compound'],
    furnishStatus: 'semi-furnished',
    sessionsRange: [5, 9],
    viewsPerSession: [3, 7],
    likeRate: 0.38,
    saveRate: 0.27,
    contactRate: 0.14,
    scheduleRate: 0.07,
    shareRate: 0.03,
    removeLikeRate: 0.05,
    removeSaveRate: 0.03,
  },
  {
    key: 'researcher',
    label: 'Market researchers and comparison shoppers',
    count: 8,
    budget: [12000, 75000],
    bedroomRange: [1, 4],
    preferredTypes: [PropertyType.APARTMENT, PropertyType.CONDO, PropertyType.HOUSE, PropertyType.VILLA, PropertyType.PENTHOUSE, PropertyType.STUDIO],
    preferredLocations: ['Bole Medhanialem', 'Kazanchis', 'Megenagna', 'Ayat', 'Bahir Dar', 'Hawassa'],
    preferredAmenities: ['WiFi', 'Parking', 'Security', 'Elevator', 'Garden', 'Near public transport'],
    furnishStatus: 'unfurnished',
    sessionsRange: [12, 22],
    viewsPerSession: [7, 14],
    likeRate: 0.11,
    saveRate: 0.04,
    contactRate: 0.009,
    scheduleRate: 0.002,
    shareRate: 0.08,
    removeLikeRate: 0.25,
    removeSaveRate: 0.12,
  },
  {
    key: 'upgrader',
    label: 'Renters upgrading budget over time',
    count: 9,
    budget: [10000, 50000],
    bedroomRange: [1, 3],
    preferredTypes: [PropertyType.STUDIO, PropertyType.CONDO, PropertyType.APARTMENT, PropertyType.SERVICED_APARTMENT],
    preferredLocations: ['Bisrate Gabriel', 'Bole Medhanialem', 'Kazanchis', 'CMC'],
    preferredAmenities: ['WiFi', 'Backup generator', 'Elevator', 'Parking', 'Smart TV'],
    furnishStatus: 'furnished',
    sessionsRange: [10, 18],
    viewsPerSession: [4, 9],
    likeRate: 0.2,
    saveRate: 0.11,
    contactRate: 0.04,
    scheduleRate: 0.015,
    shareRate: 0.03,
    removeLikeRate: 0.22,
    removeSaveRate: 0.11,
  },
  {
    key: 'shared_housing',
    label: 'Shared housing seekers',
    count: 8,
    budget: [3500, 13000],
    bedroomRange: [1, 2],
    preferredTypes: [PropertyType.SHARED_ROOM, PropertyType.STUDIO],
    preferredLocations: ['Mexico Square', 'Megenagna', 'Piassa', 'Saris'],
    preferredAmenities: ['Shared kitchen', 'WiFi', 'Bed frame', 'Study desk'],
    furnishStatus: 'furnished',
    sessionsRange: [8, 15],
    viewsPerSession: [4, 9],
    likeRate: 0.24,
    saveRate: 0.12,
    contactRate: 0.05,
    scheduleRate: 0.018,
    shareRate: 0.05,
    removeLikeRate: 0.25,
    removeSaveRate: 0.14,
  },
];

const FIRST_NAMES = [
  'Abel', 'Aman', 'Beki', 'Bereket', 'Biruk', 'Dawit', 'Elias', 'Ermias', 'Eyob', 'Fitsum',
  'Henok', 'Kaleb', 'Kidus', 'Leul', 'Michael', 'Nahom', 'Natnael', 'Robel', 'Samuel', 'Yared',
  'Selam', 'Hana', 'Meron', 'Liya', 'Bethlehem', 'Tigist', 'Saron', 'Rediet', 'Mahlet', 'Kalkidan',
  'Eden', 'Meklit', 'Rahel', 'Sara', 'Feven', 'Frehiwot', 'Tsehay', 'Ruth', 'Mikiya', 'Sosina',
  'Hiwot', 'Genet', 'Blen', 'Helen', 'Selamawit', 'Tsega', 'Beza', 'Marta', 'Mihret', 'Lemlem',
];

const LAST_NAMES = [
  'Abebe', 'Alemu', 'Ayele', 'Bekele', 'Berhanu', 'Daniel', 'Demeke', 'Demissie', 'Desta', 'Endale',
  'Eshetu', 'Fanta', 'Fikru', 'Gebre', 'Gebremariam', 'Getachew', 'Girma', 'Haile', 'Hailu', 'Kassa',
  'Kebede', 'Legesse', 'Mekonnen', 'Melaku', 'Mengistu', 'Mohammed', 'Mulugeta', 'Negash', 'Shiferaw', 'Solomon',
  'Tadesse', 'Tekle', 'Teklu', 'Tesema', 'Tesfaye', 'Tilahun', 'Tola', 'Wolde', 'Wondimu', 'Worku',
];

/**
 * Seed realistic renter profiles, preferences, search history, event streams, and state projections.
 */
export async function seedRenterInteractionData(
  prisma: PrismaClient,
  passwordHash: string
): Promise<void> {
  console.log('Seeding ML renter profiles and interaction history...');

  const renterDrafts = buildRenterDrafts();
  const renterEmails = renterDrafts.map((renter) => renter.email);

  await clearExistingRenterSeed(prisma, renterEmails);

  const propertyRows = await prisma.property.findMany({
    where: { isDeleted: false, status: 'AVAILABLE' },
    orderBy: { createdAt: 'asc' },
  });
  const properties = propertyRows.map(toPropertyFeature);

  if (properties.length === 0) {
    throw new Error('No available properties found for renter interaction seed.');
  }

  const stats = createStats();
  if (properties.length < 300) {
    stats.warnings.push(`Expected about 300 available properties; found ${properties.length}.`);
  }

  await prisma.user.createMany({
    data: renterDrafts.map((renter) => ({
      email: renter.email,
      password: passwordHash,
      first_name: renter.firstName,
      last_name: renter.lastName,
      phone: renter.phone,
      role: Role.renter,
      emailVerified: true,
      isVerified: renter.persona.key !== 'casual_browser',
      verificationState:
        renter.persona.key === 'casual_browser' ? VerificationState.pending : VerificationState.verified,
      status: UserStatus.active,
      preferredLanguage: renter.preferredLanguage,
      location: renter.location,
      bio: `${RENTER_SEED_TAG} ${renter.persona.label} browsing Ethiopian rentals for recommendation training.`,
      image: `https://i.pravatar.cc/300?u=${renter.email}`,
    })),
  });

  const createdRenters = await prisma.user.findMany({
    where: { email: { in: renterEmails } },
    select: { id: true, email: true },
  });
  const renterIdByEmail = new Map(createdRenters.map((renter) => [renter.email ?? '', renter.id]));

  await prisma.userPreference.createMany({
    data: renterDrafts.map((renter) => {
      const userId = renterIdByEmail.get(renter.email);
      if (!userId) throw new Error(`Missing created renter for ${renter.email}`);
      return buildPreferenceRow(userId, renter);
    }),
  });

  const searchHistoryRows: Prisma.SearchHistoryCreateManyInput[] = [];
  const eventRows: Prisma.UserInteractionEventCreateManyInput[] = [];
  const stateByPair = new Map<string, StateDraft>();

  renterDrafts.forEach((renter) => {
    const userId = renterIdByEmail.get(renter.email);
    if (!userId) throw new Error(`Missing created renter for ${renter.email}`);

    stats.personaCounts[renter.persona.label] = (stats.personaCounts[renter.persona.label] ?? 0) + 1;
    const built = buildRenterJourney(userId, renter, properties, stats);
    eventRows.push(...built.events);
    searchHistoryRows.push(...built.searches);
    built.states.forEach((state) => stateByPair.set(`${state.userId}:${state.propertyId}`, state));

    if ((renter.index + 1) % 20 === 0) {
      console.log(`Prepared ${renter.index + 1}/${RENTER_TOTAL} renter journeys...`);
    }
  });

  await createManyInChunks(prisma.searchHistory, searchHistoryRows, 1000);
  await createManyInChunks(prisma.userInteractionEvent, eventRows, 1000);
  await createManyInChunks(prisma.userPropertyState, [...stateByPair.values()], 1000);

  printStats(stats, properties.length, eventRows.length, stateByPair.size);
}

/**
 * Delete previous renter seed rows in dependency-safe order.
 */
async function clearExistingRenterSeed(prisma: PrismaClient, renterEmails: string[]): Promise<void> {
  const renters = await prisma.user.findMany({
    where: { email: { in: renterEmails } },
    select: { id: true },
  });
  const renterIds = renters.map((renter) => renter.id);

  if (renterIds.length === 0) {
    console.log('No existing ML renter seed data found.');
    return;
  }

  console.log(`Clearing existing ML renter seed data for ${renterIds.length} renters...`);
  await prisma.$transaction([
    prisma.userPropertyState.deleteMany({ where: { userId: { in: renterIds } } }),
    prisma.userInteractionEvent.deleteMany({ where: { userId: { in: renterIds } } }),
    prisma.searchHistory.deleteMany({ where: { userId: { in: renterIds } } }),
    prisma.userPreference.deleteMany({ where: { userId: { in: renterIds } } }),
    prisma.refreshToken.deleteMany({ where: { userId: { in: renterIds } } }),
    prisma.session.deleteMany({ where: { userId: { in: renterIds } } }),
    prisma.account.deleteMany({ where: { userId: { in: renterIds } } }),
    prisma.notification.deleteMany({ where: { userId: { in: renterIds } } }),
    prisma.report.deleteMany({ where: { reportedById: { in: renterIds } } }),
    prisma.user.deleteMany({ where: { id: { in: renterIds } } }),
  ]);
}

/**
 * Build 100 renter drafts from the configured persona distribution.
 */
function buildRenterDrafts(): RenterDraft[] {
  const renters: RenterDraft[] = [];
  const personaQueue = PERSONAS.flatMap((persona) =>
    Array.from({ length: persona.count }, () => persona)
  );

  if (personaQueue.length !== RENTER_TOTAL) {
    throw new Error(`Renter persona counts must add up to ${RENTER_TOTAL}; received ${personaQueue.length}.`);
  }

  for (let index = 0; index < RENTER_TOTAL; index += 1) {
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(index * 7) % LAST_NAMES.length];
    const persona = personaQueue[index];
    const mapLocation = getRenterMapLocation(index);
    renters.push({
      index,
      firstName,
      lastName,
      persona,
      email: `${firstName}.${lastName}.renter${String(index + 1).padStart(3, '0')}@smartrental.com`.toLowerCase(),
      phone: `+251 9${String(40000000 + index).padStart(8, '0')}`,
      location: mapLocation.address.en,
      mapLocation,
      preferredLanguage: index % 5 === 0 ? 'am' : 'en',
    });
  }

  return renters;
}

/**
 * Convert a Prisma property row into a feature object for scoring and statistics.
 */
function toPropertyFeature(property: Property): PropertyFeature {
  const location = asRecord(property.location);
  const address = asRecord(property.address);
  const category = asLocalized(property.category);
  const price = asRecord(property.price);

  return {
    id: property.id,
    category,
    categoryEnum: toPropertyType(category),
    title: asLocalized(property.title),
    neighborhood:
      asString(location.neighborhood) ||
      firstAddressPart(asString(address.en)) ||
      asString(location.city) ||
      'Unknown',
    city: asString(location.city) || lastAddressPart(asString(address.en)) || 'Addis Ababa',
    lat: toNumber(location.lat, 0),
    lng: toNumber(location.lng, 0),
    priceEtb:
      asString(price.currency).toUpperCase() === 'USD'
        ? toNumber(price.amountEtb, toNumber(price.value, 0) * 56)
        : toNumber(price.value, 0),
    bedrooms: property.bedrooms ?? 0,
    bathrooms: property.bathrooms ?? 0,
    amenities: extractAmenityLabels(property.amenities),
    furnishingStatus: property.furnishingStatus ?? 'unfurnished',
  };
}

/**
 * Build one user preference row matching the schema.
 */
function buildPreferenceRow(userId: string, renter: RenterDraft): Prisma.UserPreferenceCreateManyInput {
  const persona = renter.persona;
  return {
    userId,
    preferredPriceMin: persona.budget[0],
    preferredPriceMax: persona.budget[1],
    preferredCurrency: 'ETB',
    preferredBedrooms: persona.bedroomRange[0],
    preferredLocations: [
      {
        address: renter.mapLocation.address.en,
        lat: renter.mapLocation.lat,
        lng: renter.mapLocation.lng,
      },
    ] as Prisma.InputJsonValue,
    preferredAmenities: persona.preferredAmenities,
    preferredType: persona.preferredTypes[0],
    furnishStatus: persona.furnishStatus,
  };
}

/**
 * Build a coherent 60-day event journey and search history for one renter.
 */
function buildRenterJourney(
  userId: string,
  renter: RenterDraft,
  properties: PropertyFeature[],
  stats: SeedStats
): { events: EventDraft[]; states: StateDraft[]; searches: Prisma.SearchHistoryCreateManyInput[] } {
  const random = createRandom(9000 + renter.index * 97);
  const persona = renter.persona;
  const sessionCount = randomInt(random, persona.sessionsRange[0], persona.sessionsRange[1]);
  const start = daysAgo(HISTORY_DAYS - randomInt(random, 0, 5));
  const events: EventDraft[] = [];
  const searches: Prisma.SearchHistoryCreateManyInput[] = [];
  const stateByProperty = new Map<string, StateDraft>();

  for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex += 1) {
    const progress = sessionCount <= 1 ? 1 : sessionIndex / (sessionCount - 1);
    const sessionStart = sessionDate(start, sessionIndex, sessionCount, random);
    const sessionId = `mlseed-${userId.slice(-8)}-${String(sessionIndex + 1).padStart(2, '0')}`;
    const sessionTheme = chooseSessionTheme(renter, persona, sessionIndex, random);
    const candidatePool = rankProperties(properties, persona, renter, sessionTheme, progress);
    const viewCount = randomInt(random, persona.viewsPerSession[0], persona.viewsPerSession[1]);
    const viewed = pickSessionProperties(candidatePool, viewCount, random);

    if (sessionIndex % 2 === 0) {
      searches.push({
        userId,
        query: `${sessionTheme.location} ${sessionTheme.typeLabel}`.trim(),
        filters: {
          seedTag: RENTER_SEED_TAG,
          persona: persona.key,
          budget: currentBudget(persona, progress),
          location: sessionTheme.location,
          propertyType: sessionTheme.type,
        } as Prisma.InputJsonValue,
        createdAt: addMinutes(sessionStart, -randomInt(random, 1, 20)),
      });
    }

    viewed.forEach((property, propertyIndex) => {
      const eventTime = addMinutes(sessionStart, propertyIndex * randomInt(random, 3, 9));
      const source = chooseSource(persona, sessionIndex, propertyIndex, random);
      const viewEvent = makeEvent({
        userId,
        propertyId: property.id,
        type: 'VIEW',
        source,
        sessionId,
        createdAt: eventTime,
        ordinal: events.length,
        viewDuration: viewDuration(persona, property, random),
        imagesViewed: randomInt(random, 1, 7),
        metadata: {
          seedTag: RENTER_SEED_TAG,
          persona: persona.key,
          sessionTheme,
          rank: propertyIndex + 1,
        },
      });
      events.push(viewEvent);
      markPair(stats.viewedPairs, userId, property.id);
      incrementStats(stats, viewEvent, property, viewed.length);

      const score = scoreProperty(property, persona, renter, sessionTheme, progress);
      const engagementBoost = Math.min(0.18, score / 600);
      const forceFullFunnel =
        ['serious_seeker', 'family_seeker', 'executive'].includes(persona.key) &&
        sessionIndex === Math.floor(sessionCount / 2) &&
        propertyIndex === 0;
      const forceNegativeSignal =
        ['casual_browser', 'student_budget', 'upgrader'].includes(persona.key) &&
        sessionIndex % 5 === 0 &&
        propertyIndex === 1;

      if (forceFullFunnel || forceNegativeSignal || random() < persona.likeRate + engagementBoost) {
        const likeEvent = makeEvent({
          userId,
          propertyId: property.id,
          type: 'LIKE_ADDED',
          source: 'PROPERTY_DETAIL_PAGE',
          sessionId,
          createdAt: addMinutes(eventTime, randomInt(random, 1, 4)),
          ordinal: events.length,
          metadata: { seedTag: RENTER_SEED_TAG, persona: persona.key, reason: 'matched_features' },
        });
        events.push(likeEvent);
        applyState(stateByProperty, userId, property.id, likeEvent);
        markPair(stats.likedPairs, userId, property.id);
        incrementStats(stats, likeEvent, property, viewed.length);

        if (forceNegativeSignal || random() < persona.removeLikeRate) {
          const removeLikeEvent = makeEvent({
            userId,
            propertyId: property.id,
            type: 'LIKE_REMOVED',
            source: 'SAVED_PROPERTIES_PAGE',
            sessionId,
            createdAt: addMinutes(eventTime, randomInt(random, 60, 2400)),
            ordinal: events.length,
            metadata: { seedTag: RENTER_SEED_TAG, persona: persona.key, reason: 'changed_mind' },
          });
          events.push(removeLikeEvent);
          applyState(stateByProperty, userId, property.id, removeLikeEvent);
          incrementStats(stats, removeLikeEvent, property, viewed.length);
        }
      }

      if (forceFullFunnel || forceNegativeSignal || random() < persona.saveRate + engagementBoost / 2) {
        const saveEvent = makeEvent({
          userId,
          propertyId: property.id,
          type: 'SAVE_ADDED',
          source: 'PROPERTY_DETAIL_PAGE',
          sessionId,
          createdAt: addMinutes(eventTime, randomInt(random, 2, 8)),
          ordinal: events.length,
          metadata: { seedTag: RENTER_SEED_TAG, persona: persona.key, reason: 'shortlisted' },
        });
        events.push(saveEvent);
        applyState(stateByProperty, userId, property.id, saveEvent);
        markPair(stats.savedPairs, userId, property.id);
        incrementStats(stats, saveEvent, property, viewed.length);

        if (forceFullFunnel || random() < persona.contactRate) {
          const contactEvent = makeEvent({
            userId,
            propertyId: property.id,
            type: 'CONTACT',
            source: 'PROPERTY_DETAIL_PAGE',
            sessionId,
            createdAt: addMinutes(eventTime, randomInt(random, 8, 20)),
            ordinal: events.length,
            metadata: {
              seedTag: RENTER_SEED_TAG,
              persona: persona.key,
              contactMethod: chooseOne(['phone', 'in_app_message', 'whatsapp'], random),
            },
          });
          events.push(contactEvent);
          markPair(stats.contactedPairs, userId, property.id);
          incrementStats(stats, contactEvent, property, viewed.length);
        }

        if (forceFullFunnel || random() < persona.scheduleRate) {
          const scheduleEvent = makeEvent({
            userId,
            propertyId: property.id,
            type: 'SCHEDULE',
            source: 'PROPERTY_DETAIL_PAGE',
            sessionId,
            createdAt: addMinutes(eventTime, randomInt(random, 18, 45)),
            ordinal: events.length,
            metadata: {
              seedTag: RENTER_SEED_TAG,
              persona: persona.key,
              scheduledDate: addDays(eventTime, randomInt(random, 1, 7)).toISOString(),
              scheduledTimeSlot: chooseOne(['morning', 'afternoon', 'evening'], random),
            },
          });
          events.push(scheduleEvent);
          markPair(stats.scheduledPairs, userId, property.id);
          incrementStats(stats, scheduleEvent, property, viewed.length);
        }

        if (forceNegativeSignal || random() < persona.removeSaveRate) {
          const removeSaveEvent = makeEvent({
            userId,
            propertyId: property.id,
            type: 'SAVE_REMOVED',
            source: 'SAVED_PROPERTIES_PAGE',
            sessionId,
            createdAt: addMinutes(eventTime, randomInt(random, 120, 3600)),
            ordinal: events.length,
            metadata: { seedTag: RENTER_SEED_TAG, persona: persona.key, reason: 'removed_from_shortlist' },
          });
          events.push(removeSaveEvent);
          applyState(stateByProperty, userId, property.id, removeSaveEvent);
          incrementStats(stats, removeSaveEvent, property, viewed.length);
        }
      }

      if (random() < persona.shareRate) {
        const shareEvent = makeEvent({
          userId,
          propertyId: property.id,
          type: 'SHARE',
          source: 'PROPERTY_DETAIL_PAGE',
          sessionId,
          createdAt: addMinutes(eventTime, randomInt(random, 2, 15)),
          ordinal: events.length,
          metadata: {
            seedTag: RENTER_SEED_TAG,
            persona: persona.key,
            shareMethod: chooseOne(['copy_link', 'whatsapp', 'telegram'], random),
            recipientCount: randomInt(random, 1, 3),
          },
        });
        events.push(shareEvent);
        incrementStats(stats, shareEvent, property, viewed.length);
      }
    });

    stats.sessionLengths.push(viewed.length);
  }

  return {
    events,
    states: [...stateByProperty.values()],
    searches,
  };
}

/**
 * Create a seed event row with a stable id and idempotency key.
 */
function makeEvent(input: {
  userId: string;
  propertyId: string;
  type: InteractionType;
  source?: InteractionSource;
  sessionId?: string;
  createdAt: Date;
  ordinal: number;
  viewDuration?: number;
  imagesViewed?: number;
  metadata?: Prisma.InputJsonValue;
}): EventDraft {
  const compactTime = input.createdAt.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const id = `ml_evt_${compactTime}_${input.userId.slice(-6)}_${String(input.ordinal).padStart(5, '0')}`;
  return {
    id,
    userId: input.userId,
    propertyId: input.propertyId,
    type: input.type,
    source: input.source,
    sessionId: input.sessionId,
    viewDuration: input.viewDuration,
    imagesViewed: input.imagesViewed,
    metadata: input.metadata,
    idempotencyKey: `${RENTER_SEED_TAG}:${id}`,
    createdAt: input.createdAt,
  };
}

/**
 * Apply like/save toggle events to the final projection state.
 */
function applyState(
  stateByProperty: Map<string, StateDraft>,
  userId: string,
  propertyId: string,
  event: EventDraft
): void {
  const key = `${userId}:${propertyId}`;
  const state =
    stateByProperty.get(key) ?? {
      userId,
      propertyId,
      isLiked: false,
      isSaved: false,
      lastLikeEventId: null,
      lastSaveEventId: null,
    };

  if (event.type === 'LIKE_ADDED' || event.type === 'LIKE_REMOVED') {
    state.isLiked = event.type === 'LIKE_ADDED';
    state.lastLikeEventId = event.id;
  }

  if (event.type === 'SAVE_ADDED' || event.type === 'SAVE_REMOVED') {
    state.isSaved = event.type === 'SAVE_ADDED';
    state.lastSaveEventId = event.id;
  }

  stateByProperty.set(key, state);
}

/**
 * Score properties against persona and session theme to create clear ML signal clusters.
 */
function scoreProperty(
  property: PropertyFeature,
  persona: Persona,
  renter: RenterDraft,
  sessionTheme: { location: string; type: PropertyType; typeLabel: string },
  progress: number
): number {
  const budget = currentBudget(persona, progress);
  let score = 0;
  const preferredAreas = [
    renter.mapLocation.neighborhood,
    renter.mapLocation.subcity,
    renter.mapLocation.city,
    ...persona.preferredLocations,
  ];

  if (property.priceEtb >= budget[0] && property.priceEtb <= budget[1]) score += 90;
  if (persona.preferredTypes.includes(property.categoryEnum)) score += 60;
  if (property.categoryEnum === sessionTheme.type) score += 35;
  if (preferredAreas.includes(property.neighborhood) || preferredAreas.includes(property.city)) score += 55;
  if (property.neighborhood === sessionTheme.location || property.city === sessionTheme.location) score += 45;
  if (property.bedrooms >= persona.bedroomRange[0] && property.bedrooms <= persona.bedroomRange[1]) score += 35;
  if (property.furnishingStatus === persona.furnishStatus) score += 15;

  const amenityMatches = property.amenities.filter((amenity) =>
    persona.preferredAmenities.some((preferred) => amenity.toLowerCase().includes(preferred.toLowerCase()))
  );
  score += amenityMatches.length * 12;

  return score;
}

/**
 * Rank and lightly diversify candidate properties for a session.
 */
function rankProperties(
  properties: PropertyFeature[],
  persona: Persona,
  renter: RenterDraft,
  sessionTheme: { location: string; type: PropertyType; typeLabel: string },
  progress: number
): PropertyFeature[] {
  return properties
    .map((property, index) => ({
      property,
      score: scoreProperty(property, persona, renter, sessionTheme, progress) + (index % 17),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.property);
}

/**
 * Choose coherent session properties while preserving some exploration.
 */
function pickSessionProperties(
  ranked: PropertyFeature[],
  count: number,
  random: () => number
): PropertyFeature[] {
  const selected: PropertyFeature[] = [];
  const topPool = ranked.slice(0, Math.min(60, ranked.length));
  const explorePool = ranked.slice(60, Math.min(160, ranked.length));

  while (selected.length < count && selected.length < ranked.length) {
    const pool = random() < 0.84 || explorePool.length === 0 ? topPool : explorePool;
    const property = chooseOne(pool, random);
    if (!selected.some((item) => item.id === property.id)) {
      selected.push(property);
    }
  }

  return selected;
}

/**
 * Session theme controls coherence within a browse session.
 */
function chooseSessionTheme(
  renter: RenterDraft,
  persona: Persona,
  sessionIndex: number,
  random: () => number
): { location: string; type: PropertyType; typeLabel: string } {
  const location =
    sessionIndex % 2 === 0
      ? renter.mapLocation.neighborhood
      : persona.preferredLocations[sessionIndex % persona.preferredLocations.length];
  const type = persona.preferredTypes[randomInt(random, 0, persona.preferredTypes.length - 1)];
  return { location, type, typeLabel: type.toLowerCase().replace(/_/g, ' ') };
}

/**
 * Upgraders start lower and move toward their full budget over time.
 */
function currentBudget(persona: Persona, progress: number): [number, number] {
  if (persona.key !== 'upgrader') return persona.budget;
  const min = persona.budget[0] + Math.round(8000 * progress);
  const max = persona.budget[0] + Math.round((persona.budget[1] - persona.budget[0]) * (0.45 + progress * 0.55));
  return [min, max];
}

/**
 * Choose realistic sources based on browse context.
 */
function chooseSource(
  persona: Persona,
  sessionIndex: number,
  propertyIndex: number,
  random: () => number
): InteractionSource {
  if (propertyIndex === 0 && sessionIndex % 4 === 0) return 'RECOMMENDATIONS';
  if (persona.key === 'location_loyal') return 'LOCATION_BROWSE';
  if (persona.key === 'researcher' && random() < 0.35) return 'SIMILAR_PROPERTIES';
  if (random() < 0.12) return 'DIRECT_LINK';
  return propertyIndex % 2 === 0 ? 'SEARCH_RESULTS' : 'SEARCH_RESULTS_CARD';
}

/**
 * Serious seekers spend longer on good matches.
 */
function viewDuration(persona: Persona, property: PropertyFeature, random: () => number): number {
  const base =
    persona.key === 'serious_seeker' || persona.key === 'family_seeker' || persona.key === 'executive'
      ? randomInt(random, 70, 320)
      : randomInt(random, 12, 140);
  const premiumBonus = property.priceEtb > 50000 ? randomInt(random, 10, 70) : 0;
  return base + premiumBonus;
}

/**
 * Track event-level statistics as rows are built.
 */
function incrementStats(
  stats: SeedStats,
  event: EventDraft,
  property: PropertyFeature,
  sessionLength: number
): void {
  stats.eventCounts[event.type] = (stats.eventCounts[event.type] ?? 0) + 1;
  stats.propertyCounts.set(property.id, (stats.propertyCounts.get(property.id) ?? 0) + 1);
  stats.neighborhoodCounts.set(
    property.neighborhood,
    (stats.neighborhoodCounts.get(property.neighborhood) ?? 0) + 1
  );
  if (sessionLength <= 1) stats.warnings.push(`Very short session ${event.sessionId ?? 'unknown'} generated.`);
}

/**
 * Create an empty stats object.
 */
function createStats(): SeedStats {
  return {
    personaCounts: {},
    eventCounts: {},
    propertyCounts: new Map(),
    neighborhoodCounts: new Map(),
    sessionLengths: [],
    viewedPairs: new Set(),
    likedPairs: new Set(),
    savedPairs: new Set(),
    contactedPairs: new Set(),
    scheduledPairs: new Set(),
    warnings: [],
  };
}

/**
 * Print ML data quality statistics after seeding.
 */
function printStats(stats: SeedStats, propertyTotal: number, eventTotal: number, stateTotal: number): void {
  const eventEntries = Object.entries(stats.eventCounts).sort(([a], [b]) => a.localeCompare(b));
  const propertyDensity = [...stats.propertyCounts.values()];
  const averageDensity = average(propertyDensity);
  const averageSessionLength = average(stats.sessionLengths);
  const topNeighborhoods = topEntries(stats.neighborhoodCounts, 8);
  const topProperties = topEntries(stats.propertyCounts, 5);

  console.log('ML renter seed complete.');
  console.log('Renter persona distribution:');
  Object.entries(stats.personaCounts).forEach(([persona, count]) => {
    console.log(`- ${persona}: ${count}`);
  });

  console.log('Interactions by type:');
  eventEntries.forEach(([type, count]) => console.log(`- ${type}: ${count}`));

  console.log('Interaction density per property:');
  console.log(`- Properties with interactions: ${stats.propertyCounts.size}/${propertyTotal}`);
  console.log(`- Average interactions per engaged property: ${averageDensity.toFixed(2)}`);
  console.log(`- Max interactions on one property: ${Math.max(...propertyDensity)}`);
  console.log(`- Top engaged property ids: ${topProperties.map(([id, count]) => `${id} (${count})`).join(', ')}`);

  console.log(`Average session length: ${averageSessionLength.toFixed(2)} viewed properties`);
  console.log(`Most engaged neighborhoods: ${topNeighborhoods.map(([name, count]) => `${name} (${count})`).join(', ')}`);
  console.log('Conversion funnel metrics:');
  console.log(`- Viewed pairs: ${stats.viewedPairs.size}`);
  console.log(`- Liked / viewed: ${percentage(stats.likedPairs.size, stats.viewedPairs.size)}`);
  console.log(`- Saved / liked: ${percentage(stats.savedPairs.size, stats.likedPairs.size)}`);
  console.log(`- Contacted / saved: ${percentage(stats.contactedPairs.size, stats.savedPairs.size)}`);
  console.log(`- Scheduled / contacted: ${percentage(stats.scheduledPairs.size, stats.contactedPairs.size)}`);
  console.log(`- UserPropertyState rows: ${stateTotal}`);
  console.log(`- Total interaction events: ${eventTotal}`);

  const warnings = dedupe(stats.warnings).slice(0, 10);
  if (warnings.length > 0) {
    console.log('Data quality warnings:');
    warnings.forEach((warning) => console.log(`- ${warning}`));
  } else {
    console.log('Data quality warnings: none');
  }
}

/**
 * Chunk createMany calls to avoid oversized database statements.
 */
async function createManyInChunks<T extends { createMany(args: { data: D[] }): Promise<unknown> }, D>(
  model: T,
  data: D[],
  chunkSize: number
): Promise<void> {
  for (let index = 0; index < data.length; index += chunkSize) {
    await model.createMany({ data: data.slice(index, index + chunkSize) });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asLocalized(value: unknown): string {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  return asString(record.en) || asString(record.am) || '';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNumber(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function extractAmenityLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item : asLocalized(item)))
    .filter(Boolean);
}

function toPropertyType(category: string): PropertyType {
  const normalized = category.toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized.includes('SERVICED')) return PropertyType.SERVICED_APARTMENT;
  if (normalized.includes('SHARED')) return PropertyType.SHARED_ROOM;
  if (normalized in PropertyType) return normalized as PropertyType;
  return PropertyType.APARTMENT;
}

function firstAddressPart(address: string): string {
  return address.split(',')[0]?.trim() ?? '';
}

function lastAddressPart(address: string): string {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 2] ?? parts[parts.length - 1] ?? '';
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function chooseOne<T>(items: readonly T[], random: () => number): T {
  return items[randomInt(random, 0, items.length - 1)];
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(8, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutes(date: Date, minutes: number): Date {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

function sessionDate(start: Date, sessionIndex: number, sessionCount: number, random: () => number): Date {
  const dayOffset = Math.floor((HISTORY_DAYS / Math.max(1, sessionCount - 1)) * sessionIndex);
  const date = addDays(start, dayOffset + randomInt(random, -1, 1));
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const hour = isWeekend
    ? chooseOne([10, 11, 14, 15, 19, 20], random)
    : chooseOne([7, 8, 12, 18, 19, 20, 21], random);
  date.setHours(hour, randomInt(random, 0, 55), 0, 0);
  return date;
}

function markPair(set: Set<string>, userId: string, propertyId: string): void {
  set.add(`${userId}:${propertyId}`);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentage(numerator: number, denominator: number): string {
  if (denominator === 0) return '0.0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function topEntries(map: Map<string, number>, limit: number): Array<[string, number]> {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
