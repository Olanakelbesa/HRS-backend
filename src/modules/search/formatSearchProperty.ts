import { formatPropertyResponse } from '../properties/service';
import { enrichPrice, type SupportedCurrency } from './currency';

/**
 * Formats a property for semantic search responses (includes price.amountEtb).
 */
export function formatSearchProperty(
  property: Record<string, unknown>,
  etbPerUsd: number,
  displayCurrency: SupportedCurrency,
) {
  const formatted = formatPropertyResponse(property) as Record<string, unknown>;
  const rawPrice = formatted.price as { value?: number; currency?: string; amountEtb?: number };

  return {
    ...formatted,
    price: enrichPrice(rawPrice, etbPerUsd, displayCurrency),
  };
}
