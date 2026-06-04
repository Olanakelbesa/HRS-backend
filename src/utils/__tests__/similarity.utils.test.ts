import { cosineSimilarity } from '../similarity.utils';

describe('cosineSimilarity', () => {
  it('returns 1 for identical unit vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('returns 0 when vector lengths differ', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('returns 0 when either vector has zero magnitude', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it('computes similarity for arbitrary vectors', () => {
    const similarity = cosineSimilarity([1, 2, 3], [2, 4, 6]);
    expect(similarity).toBeCloseTo(1, 5);
  });
});
