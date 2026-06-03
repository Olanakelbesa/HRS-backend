type PreferredLocation = {
  address: string;
  lat?: number | null;
  lng?: number | null;
};

export type UserPrefForScoring = {
  preferredPriceMin?: number | null;
  preferredPriceMax?: number | null;
  preferredBedrooms?: number | null;
  preferredType?: string | null;
  preferredAmenities?: string[];
  furnishStatus?: string | null;
  preferredLocations?: PreferredLocation[] | null;
};

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function extractPriceEtb(price: unknown): number {
  const p = price as { value?: number; currency?: string; amountEtb?: number } | null;
  if (!p) return 0;
  if (p.amountEtb != null && Number.isFinite(p.amountEtb)) return p.amountEtb;
  const value = Number(p.value ?? 0);
  const currency = String(p.currency ?? 'ETB').toUpperCase();
  return currency === 'USD' ? value * 56 : value;
}

function extractCategoryType(category: unknown): string {
  if (typeof category === 'string') {
    return category.toUpperCase().replace(/\s+/g, '_');
  }
  if (category && typeof category === 'object') {
    const cat = category as { en?: string; am?: string };
    const label = cat.en || cat.am || '';
    return label.toUpperCase().replace(/\s+/g, '_');
  }
  return '';
}

function extractLocationStrings(property: {
  location?: unknown;
  address?: unknown;
}): string[] {
  const parts: string[] = [];
  const loc = property.location as Record<string, unknown> | null;
  const addr = property.address as { en?: string; am?: string } | null;

  if (loc?.city) parts.push(String(loc.city).toLowerCase());
  if (loc?.neighborhood) parts.push(String(loc.neighborhood).toLowerCase());
  if (loc?.subcity) parts.push(String(loc.subcity).toLowerCase());
  if (addr?.en) parts.push(String(addr.en).toLowerCase());
  if (addr?.am) parts.push(String(addr.am).toLowerCase());

  return parts;
}

function extractAmenities(amenities: unknown): string[] {
  if (!Array.isArray(amenities)) return [];

  return amenities.map((entry) => {
    if (typeof entry === 'string') return entry.toLowerCase();
    if (entry && typeof entry === 'object' && 'en' in entry) {
      return String((entry as { en?: string }).en ?? '').toLowerCase();
    }
    return String(entry).toLowerCase();
  });
}

export function hasMeaningfulPreferences(pref: UserPrefForScoring): boolean {
  const locations = pref.preferredLocations ?? [];
  return (
    pref.preferredPriceMin != null ||
    pref.preferredPriceMax != null ||
    pref.preferredBedrooms != null ||
    pref.preferredType != null ||
    (pref.preferredAmenities?.length ?? 0) > 0 ||
    pref.furnishStatus != null ||
    locations.length > 0
  );
}

export function scorePropertyAgainstPreferences(
  property: {
    price?: unknown;
    category?: unknown;
    bedrooms?: number | null;
    furnishingStatus?: string | null;
    amenities?: unknown;
    location?: unknown;
    address?: unknown;
    viewCount?: number | null;
  },
  pref: UserPrefForScoring
): number {
  let score = 0;

  const price = extractPriceEtb(property.price);
  const min = pref.preferredPriceMin ?? 0;
  const max = pref.preferredPriceMax ?? Number.POSITIVE_INFINITY;

  if (pref.preferredPriceMin != null || pref.preferredPriceMax != null) {
    if (price >= min && price <= max) {
      score += 90;
    } else if (price >= min * 0.85 && price <= max * 1.15) {
      score += 40;
    }
  }

  const propType = extractCategoryType(property.category);
  if (pref.preferredType && propType === pref.preferredType) {
    score += 60;
  }

  if (pref.preferredBedrooms != null && property.bedrooms != null) {
    const diff = Math.abs(property.bedrooms - pref.preferredBedrooms);
    if (diff === 0) score += 35;
    else if (diff === 1) score += 15;
  }

  const furnishPref = pref.furnishStatus?.toLowerCase();
  const furnishProp = property.furnishingStatus?.toLowerCase();
  if (furnishPref && furnishProp && furnishPref === furnishProp) {
    score += 15;
  }

  const propAmenities = extractAmenities(property.amenities);
  const prefAmenities = (pref.preferredAmenities ?? []).map((a) => a.toLowerCase());
  for (const preferred of prefAmenities) {
    if (propAmenities.some((a) => a.includes(preferred) || preferred.includes(a))) {
      score += 12;
    }
  }

  const locStrings = extractLocationStrings(property);
  const preferredLocs = pref.preferredLocations ?? [];
  for (const loc of preferredLocs) {
    const addr = loc.address.toLowerCase();
    const addressMatch = locStrings.some(
      (part) => part.includes(addr) || addr.includes(part)
    );
    if (addressMatch) {
      score += 55;
      break;
    }

    if (loc.lat != null && loc.lng != null && property.location) {
      const plat = Number((property.location as { lat?: number }).lat);
      const plng = Number((property.location as { lng?: number }).lng);
      if (Number.isFinite(plat) && Number.isFinite(plng)) {
        const dist = getDistanceKm(loc.lat, loc.lng, plat, plng);
        if (dist <= 5) score += 55;
        else if (dist <= 15) score += 25;
      }
    }
  }

  score += Math.min((property.viewCount ?? 0) / 100, 5);

  return score;
}
