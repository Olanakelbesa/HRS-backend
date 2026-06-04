import { generateReadableId } from '../readableId';

describe('generateReadableId', () => {
  it('includes the prefix and a hyphen', () => {
    const id = generateReadableId('PAY');
    expect(id.startsWith('PAY-')).toBe(true);
  });

  it('uses the default random part length of 6', () => {
    const id = generateReadableId('USR');
    expect(id).toMatch(/^USR-[A-Z0-9]{6}$/);
  });

  it('respects a custom random part length', () => {
    const id = generateReadableId('AUD', 10);
    expect(id).toMatch(/^AUD-[A-Z0-9]{10}$/);
  });

  it('generates unique values across calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateReadableId('PAY')));
    expect(ids.size).toBe(20);
  });
});
