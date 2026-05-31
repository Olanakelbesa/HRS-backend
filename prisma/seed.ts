/// <reference types="node" />
import 'dotenv/config';
import {
  Prisma,
  PrismaClient,
  PropertyStatus,
  Role,
  UserStatus,
  VerificationState,
  VerificationStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getPropertyMapLocation, SeedMapLocation, toPropertyLocationJson } from './seedLocations';
import { seedRenterInteractionData } from './seedRenters';

const prisma = new PrismaClient();

const SEED_TAG = '';
const DEFAULT_PASSWORD = 'Password123!';
const PROPERTY_TOTAL = 300;

type LocaleText = Prisma.InputJsonObject & { en: string; am: string };
type JsonLocation = Prisma.InputJsonObject & {
  lat: number;
  lng: number;
  city: string;
  subcity: string;
  neighborhood: string;
};
type JsonPrice = Prisma.InputJsonObject & {
  value: number;
  currency: 'ETB' | 'USD';
  amountEtb?: number;
};

type SeedOwner = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  location: LocaleText;
  bio: LocaleText;
  image: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
};

type ColumnMetadata = {
  dataType: string;
  udtName: string;
};

type Neighborhood = {
  cityEn: string;
  cityAm: string;
  subcityEn: string;
  subcityAm: string;
  neighborhoodEn: string;
  neighborhoodAm: string;
  lat: number;
  lng: number;
  weight: number;
  premium: number;
};

const PROPERTY_TYPE = {
  VILLA: 'VILLA',
  APARTMENT: 'APARTMENT',
  CONDO: 'CONDO',
  STUDIO: 'STUDIO',
  HOUSE: 'HOUSE',
  SHARED_ROOM: 'SHARED_ROOM',
  SERVICED_APARTMENT: 'SERVICED_APARTMENT',
  PENTHOUSE: 'PENTHOUSE',
} as const;

type SeedPropertyType = (typeof PROPERTY_TYPE)[keyof typeof PROPERTY_TYPE];

type PropertyTypeConfig = {
  type: SeedPropertyType;
  count: number;
  category: LocaleText;
  noun: LocaleText;
  priceMin: number;
  priceMax: number;
  bedroomOptions: number[];
  bathroomOffset: number;
  areaRange: [number, number];
  amenities: LocaleText[];
  furnishingOptions: string[];
  minLeaseMonths: number;
};

type PropertyDraft = {
  ownerId: string;
  config: PropertyTypeConfig;
  neighborhood: Neighborhood;
  sequence: number;
  bedrooms: number;
  bathrooms: number;
  price: JsonPrice;
  mapLocation: SeedMapLocation;
  amenities: LocaleText[];
  imageCount: number;
  area: number;
  furnishingStatus: string;
  availableFrom: Date;
};

/// @seed
const OWNER_NAME_ROWS: Array<[string, string]> = [
  ['Selam', 'Tadesse'], ['Yonas', 'Bekele'], ['Meron', 'Girma'], ['Dawit', 'Mekonnen'], ['Hana', 'Alemu'],
  ['Abel', 'Tesfaye'], ['Liya', 'Kebede'], ['Nahom', 'Getachew'], ['Bethlehem', 'Wolde'], ['Samuel', 'Haile'],
  ['Tigist', 'Abebe'], ['Robel', 'Worku'], ['Saron', 'Demissie'], ['Kaleb', 'Assefa'], ['Rediet', 'Fikru'],
  ['Biniam', 'Tola'], ['Mahlet', 'Gebre'], ['Henok', 'Desta'], ['Kalkidan', 'Mulugeta'], ['Fitsum', 'Kebede'],
  ['Eden', 'Tesema'], ['Natnael', 'Eshetu'], ['Meklit', 'Hailu'], ['Yared', 'Solomon'], ['Rahel', 'Negash'],
  ['Eyob', 'Tadesse'], ['Sara', 'Mohammed'], ['Elias', 'Kassa'], ['Feven', 'Alemayehu'], ['Biruk', 'Shiferaw'],
  ['Frehiwot', 'Ayele'], ['Bereket', 'Mengistu'], ['Tsehay', 'Tesfaye'], ['Ermias', 'Wolde'], ['Ruth', 'Daniel'],
  ['Mikiya', 'Abera'], ['Kidus', 'Fanta'], ['Sosina', 'Berhanu'], ['Yohannes', 'Zewdu'], ['Hiwot', 'Tilahun'],
  ['Aman', 'Tekle'], ['Genet', 'Melaku'], ['Leul', 'Endale'], ['Blen', 'Wondimu'], ['Helen', 'Desta'],
  ['Nahom', 'Teklu'], ['Selamawit', 'Demeke'], ['Michael', 'Legesse'], ['Tsega', 'Gebremariam'], ['Beza', 'Adane'],
];

const LEGACY_OWNER_EMAILS = [
  'selam.tadesse@smart-rentals.com',
  'yonas.bekele@smart-rentals.com',
  'meron.girma@smart-rentals.com',
  'admin@smartrental.com',
];

/// @seed
const OWNERS: SeedOwner[] = OWNER_NAME_ROWS.map(([firstName, lastName], index) =>
  buildSeedOwner(firstName, lastName, index)
);

const OWNER_EMAILS = OWNERS.map((owner) => owner.email);
const CLEANUP_OWNER_EMAILS = [...OWNER_EMAILS, ...LEGACY_OWNER_EMAILS];

/// @seed
const NEIGHBORHOODS: Neighborhood[] = [
  ['Addis Ababa', 'አዲስ አበባ', 'Bole', 'ቦሌ', 'Bole Medhanialem', 'ቦሌ መድሃኔዓለም', 8.9956, 38.7891, 10, 1.22],
  ['Addis Ababa', 'አዲስ አበባ', 'Bole', 'ቦሌ', 'CMC', 'ሲኤምሲ', 9.0236, 38.8617, 8, 1.06],
  ['Addis Ababa', 'አዲስ አበባ', 'Kirkos', 'ቂርቆስ', 'Kazanchis', 'ካዛንቺስ', 9.0168, 38.7652, 9, 1.16],
  ['Addis Ababa', 'አዲስ አበባ', 'Yeka', 'የካ', 'Megenagna', 'መገናኛ', 9.0231, 38.8023, 8, 1.08],
  ['Addis Ababa', 'አዲስ አበባ', 'Nifas Silk-Lafto', 'ንፋስ ስልክ-ላፍቶ', 'Bisrate Gabriel', 'ብስራተ ገብርኤል', 8.9953, 38.7303, 7, 1.02],
  ['Addis Ababa', 'አዲስ አበባ', 'Lideta', 'ልደታ', 'Mexico Square', 'ሜክሲኮ አደባባይ', 9.0107, 38.7469, 7, 0.98],
  ['Addis Ababa', 'አዲስ አበባ', 'Arada', 'አራዳ', 'Piassa', 'ፒያሳ', 9.0353, 38.7524, 7, 1.0],
  ['Addis Ababa', 'አዲስ አበባ', 'Bole', 'ቦሌ', 'Summit', 'ሰሚት', 9.0154, 38.8943, 7, 0.96],
  ['Addis Ababa', 'አዲስ አበባ', 'Akaky Kaliti', 'አቃቂ ቃሊቲ', 'Saris', 'ሳሪስ', 8.9556, 38.7669, 6, 0.9],
  ['Addis Ababa', 'አዲስ አበባ', 'Lemi Kura', 'ለሚ ኩራ', 'Ayat', 'አያት', 9.0366, 38.8812, 8, 1.04],
  ['Addis Ababa', 'አዲስ አበባ', 'Kolfe Keranio', 'ኮልፌ ቀራኒዮ', 'Old Airport', 'ኦልድ ኤርፖርት', 8.9994, 38.7109, 8, 1.18],
  ['Adama', 'አዳማ', 'Adama City', 'አዳማ ከተማ', 'Bole Adama', 'ቦሌ አዳማ', 8.5407, 39.2696, 5, 0.82],
  ['Bahir Dar', 'ባሕር ዳር', 'Bahir Dar City', 'ባሕር ዳር ከተማ', 'Lake Tana', 'ጣና ሐይቅ', 11.5936, 37.3908, 5, 0.86],
  ['Hawassa', 'ሀዋሳ', 'Hawassa City', 'ሀዋሳ ከተማ', 'Tabor', 'ታቦር', 7.0506, 38.4766, 5, 0.84],
  ['Mekelle', 'መቐለ', 'Mekelle City', 'መቐለ ከተማ', 'Ayder', 'አይደር', 13.4967, 39.4753, 4, 0.78],
].map(([cityEn, cityAm, subcityEn, subcityAm, neighborhoodEn, neighborhoodAm, lat, lng, weight, premium]) => ({
  cityEn: String(cityEn),
  cityAm: String(cityAm),
  subcityEn: String(subcityEn),
  subcityAm: String(subcityAm),
  neighborhoodEn: String(neighborhoodEn),
  neighborhoodAm: String(neighborhoodAm),
  lat: Number(lat),
  lng: Number(lng),
  weight: Number(weight),
  premium: Number(premium),
}));

/// @seed
const PROPERTY_TYPES: PropertyTypeConfig[] = [
  {
    type: PROPERTY_TYPE.APARTMENT,
    count: 95,
    category: textPair('Apartment', 'አፓርታማ'),
    noun: textPair('Apartment', 'አፓርታማ'),
    priceMin: 12000,
    priceMax: 60000,
    bedroomOptions: [1, 2, 2, 3, 3, 4],
    bathroomOffset: 1,
    areaRange: [58, 165],
    amenities: [
      textPair('WiFi', 'ዋይፋይ'),
      textPair('Water tank', 'የውሃ ታንክ'),
      textPair('Security', 'ጥበቃ'),
      textPair('Parking', 'መኪና ማቆሚያ'),
      textPair('Balcony', 'በረንዳ'),
      textPair('Kitchen cabinets', 'የወጥ ቤት ካቢኔት'),
      textPair('Elevator', 'ሊፍት'),
      textPair('Backup generator', 'ጀነሬተር'),
      textPair('CCTV', 'ሲሲቲቪ'),
      textPair('Gym', 'የጂም መጠቀሚያ'),
      textPair('Near public transport', 'ለህዝብ መጓጓዣ ቅርብ'),
    ],
    furnishingOptions: ['unfurnished', 'semi-furnished', 'furnished'],
    minLeaseMonths: 6,
  },
  {
    type: PROPERTY_TYPE.STUDIO,
    count: 45,
    category: textPair('Studio', 'ስቱዲዮ'),
    noun: textPair('Studio', 'ስቱዲዮ'),
    priceMin: 8000,
    priceMax: 25000,
    bedroomOptions: [0, 0, 1],
    bathroomOffset: 0,
    areaRange: [28, 55],
    amenities: [
      textPair('WiFi', 'ዋይፋይ'),
      textPair('Water tank', 'የውሃ ታንክ'),
      textPair('Security', 'ጥበቃ'),
      textPair('Compact kitchen', 'አነስተኛ ወጥ ቤት'),
      textPair('Hot shower', 'ሙቅ ሻወር'),
      textPair('Balcony', 'በረንዳ'),
      textPair('Backup generator', 'ጀነሬተር'),
      textPair('Smart TV', 'ስማርት ቲቪ'),
      textPair('Near public transport', 'ለህዝብ መጓጓዣ ቅርብ'),
    ],
    furnishingOptions: ['semi-furnished', 'furnished'],
    minLeaseMonths: 3,
  },
  {
    type: PROPERTY_TYPE.VILLA,
    count: 40,
    category: textPair('Villa', 'ቪላ'),
    noun: textPair('Villa', 'ቪላ'),
    priceMin: 25000,
    priceMax: 80000,
    bedroomOptions: [3, 4, 4, 5, 5, 6],
    bathroomOffset: 1,
    areaRange: [180, 420],
    amenities: [
      textPair('Parking', 'መኪና ማቆሚያ'),
      textPair('Garden', 'አትክልት ቦታ'),
      textPair('Water tank', 'የውሃ ታንክ'),
      textPair('Security', 'ጥበቃ'),
      textPair('Maid room', 'የሰራተኛ ክፍል'),
      textPair('Private compound', 'የግል ግቢ'),
      textPair('Backup generator', 'ጀነሬተር'),
      textPair('CCTV', 'ሲሲቲቪ'),
    ],
    furnishingOptions: ['unfurnished', 'semi-furnished', 'furnished'],
    minLeaseMonths: 12,
  },
  {
    type: PROPERTY_TYPE.CONDO,
    count: 35,
    category: textPair('Condo', 'ኮንዶ'),
    noun: textPair('Condo', 'ኮንዶ'),
    priceMin: 10000,
    priceMax: 38000,
    bedroomOptions: [1, 2, 2, 3],
    bathroomOffset: 1,
    areaRange: [50, 120],
    amenities: [
      textPair('WiFi', 'ዋይፋይ'),
      textPair('Security', 'ጥበቃ'),
      textPair('Parking', 'መኪና ማቆሚያ'),
      textPair('Water tank', 'የውሃ ታንክ'),
      textPair('Balcony', 'በረንዳ'),
      textPair('Elevator', 'ሊፍት'),
      textPair('Kitchen cabinets', 'የወጥ ቤት ካቢኔት'),
      textPair('Near public transport', 'ለህዝብ መጓጓዣ ቅርብ'),
      textPair('Children play area', 'የልጆች መጫወቻ ቦታ'),
    ],
    furnishingOptions: ['unfurnished', 'semi-furnished'],
    minLeaseMonths: 6,
  },
  {
    type: PROPERTY_TYPE.HOUSE,
    count: 25,
    category: textPair('House', 'ቤት'),
    noun: textPair('House', 'ቤት'),
    priceMin: 16000,
    priceMax: 55000,
    bedroomOptions: [2, 3, 3, 4],
    bathroomOffset: 1,
    areaRange: [90, 220],
    amenities: [
      textPair('Parking', 'መኪና ማቆሚያ'),
      textPair('Garden', 'አትክልት ቦታ'),
      textPair('Water tank', 'የውሃ ታንክ'),
      textPair('Security', 'ጥበቃ'),
      textPair('Private compound', 'የግል ግቢ'),
      textPair('Kitchen cabinets', 'የወጥ ቤት ካቢኔት'),
      textPair('Near public transport', 'ለህዝብ መጓጓዣ ቅርብ'),
      textPair('Service quarter', 'የአገልግሎት ክፍል'),
    ],
    furnishingOptions: ['unfurnished', 'semi-furnished', 'furnished'],
    minLeaseMonths: 12,
  },
  {
    type: PROPERTY_TYPE.SHARED_ROOM,
    count: 25,
    category: textPair('Shared Room', 'የጋራ ክፍል'),
    noun: textPair('Shared Room', 'የጋራ ክፍል'),
    priceMin: 4000,
    priceMax: 12000,
    bedroomOptions: [1, 1, 2],
    bathroomOffset: 0,
    areaRange: [18, 38],
    amenities: [
      textPair('WiFi', 'ዋይፋይ'),
      textPair('Shared kitchen', 'የጋራ ወጥ ቤት'),
      textPair('Water tank', 'የውሃ ታንክ'),
      textPair('Security', 'ጥበቃ'),
      textPair('Bed frame', 'የአልጋ ፍሬም'),
      textPair('Study desk', 'የጥናት ጠረጴዛ'),
      textPair('Hot shower', 'ሙቅ ሻወር'),
      textPair('Near public transport', 'ለህዝብ መጓጓዣ ቅርብ'),
    ],
    furnishingOptions: ['furnished'],
    minLeaseMonths: 1,
  },
  {
    type: PROPERTY_TYPE.SERVICED_APARTMENT,
    count: 25,
    category: textPair('Serviced Apartment', 'አገልግሎት ያለው አፓርታማ'),
    noun: textPair('Serviced Apartment', 'አገልግሎት ያለው አፓርታማ'),
    priceMin: 20000,
    priceMax: 50000,
    bedroomOptions: [1, 1, 2, 2, 3],
    bathroomOffset: 0,
    areaRange: [45, 130],
    amenities: [
      textPair('WiFi', 'ዋይፋይ'),
      textPair('Security', 'ጥበቃ'),
      textPair('Furnished', 'የታጠቀ'),
      textPair('Backup generator', 'ጀነሬተር'),
      textPair('Elevator', 'ሊፍት'),
      textPair('Reception', 'መቀበያ'),
      textPair('Gym', 'የጂም መጠቀሚያ'),
      textPair('Smart TV', 'ስማርት ቲቪ'),
      textPair('Near public transport', 'ለህዝብ መጓጓዣ ቅርብ'),
    ],
    furnishingOptions: ['furnished'],
    minLeaseMonths: 1,
  },
  {
    type: PROPERTY_TYPE.PENTHOUSE,
    count: 10,
    category: textPair('Penthouse', 'ፔንትሃውስ'),
    noun: textPair('Penthouse', 'ፔንትሃውስ'),
    priceMin: 40000,
    priceMax: 100000,
    bedroomOptions: [3, 3, 4, 4, 5],
    bathroomOffset: 0,
    areaRange: [150, 360],
    amenities: [
      textPair('WiFi', 'ዋይፋይ'),
      textPair('Elevator', 'ሊፍት'),
      textPair('Security', 'ጥበቃ'),
      textPair('Parking', 'መኪና ማቆሚያ'),
      textPair('Backup generator', 'ጀነሬተር'),
      textPair('City view', 'የከተማ እይታ'),
      textPair('Private terrace', 'የግል ቴራስ'),
      textPair('CCTV', 'ሲሲቲቪ'),
      textPair('Gym', 'የጂም መጠቀሚያ'),
      textPair('Jacuzzi', 'ጃኩዚ'),
    ],
    furnishingOptions: ['semi-furnished', 'furnished'],
    minLeaseMonths: 6,
  },
];

/**
 * Builds multilingual text JSON used by the backend.
 */
function textPair(en: string, am: string): LocaleText {
  return { en, am };
}

/**
 * Builds a deterministic verified owner profile from a name.
 */
function buildSeedOwner(firstName: string, lastName: string, index: number): SeedOwner {
  const bankNames = ['Commercial Bank of Ethiopia', 'Dashen Bank', 'Awash Bank', 'Bank of Abyssinia', 'Cooperative Bank of Oromia'];
  const neighborhoods = [
    textPair('Bole, Addis Ababa, Ethiopia', 'ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ'),
    textPair('Kazanchis, Addis Ababa, Ethiopia', 'ካዛንቺስ፣ አዲስ አበባ፣ ኢትዮጵያ'),
    textPair('Piassa, Addis Ababa, Ethiopia', 'ፒያሳ፣ አዲስ አበባ፣ ኢትዮጵያ'),
    textPair('Megenagna, Addis Ababa, Ethiopia', 'መገናኛ፣ አዲስ አበባ፣ ኢትዮጵያ'),
    textPair('Ayat, Addis Ababa, Ethiopia', 'አያት፣ አዲስ አበባ፣ ኢትዮጵያ'),
  ];
  const phoneDigits = String(911200000 + index);
  const email = `${firstName}.${lastName}@smartrental.com`.toLowerCase();

  return {
    email,
    firstName,
    lastName,
    phone: `+251 ${phoneDigits.slice(0, 3)} ${phoneDigits.slice(3, 6)} ${phoneDigits.slice(6)}`,
    location: neighborhoods[index % neighborhoods.length],
    bio: textPair(
      `${SEED_TAG} Verified Ethiopian rental owner managing residential listings on Smart Rental.`,
      `${SEED_TAG} በSmart Rental ላይ የመኖሪያ ቤት ማስታወቂያዎችን የሚያስተዳድሩ የተረጋገጡ ኢትዮጵያዊ ባለንብረት።`
    ),
    image: `https://i.pravatar.cc/300?u=${firstName.toLowerCase()}-${lastName.toLowerCase()}-seed-owner`,
    bankName: bankNames[index % bankNames.length],
    bankBranch: `${neighborhoods[index % neighborhoods.length].en.split(',')[0]} Branch`,
    accountNumber: `1000${String(index + 1).padStart(8, '0')}`,
  };
}

/**
 * Creates a deterministic random generator for stable seed output.
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Returns a random integer between inclusive bounds.
 */
function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Chooses one array item using the deterministic random source.
 */
function chooseOne<T>(items: readonly T[], random: () => number): T {
  return items[randomInt(random, 0, items.length - 1)];
}

/**
 * Returns a future date at 09:00 local time.
 */
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date;
}

/**
 * Selects neighborhoods by demand weight for realistic distribution.
 */
function weightedNeighborhood(index: number): Neighborhood {
  const weighted = NEIGHBORHOODS.flatMap((neighborhood) =>
    Array.from({ length: neighborhood.weight }, () => neighborhood)
  );
  return weighted[index % weighted.length];
}

/**
 * Builds a price in ETB, with occasional USD listings for high-end rentals.
 */
function buildPrice(config: PropertyTypeConfig, neighborhood: Neighborhood, random: () => number): JsonPrice {
  const base = randomInt(random, config.priceMin, config.priceMax);
  const adjusted = Math.min(config.priceMax, Math.max(config.priceMin, base * neighborhood.premium));
  const amountEtb = Math.round(adjusted / 500) * 500;
  const shouldUseUsd =
    (config.type === PROPERTY_TYPE.PENTHOUSE && amountEtb >= 80000) ||
    (config.type === PROPERTY_TYPE.SERVICED_APARTMENT && random() > 0.82);

  if (shouldUseUsd) {
    return { value: Math.round(amountEtb / 56), currency: 'USD', amountEtb };
  }

  return { value: amountEtb, currency: 'ETB' };
}

/**
 * Computes a practical bathroom count for each property type.
 */
function bathroomCount(config: PropertyTypeConfig, bedrooms: number): number {
  if (config.type === PROPERTY_TYPE.SHARED_ROOM || config.type === PROPERTY_TYPE.STUDIO) {
    return 1;
  }

  return Math.max(1, bedrooms - config.bathroomOffset);
}

/**
 * Selects 4-8 bilingual amenities from the property type's configured amenity list.
 */
function buildAmenities(config: PropertyTypeConfig, random: () => number): LocaleText[] {
  const targetCount = randomInt(random, 4, 8);
  const amenities: LocaleText[] = [];

  while (amenities.length < targetCount && amenities.length < config.amenities.length) {
    const amenity = chooseOne(config.amenities, random);
    if (!amenities.some((item) => item.en === amenity.en)) {
      amenities.push(amenity);
    }
  }

  return amenities;
}

/**
 * Builds deterministic placeholder image URLs.
 */
function buildImages(type: SeedPropertyType, sequence: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = `${type.toLowerCase()}-${String(sequence).padStart(3, '0')}-${index + 1}`;
    return `https://picsum.photos/seed/${seed}/1200/800`;
  });
}

/**
 * Builds a bilingual property title.
 */
function buildTitle(draft: PropertyDraft): LocaleText {
  const englishPrefix =
    draft.config.type === PROPERTY_TYPE.STUDIO ? 'Studio' : `${draft.bedrooms} Bedroom ${draft.config.noun.en}`;
  const amharicPrefix =
    draft.config.type === PROPERTY_TYPE.STUDIO ? 'ስቱዲዮ' : `${draft.bedrooms} መኝታ ቤት ${draft.config.noun.am}`;

  return textPair(
    `${englishPrefix} in ${draft.mapLocation.neighborhood}`,
    `${amharicPrefix} - ${draft.mapLocation.neighborhood}`
  );
}

const DESCRIPTION_AUDIENCES: LocaleText[] = [
  textPair('professionals who need short commutes', 'አጭር የመጓጓዣ ጊዜ ለሚፈልጉ ባለሙያዎች'),
  textPair('families looking for calm residential streets', 'ጸጥ ያለ የመኖሪያ አካባቢ ለሚፈልጉ ቤተሰቦች'),
  textPair('students and first-time renters comparing value', 'ዋጋን ለሚያወዳድሩ ተማሪዎች እና አዲስ ተከራዮች'),
  textPair('remote workers who need reliable utilities', 'አስተማማኝ አገልግሎት ለሚፈልጉ ከቤት የሚሰሩ ሰዎች'),
  textPair('long-term renters prioritizing safety and convenience', 'ደህንነትን እና ምቾትን ቅድሚያ ለሚሰጡ የረጅም ጊዜ ተከራዮች'),
];

const DESCRIPTION_SURROUNDINGS: LocaleText[] = [
  textPair('near cafes, supermarkets, clinics, and minibus routes', 'ለካፌዎች፣ ሱፐርማርኬቶች፣ ክሊኒኮች እና የሚኒባስ መስመሮች ቅርብ'),
  textPair('close to schools, pharmacies, groceries, and main roads', 'ለትምህርት ቤቶች፣ ፋርማሲዎች፣ ግሮሰሪዎች እና ዋና መንገዶች ቅርብ'),
  textPair('with quick access to business districts and ride-hailing pickup points', 'ወደ የንግድ አካባቢዎች እና የታክሲ መጠባበቂያ ቦታዎች ፈጣን መዳረሻ ያለው'),
  textPair('near gyms, restaurants, banks, and evening transport options', 'ለጂሞች፣ ሬስቶራንቶች፣ ባንኮች እና የማታ መጓጓዣ አማራጮች ቅርብ'),
  textPair('in a walkable area with daily services within a short distance', 'የዕለት ተዕለት አገልግሎቶች በአጭር ርቀት የሚገኙበት በእግር ለመጓዝ ምቹ አካባቢ'),
];

const DESCRIPTION_KEYWORDS: Record<SeedPropertyType, LocaleText[]> = {
  [PROPERTY_TYPE.APARTMENT]: [
    textPair('elevator access, city living, apartment security', 'ሊፍት፣ የከተማ ኑሮ፣ የአፓርታማ ጥበቃ'),
    textPair('balcony space, backup power, managed building', 'በረንዳ፣ ተጠባባቂ ጀነሬተር፣ የተደራጀ ሕንፃ'),
  ],
  [PROPERTY_TYPE.STUDIO]: [
    textPair('compact layout, furnished option, starter rental', 'አነስተኛ አቀማመጥ፣ የታጠቀ አማራጭ፣ የመጀመሪያ ኪራይ'),
    textPair('low budget, single renter, easy maintenance', 'ዝቅተኛ በጀት፣ ነጠላ ተከራይ፣ ቀላል እንክብካቤ'),
  ],
  [PROPERTY_TYPE.VILLA]: [
    textPair('private compound, family space, garden lifestyle', 'የግል ግቢ፣ የቤተሰብ ቦታ፣ የአትክልት ቦታ ኑሮ'),
    textPair('large bedrooms, parking, quiet neighborhood', 'ሰፊ መኝታ ቤቶች፣ መኪና ማቆሚያ፣ ጸጥ ያለ አካባቢ'),
  ],
  [PROPERTY_TYPE.CONDO]: [
    textPair('condominium block, predictable rent, community services', 'የኮንዶሚኒየም ሕንፃ፣ የታወቀ ኪራይ፣ የማህበረሰብ አገልግሎቶች'),
    textPair('affordable family unit, transport access, managed compound', 'ተመጣጣኝ የቤተሰብ ክፍል፣ የመጓጓዣ መዳረሻ፣ የተደራጀ ግቢ'),
  ],
  [PROPERTY_TYPE.HOUSE]: [
    textPair('standalone home, private entrance, flexible family layout', 'ራሱን የቻለ ቤት፣ የግል መግቢያ፣ ለቤተሰብ ተስማሚ አቀማመጥ'),
    textPair('compound space, service quarter, long lease stability', 'የግቢ ቦታ፣ የአገልግሎት ክፍል፣ የረጅም ጊዜ ኪራይ መረጋጋት'),
  ],
  [PROPERTY_TYPE.SHARED_ROOM]: [
    textPair('shared kitchen, study desk, budget room', 'የጋራ ወጥ ቤት፣ የጥናት ጠረጴዛ፣ በጀት ክፍል'),
    textPair('student housing, furnished bed, transport access', 'የተማሪ መኖሪያ፣ የታጠቀ አልጋ፣ የመጓጓዣ መዳረሻ'),
  ],
  [PROPERTY_TYPE.SERVICED_APARTMENT]: [
    textPair('serviced living, reception, flexible monthly stay', 'አገልግሎት ያለው ኑሮ፣ መቀበያ፣ ተለዋዋጭ ወርሃዊ ቆይታ'),
    textPair('furnished apartment, utilities ready, executive rental', 'የታጠቀ አፓርታማ፣ ዝግጁ አገልግሎቶች፣ የኤክዜክቲቭ ኪራይ'),
  ],
  [PROPERTY_TYPE.PENTHOUSE]: [
    textPair('city view, private terrace, premium residence', 'የከተማ እይታ፣ የግል ቴራስ፣ ፕሪሚየም መኖሪያ'),
    textPair('luxury finish, elevator access, high-end amenities', 'የቅንጦት አጨራረስ፣ ሊፍት፣ ከፍተኛ ደረጃ መገልገያዎች'),
  ],
};

function pickVariant<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

/**
 * Builds a detailed bilingual property description.
 */
function buildDescription(draft: PropertyDraft): LocaleText {
  const priceText =
    draft.price.currency === 'USD'
      ? `USD ${draft.price.value.toLocaleString()} per month, approximately ETB ${draft.price.amountEtb?.toLocaleString()}`
      : `ETB ${draft.price.value.toLocaleString()} per month`;
  const englishFeatures = draft.amenities.slice(0, 4).map((amenity) => amenity.en).join(', ');
  const amharicFeatures = draft.amenities.slice(0, 4).map((amenity) => amenity.am).join('፣ ');
  const audience = pickVariant(DESCRIPTION_AUDIENCES, draft.sequence + draft.bedrooms);
  const surroundings = pickVariant(DESCRIPTION_SURROUNDINGS, draft.sequence + draft.area);
  const keywords = pickVariant(DESCRIPTION_KEYWORDS[draft.config.type], draft.sequence);

  return textPair(
    `${SEED_TAG} This ${draft.config.category.en.toLowerCase()} is located in ${draft.mapLocation.neighborhood}, ${draft.mapLocation.city}, ${surroundings.en}. It works well for ${audience.en}. It offers ${draft.bedrooms} bedroom${draft.bedrooms === 1 ? '' : 's'}, ${draft.bathrooms} bathroom${draft.bathrooms === 1 ? '' : 's'}, and about ${draft.area} sqm of usable space. Key features include ${englishFeatures}. Search highlights: ${keywords.en}. The monthly rent is ${priceText}, with lease terms designed for ${draft.config.minLeaseMonths}+ month stays.`,
    `${SEED_TAG} ይህ ${draft.config.category.am} በ${draft.mapLocation.neighborhood}፣ ${draft.mapLocation.city} ውስጥ ይገኛል፣ ${surroundings.am}። ለ${audience.am} ተስማሚ ነው። ${draft.bedrooms} መኝታ ቤት፣ ${draft.bathrooms} መታጠቢያ ቤት እና በግምት ${draft.area} ካሬ ሜትር ቦታ አለው። ዋና ገጽታዎቹ ${amharicFeatures} ያካትታሉ። የፍለጋ ቁልፍ ቃላት፦ ${keywords.am}። ወርሃዊ ኪራዩ ${priceText} ሲሆን የኪራይ ውሉ ለ${draft.config.minLeaseMonths}+ ወር ቆይታ ተዘጋጅቷል።`
  );
}

/**
 * Builds lease terms and embeds the seed tag for database-level traceability.
 */
function buildLeaseTerms(draft: PropertyDraft): Prisma.InputJsonObject {
  const deposit = draft.price.amountEtb ?? draft.price.value;
  return {
    seedTag: SEED_TAG,
    secureDeposit: { value: deposit, currency: 'ETB' },
    conditions: textPair(
      `${draft.config.minLeaseMonths} months minimum. Utilities are paid by the tenant unless otherwise agreed.`,
      `ቢያንስ ${draft.config.minLeaseMonths} ወር። ሌላ ስምምነት ካልተደረገ የመብራት፣ ውሃ እና ሌሎች ክፍያዎች በተከራይ ይከፈላሉ።`
    ),
    minDuration: draft.config.minLeaseMonths,
    availableFrom: draft.availableFrom.toISOString(),
  };
}

/**
 * Builds all property drafts in the exact requested distribution.
 */
function buildPropertyDrafts(ownerIds: string[]): PropertyDraft[] {
  const random = createRandom(20260525);
  const drafts: PropertyDraft[] = [];

  PROPERTY_TYPES.forEach((config) => {
    for (let offset = 0; offset < config.count; offset += 1) {
      const sequence = drafts.length + 1;
      const neighborhood = weightedNeighborhood(sequence + offset);
      const bedrooms = chooseOne(config.bedroomOptions, random);
      const price = buildPrice(config, neighborhood, random);

      drafts.push({
        ownerId: ownerIds[sequence % ownerIds.length],
        config,
        neighborhood,
        sequence,
        bedrooms,
        bathrooms: bathroomCount(config, bedrooms),
        price,
        mapLocation: getPropertyMapLocation(drafts.length),
        amenities: buildAmenities(config, random),
        imageCount: randomInt(random, 3, 8),
        area: randomInt(random, config.areaRange[0], config.areaRange[1]),
        furnishingStatus: chooseOne(config.furnishingOptions, random),
        availableFrom: daysFromNow(randomInt(random, 0, 45)),
      });
    }
  });

  return drafts;
}

/**
 * Ensures seed-required schema changes are present when `db seed` is run before migrations.
 */
async function ensureSeedSchemaCompatibility(): Promise<void> {
  await prisma.$executeRawUnsafe(`ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'SHARED_ROOM'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'SERVICED_APARTMENT'`);

  const [amenitiesColumn] = await prisma.$queryRaw<ColumnMetadata[]>`
    SELECT data_type AS "dataType", udt_name AS "udtName"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Property'
      AND column_name = 'amenities'
  `;

  if (!amenitiesColumn) {
    throw new Error('Property.amenities column was not found. Run Prisma migrations before seeding.');
  }

  if (amenitiesColumn.udtName === 'jsonb' || amenitiesColumn.udtName === 'json') {
    return;
  }

  if (amenitiesColumn.dataType !== 'ARRAY') {
    throw new Error(
      `Property.amenities must be jsonb/json or text[]. Found ${amenitiesColumn.dataType} (${amenitiesColumn.udtName}).`
    );
  }

  console.log('Converting Property.amenities from text[] to jsonb for bilingual seed data...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Property"
      ALTER COLUMN "amenities" DROP DEFAULT,
      ALTER COLUMN "amenities" TYPE JSONB USING to_jsonb("amenities"),
      ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb
  `);
}

/**
 * Deletes only data owned by the deterministic seed owner emails.
 */
async function clearSeedData(): Promise<void> {
  const seedOwners = await prisma.user.findMany({
    where: { email: { in: CLEANUP_OWNER_EMAILS } },
    select: { id: true },
  });
  const ownerIds = seedOwners.map((owner) => owner.id);

  if (ownerIds.length === 0) {
    console.log('No existing Ethiopian rental seed data found.');
    return;
  }

  const properties = await prisma.property.findMany({
    where: { ownerId: { in: ownerIds } },
    select: { id: true },
  });
  const propertyIds = properties.map((property) => property.id);
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ ownerId: { in: ownerIds } }, { propertyId: { in: propertyIds } }] },
    select: { id: true },
  });
  const conversationIds = conversations.map((conversation) => conversation.id);
  const messages = await prisma.message.findMany({
    where: { conversationId: { in: conversationIds } },
    select: { id: true },
  });
  const messageIds = messages.map((message) => message.id);
  const agreements = await prisma.agreement.findMany({
    where: { OR: [{ ownerId: { in: ownerIds } }, { propertyId: { in: propertyIds } }] },
    select: { id: true },
  });
  const agreementIds = agreements.map((agreement) => agreement.id);

  console.log(`Clearing existing seed data for ${ownerIds.length} owners and ${propertyIds.length} properties...`);

  await prisma.$transaction([
    prisma.propertyEmbedding.deleteMany({ where: { propertyId: { in: propertyIds } } }),
    prisma.userPropertyState.deleteMany({ where: { propertyId: { in: propertyIds } } }),
    prisma.userInteractionEvent.deleteMany({ where: { propertyId: { in: propertyIds } } }),
    prisma.review.deleteMany({ where: { propertyId: { in: propertyIds } } }),
    prisma.payment.deleteMany({ where: { agreementId: { in: agreementIds } } }),
    prisma.agreement.deleteMany({ where: { id: { in: agreementIds } } }),
    prisma.appointment.deleteMany({
      where: { OR: [{ ownerId: { in: ownerIds } }, { propertyId: { in: propertyIds } }] },
    }),
    prisma.messageReaction.deleteMany({
      where: { OR: [{ userId: { in: ownerIds } }, { messageId: { in: messageIds } }] },
    }),
    prisma.messageAttachment.deleteMany({ where: { messageId: { in: messageIds } } }),
    prisma.message.deleteMany({ where: { id: { in: messageIds } } }),
    prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } }),
    prisma.notification.deleteMany({ where: { userId: { in: ownerIds } } }),
    prisma.auditLog.deleteMany({ where: { actorId: { in: ownerIds } } }),
    prisma.report.deleteMany({
      where: {
        OR: [
          { reportedById: { in: ownerIds } },
          { targetId: { in: [...ownerIds, ...propertyIds, ...agreementIds] } },
        ],
      },
    }),
    prisma.verificationDocument.deleteMany({ where: { userId: { in: ownerIds } } }),
    prisma.bankDetail.deleteMany({ where: { userId: { in: ownerIds } } }),
    prisma.notificationPreference.deleteMany({ where: { userId: { in: ownerIds } } }),
    prisma.property.deleteMany({ where: { id: { in: propertyIds } } }),
    prisma.refreshToken.deleteMany({ where: { userId: { in: ownerIds } } }),
    prisma.session.deleteMany({ where: { userId: { in: ownerIds } } }),
    prisma.account.deleteMany({ where: { userId: { in: ownerIds } } }),
    prisma.user.deleteMany({ where: { id: { in: ownerIds } } }),
  ]);
}

/**
 * Creates verified owners and profile-related records.
 */
async function createSeedOwners(passwordHash: string): Promise<Array<{ id: string; email: string }>> {
  const owners: Array<{ id: string; email: string }> = [];

  for (const owner of OWNERS) {
    const created = await prisma.user.create({
      data: {
        email: owner.email,
        password: passwordHash,
        first_name: owner.firstName,
        last_name: owner.lastName,
        phone: owner.phone,
        role: Role.owner,
        emailVerified: true,
        isVerified: true,
        verificationState: VerificationState.verified,
        status: UserStatus.active,
        preferredLanguage: 'en',
        location: owner.location.en,
        bio: owner.bio.en,
        image: owner.image,
        verificationDocs: {
          create: {
            frontUrl: `https://picsum.photos/seed/${owner.firstName.toLowerCase()}-id-front/900/600`,
            backUrl: `https://picsum.photos/seed/${owner.firstName.toLowerCase()}-id-back/900/600`,
            livePhotoUrl: owner.image,
            status: VerificationStatus.approved,
            note: `${SEED_TAG} approved owner verification`,
            reviewedAt: new Date(),
          },
        },
        bankDetail: {
          create: {
            bankName: owner.bankName,
            branch: owner.bankBranch,
            accountNumber: owner.accountNumber,
            holderName: `${owner.firstName} ${owner.lastName}`,
          },
        },
        notificationPreference: {
          create: {
            appointments: true,
            agreements: true,
            payments: true,
            reviews: true,
            reports: true,
            system: true,
          },
        },
      },
      select: { id: true, email: true },
    });

    owners.push({ id: created.id, email: created.email ?? owner.email });
  }

  console.log(`Created ${owners.length} verified owners.`);
  return owners;
}

/**
 * Converts a property draft into a Prisma create payload.
 */
function toPropertyCreateInput(draft: PropertyDraft): Prisma.PropertyUncheckedCreateInput {
  return {
    ownerId: draft.ownerId,
    category: draft.config.category,
    status: PropertyStatus.AVAILABLE,
    title: buildTitle(draft),
    description: buildDescription(draft),
    location: toPropertyLocationJson(draft.mapLocation) as JsonLocation,
    address: draft.mapLocation.address,
    price: draft.price,
    bedrooms: draft.bedrooms,
    bathrooms: draft.bathrooms,
    area: { value: draft.area, unit: 'sqm' },
    amenities: draft.amenities as unknown as Prisma.InputJsonValue,
    furnishingStatus: draft.furnishingStatus,
    images: buildImages(draft.config.type, draft.sequence, draft.imageCount),
    videos: [],
    leaseTerms: buildLeaseTerms(draft),
    viewCount: draft.sequence % 37,
    isVerified: true,
    isDeleted: false,
  };
}

/**
 * Creates properties and logs progress every 50 records.
 */
async function createSeedProperties(ownerIds: string[]): Promise<void> {
  const drafts = buildPropertyDrafts(ownerIds);

  if (drafts.length !== PROPERTY_TOTAL) {
    throw new Error(`Expected ${PROPERTY_TOTAL} properties, built ${drafts.length}.`);
  }

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    await prisma.property.create({
      data: toPropertyCreateInput(draft),
      select: { id: true },
    });

    if ((index + 1) % 50 === 0) {
      console.log(`Created ${index + 1}/${PROPERTY_TOTAL} properties...`);
    }
  }
}

/**
 * Logs the generated property distribution.
 */
function logDistribution(): void {
  console.log('Property distribution:');
  PROPERTY_TYPES.forEach((config) => {
    const percentage = Math.round((config.count / PROPERTY_TOTAL) * 100);
    console.log(`- ${config.category.en}: ${config.count} (${percentage}%)`);
  });
}

/**
 * Creates the admin user.
 */
async function createAdminUser(passwordHash: string): Promise<void> {
  console.log('Seeding admin user...');
  await prisma.user.create({
    data: {
      email: 'admin@smartrental.com',
      password: passwordHash,
      first_name: 'System',
      last_name: 'Admin',
      phone: '+251900000000',
      role: Role.admin,
      emailVerified: true,
      isVerified: true,
      verificationState: VerificationState.verified,
      status: UserStatus.active,
      preferredLanguage: 'en',
      notificationPreference: {
        create: {
          appointments: true,
          agreements: true,
          payments: true,
          reviews: true,
          reports: true,
          system: true,
        },
      },
    },
  });
  console.log('Admin user seeded successfully: admin@smartrental.com');
}

/**
 * Runs the seed script.
 */
async function main(): Promise<void> {
  console.log('Seeding Ethiopian rental owners and properties...');
  console.log(`Seed tag: ${SEED_TAG}`);

  const requestedTotal = PROPERTY_TYPES.reduce((sum, config) => sum + config.count, 0);
  if (requestedTotal !== PROPERTY_TOTAL) {
    throw new Error(`Property type counts must equal ${PROPERTY_TOTAL}; received ${requestedTotal}.`);
  }

  await ensureSeedSchemaCompatibility();
  await clearSeedData();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await createAdminUser(passwordHash);
  const owners = await createSeedOwners(passwordHash);
  await createSeedProperties(owners.map((owner) => owner.id));
  await seedRenterInteractionData(prisma, passwordHash);

  logDistribution();
  console.log('Seeding complete.');
  console.log('Default password for seed owners:', DEFAULT_PASSWORD);
  console.log('Owner emails:', owners.map((owner) => owner.email).join(', '));
}

main()
  .catch((error: unknown) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
