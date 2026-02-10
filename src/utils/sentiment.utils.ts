/**
 * AI sentiment logic helper (e.g. for review scores or content moderation).
 * Integrate with your AI provider when needed.
 */

export function normalizeSentimentScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}

export function sentimentLabel(score: number): 'negative' | 'neutral' | 'positive' {
  if (score < 0.4) return 'negative';
  if (score < 0.6) return 'neutral';
  return 'positive';
}
