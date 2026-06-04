import { normalizeSentimentScore, sentimentLabel } from '../sentiment.utils';

describe('sentiment.utils', () => {
  describe('normalizeSentimentScore', () => {
    it('clamps values below 0 to 0', () => {
      expect(normalizeSentimentScore(-0.5)).toBe(0);
    });

    it('clamps values above 1 to 1', () => {
      expect(normalizeSentimentScore(1.5)).toBe(1);
    });

    it('returns the same value when already in range', () => {
      expect(normalizeSentimentScore(0.75)).toBe(0.75);
    });
  });

  describe('sentimentLabel', () => {
    it('classifies negative scores', () => {
      expect(sentimentLabel(0.2)).toBe('negative');
    });

    it('classifies neutral scores', () => {
      expect(sentimentLabel(0.5)).toBe('neutral');
    });

    it('classifies positive scores', () => {
      expect(sentimentLabel(0.8)).toBe('positive');
    });
  });
});
